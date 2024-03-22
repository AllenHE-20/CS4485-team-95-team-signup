-- 'reminder to self not to forget about ON DELETE'
-- 'triggers to add at some point, checking for team size to not go above X, no more than X teams per a project.'
DROP DATABASE IF EXISTS team;
CREATE DATABASE team;
USE team;
-- Any tables with numeric IDs automatically increment for now. TODO: Some other method?
CREATE TABLE user (
    userID INT PRIMARY KEY AUTO_INCREMENT,
    firstName VARCHAR(20),
    middleName VARCHAR(20),
    lastName VARCHAR(20),
    email VARCHAR(255) CHECK(email LIKE '.+@.+\..+$')
);
CREATE TABLE organizer(
    userID INT,
    FOREIGN KEY(userID) REFERENCES user(userID) ON DELETE CASCADE,
    affiliation VARCHAR(50)
);
-- depending on how the SSO works we might be able to add email here and grab it
-- then, we could put a seperate email into Organizer.
CREATE TABLE UTD (
    netID CHAR(8) CHECK(netID REGEXP '^[A-Za-z]{3}[0-9]{5}$') PRIMARY KEY UNIQUE,
    userID INT,
    FOREIGN KEY(userID) REFERENCES user(userID) ON DELETE CASCADE
);
CREATE TABLE Project(
    projectID INT PRIMARY KEY AUTO_INCREMENT,
    userID INT,
    FOREIGN KEY(userID) REFERENCES user(userID) ON DELETE CASCADE,
    description VARCHAR(255),
    projectName VARCHAR(50) UNIQUE,
    teamSize INT CHECK(
        teamSize >= 1
        AND teamSize <= 6
    )
);
CREATE TABLE Team(
    teamID INT PRIMARY KEY AUTO_INCREMENT,
    projectID INT,
    FOREIGN KEY (projectID) REFERENCES Project(projectID) ON DELETE
    SET NULL
);
CREATE TABLE student(
    netID CHAR(8) PRIMARY KEY UNIQUE,
    FOREIGN KEY(netID) REFERENCES UTD(netID) ON DELETE CASCADE,
    resumeFile BLOB,
    phoneNumber VARCHAR(10) CHECK (phoneNumber LIKE '(\+\d+)? \d{3}-\d{3}-\d{4}'),
    teamID INT,
    FOREIGN KEY (teamID) REFERENCES Team(teamID) ON DELETE
    SET NULL
);
CREATE TABLE Faculty(
    netID CHAR(8),
    FOREIGN KEY(netID) REFERENCES UTD(netID) ON DELETE CASCADE
);
CREATE TABLE ProjectFiles(
    projectID INT,
    FOREIGN KEY(projectID) REFERENCES Project(projectID) ON DELETE CASCADE,
    filename VARCHAR(255),
    file LONGBLOB,
    PRIMARY KEY (projectID, filename)
);
-- TODO: Ensure that student exists in students table?
/*
 CREATE TABLE StudentPreferences(
 netID CHAR(8),
 FOREIGN KEY (netID) REFERENCES UTD(netID) ON DELETE CASCADE,
 projectID INT,
 FOREIGN KEY (projectID) REFERENCES Project(projectID) ON DELETE CASCADE,
 preference INT,
 -- Limit? Maybe -5 to +5?
 PRIMARY KEY (netID, projectID)
 );
 */
CREATE TABLE StudentPreferences(
    netID CHAR(8),
    FOREIGN KEY (netID) REFERENCES UTD(netID) ON DELETE CASCADE,
    projectID INT,
    FOREIGN KEY (projectID) REFERENCES Project(projectID) ON DELETE CASCADE,
    preference_number INT CHECK (
        preference_number BETWEEN 1 AND 5
    )
);
CREATE TABLE Skills(
    skillID INT PRIMARY KEY AUTO_INCREMENT,
    skillName VARCHAR(20),
    skillCategory VARCHAR(20)
);
CREATE TABLE StudentSkillset(
    netID CHAR(8),
    FOREIGN KEY (netID) REFERENCES UTD(netID) ON DELETE CASCADE,
    skillID INT,
    FOREIGN KEY (skillID) REFERENCES Skills(skillID) ON DELETE CASCADE,
    PRIMARY KEY (netID, skillID)
);
CREATE TABLE ProjectSkillset(
    projectID INT,
    FOREIGN KEY (projectID) REFERENCES Project(projectID) ON DELETE CASCADE,
    skillID INT,
    FOREIGN KEY (skillID) REFERENCES Skills(skillID) ON DELETE CASCADE,
    required BOOLEAN,
    PRIMARY KEY (projectID, skillID)
);
CREATE TABLE TeamPreferences(
    teamID INT,
    FOREIGN KEY (teamID) REFERENCES Team(teamID) ON DELETE CASCADE,
    projectID INT,
    FOREIGN KEY (projectID) REFERENCES Project(projectID) ON DELETE CASCADE,
    preference INT,
    -- TODO: Limit? Maybe -5 to +5?
    PRIMARY KEY (teamID, projectID)
);
CREATE TABLE PendingInvites(
    netID CHAR(8),
    FOREIGN KEY (netID) REFERENCES UTD(netID) ON DELETE CASCADE,
    teamID INT,
    FOREIGN KEY (teamID) REFERENCES Team(teamID) ON DELETE CASCADE,
    message VARCHAR(255),
    PRIMARY KEY (netID, teamID)
)