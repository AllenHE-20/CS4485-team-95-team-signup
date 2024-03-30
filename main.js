const bodyParser = require('body-parser');
const dotenv = require('dotenv');
const express = require("express");
const session = require("express-session");
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

const SESSION_MAX_AGE = 1000 * 60 * 60 * 24  // 1 day

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

app.get("/teamTest", (req, res) => {
    res.render("teamPage.ejs", dummyData.teams[1]);
})

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
    res.render("submitPreferences.ejs");
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

app.get("/projects", auth.isAuthenticated, (req, res) => {
    res.render("project-list.ejs", dummyData.teamList);
})

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
app.post('/api/profile', auth.isAuthenticated, urlencodedParser, (req, res) => {
    // Extract form data from the request body

    const result = schemas.resumeContact.validate(req.body);
    if (result.error)
        return res.status(httpStatus.BAD_REQUEST).send(result.error.details[0].message);

    const contact = Object.fromEntries(
        Object.entries(result.value)
            .filter(([_, val]) => val)
            .map(([key, val]) => {
                if (key === "resumeUploadButton")
                    return [key, null];
                return [key.substring("contactBy".length), val]
            })
    );

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

app.post("/invites/:teamid/respond", auth.isAuthenticated, urlencodedParser, (req, res) => {
    const result = schemas.inviteResponse.validate(req.body);
    if (result.error)
        return res.status(httpStatus.BAD_REQUEST).send(result.error.details[0].message);

    // TODO: Ensure user is not on a team if accepting
    // TODO: Apply team change

    // Send the user to their new team's page
    // TODO: Update this URL when that gets set up
    res.redirect("/team");
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Listening on port ${port}`));
