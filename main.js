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
    const externalPrefs = [];
    const csPrefs = [];
    Object.entries(result.value).forEach(([key, val]) => {
        if (!key.startsWith("preference"))
            return;
        prefNo = parseInt(key.substring("preference".length))
        if (prefNo <= 5)
            externalPrefs.push(val);
        else
            csPrefs.push(val);
    });
    function validateNonRepetition(arr) {
        arr.sort();
        for (var i = 1; i < arr.length; i++) {
            if (arr[i - 1] === arr[i])
                return false;
        }
        return true;
    }
    if (!validateNonRepetition(externalPrefs) || !validateNonRepetition(csPrefs)) {
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
