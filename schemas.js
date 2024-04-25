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

const invite = Joi.object({
    target: Joi.string()
        .valid("user", "team")
        .required(),
    id: Joi.number()
        .integer()
        .required(),
    message: Joi.string()
        .max(255)
        .min(1)
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
    clearProfile: Joi.string()
        .email()
        .required(),
})

const addUser = Joi.object({
    firstNameInput: Joi.string().required(),
    middleNameInput: Joi.string().optional().empty(''),
    lastNameInput: Joi.string().required(),
    emailInput: Joi.string().email().required(),
    netIdInput: Joi.string().regex(/[A-Z]{3}[0-9]{5}/).empty(''),
    adminPriv: Joi.string().valid('on', 'off')
})

const skillChange = Joi.object({
    action: Joi.string()
        .valid("add", "remove")
        .required(),
    skill: Joi.string()
        .max(20)
        .required(),
});

const adminAddTeamMember = Joi.object({
    newMember: Joi.number()
        .required(),
    team: Joi.number()
        .required(),
});

const adminRemoveTeamMember = Joi.object({
    user: Joi.number().required(),
});

const adminDisbandTeam = Joi.object({
    team: Joi.number().required(),
});

const adminSetProject = Joi.object({
    assignProject: Joi.number()
        .required(),
    team: Joi.number()
        .required(),
})

const adminAddProject = Joi.object({
    projectName: Joi.string()
        .required()
        .max(50),

    newSponsor: Joi.string()
        .required()
        .max(255),

        newSkills: Joi.array()
        .items(Joi.string()) 
        .required(),

    newSize: Joi.number()
        .required()
        .min(4)
        .max(6),

    newMaxSize: Joi.number()
        .required()
        .min(1)
        .max(15),

    newDescription: Joi.string()
        .required()
        .max(500),
});

const adminEditProject = Joi.object({
    editProjectID: Joi.number()
        .required(),

    editProjectName: Joi.string()
        .required()
        .max(50),

    editSponsor: Joi.string()
        .required()
        .max(255),

    editMaxSize: Joi.string()
        .required()
        .min(4)
        .max(6),

    editDescription: Joi.string()
        .required()
        .max(500),
});

const adminDeleteProject = Joi.object({
    removeProjectID: Joi.number()
        .required(),
});

const adminCommitTeams = Joi.object({
    teams: Joi.array()
        .items(Joi.object({
            id: Joi.number()
                .optional()
                .empty(""),
            newMemberIDs: Joi.array()
                .items(Joi.number())
                .required(),
        }))
        .required(),
});

module.exports.preferences = preferences;
module.exports.invite = invite;
module.exports.inviteResponse = inviteResponse;
module.exports.resumeContact = resumeContact;
module.exports.clearProfile = clearProfile;
module.exports.addUser = addUser;
module.exports.skillChange = skillChange;
module.exports.adminAddTeamMember = adminAddTeamMember;
module.exports.adminRemoveTeamMember = adminRemoveTeamMember;
module.exports.adminDisbandTeam = adminDisbandTeam;
module.exports.adminSetProject = adminSetProject;
module.exports.adminAddProject = adminAddProject;
module.exports.adminEditProject = adminEditProject;
module.exports.adminDeleteProject = adminDeleteProject;
module.exports.adminCommitTeams = adminCommitTeams;
