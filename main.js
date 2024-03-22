const bodyParser = require('body-parser');
const express = require("express");

const schemas = require("./schemas");
const httpStatus = require("./http_status");
// console.debug(httpStatus);
const dummyData = require("./dummy_data");

const app = express();
const urlencodedParser = bodyParser.urlencoded({ extended: false });

app.use(express.static("public"));
app.set("view engine", "ejs");

app.get("/", (req, res) => {
    res.render("index.ejs");
})

app.get("/landing", (req, res) => {
    res.render("landing.ejs");
})

app.get("/users", (req, res) => {
    res.render("allUsersList.ejs");
})

app.get("/user", (req, res) => {
    res.render("user.ejs");
})

app.get("/profile", (req, res) => {
    res.render("profile.ejs");
})

app.get("/resumeContact", (req, res) => {
    res.render("resumeContactForm.ejs");
})

app.get("/submitPreferences", (req, res) => {
    res.render("submitPreferences.ejs");
})

app.get("/teams", (req, res) => {
    res.render("team-list.ejs", dummyData.TEAM_LIST);
})

app.get("/invites", (req, res) => {
    res.render("invite-inbox.ejs", dummyData.INVITES);
})

app.get("/adminHomepage", (req, res) => {
    res.render("adminHomePage.ejs");
})

app.get("/adminClearProfile", (req, res) => {
    res.render("adminClearProfile.ejs");
})

app.post("/submitPreferences", urlencodedParser, (req, res) => {
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

app.post("/invites/:teamid/respond", urlencodedParser, (req, res) => {
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
