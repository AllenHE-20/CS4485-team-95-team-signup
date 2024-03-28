const mysql = require('mysql2');
const dotenv = require('dotenv');
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

async function getUser(userID) {
    const [users] = await pool.query(`
        SELECT *
        FROM user U, UTD D, student S
        WHERE U.userID = ? AND D.userID = U.userID AND D.netID = S.netID`, [userID]);
    const dbUser = users[0];
    const [skills] = await pool.query(`
        SELECT S.skillName
        FROM Skills S, StudentSkillset A
        WHERE A.netID = ? AND S.skillID = A.skillID`, [dbUser.netID]);
    const [preferences] = await pool.query(`
        SELECT P.projectName
        FROM Project P, StudentPreferences W
        WHERE W.netID = ? AND P.projectID = W.projectID`, [dbUser.netID]);
    const user = {
        userID: dbUser.userID,
        name: `${dbUser.firstName} ${dbUser.lastName}`,
        avatar: "images/profile.png",
        resume: dbUser.resumeFile,
        email: dbUser.email,
        phone: dbUser.phoneNumber,
        discord: dbUser.discord,
        groupme: dbUser.groupme,
        instagram: dbUser.instagram,
        team: dbUser.teamID,
        interests: preferences.map(({projectName}) => projectName),
        skills: skills.map(({skillName}) => skillName),
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
        WHERE P.projectID = T.teamID`);
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
module.exports.getUser = getUser;
module.exports.getAllTeams = getAllTeams;
