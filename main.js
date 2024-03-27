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

const sessionStore = new MySqlStore({}, database.pool);

const SESSION_MAX_AGE = 1000 * 60 * 60 * 24  // 1 day

app.use(passport.initialize());
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
    createDatabaseTable: true,
    store: sessionStore,
    cookie: {
        maxAge: SESSION_MAX_AGE,
    },
}));
app.use(passport.session());

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

app.get("/users", auth.isAuthenticated, (req, res) => {
    res.render("allUsersList.ejs");
})

app.get("/user", auth.isAuthenticated, (req, res) => {
    res.render("user.ejs", dummyData.user);
})

app.get("/profile", auth.isAuthenticated, (req, res) => {
    res.render("profile.ejs", dummyData.user);
})

app.get("/resumeContact", auth.isAuthenticated, (req, res) => {
    res.render("resumeContactForm.ejs");
})

app.get("/submitPreferences", auth.isAuthenticated, (req, res) => {
    res.render("submitPreferences.ejs");
})

app.get("/teams", auth.isAuthenticated, (req, res) => {
    res.render("team-list.ejs", dummyData.teamList);
})

app.get("/projects", auth.isAuthenticated, (req, res) => {
    res.render("project-list.ejs");
})

app.get("/invites", auth.isAuthenticated, (req, res) => {
    res.render("invite-inbox.ejs", dummyData.invites);
})

app.get("/adminHomepage", auth.isAdmin, (req, res) => {
    res.render("adminHomePage.ejs");
})

app.get("/adminClearProfile", auth.isAdmin, (req, res) => {
    res.render("adminClearProfile.ejs");
})

app.post("/login", urlencodedParser, passport.authenticate("local", { successRedirect: '/'}));

app.post("/register", urlencodedParser, (req, res) => {

    database.getUserByEmail(req.body.email).then((user) => {
        if (!user)
            return res.status(httpStatus.UNAUTHORIZED).send("That email is not associated with an assigned user.");

        database.getLoginByEmail(req.body.email).then(login => {
            if (login)
                return res.status(httpStatus.BAD_REQUEST).send("That user is already registered.");

            const {salt, hash} = password.genPassword(req.body.password);
            database.addLogin(user.userID, hash, salt);
            res.redirect("/login");
        });
    }).catch((err) => {
        console.log(err);
        res.status(httpStatus.BAD_REQUEST).send(err);
    });
});

//resumeContactInfo
//not sure how to get res.redirect to work properly
app.post('/api/profile', urlencodedParser, (req, res) => {
    // Extract form data from the request body

    const result = schemas.resumeContact.validate(req.body);
    if (result.error)
        return res.status(httpStatus.BAD_REQUEST).send(result.error.details[0].message);

    const {
        resumeUploadButton,
        contactByEmail,
        contactByPhone,
        contactByDiscord,
        contactByGroupme,
        contactByInstagram
    } = Object.fromEntries(
        Object.entries(result.value).filter(([_, val]) => val)
    );

    // TODO: Update data storage for preferences

    // Send the browser to the user's own page to view new preferences
    // TODO: Update this URL when that gets set up
    console.log(req.body);
    res.redirect("/user");
});

app.post("/submitPreferences", auth.isAuthenticated, urlencodedParser, (req, res) => {
    console.log("Submit preferences request:", req.body);
    // TODO: Authenticate and determine user to update

    const result = schemas.preferences.validate(req.body);
    if (result.error)
        return res.status(httpStatus.BAD_REQUEST).send(result.error.details[0].message);

    // Ensure no preferences are repeated among external and CS projects
    const prefs = Object.values(result.value);
    prefs.sort();
    for (var i = 1; i < prefs.length; i++) {
        if (prefs[i - 1] === prefs[i])
            return res.status(httpStatus.BAD_REQUEST).send("Preferences must be different projects");
    }

    // TODO: Update data storage for preferences

    // Send the browser to the user's own page to view new preferences
    // TODO: Update this URL when that gets set up
    res.redirect("/user");
});

app.post("/invites/:teamid/respond", auth.isAuthenticated, urlencodedParser, (req, res) => {
    console.log("Invite response request:", req.params.teamid, req.body);
    // TODO: Authenticate and determine user to update

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
