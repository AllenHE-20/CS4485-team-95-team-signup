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
    console.log(rows);
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
    if (netIDs) {
        return netIDs[0].netID;
    } else {
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
            }
        }
        return accumulator;
    }, {});
    const [prefs] = await pool.query(`
        SELECT T.teamID, P.projectName
        FROM TeamPreferences T, Project P
        WHERE P.projectID = T.projectID
        ORDER BY T.preference`);
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
        WHERE P.projectID = ?
        ORDER BY T.preference`, teamID);
    const interests = [];
    prefs.forEach((pref) => interests.push(pref.projectName));
    const [skills] = await pool.query(`
        SELECT S.skillName
        FROM StudentSkillset C, Skills S, Student T
        WHERE S.skillID = C.skillID AND C.netID = T.netID AND T.teamID = ?`, teamID);
    const teamSkills = [];
    skills.forEach((skill) => {
        if (teamSkills.indexOf(skill.skillName) == -1)
            teamSkills.push(skill.skillName);
    });
    const team = {
        id: teamID,
        avatar: "/images/profile.png",
        interests: interests,
        skills: teamSkills,
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
            listItem = {student: await getStudentByNetID(invite.sender)};
        } else {
            listItem = {team: await getTeam(invite.teamID)};
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
