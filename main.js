const bodyParser = require('body-parser');
const dotenv = require('dotenv');
const express = require("express");
const fs = require("fs");
const mime = require("mime");
const multer = require("multer");
const session = require("express-session");
const path = require("path");
const passport = require("passport");
const MySqlStore = require("express-mysql-session")(session);

const database = require('./database');
const schemas = require("./schemas");
const httpStatus = require("./http_status");
//console.debug(httpStatus);
const dummyData = require("./dummy_data");
const password = require("./password");
require("./passport-config")
const auth = require("./authMiddleware");

const app = express();
const urlencodedParser = bodyParser.urlencoded({ extended: false });
dotenv.config();

app.use(express.static("public"));
app.set("view engine", "ejs");

const sessionStore = new MySqlStore({ createDatabaseTable: true }, database.pool);

const SESSION_MAX_AGE = 1000 * 60 * 60 * 24 * 30  // 30 days

app.use(passport.initialize());
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
    store: sessionStore,
    cookie: {
        maxAge: SESSION_MAX_AGE,
    },
}));
app.use(passport.session());

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, "./public/user-files")
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`
        cb(null, `${file.fieldname}-${uniqueSuffix}.${mime.getExtension(file.mimetype)}`);
    }
});
const upload = multer({ storage: storage });


app.get("/", (req, res) => {
    if (!req.isAuthenticated())
        return res.render("landing.ejs");

    res.render("index.ejs");
})

app.get("/register", (req, res) => {
    if (req.isAuthenticated())
        return res.redirect("/");

    res.render("register.ejs");
})

app.get("/login", (req, res) => {
    if (req.isAuthenticated())
        return res.redirect("/");

    res.render("login.ejs");
})

app.get("/logout", (req, res) => {
    req.logout(function (err) {
        if (err) {
            console.log(err);
            return next(err);
        }
        res.redirect('/');
    });
})

//sends list with firstName, lastName, and userID.
app.get("/users", auth.isAuthenticated, (req, res) => {
    database.allStudents().then((list) => {
        res.render("allUsersList.ejs", { studentlist: list });
    });
});


app.get("/users/:userid", auth.isAuthenticated, (req, res) => {
    database.getStudentByUserID(req.params.userid).then((student) => {
        if (!student) {
            return res.status(httpStatus.NOT_FOUND).send("That user doesn't exist or has no profile");
        }
        res.render("profile.ejs", { student: student, curr: req.user.userID });
    });
})

app.get("/profile", auth.isAuthenticated, (req, res) => {
    res.redirect(`/users/${req.user.userID}`)
})

app.get("/resumeContact", auth.isAuthenticated, (req, res) => {
    res.render("resumeContactForm.ejs");
})

app.get("/submitPreferences", auth.isAuthenticated, (req, res) => {

    database.getAllProjects()
        .then(projects => {
            console.log(projects)
            res.render("submitPreferences.ejs", {
                projects: projects
            });
        })
})

app.get("/teams", auth.isAuthenticated, (req, res) => {
    database.getStudentByUserID(req.user.userID).then((student) => {
        var team;
        if (!student) {
            team = null;
        } else {
            team = student.team;
        }
        database.getAllTeams().then((teams) => {
            res.render("team-list.ejs", { yourTeam: team, teams });
        });
    });
})

app.get("/team/:teamid", auth.isAuthenticated, (req, res) => {

    //Duplicated from '/teams'
    database.getStudentByUserID(req.user.userID).then((student) => {
        var team;
        if (!student) {
            team = null;
        } else {
            team = student.team;
        }
        database.getTeam(req.params.teamid).then((teamDataObj) => {
            res.render("teamPage.ejs", { yourTeam: team, teamDataObj });
        });
    });

})

app.get("/projects", auth.isAuthenticated, (req, res) => {
    database.getNetID(req.user.userID)
        .then(netID => {
            return database.getUsersProject(netID);
        })
        .then(yourProjectID => {
            return Promise.all([
                database.getAllSponsors(),
                database.getAllProjects()
            ]).then(([sponsors, projects]) => {
                res.render("project-list.ejs", {
                    yourProjectID: yourProjectID,
                    sponsors: sponsors,
                    projects: projects
                });
            });
        })
        .catch(err => {
            console.error("Error:", err);
            res.status(500).send("Internal Server Error");
        });
});

app.get("/project/:projectid", auth.isAuthenticated, (req, res) => {
    database.getProject(req.params.projectid).then((project) => {
        if (!project) {
            return res.status(httpStatus.NOT_FOUND).send("The project with id " + req.params.projectid + " does not exist.");
        } else {
            res.render("project-page.ejs", {project: project});
        }
    });
})

app.get("/invite/new", auth.isAuthenticated, async (req, res) => {
    const student = await database.getStudentByUserID(req.user.userID);
    res.render("inviteUser.ejs", { yourTeam: student.team });
});

app.get("/invites", auth.isAuthenticated, (req, res) => {
    database.getStudentByUserID(req.user.userID).then((student) => {
        if (!student) {
            return res.status(httpStatus.NOT_FOUND).send("That user is not a Student");
        }
        database.getInvites(req.user.userID).then((invites) => {
            res.render("invite-inbox.ejs", { yourTeam: student.team, invites: invites })
        });
    });
})

app.get("/adminHomepage", auth.isAdmin, (req, res) => {
    res.render("adminHomePage.ejs");
})

app.get("/adminClearProfile", auth.isAdmin, (req, res) => {
    res.render("adminClearProfile.ejs");
})

app.get("/adminAccess", auth.isAdmin, (req, res) => {
    res.render("adminAccess.ejs");
})

app.get("/adminDatabase", auth.isAdmin, (req, res) => {
    res.render("adminDatabase.ejs");
})

app.get("/adminTeams", auth.isAdmin, async (req, res) => {
    res.render("adminTeams.ejs", {
        teams: await database.getAllTeams(),
        projects: await database.getAllProjects(),
    });
})

app.post("/login", urlencodedParser, passport.authenticate("local", { successRedirect: '/' }));

app.post("/register", urlencodedParser, (req, res) => {
    database.getUserByEmail(req.body.email).then((user) => {
        if (!user)
            return res.status(httpStatus.UNAUTHORIZED).send("That email is not associated with an assigned user.");

        database.getLoginByEmail(req.body.email).then(login => {
            if (login)
                return res.status(httpStatus.BAD_REQUEST).send("That user is already registered.");

            const { salt, hash } = password.genPassword(req.body.password);
            database.addLogin(user.userID, hash, salt);
            res.redirect("/login");
        });
    }).catch((err) => {
        console.log(err);
        res.status(httpStatus.BAD_REQUEST).send(err);
    });
});

//resumeContactInfo
app.post('/profile', auth.isAuthenticated, upload.single("resumeUploadButton"), (req, res) => {
    const result = schemas.resumeContact.validate(req.body);
    if (result.error)
        return res.status(httpStatus.BAD_REQUEST).send(result.error.details[0].message);

    const contact = Object.fromEntries(
        Object.entries(result.value)
            .map(([key, val]) => {
                if (key === "contactByPhone")
                    return ["phoneNumber", val];
                return [key.substring("contactBy".length), val]
            })
            .filter(([_, val]) => val)
    );
    if (req.file) {
        try {
            database.getStudentByUserID(req.user.userID)
                .then((user) => {
                    if (user.resume)
                        fs.unlink(path.join("./public", user.resume), (err) => {
                            if (err)
                                console.log(`Could not delete file: ${err}`);
                        });
                })
            contact['resumeFile'] = req.file.filename;
        } catch (e) {
            fs.unlink(req.file.path, (err) => {
                if (err)
                    console.log(`Could not delete file: ${err}`);
            });
        }
    }

    if (Object.keys(contact).length === 0) {
        return res.redirect("/profile");
    }

    database.pool.query(`
        UPDATE Student
        SET ?
        WHERE netID IN (
            SELECT D.netID
            FROM user U, UTD D
            WHERE D.userID = U.userID AND U.userID = ?
        )
    `, [contact, req.user.userID]).then(() => {
        // Send the browser to the user's own page to view new preferences
        res.redirect("/profile");
    });
});

app.post("/upload-avatar", auth.isAuthenticated, upload.single("avatar"), (req, res) => {
    if (!req.file)
        res.status(httpStatus.BAD_REQUEST).send("Must upload a new avatar");

    try {
        database.getStudentByUserID(req.user.userID)
            .then((user) => {
                if (user.avatar && user.avatar !== "/images/profile.png")
                    fs.unlink(path.join("./public", user.avatar), (err) => {
                        if (err)
                            console.log(`Could not delete file: ${err}`);
                    });
            })
    } catch (e) {
        fs.unlink(req.file.path, (err) => {
            if (err)
                console.log(`Could not delete file: ${err}`);
        });
    }

    database.pool.query(`
        UPDATE Student
        SET ?
        WHERE netID IN (
            SELECT D.netID
            FROM user U, UTD D
            WHERE D.userID = U.userID AND U.userID = ?
        )
    `, [{ avatar: req.file.filename }, req.user.userID]).then(() => {
        // Send the browser to the user's own page to view new preferences
        res.redirect("/profile");
    });
})

app.post("/submitPreferences", auth.isAuthenticated, urlencodedParser, (req, res) => {
    const result = schemas.preferences.validate(req.body);
    if (result.error)
        return res.status(httpStatus.BAD_REQUEST).send(result.error.details[0].message);

    // Ensure no preferences are repeated
    const prefs = Object.values(result.value);
    prefs.sort();
    for (var i = 1; i < prefs.length; i++) {
        if (prefs[i - 1] === prefs[i])
            return res.status(httpStatus.BAD_REQUEST).send("Preferences must be different projects");
    }

    database.pool.query(`
        SELECT projectID
        FROM Project;
    `).then(([projects]) => {
        projectIDs = projects.map(Object.values).flat();

        for (var pref of prefs) {
            if (projectIDs.indexOf(pref) === -1)
                return res.status(httpStatus.BAD_REQUEST).send(`Project ID ${pref} does not exist`);
        }

        database.getNetID(req.user.userID).then((netID) => {
            const preferences = Object.entries(result.value).map(([field, projectID]) => {
                return [
                    netID,
                    projectID,
                    parseInt(field.charAt(field.length - 1)),
                ];
            });
            database.pool.query(`
                DELETE FROM StudentPreferences
                WHERE netID = ?`, [netID])
                .then(() => {
                    database.pool.query(`
                INSERT INTO StudentPreferences(netID, projectID, preference_number)
                VALUES ?`, [preferences]).then(() => {
                        // Send the browser to the user's own page to view new preferences
                        res.redirect("/profile");
                    });
                });
        });
    });
});

app.post("/invite/new", auth.isAuthenticated, urlencodedParser, async (req, res) => {
    const {value, error} = schemas.invite.validate(req.body);
    if (error)
        return res.status(httpStatus.BAD_REQUEST).send(error.details[0].message);

    if (value.target === "user") {
        const ourNetID = await database.getNetID(req.user.userID);
        const otherNetID = await database.getNetID(value.id);
        if (!otherNetID)
            return res.status(httpStatus.BAD_REQUEST).message("Invalid student ID");

        const ourTeam = (await database.getStudentByNetID(ourNetID)).team;
        const theirTeam = (await database.getStudentByNetID(otherNetID)).team;
        if (ourTeam === theirTeam)
            return res.status(httpStatus.BAD_REQUEST).send("You and that user are on the same team");

        const [[existingInvites], [reverseInvites]] = await Promise.all([
            database.pool.query(`
                SELECT *
                FROM PendingInvites
                WHERE sender = ? AND receiver = ?`, [ourNetID, otherNetID]),
            database.pool.query(`
                SELECT *
                FROM PendingInvites
                WHERE receiver = ? AND sender = ?`, [ourNetID, otherNetID]),
        ]);
        if (reverseInvites && reverseInvites.length)
            return res.status(httpStatus.BAD_REQUEST).send("That user has already invited you. Accept their invitation from the Invites page.");
        if (existingInvites && existingInvites.length)
            return res.status(httpStatus.BAD_REQUEST).send("You have already invited that user");

        await Promise.all([
            database.pool.query(`
                INSERT INTO PendingInvites (sender, receiver, message)
                VALUES (?, ?, ?)`, [ourNetID, otherNetID, value.message]),
            res.redirect("back"),
        ]);
    } else {
        const ourNetID = await database.getNetID(req.user.userID);
        if ((await database.getStudentByNetID(ourNetID)).team)
            return res.status(httpStatus.BAD_REQUEST).send("Cannot request to join a team: You are already on a team");
        const team = await database.getTeam(value.id);
        if (!team)
            return res.status(httpStatus.BAD_REQUEST).message("Invalid team ID");
        const [[existingInvites], [reverseInvites]] = await Promise.all([
            database.pool.query(`
                SELECT *
                FROM PendingInvites P, Student S, Student T
                WHERE P.sender = S.netID AND T.teamID = ? AND P.receiver = T.netID
            `, [team.id]),
            database.pool.query(`
                SELECT *
                FROM PendingInvites P, Student S, Student T
                WHERE P.sender = T.netID AND T.teamID = ? AND P.receiver = S.netID
            `, [team.id]),
        ]);
        if (reverseInvites && reverseInvites.length)
            return res.status(httpStatus.BAD_REQUEST).send("Someone from that team has already invited you. Accept their invitation from the Invites page.");
        if (existingInvites && existingInvites.length)
            return res.status(httpStatus.BAD_REQUEST).send("You have already invited someone from that team");

        const [result] = await database.pool.query(`
            SELECT S.netID
            FROM student S
            WHERE S.teamID = ?`, [team.id]);
        await Promise.all([
            database.pool.query(`
                INSERT INTO PendingInvites (sender, receiver, message)
                VALUES (?, ?, ?)`, [ourNetID, result[0].netID, value.message]),
            res.redirect("back"),
        ]);
    }
})

app.post("/invites/:index/respond", auth.isAuthenticated, urlencodedParser, async (req, res) => {
    const result = schemas.inviteResponse.validate(req.body);
    if (result.error)
        return res.status(httpStatus.BAD_REQUEST).send(result.error.details[0].message);

    const invites = await database.getInvites(req.user.userID)
    const invite = invites[req.params.index]
    const netID = await database.getNetID(req.user.userID);
    const senderNetID = invite.senderNetID;

    if (result.value.action === "decline") {
        await database.pool.query(`
            DELETE FROM PendingInvites
            WHERE sender = ? AND receiver = ?`, [senderNetID, invite.receiverNetID]);
        return res.redirect("/invites");
    }

    if (!invite) {
        return res.status(httpStatus.BAD_REQUEST).send(`Invite number ${req.params.index} is invalid`)
    }

    const student = await database.getStudentByNetID(netID);
    const ourTeam = await database.getTeam(student.team);
    var newTeam;

    if (invite.team) {
        // They have team: switch our team
        if (!invite.team.open)
            return res.status(httpStatus.BAD_REQUEST).send(`Team ${invite.team.teamID} is closed`);
        newTeam = invite.team.id;
        await database.pool.query(`
            UPDATE student
            SET teamID = ?
            WHERE netID = ?`, [newTeam, netID]);
    } else if (ourTeam) {
        // They don't have team but we do: switch their team
        if (!ourTeam.open)
            return res.status(httpStatus.BAD_REQUEST).send(`Your team is closed`);
        newTeam = ourTeam.teamID;
        await database.pool.query(`
            UPDATE student
            SET teamID = ?
            WHERE netID = ?`, [newTeam, senderNetID]);
    } else {
        // Neither has team: Add both of us to new team
        const [result] = await database.pool.query(`
            INSERT INTO team ()
            VALUES ()`);
        newTeam = result.insertId;
        await database.pool.query(`
            UPDATE student
            SET teamID = ?
            WHERE netID = ? OR netID = ?`, [newTeam, netID, senderNetID]);
    }

    await Promise.all([
        database.pool.query(`
            DELETE FROM PendingInvites
            WHERE sender = ? AND receiver = ?`, [senderNetID, invite.receiverNetID]),
        database.pool.query(`
            DELETE FROM team
            WHERE teamID NOT IN (
                SELECT teamID
                FROM student
                WHERE teamID IS NOT NULL
            )`),
        // Send the user to their new team's page
        res.redirect(`/team/${newTeam}`),
    ]);
});

app.post("/admin/clear-profile", auth.isAdmin, urlencodedParser, async (req, res) => {
    const result = schemas.clearProfile.validate(req.body);
    if (result.error)
        return res.status(httpStatus.BAD_REQUEST).send(result.error.details[0].message);
    const userID = (await database.getUserByEmail(result.value.clearProfile)).userID;
    if (!userID)
        return res.status(httpStatus.BAD_REQUEST).send("That email isn't associated with a user");
    const netID = await database.getNetID(userID);
    if (!netID)
        return res.status(httpStatus.BAD_REQUEST).send("That user has no profile");
    await Promise.all([
        database.pool.query(`
            UPDATE Student
            SET ?
            WHERE netID = ?`, [
            {
                resumeFile: null,
                phoneNumber: null,
                email: null,
                discord: null,
                groupme: null,
                instagram: null,
                avatar: null,
            },
            netID,
        ]
        ),
        res.redirect("/adminClearProfile"),
    ]);
})

//Currently when giving someone user access Faculty privileges may need to be reworked since it involves using netID.
//Maybe some kind of check box for UTD to make a student?
app.post("/admin/adminAccess", auth.isAdmin, urlencodedParser, async (req, res) => {
    const { firstNameInput, middleNameInput, lastNameInput, emailInput, adminPriv } = req.body;
    const adminBool = adminPriv ? 1 : 0;
    console.log(adminPriv)
    console.log(adminBool)

    const result = schemas.addUser.validate(req.body);
    console.log(result);
    if (result.error)
        return res.status(httpStatus.BAD_REQUEST).send(result.error.details[0].message);
    await database.pool.query(`
        INSERT INTO user (firstName, middleName, lastName, email, admin) VALUES
        (?,?,?,?,?)`, [firstNameInput, middleNameInput, lastNameInput, emailInput, adminBool]);

    res.redirect("/adminAccess");
});


const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Listening on port ${port}`));
