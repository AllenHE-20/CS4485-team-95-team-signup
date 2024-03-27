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
