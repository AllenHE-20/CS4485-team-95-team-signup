const bodyParser = require('body-parser');
const express = require("express");
const Joi = require('joi');

const app = express();
const urlencodedParser = bodyParser.urlencoded({ extended: false });

app.use(express.static("public"));

const preferencesSchema = Joi.object({
    //netid: Joi.string()
    //    .regex(/^[a-z]{3}[0-9]{5}/),

    preference1: Joi.number()
        .integer()
        .required(),
    preference2: Joi.number()
        .integer()
        .required(),
    preference3: Joi.number()
        .integer()
        .required(),
    preference4: Joi.number()
        .integer()
        .required(),
    preference5: Joi.number()
        .integer()
        .required(),
    preference6: Joi.number()
        .integer()
        .required(),
    preference7: Joi.number()
        .integer()
        .required(),
    preference8: Joi.number()
        .integer()
        .required(),
    preference9: Joi.number()
        .integer()
        .required(),
    preference10: Joi.number()
        .integer()
        .required(),
});

app.post("/submitPreferences/", urlencodedParser, (req, res) => {
    console.log("Submit preferences request:", req.body);
    // TODO: Authenticate and determine user to update

    const result = preferencesSchema.validate(req.body);
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

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Listening on port ${port}`));
