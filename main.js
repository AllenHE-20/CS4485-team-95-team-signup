const bodyParser = require('body-parser');
const dotenv = require('dotenv');
const express = require("express");
const fs = require("fs");
const mime = require("mime");
const multer = require("multer");
const session = require("express-session");
const path = require("path");
const passport = require("passport");
const xssFilters = require("xss-filters");
const MySqlStore = require("express-mysql-session")(session);

const database = require('./database');
const sendEmail = require('./email');
const schemas = require("./schemas");
const httpStatus = require("./http_status");
//console.debug(httpStatus);
const dummyData = require("./dummy_data");
const password = require("./password");
require("./passport-config")
const auth = require("./authMiddleware");
const { preferences } = require('joi');

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

// Adds some information about the current user
app.use(async (req, res, next) => {
    if (!req.isAuthenticated()) {
        res.locals.user = null;
        return next();
    }

    const user = await database.getUserByID(req.user.userID);
    const student = await database.getStudentByUserID(req.user.userID);
    const team = student ? await database.getTeam(student.team) : null;
    const project = team ? await database.getProject(team.projectID) : null;
    const projectID = project ? project.projectID : null;
    const studentData = student ? {
        // We can add more info if needed
        avatar: student.avatar,
        team: student.team,
        project: projectID,
    } : null;
    res.locals.user = {
        userID: user.userID,
        firstName: user.firstName,
        middleName: user.middleName,
        lastName: user.lastName,
        email: user.email,
        admin: user.admin,
        student: studentData,
    };
    next();
});

app.get("/", (req, res) => {
    if (!req.isAuthenticated())
        return res.render("landing.ejs");

    res.render("index.ejs");
})

app.get("/register/:token", (req, res) => {
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
        database.getAllStudentPreferences().then((preferences) => {


            console.log(list, '\n')
            //console.log('\n', preferences)
            res.render("allUsersList.ejs", { studentlist: list, preferences: preferences });
        })
    });
});

app.get("/users/:userid", auth.isAuthenticated, (req, res) => {
    database.getStudentByUserID(req.params.userid).then((student) => {
        if (!student) {
            return res.status(httpStatus.NOT_FOUND).send("That user doesn't exist or has no profile");
        }
        database.getUsersProject(student.netID).then((project) => {
            if (!project) {
                usersProject = 'Not Assigned'
            } else {
                usersProject = project[0].projectName
            }
            if (student.teamID) {
                usersTeam = ("team " + student.teamID)
            }
            else {
                usersTeam = 'None'
            }
            res.render("profile.ejs", { student: student, curr: req.user.userID, proj: usersProject, usersTeam: usersTeam });
        })
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

app.get("/submitTeamPreferences", auth.isAuthenticated, async (req, res) => {
    const student = await database.getStudentByUserID(req.user.userID);
    const team = await database.getTeam(student.team)
    if (!team)
        return res.status(httpStatus.UNAUTHORIZED).message("You are not on a team");
    const projects = await database.getAllProjects();
    res.render("submitPreferences.ejs", {
        projects: projects,
        endpoint: "/submitTeamPreferences"
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
            res.render("project-page.ejs", { project: project });
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
    res.render("adminHomepage.ejs");
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
    // HACK: We need user IDs
    const teams = await database.getAllTeams();
    teams.forEach(async (team) => {
        [team.members] = await database.pool.query(`
            SELECT U.userID, U.firstName, U.lastName
            FROM user U, UTD D, student S
            WHERE D.userID = U.userID AND D.netID = S.netID AND S.teamID = ?`, team.id);
    });
    const [teamlessUsers] = await database.pool.query(`
        SELECT U.userID, U.firstName, U.lastName
        FROM user U, UTD D, student S
        WHERE D.userID = U.userID AND D.netID = S.netID AND S.teamID IS NULL`);
    res.render("adminTeams.ejs", {
        teams: teams,
        singleUsers: teamlessUsers.map((user) => {
            return {
                name: `${user.firstName} ${user.lastName}`,
                userID: user.userID,
            };
        }),
        projects: await database.getAllProjects(),
    });
})

app.get("/adminProjects", auth.isAdmin, async (req, res) => {
    res.render("adminProjects.ejs", {
        projects: await database.getAllProjects(),
    });
})

app.get("/adminFormTeam", auth.isAdmin, (req, res) => {
    res.render("adminFormTeam.ejs");
})

app.get("/adminAddProjectTest", auth.isAdmin, (req, res) => {
    res.render("adminAddProject.ejs");
})

app.post("/login", urlencodedParser, passport.authenticate("local", { successRedirect: '/' }));

app.post("/register/:token", urlencodedParser, async (req, res) => {
    const tokenHash = password.hashToken(req.params.token);
    const [users] = await database.pool.query(`
        SELECT U.userID
        FROM user U, login L
        WHERE U.userID = L.userID AND L.oneTimeTokenHash = ?`, [tokenHash]);

    if (users.length === 0) {
        return res.status(httpStatus.BAD_REQUEST).send("Invalid token");
    }

    const user = users[0];
    const { salt, hash } = password.genPassword(req.body.password);
    database.addLogin(user.userID, hash, salt);

    res.redirect("/login");
})

//resumeContactInfo
app.post('/profile', auth.isAuthenticated, upload.single("resumeUploadButton"), (req, res) => {
    const result = schemas.resumeContact.validate(req.body);
    if (result.error)
        return res.status(httpStatus.BAD_REQUEST).send(result.error.details[0].message);

    const contact = Object.fromEntries(
        Object.entries(result.value)
            .map(([key, val]) => {
                const value = xssFilters.inHTMLData(val);
                if (key === "contactByPhone")
                    return ["phoneNumber", value];
                return [key.substring("contactBy".length), value]
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

app.post("/skills/change", auth.isAuthenticated, urlencodedParser, async (req, res) => {
    const { value, error } = schemas.skillChange.validate(req.body);
    if (error)
        return res.status(httpStatus.BAD_REQUEST).send(error.details[0].message);

    const [skills] = await database.pool.query(`
        SELECT skillID
        FROM Skills
        WHERE skillName = ?`, value.skill);
    const netID = await database.getNetID(req.user.userID);

    if (value.action === "add") {
        var skillID;
        if (!skills.length) {
            const [result] = await database.pool.query(`
                INSERT INTO Skills (skillName)
                VALUES (?)`, [xssFilters.inHTMLData(value.skill)]);
            skillID = result.insertId;
        } else {
            skillID = skills[0].skillID;
        }

        try {
            await database.pool.query(`
                INSERT INTO StudentSkillset (netID, skillID)
                VALUES (?, ?)`, [netID, skillID])
        } catch (err) {
            if (err.code === 'ER_DUP_ENTRY')
                console.log("Duplicate skill ignored");
            else
                throw err;
        }
    } else {
        if (!skills.length) {
            console.log("Non-existing skill ignored");
            return res.redirect("/profile");
        }

        const skillID = skills[0].skillID;
        await database.pool.query(`
            DELETE FROM StudentSkillset
            WHERE netID = ? AND skillID = ?`, [netID, skillID]);
    }

    res.redirect("/profile");
});

app.post("/invite/new", auth.isAuthenticated, urlencodedParser, async (req, res) => {
    const { value, error } = schemas.invite.validate(req.body);
    if (error)
        return res.status(httpStatus.BAD_REQUEST).send(error.details[0].message);

    const message = xssFilters.inHTMLData(value.message);

    if (value.target === "user") {
        const ourNetID = await database.getNetID(req.user.userID);
        const otherNetID = await database.getNetID(value.id);
        if (!otherNetID)
            return res.status(httpStatus.BAD_REQUEST).send("Invalid student ID");

        const ourTeam = (await database.getStudentByNetID(ourNetID)).team;
        const theirTeam = (await database.getStudentByNetID(otherNetID)).team;
        if (ourTeam === theirTeam && ourTeam !== null)
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
                VALUES (?, ?, ?)`, [ourNetID, otherNetID, message]),
            res.redirect("back"),
        ]);
    } else {
        const ourNetID = await database.getNetID(req.user.userID);
        if ((await database.getStudentByNetID(ourNetID)).team)
            return res.status(httpStatus.BAD_REQUEST).send("Cannot request to join a team: You are already on a team");
        const team = await database.getTeam(value.id);
        if (!team)
            return res.status(httpStatus.BAD_REQUEST).send("Invalid team ID");
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

app.post("/leave-team", auth.isAuthenticated, async (req, res) => {
    const netID = await database.getNetID(req.user.userID);
    const student = await database.getStudentByNetID(netID);
    if (student.team === null) {
        return res.status(httpStatus.BAD_REQUEST).send("You are not on a team");
    }
    await Promise.all([
        database.pool.query(`
            UPDATE student
            SET teamID = NULL
            WHERE netID = ?`, [netID]),
        database.pool.query(`
            DELETE FROM Team
            WHERE teamID NOT IN (
                SELECT teamID
                FROM student
                WHERE teamID IS NOT NULL
            )`),
        res.redirect(`/teams`),
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
});

app.get("/admin/database-clear", auth.isAdmin, async (req, res) => {
    const [files] = await database.pool.query(`
        SELECT S.resumeFile, S.avatar
        FROM Student S, UTD D, user U
        WHERE U.userID = D.userID AND D.netID = U.netID AND NOT U.admin`);
    files.forEach((resumeFile, avatar) => {
        try {
            fs.unlink(path.join("public/user-files", resumeFile));
        } catch (err) {
            console.error(err);
        }
        try {
            fs.unlink(path.join("public/user-files", avatar));
        } catch (err) {
            console.error(err);
        }
    });
    await database.pool.query(`
        DELETE FROM user
        WHERE NOT admin`);
    await database.pool.query(`
        DELETE FROM Team`);
    await database.pool.query(`
        DELETE FROM Skills`);

    res.redirect("/adminHomepage");
})

//Currently when giving someone user access Faculty privileges may need to be reworked since it involves using netID.
//Maybe some kind of check box for UTD to make a student?
// TODO: Handle faculty checkbutton
app.post("/admin/adminAccess", auth.isAdmin, urlencodedParser, async (req, res) => {
    const result = schemas.addUser.validate(req.body);
    if (result.error)
        return res.status(httpStatus.BAD_REQUEST).send(result.error.details[0].message);

    const { firstNameInput, middleNameInput, lastNameInput, emailInput, netIdInput, facultyPriv, adminPriv } = result.value;
    const firstName = xssFilters.inHTMLData(firstNameInput);
    const middleName = xssFilters.inHTMLData(middleNameInput);
    const lastName = xssFilters.inHTMLData(lastNameInput);
    const adminBool = adminPriv ? 1 : 0;

    const user = await database.getUserByEmail(emailInput);
    if (user)
        return res.status(httpStatus.BAD_REQUEST).send("A user with that email already exists");

    if (adminPriv && !netIdInput)
        return res.status(httpStatus.BAD_REQUEST).send("Faculty or admin must be UTD affiliated");

    const { token, hash } = password.createOneTimePasswordToken();

    const [insert] = await database.pool.query(`
        INSERT INTO user (firstName, middleName, lastName, email, admin) VALUES
        (?,?,?,?,?)`,
        [firstName, middleName, lastName, emailInput, adminBool]);
    const userID = insert.insertId;
    await database.pool.query(`
        INSERT INTO login (userID, oneTimeTokenHash)
        VALUES (?, ?);`, [userID, hash])

    if (netIdInput) {
        await database.pool.query(`
            INSERT INTO UTD (userID, netID)
            VALUES (?, ?);`, [userID, netIdInput]);

        if (!adminPriv) {
            await database.pool.query(`
            INSERT INTO student (netID)
            VALUES (?)`, [netIdInput]);
        }
    }

    const registerUrl = `${req.protocol}://${req.get("host")}/register/${token}`;
    const message = `You have been registered into Team Sign-Up. Please use the below link to set your login information\n\n${registerUrl}`;
    try {
        await sendEmail(emailInput, "Team Sign-Up: New User", message);
    } catch (err) {
        await database.pool.query(`
            DELETE FROM user
            WHERE userID = ?`, userID);
        return res.status(httpStatus.INTERNAL_SERVER_ERROR).send("Unable to send registration email. Please try again later.");
    }

    res.redirect("/adminAccess");
});

// Note: Untested
app.post("/admin/projects/add", auth.isAdmin, urlencodedParser, async (req, res) => {
    const result = schemas.adminAddProject.validate(req.body);
    if (result.error)
        return res.status(httpStatus.BAD_REQUEST).send(result.error.details[0].message);

    const { projectName, newSponsor, newSize, newDescription } = result.value;
    const name = xssFilters.inHTMLData(projectName);
    const sponsor = xssFilters.inHTMLData(newSponsor);
    const description = xssFilters.inHTMLData(newDescription);
    const [insert] = await database.pool.query(`
        INSERT INTO Project (projectName, sponsor, description, teamSize)
        VALUES (?)`, [[name, sponsor, description, newSize]])
    const projectID = insert.insertId;

    // TODO: Skills required

    res.redirect("back");
});

// Note: Untested
app.post("/admin/projects/edit", auth.isAdmin, urlencodedParser, async (req, res) => {
    const result = schemas.adminEditProject.validate(req.body);
    if (result.error)
        return res.status(httpStatus.BAD_REQUEST).send(result.error.details[0].message);

    const { editProjectID, editProjectName, editSponsor, editSize, editDescription } = result.value;
    const name = xssFilters.inHTMLData(editProjectName);
    const sponsor = xssFilters.inHTMLData(editSponsor);
    const description = xssFilters.inHTMLData(editDescription);
    await database.pool.query(`
        UPDATE Project
        SET projectName = ?, sponsor = ?, description = ?, teamSize = ?
        WHERE projectID = ?`,
        [name, sponsor, description, editSize, editProjectID])

    // TODO: Skills required

    res.redirect("back");
});

// Note: Untested
app.post("/admin/projects/delete", auth.isAdmin, urlencodedParser, async (req, res) => {
    const result = schemas.adminDeleteProject.validate(req.body);
    if (result.error)
        return res.status(httpStatus.BAD_REQUEST).send(result.error.details[0].message);

    const { deleteProjectID } = result.value;
    await database.pool.query(`
        DELETE FROM Project
        WHERE projectID = ?`, [deleteProjectID])

    res.redirect("back");
});

app.post("/admin/add-team-member", auth.isAdmin, urlencodedParser, async (req, res) => {
    const result = schemas.adminAddTeamMember.validate(req.body);
    if (result.error)
        return res.status(httpStatus.BAD_REQUEST).send(result.error.details[0].message);

    const { newMember, team } = result.value;
    var netID;
    try {
        netID = await database.getNetID(newMember);
    } catch (err) {
        return res.status(httpStatus.BAD_REQUEST).send(`Invalid user ID: ${newMember}`);
    }
    try {
        await database.pool.query(`
        UPDATE Student
        SET teamID = ?
        WHERE netID = ?`, [team, netID]);
    } catch (err) {
        return res.status(httpStatus.BAD_REQUEST).send(err);
    }
    return res.redirect("/adminTeams");
})

app.post("/admin/drop-from-team", auth.isAdmin, urlencodedParser, async (req, res) => {
    const { value, error } = schemas.adminRemoveTeamMember.validate(req.body);
    if (error)
        return res.status(httpStatus.BAD_REQUEST).send(error.details[0].message);

    const userID = value.user;
    const netID = await database.getNetID(userID);
    const student = await database.getStudentByNetID(netID);
    if (!student || !student.team) {
        return res.status(httpStatus.BAD_REQUEST).send("That user is not on a team");
    }
    await Promise.all([
        database.pool.query(`
            UPDATE student
            SET teamID = NULL
            WHERE netID = ?`, [netID]),
        database.pool.query(`
            DELETE FROM Team
            WHERE teamID NOT IN (
                SELECT teamID
                FROM student
                WHERE teamID IS NOT NULL
            )`),
        res.redirect(`/adminTeams`),
    ]);
});

app.post("/admin/disband-team", auth.isAdmin, urlencodedParser, async (req, res) => {
    const { value, error } = schemas.adminRemoveTeamMember.validate(req.body);
    if (error)
        return res.status(httpStatus.BAD_REQUEST).send(error.details[0].message);

    const teamID = value.team;
    await database.pool.query(`
        DELETE FROM Team
        WHERE teamID = ?`, [teamID]);
    res.redirect("/adminTeams");
});

app.post("/admin/set-project", auth.isAdmin, urlencodedParser, async (req, res) => {
    const result = schemas.adminSetProject.validate(req.body);
    if (result.error)
        return res.status(httpStatus.BAD_REQUEST).send(result.error.details[0].message);

    const { assignProject, team } = result.value;
    try {
        await database.pool.query(`
            UPDATE Team
            SET projectID = ?
            WHERE teamID = ?`, [assignProject, team]);
    } catch (err) {
        return res.status(httpStatus.BAD_REQUEST).send(err)
    }
    return res.redirect("/adminTeams");
});

app.get("/admin/generate-teams", auth.isAdmin, async (req, res) => {
    const { maxTeam } = req.query;
    const maxTeamSize = maxTeam;
    if (isNaN(maxTeamSize)) {
        return res.status(httpStatus.BAD_REQUEST).send("Max team size must be a number");
    }

    const generatedTeamUpdates = await database.matchTeams(maxTeamSize);
    const { newTeams, studentToExistingTeam, leftOverStudents } = generatedTeamUpdates;

    const teamsToMake = newTeams.map(async team => {
        const netIDs = team.map(member => member.netID);
        const members = team.map(async member => {
            const [[user]] = await database.pool.query(`
                SELECT U.userID, U.firstName, U.lastName
                FROM UTD D, user U
                WHERE D.userID = U.userID AND D.netID = ?`, [member.netID]);
            return user;
        });
        const skills = (await database.pool.query(`
            SELECT DISTINCT Sk.skillName
            FROM StudentSkillset SS, Skills Sk
            WHERE SS.skillID = Sk.skillID AND SS.netID IN (?)`,
            [netIDs],
        ))[0].map(skill => skill.skillName);
        // Give each preferred project a 1-5 score opposite the preference
        // number (projects not in preferences still worth 0), and sum those
        // scores to find the most well-liked projects in the team
        const preferences = (await database.pool.query(`
            SELECT SUM(6 - SP.preference_number) AS totalPreference, SP.projectID, P.projectName
            FROM StudentPreferences SP, Project P
            WHERE SP.netID in (?) AND SP.projectID = P.projectID
            GROUP BY SP.projectID
            ORDER BY totalPreference`,
            [netIDs])
        )[0].toReversed()
            .map((project) => project.projectName /*{ return {id: projectID, name: projectName}; }*/)
            .filter((_val, i, _arr) => i < 5);
        return {
            teamID: null,  // New team
            currentMemberNames: [],
            newMemberNames: (await Promise.all(members)).map(member => `${member.firstName} ${member.lastName}`),
            newMemberIDs: (await Promise.all(members)).map(member => member.userID),
            projectPreferences: preferences,
            currentSkills: [],
            newSkills: skills,
        };
    });

    const teamsToUpdate = {};
    const teamIDs = studentToExistingTeam.map(({ teamID }) => teamID)
        .toSorted()
        .filter((val, i, arr) => val != arr[i - 1]);
    for (var teamID of teamIDs) {
        const team = await database.getTeam(teamID);
        team.newMemberIDs = [],
            team.newMemberNetIDs = [],
            team.newMemberNames = [],
            team.newSkills = [],
            teamsToUpdate[teamID] = team;
    }
    for (var { student, teamID } of studentToExistingTeam) {
        const team = teamsToUpdate[teamID];
        const [[user]] = await database.pool.query(`
            SELECT U.userID, U.firstName, U.lastName
            FROM UTD D, user U
            WHERE D.userID = U.userID AND D.netID = ?`, [student.netID]);
        team.newMemberIDs.push(user.userID);
        team.newMemberNetIDs.push(student.netID);
        team.newMemberNames.push(`${user.firstName} ${user.lastName}`);
    }
    for (var team of Object.values(teamsToUpdate)) {
        const [skills] = await database.pool.query(`
            SELECT DISTINCT Sk.skillName
            FROM StudentSkillset SS, Skills Sk, Student St
            WHERE SS.skillID = Sk.skillID AND SS.netID = St.netID AND (St.teamID = ? OR St.netID IN (?))
            EXCEPT
            SELECT Sk.skillName
            FROM StudentSkillset SS, Skills Sk, Student St
            WHERE SS.skillID = Sk.skillID AND SS.netID = St.netID AND St.teamID = ?`,
            [team.id, team.newMemberNetIDs, team.id],
        );
        team.newSkills = skills.map(skill => skill.skillName);
    }

    const updatedTeams = Object.values(teamsToUpdate)
        .map((team) => {
            return {
                teamID: team.id,
                currentMemberNames: team.members,
                newMemberNames: team.newMemberNames,
                newMemberIDs: team.newMemberIDs,
                projectPreferences: team.interests,
                currentSkills: team.skills,
                newSkills: team.newSkills,
            };
        });

    const unsortedStudents = leftOverStudents.map(async (student) => {
        const [[user]] = await database.pool.query(`
            SELECT U.userID, U.firstName, U.lastName
            FROM UTD D, user U
            WHERE D.userID = U.userID AND D.netID = ?`, [student.netID]);
        const [skills] = await database.pool.query(`
            SELECT Sk.skillName
            FROM StudentSkillset SS, Skills Sk
            WHERE SS.skillID = Sk.skillID AND SS.netID = ?`, [student.netID]);
        const [preferences] = await database.pool.query(`
            SELECT P.projectName
            FROM Project P, StudentPreferences W
            WHERE W.netID = ? AND P.projectID = W.projectID
            ORDER BY W.preference_number`, [student.netID]);
        return {
            userID: user.userID,
            name: `${user.firstName} ${user.lastName}`,
            skills: skills.map((skill) => skill.skillName),
            preferences: preferences.map((pref) => (pref.projectName)),
        };
    });

    const arrangement = {
        teams: await Promise.all([...teamsToMake, ...updatedTeams]),
        unsortedUsers: await (Promise.all(unsortedStudents)),
    };

    res.render("adminGenTeam.ejs", {
        teams: arrangement.teams,
        unsortedUsers: arrangement.unsortedUsers
    });
});

//remove later - testing page
app.get("/adminTest", auth.isAdmin, (req, res) => {
    res.render("adminGenTeam.ejs", {
        teams: dummyData.adminTeam
    });
})

// Note: untested until team generation result endpoint is created
app.post("/admin/save-teams", auth.isAdmin, bodyParser.urlencoded({ extended: true }), async (req, res) => {
    const { value, error } = schemas.adminCommitTeams.validate(req.body);
    if (error)
        return res.status(httpStatus.BAD_REQUEST).send(error.details[0].message);

    const { teams } = value;
    for (const team of teams) {
        const [netIDs] = await database.pool.query(`
            SELECT D.netID
            FROM user U, UTD D, student S
            WHERE U.userID = D.userID AND S.netID = D.netID AND U.userID IN (?)`, [team.newMemberIDs]);

        if (!netIDs.length) {
            console.warn(`Empty team: ${team}`);
            continue;
        }

        if (team.id === null) {
            const [result] = await database.pool.query(`
                INSERT INTO Team ()
                VALUES ()`);
            team.id = result.insertId;
            team.new = true;
        } else {
            team.new = false;
        }

        await database.pool.query(`
            UPDATE student
            SET teamID = ?
            WHERE netID IN (?)`, [netIDs.map((o) => o.netID)]);

        if (team.new) {
            // Give each preferred project a 1-5 score opposite the preference
            // number (projects not in preferences still worth 0), and sum those
            // scores to find the most well-liked projects in the team
            const preferences = (await database.pool.query(`
                SELECT SUM(6 - SP.preference_number) AS totalPreference, SP.projectID, P.projectName
                FROM StudentPreferences SP, Project P, student S
                WHERE SP.netID = S.netID AND SP.projectID = P.projectID AND S.teamID = ?
                GROUP BY SP.projectID
                ORDER BY totalPreference`,
                [team.id])
            )[0].toReversed()
                .map((project) => project.projectID)
                .filter((_val, i, _arr) => i < 5);
            await database.pool.query(`
                INSERT INTO ProjectPreferences (teamID, projectID, preference_number)
                VALUES ?`, preferences.map((pref, i) => [team.id, pref, i + 1]));
        }
    }

    res.redirect("back");
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Listening on port ${port}`));
