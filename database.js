const mysql = require('mysql2');
const dotenv = require('dotenv');
const path = require("path");
dotenv.config();

const pool = mysql.createPool({
    host: process.env.MYSQL_HOST,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE
}).promise();

/* Various basic function examples.
async function getUsers() {
    const [rows] = await pool.query("SELECT * FROM user");
    return rows;
}

async function getUser(id) {
    const [rows] = await pool.query(`SELECT * FROM user WHERE userID = ?`, [id]);
    return rows[0];
}
*/

async function getUserByID(userID) {
    const [users] = await pool.query(`
        SELECT userID, firstName, middleName, lastName, email, admin
        FROM user
        WHERE userID = ?`, [userID]);
    return users[0];
}

async function getAllStudentPreferences() {
    const [preferences] = await pool.query(`
        SELECT SP.*, P.projectName
        FROM StudentPreferences SP
        INNER JOIN Project P ON SP.projectID = P.projectID
        ORDER BY SP.preference_number;`);

    return preferences;
}

async function allStudents() {
    const [rows] = await pool.query(`
        SELECT u.firstName, u.lastName, u.userID, s.avatar, s.netID FROM user u JOIN UTD on u.userID = UTD.userID
        JOIN student s on UTD.netID = s.netID;`);

    const [skills] = await pool.query(`
    SELECT SS.netID, S.skillName
    FROM StudentSkillset SS
    INNER JOIN Skills S ON SS.skillID = S.skillID;
    `);
    const skillsForStudent = [];
    skills.forEach((skill) => {
        if (!skillsForStudent[skill.netID]) {
            skillsForStudent[skill.netID] = [skill.skillName];
        }
        else {
            skillsForStudent[skill.netID].push(skill.skillName);
        }
    });

    rows.forEach((rows, i) => {
        if (skillsForStudent[i] = rows.netID) {
            rows.skills = skillsForStudent[rows.netID] || [];
        }
    })

    console.log(rows.avatar, '\n')

    return rows;
}

async function getUserByEmail(email) {
    const [rows] = await pool.query(`
        SELECT * FROM
        user U
        WHERE U.email = ?`, [email]);
    return rows[0];
}

async function addLogin(userID, hash, salt) {
    const result = await pool.query(`
        INSERT INTO login(userID, passwordHash, passwordSalt)
        VALUES (?, ?, ?)`, [userID, hash, salt]);
    return result;
}

async function getLoginByEmail(email) {
    const [rows] = await pool.query(`
        SELECT *
        FROM user U, login L
        WHERE U.email = ? AND U.userID = L.userID`, [email]);
    return rows[0];
}

async function createUser(firstName, middleName, lastName) {
    const result = await pool.query(`
    INSERT INTO user(firstName, middleName, lastName)
    VALUES (?, ?, ?)`, [firstName, middleName, lastName]);
    return result;
}

async function getNetID(userID) {
    const [netIDs] = await pool.query(`
        SELECT D.netID
        FROM user U, UTD D
        WHERE U.userID = ? AND D.userID = U.userID`, [userID]);
    if (netIDs && netIDs.length) {
        return netIDs[0].netID;
    } else {
        return null;
    }
}

//only gets projectID but this could later be modified to grab more if needed.
async function getUsersProject(netID) {
    const [project] = await pool.query(`
    SELECT P.projectID, P.projectName
    FROM Project P
    INNER JOIN Team T ON P.projectID = T.projectID
    INNER JOIN student S ON T.teamID = S.teamID
    WHERE S.netID = ?
    `, [netID]);
    if (project.length > 0) {
        return project;
    }
    else {
        return null;
    }
}

async function getStudentByUserID(userID) {
    return await getStudentByNetID(await getNetID(userID));
}

async function getStudentByNetID(netid) {
    if (!netid)
        return null;

    const [users] = await pool.query(`
        SELECT *
        FROM student S, UTD D, user U
        WHERE S.netID = ? AND S.netID = D.netID AND D.userID = U.userID`, [netid]);
    const dbUser = users[0];
    if (!dbUser) {
        return null;
    }

    const [skills] = await pool.query(`
        SELECT S.skillName
        FROM Skills S, StudentSkillset A
        WHERE A.netID = ? AND S.skillID = A.skillID`, [dbUser.netID]);
    const [preferences] = await pool.query(`
        SELECT P.projectName
        FROM Project P, StudentPreferences W
        WHERE W.netID = ? AND P.projectID = W.projectID
        ORDER BY W.preference_number`, [dbUser.netID]);
    const user = {
        userID: dbUser.userID,
        name: `${dbUser.firstName} ${dbUser.lastName}`,
        avatar: dbUser.avatar ? `/user-files/${dbUser.avatar}` : "/images/profile.png",
        resume: dbUser.resumeFile ? `/user-files/${dbUser.resumeFile}` : null,
        email: dbUser.email,
        phone: dbUser.phoneNumber,
        discord: dbUser.discord,
        groupme: dbUser.groupme,
        instagram: dbUser.instagram,
        team: dbUser.teamID,
        interests: preferences.map(({ projectName }) => projectName),
        skills: skills.map(({ skillName }) => skillName),
    }
    return user;
}

async function teamsPerProject(pID) {
    const amt = await pool.query(`
        SELECT COUNT(*) FROM Team WHERE projectID = ?`, [pID]);
    return amt[0][0]['COUNT(*)'];
}

async function getAllProjects() {
    const [projects] = await pool.query(`
        SELECT P.projectID, P.projectname, P.description, P.teamSize, P.maxTeams, P.avatar, P.sponsor, O.affiliation
        FROM Project P, organizer O 
        WHERE O.userID = P.userID;
    `);
    const [skills] = await pool.query(`
        SELECT PS.projectID, S.skillName
        FROM ProjectSkillset PS
        INNER JOIN Skills S ON PS.skillID = S.skillID;
    `);
    const skillsByProject = {};
    skills.forEach((skill) => {
        if (!skillsByProject[skill.projectID]) {
            skillsByProject[skill.projectID] = [];
        }
        skillsByProject[skill.projectID].push(skill.skillName);
    });

    const teamWait = projects.map(project => teamsPerProject(project.projectID));
    const teamCounts = await Promise.all(teamWait);

    projects.forEach((project, i) => {
        if (skillsByProject[project.projectID]) {
            project.skills = skillsByProject[project.projectID];
        } else {
            project.skills = [];
        }

        const teamAmt = teamCounts[i];
        project.team_assigned = project.maxTeams <= teamAmt;
    });

    return projects;
}

async function getProject(projID) {
    const [projects] = await pool.query(`
        SELECT P.projectID, P.projectname, P.description, P.teamSize, P.maxTeams, P.avatar, O.affiliation
        FROM Project P, organizer O
        WHERE O.userID = P.userID AND P.projectID = ?;`, [projID]);
    const project = projects[0];
    if (!project) {
        return null;
    }

    const [skills] = await pool.query(`
        SELECT PS.projectID, S.skillName
        FROM ProjectSkillset PS
        INNER JOIN Skills S ON PS.skillID = S.skillID
        WHERE PS.projectID = ?;`, [projID]);

    const [files] = await pool.query(`
        SELECT PF.filename
        FROM ProjectFiles PF
        WHERE PF.projectID = ?`, [projID]);

    const teamCount = await teamsPerProject(projID);
    const result = {
        projectID: project.projectID,
        projectname: project.projectname,
        description: project.description,
        teamSize: project.teamSize,
        maxTeams: project.maxTeams,
        avatar: project.avatar,
        affiliation: project.affiliation,
        skills: skills.map(skill => skill.skillName),
        team_assigned: project.maxTeams <= teamCount,
        files: files,
    }
    return result;
}

async function getAllSponsors() {
    const [sponsors] = await pool.query(`
        SELECT *
        FROM organizer O
    `);

    return sponsors;
}

async function getAllTeams() {
    const [usersByTeam] = await pool.query(`
        SELECT U.userID, U.firstName, U.lastName, S.teamID
        FROM user U, UTD D, student S
        WHERE D.userID = U.userID AND D.netID = S.netID AND S.teamID IS NOT NULL`);
    const teams = usersByTeam.reduce((accumulator, dbUser) => {
        const user = `${dbUser.firstName} ${dbUser.lastName}`;
        if (dbUser.teamID in accumulator) {
            const team = accumulator[dbUser.teamID];
            team.members.push(user);
            team.open = team.members.length < 6;
        } else {
            accumulator[dbUser.teamID] = {
                id: dbUser.teamID,
                avatar: "/images/profile.png",
                interests: [],
                skills: [],
                members: [user],
                open: true,
                projectID: null,
            }
        }
        return accumulator;
    }, {});
    const [prefs] = await pool.query(`
        SELECT T.teamID, P.projectName
        FROM TeamPreferences T, Project P
        WHERE P.projectID = T.projectID
        ORDER BY T.preference_number`);
    prefs.forEach((pref) => teams[pref.teamID].interests.push(pref.projectName));
    const [skills] = await pool.query(`
        SELECT DISTINCT S.skillName, T.teamID
        FROM StudentSkillset C, Skills S, student T
        WHERE S.skillID = C.skillID AND C.netID = T.netID AND T.teamID IS NOT NULL`);
    skills.forEach((skill) => teams[skill.teamID].skills.push(skill.skillName));
    const [projects] = await pool.query(`
        SELECT projectID, teamID
        FROM Team`)
    projects.forEach((project) => teams[project.teamID].projectID = project.projectID);

    return Object.values(teams);
}

async function getTeam(teamID) {
    if (!teamID)
        return null;

    const [members] = await pool.query(`
        SELECT U.userID, U.firstName, U.lastName
        FROM user U, UTD D, student S
        WHERE D.userID = U.userID AND D.netID = S.netID AND S.teamID = ?`, teamID);

    const [prefs] = await pool.query(`
        SELECT P.projectName
        FROM TeamPreferences T, Project P
        WHERE T.teamID = ? AND P.projectID = T.projectID
        ORDER BY T.preference_number`, teamID);
    const [skills] = await pool.query(`
        SELECT DISTINCT S.skillName
        FROM StudentSkillset C, Skills S, student T
        WHERE S.skillID = C.skillID AND C.netID = T.netID AND T.teamID = ?`, teamID);
    const [project] = await pool.query(`
        SELECT projectID
        FROM Team
        WHERE teamID = ?`, teamID);
    const team = {
        id: teamID,
        avatar: "/images/profile.png",
        interests: prefs.flatMap(Object.values),
        skills: skills.flatMap(Object.values),
        members: members.map(member => `${member.firstName} ${member.lastName}`),
        open: members.length <= 6,
        projectID: project[0].projectID,
    };
    return team;
}

async function getInvites(userID) {
    const [[{ netID, teamID }]] = await pool.query(`
        SELECT S.teamID, S.netID
        FROM user U, UTD D, student S
        WHERE D.userID = U.userID AND D.netID = S.netID AND U.userID = ?`, [userID]);
    var invites;
    if (teamID === null) {
        // Invites toward the user
        [invites] = await pool.query(`
            SELECT P.sender, P.receiver, S.teamID, P.message
            FROM PendingInvites P, Student S
            WHERE P.receiver = ? AND S.netID = P.sender`, [netID]);
    } else {
        // Invites toward any member of the user's team
        [invites] = await pool.query(`
            SELECT P.sender, P.receiver, S.teamID, P.message
            FROM PendingInvites P, Student R, Student S
            WHERE P.receiver = R.netID AND S.netID = P.sender AND R.teamID = ?`, [teamID]);
    }
    invites = invites.map(async (invite) => {
        var listItem;
        if (invite.teamID === null) {
            listItem = { student: await getStudentByNetID(invite.sender) };
        } else {
            listItem = { team: await getTeam(invite.teamID) };
        }
        listItem.message = invite.message;
        listItem.senderNetID = invite.sender;
        listItem.receiverNetID = invite.receiver;
        return listItem;
    });
    return await Promise.all(invites);
}


/*
async function fetchUsers() {
    const users = await getUsers();
    console.log(users);
}
 
fetchUsers();
*/

module.exports.pool = pool;
module.exports.getUserByID = getUserByID;
module.exports.getLoginByEmail = getLoginByEmail;
module.exports.getUserByEmail = getUserByEmail;
module.exports.addLogin = addLogin;
module.exports.createUser = createUser;
module.exports.getStudentByUserID = getStudentByUserID;
module.exports.getAllTeams = getAllTeams;
module.exports.getTeam = getTeam;
module.exports.getInvites = getInvites;
module.exports.getNetID = getNetID;
module.exports.allStudents = allStudents;
module.exports.getStudentByNetID = getStudentByNetID;
module.exports.getAllSponsors = getAllSponsors;
module.exports.getAllProjects = getAllProjects;
module.exports.getUsersProject = getUsersProject;
module.exports.getProject = getProject;
module.exports.getAllStudentPreferences = getAllStudentPreferences;
