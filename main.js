const bodyParser = require('body-parser');
const express = require("express");

const schemas = require("./schemas");

const app = express();
const urlencodedParser = bodyParser.urlencoded({ extended: false });

app.use(express.static("public"));

app.post("/submitPreferences", urlencodedParser, (req, res) => {
    console.log("Submit preferences request:", req.body);
    // TODO: Authenticate and determine user to update

    const result = schemas.preferences.validate(req.body);
    if (result.error)
        return res.status(400).send(result.error.details[0].message);

    // Ensure no preferences are repeated among external and CS projects
    const prefs = Object.values(result.value);
    prefs.sort();
    for (var i = 1; i < prefs.length; i++) {
        if (prefs[i - 1] === prefs[i])
            return res.status(400).send("Preferences must be different projects");
    }

    // TODO: Update data storage for preferences

    // Send the browser to the user's own page to view new preferences
    // TODO: Update this URL when that gets set up
    res.redirect("/user.html");
});

app.post("/invites/:teamid/respond", urlencodedParser, (req, res) => {
    console.log("Invite response request:", req.body);
    // TODO: Authenticate and determine user to update

    const result = schemas.inviteResponse.validate(req.body);
    if (result.error)
        return res.status(400).send(result.error.details[0].message);

    // TODO: Ensure user is not on a team if accepting
    // TODO: Apply team change

    // Send the user to their new team's page
    // TODO: Update this URL when that gets set up
    res.redirect("/team.html");
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Listening on port ${port}`));
