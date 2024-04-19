const mysql = require('mysql2');
const dotenv = require('dotenv');
const path = require("path");
dotenv.config();

const password = require("./password")

const pool = mysql.createPool({
    host: process.env.MYSQL_HOST,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE
}).promise();


// Create admin user if none exists
pool.query(`SELECT userID FROM user`).then(async ([users]) => {
    if (!users.length) {
        await pool.query(`
            INSERT INTO user (lastName, email, admin)
            VALUES ("admin", "admin@example.com", 1)`);
        const { hash, salt } = password.genPassword(process.env.ADMIN_PASSWORD);
        await pool.query(`
            INSERT INTO login (userID, passwordHash, passwordSalt)
            VALUES (LAST_INSERT_ID(), ?, ?)`, [hash, salt]);
    }
});


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
        UPDATE login
        SET passwordHash = ?, passwordSalt = ?, oneTimeTokenHash = NULL
        WHERE userID = ?`, [hash, salt, userID]);
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
        netID: dbUser.netID,
        teamID: dbUser.teamID,
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
    const [teamIDs] = await pool.query(`
        SELECT teamID
        FROM Team`);
    const teams = {};
    teamIDs.forEach((o) => teams[o.teamID] = {
        id: o.teamID,
        avatar: "/images/profile.png",
        interests: [],
        skills: [],
        members: [],
        open: true,
        projectID: null,
    });

    const [usersByTeam] = await pool.query(`
        SELECT U.userID, U.firstName, U.lastName, S.teamID
        FROM user U, UTD D, student S
        WHERE D.userID = U.userID AND D.netID = S.netID AND S.teamID IS NOT NULL`);
    usersByTeam.forEach((dbUser) => {
        const user = `${dbUser.firstName} ${dbUser.lastName}`;
        const team = teams[dbUser.teamID];
        team.members.push(user);
        team.open = team.members.length < 6;
    });
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

    return Object.values(teams).filter((team) => team.members.length);
}

async function getTeam(teamID) {
    if (!teamID)
        return null;

    const [[result]] = await pool.query(`
        SELECT teamID, projectID
        FROM Team
        WHERE teamID = ?`, teamID);
    if (!result)
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
    const team = {
        id: teamID,
        avatar: "/images/profile.png",
        interests: prefs.flatMap(Object.values),
        skills: skills.flatMap(Object.values),
        members: members.map(member => `${member.firstName} ${member.lastName}`),
        open: members.length <= 6,
        projectID: result.projectID,
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
            FROM PendingInvites P, student S
            WHERE P.receiver = ? AND S.netID = P.sender`, [netID]);
    } else {
        // Invites toward any member of the user's team
        [invites] = await pool.query(`
            SELECT P.sender, P.receiver, S.teamID, P.message
            FROM PendingInvites P, student R, student S
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
async function getAllStudentsWithoutTeam() {
    const [students] = await pool.query(`
        SELECT * FROM Student WHERE teamID IS NULL;
    `)
    return students;
}

//gets teams less than specific teamSize
async function getAllNotFullTeams(teamSize) {
    const [teams] = await pool.query(`
    SELECT teamID, COUNT(*) AS teamSize
    FROM student
    WHERE teamID IS NOT NULL
    GROUP BY teamID
    HAVING teamSize < ?;
    `, [teamSize]);
    return teams;
}

async function getStudentByProjectIDPreferenceID(PID, PNUM) {
    const [ids] = await pool.query(`SELECT netID
    FROM studentpreferences
    WHERE netID IN (
        SELECT netID
        FROM Student
        WHERE teamID IS NULL
    ) AND preference_number = ? AND projectID = ?;`, [PNUM, PID]);
    return ids;
}

async function getStudentPreference(netID, prefNum) {
    const [preferences] = await pool.query(`
    SELECT SP.*, P.projectName
    FROM StudentPreferences SP
    INNER JOIN Project P ON SP.projectID = P.projectID AND SP.netID = ? WHERE preference_number = ?
    ;
    `, [netID, prefNum])
    return preferences;
}

async function getTeamPreferences(teamID) {
    const [preferences] = await pool.query(`
        SELECT TP.*, P.projectName
        FROM TeamPreferences TP
        INNER JOIN Project P ON TP.projectID = P.projectID AND TP.teamID = ?
        ORDER BY TP.preference_number;
    `, [teamID])
    return preferences;
}


async function getAllOpenProjectSlots() {
    const [size] = await pool.query(
        'SELECT projectID, maxTeams FROM Project'
    );
    const [amt] = await pool.query(`
        SELECT COUNT(tp.projectID) AS count, tp.projectID
        FROM TeamPreferences tp
        JOIN Team t ON tp.teamID = t.teamID
        WHERE t.projectID IS NULL
        AND tp.preference_number = 1
        GROUP BY tp.projectID
        ORDER BY tp.projectID;`);

    const [teamsAssignedToProject] = await pool.query(`
        SELECT COUNT(t.teamID) AS count, t.projectID
        FROM Team t 
        WHERE t.projectID IS NOT NULL
        GROUP BY t.projectID;
    `);
    //we have the size of teams and the count of teams in a project, now we need to loop through each and subtract them and consider those who are already assigned a project.
    //OR we could just use getOpenProjectSlots and make a for loop from a query getting all projectIDs.
    let projects = new Array(size.length);
    for (var i = 0; i < size.length; i++) {
        let existsPref = amt.some(slot => slot.projectID === size[i].projectID)
        let existsAssigned = teamsAssignedToProject.some(slot => slot.projectID === size[i].projectID);
        occupied = 0;
        if (existsPref) {
            occupied += 1;
        }
        if (existsAssigned) {
            occupied += 1;
        }
        const sizeUpdated = {
            projectID: size[i].projectID,
            maxTeams: size[i].maxTeams - occupied
        }
        projects[i] = sizeUpdated
    }

    return projects;
}

//it ends up being a mix of random and preference, while it goes off preference, there is no skills to decide best fit.
async function matchTeamsPref(teamSize) {
    let students = await getAllStudentsWithoutTeam();
    let teamNotFull = await getAllNotFullTeams(teamSize);
    let AddStudentToTeam = [];

    //currently the algorithm does not take into account max amount of teams per a project.
    for (var i = 0; i < teamNotFull.length; i++) {
        const teamPreferences = await getTeamPreferences(teamNotFull[i].teamID);
        for (var j = 0; j < teamPreferences.length; j++) {
            while (teamNotFull[i].teamSize < teamSize) {
                let potentialStudents = await getStudentByProjectIDPreferenceID(teamPreferences[j].projectID, teamPreferences[j].preference_number);
                //note: we use random instead of anything else here since there are no relevant skills to compare.
                if (potentialStudents.length > 0) {
                    studentIndex = Math.floor(Math.random() * students.length);
                    const toAdd = {
                        student: students[studentIndex],
                        teamID: teamNotFull[i].teamID,
                        //This projectID is what the student matched with this team for.
                        //We need to take this away from projectOpenSlots and add their top preference back to the pool.
                        projectID: teamPreferences[j].projectID
                    }
                    AddStudentToTeam.push(toAdd);
                    students.splice(studentIndex, 1);
                    teamNotFull[i].teamSize += 1;
                    console.log(teamNotFull[i].teamSize, "size");
                }
            }
        }
    }
    let openSlots = await getAllOpenProjectSlots();

    let finalTeams = [];
    //Forming team object
    let teams = {};
    //We use prefCount to keep track of preferences.
    let prefCount = {};
    //We Store the netIDs of each student interested in each project
    let prefStudent = {};
    //Format: projectID: maxStudents. maxStudents is how many students we can assign to the project before we assign random teams.
    let maxStudents = {};
    openSlots.forEach(project => {
        teams[project.projectID] = [];
        prefStudent[project.projectID] = [];
        prefCount[project.projectID] = 0;
        maxStudents[project.projectID] = project.maxTeams * teamSize;
    });

    //ended up removing this implementation out as it became obsolete by the rest.
    // let change = true;
    // while (change) {
    //     change = false;
    //     if (students.length > 0) {
    //         let student = students.shift();
    //         let preferences = await getStudentPreferences(student.netID)
    //         for (var i = 0; i < preferences.length; i++) {
    //             let project = preferences[i].projectID;
    //             //might need to change openSlots.maxTeams to instead get number of students we can do openSlots.maxTeams * teamSize to get the number of students total we can accept for the project.
    //             //we can put all those students in an array and then, randomly select from there.
    //             if (maxStudents[project] != teams[project].length) {
    //                 teams[project].push(student);
    //                 change = true;
    //                 break;
    //             }
    //         }
    //     }
    // }

    //we loop to 5 due to amount of preferences
    for (var i = 1; i < 6; i++) {
        //loop through students
        for (var j = 0; j < students.length; j++) {

            let preference = await getStudentPreference(students[j].netID, i)
            prefCount[preference[0].projectID] += 1;
            prefStudent[preference[0].projectID].push(students[j]);

            //if the size is greater than teamSize we form a random team and then take them out of prefStudent and students2
        }

        //loop through projects
        for (var k = 1; k < Object.getOwnPropertyNames(openSlots).length; k++) {

            //one downside of this is that projects with a smaller projectID are preferred
            while (prefCount[k] >= teamSize && openSlots[k - 1].maxTeams > 0) {
                //calculated teams to make and makes that many teams.
                //We grab students at random from the list if there are more than teamSize since we do not have a true comparison based off skills which is a way this algo could be improved. 
                //loops for teamSize to make a team.
                teamArr = [];
                for (var m = 0; m < teamSize; m++) {

                    studentIndex = Math.floor(Math.random() * prefStudent[k].length);
                    studentToAdd = prefStudent[k][studentIndex]
                    teamArr.push(studentToAdd)

                    //we grab the students preferences and loop up to i times since they will only have i preferences by the time we reach here in the code and we removed them from.
                    for (var n = 1; n < i + 1; n++) {
                        let removePreference = await getStudentPreference(studentToAdd.netID, n);

                        //subtract their preferences to prevent them from effecting future teams.
                        prefCount[removePreference[0].projectID]--;
                        prefStudent[removePreference[0].projectID] = prefStudent[removePreference[0].projectID].filter(obj => obj != studentToAdd.netID);

                    }
                    students = students.filter(obj => obj.netID != studentToAdd.netID)
                }
                const fullTeam = {
                    team: teamArr,
                    projectID: k - 1
                }
                finalTeams.push(fullTeam)
                openSlots[k - 1].maxTeams--;
            }
        }
    }
    return {
        newTeams: finalTeams,
        studentToExistingTeam: AddStudentToTeam,
        leftOverStudents: students,
    }
}

async function matchTeamsRandom(teamSize) {
    //gets array of student netIDs
    let students = (await getAllStudentsWithoutTeam());
    const teamNotFull = await getAllNotFullTeams(teamSize);
    let AddStudentToTeam = [];

    //we loop through all teams not full and fill them to designated teamSize.
    for (var i = 0; i < teamNotFull.length; i++) {
        // BUG: Adds at most one member to each team
        studentIndex = Math.floor(Math.random() * students.length);
        const toAdd = {
            student: students[studentIndex],
            teamID: teamNotFull[i].teamID
        }
        AddStudentToTeam.push(toAdd);
        students.splice(studentIndex, 1);
    }
    const amtOfTeams = Math.floor(students.length / teamSize);
    const leftOverStudents = students.slice(students.length - (students.length % teamSize), students.length)


    //makes each teams initially start as empty
    let teams = new Array(amtOfTeams);

    //loops through all the potential teams and randomly fills them.
    for (var i = 0; i < amtOfTeams; i++) {
        teams[i] = [];
        for (var j = 0; j < teamSize; j++) {
            studentIndex = Math.floor(Math.random() * students.length);
            teams[i].push(students[studentIndex])
            students.splice(studentIndex, 1);
        }
    }
    //teams are newly made to be inserted into the teams table
    //console.log(teams);
    //AddStudentToTeam contains the student and the team to add them to.
    //console.log(AddStudentToTeam);
    //These are are students that did not fit in anywhere.
    //console.log(leftOverStudents);
    return {
        newTeams: teams,
        studentToExistingTeam: AddStudentToTeam,
        leftOverStudents: leftOverStudents,
    }
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
module.exports.matchTeams = matchTeamsRandom;
