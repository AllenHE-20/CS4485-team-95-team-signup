const Joi = require('joi');

const preferences = Joi.object({
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
    action: Joi.string()
        .valid("accept", "decline")
        .required(),
});

const resumeContact = Joi.object({
    resumeUploadButton: Joi.any()
        .allow("")
        .optional(),
    contactByEmail: Joi.string()
        .email()
        .allow("")
        .optional(),
    contactByPhone: Joi.string()
        .allow("")
        .optional(),
    contactByDiscord: Joi.string()
        .allow("")
        .optional(),
    contactByGroupme: Joi.string()
        .allow("")
        .optional(),
    contactByInstagram: Joi.string()
        .allow("")
        .optional(),
})

const clearProfile = Joi.object({
    netidInput: Joi.string()
        .regex(/[a-zA-Z]{3}[0-9]{5,6}/)
        .required(),
})

module.exports.preferences = preferences;
module.exports.inviteResponse = inviteResponse;
module.exports.resumeContact = resumeContact;
module.exports.clearProfile = clearProfile;
