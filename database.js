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

//currently not displaying on student list. But it does send the data over in the format [{firstName: 'x', lastName: 'y', userID: 0}]
async function allStudents() {
    const [rows] = await pool.query(`
        SELECT u.firstName, u.lastName, u.userID FROM user u JOIN UTD on u.userID = UTD.userID
        JOIN student s on utd.netID = s.netID`);
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
async function getProject(netID) {
    const [project] = await pool.query(`
    SELECT P.projectID
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
    const [users] = await pool.query(`
        SELECT *
        FROM user U, UTD D, student S
        WHERE U.userID = ? AND D.userID = U.userID AND D.netID = S.netID`, [userID]);
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
async function getAllProjects() {
    const [projects] = await pool.query(`
        SELECT P.projectID, P.projectname, P.description, P.teamSize, P.maxTeams, O.affiliation
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
    projects.forEach((project) => {
        const projectId = project.projectID;
        if (skillsByProject[projectId]) {
            project.skills = skillsByProject[projectId];
        } else {
            project.skills = [];
        }
    });

    //TODO: Add team_assigned to check if a project is full.
    const [teamsPerProject] = await pool.query(`
        SELECT projectID, COUNT(*) AS teamCount
        FROM Team GROUP BY projectID`);
    const projectStatus = {};

    return projects;
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
                avatar: "/profile.png",
                interests: [],
                skills: [],
                members: [user],
                open: true,
            }
        }
        return accumulator;
    }, {});
    const [prefs] = await pool.query(`
        SELECT T.teamID, P.projectName
        FROM TeamPreferences T, Project P
        WHERE P.projectID = T.projectID`);
    prefs.forEach((pref) => teams[pref.teamID].interests.push(pref.projectName));
    const [skills] = await pool.query(`
        SELECT S.skillName, T.teamID
        FROM StudentSkillset C, Skills S, Student T
        WHERE S.skillID = C.skillID AND C.netID = T.netID AND T.teamID IS NOT NULL`);
    skills.forEach((skill) => {
        if (teams[skill.teamID].skills.indexOf(skill.skillName) == -1)
            teams[skill.teamID].skills.push(skill.skillName);
    });
    return Object.values(teams);
}

/* TO:DO Pull projects to display on project list page, individual project page
async function getAllProjects() {
}
*/

async function getTeam(teamID) {
    const [members] = await pool.query(`
        SELECT U.userID, U.firstName, U.lastName
        FROM user U, UTD D, student S
        WHERE D.userID = U.userID AND D.netID = S.netID AND S.teamID = ?`, teamID);
    const [prefs] = await pool.query(`
        SELECT P.projectName
        FROM TeamPreferences T, Project P
        WHERE P.projectID = ?
        ORDER BY T.preference_number`, teamID);
    prefs.forEach((pref) => teams[pref.teamID].interests.push(pref.projectName));
    const [skills] = await pool.query(`
        SELECT S.skillName
        FROM StudentSkillset C, Skills S, Student T
        WHERE S.skillID = C.skillID AND C.netID = T.netID AND T.teamID = ?`, teamID);
    skills.forEach((skill) => {
        if (teams[skill.teamID].skills.indexOf(skill.skillName) == -1)
            teams[skill.teamID].skills.push(skill.skillName);
    });
    const team = {
        id: teamID,
        avatar: "/profile.png",
        interests: prefs.map(Object.values),
        skills: skills.map(Object.values),
        members: members.map(member => `${member.firstName} ${member.lastName}`),
        open: members.length <= 6,
    };
    return team;
}

async function getInvites(userID) {
    const [[{ netID, teamID }]] = await pool.query(`
        SELECT S.teamID, S.netID
        FROM user U, UTD D, student S
        WHERE D.userID = U.userID AND D.netID = S.netID AND U.userID = ?`, [userID]);
    // FIXME: There's no way to tell which way an invite was sent, so a user can invite themselves
    var invites;
    if (teamID === null) {
        // Invites toward the user
        [invites] = await pool.query(`
            SELECT P.teamID, P.message
            FROM PendingInvites P
            WHERE P.netID = ?`, [netID]);
    } else {
        // Invites toward any member of the user's team
        [invites] = await pool.query(`
            SELECT P.teamID, P.message
            FROM PendingInvites P, Student S
            WHERE P.netID = S.netID AND S.teamID = ?`, [teamID]);
    }
    // TODO: Let database handle team data grabs
    const teams = (await getAllTeams())
        .filter((team) => invites.some((invite) => team.id == invite.teamID))
        .map((team) => {
            return {
                team: team,
                message: invites.find((invite) => invite.teamID == team.id).message
            }
        });
    return teams;
}


/*
async function fetchUsers() {
    const users = await getUsers();
    console.log(users);
}
 
fetchUsers();
*/

module.exports.pool = pool;
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
module.exports.getAllProjects = getAllProjects;
module.exports.getProject = getProject;