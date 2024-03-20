const Joi = require('joi');

const preferences = Joi.object({
    //netid: Joi.string()
    //    .regex(/^[a-z]{3}[0-9]{5}/)
    //    .required(),

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
});

const inviteResponse = Joi.object({
    //netid: Joi.string()
    //    .regex(/^[a-z]{3}[0-9]{5}/)
    //    .required(),

    action: Joi.string()
        .valid("accept", "decline")
        .required(),
});

module.exports = {
    preferences: preferences,
    inviteResponse: inviteResponse,
}
