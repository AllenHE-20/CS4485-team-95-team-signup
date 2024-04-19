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
    email VARCHAR(255) UNIQUE NOT NULL,
    admin BOOLEAN NOT NULL DEFAULT 0
);
CREATE TABLE login (
    userID INT PRIMARY KEY UNIQUE NOT NULL,
    passwordHash VARCHAR(128) CHECK(passwordHash REGEXP '^[0-9A-Za-z]{128}$'),
    passwordSalt VARCHAR(64) CHECK(passwordSalt REGEXP '^[0-9A-Za-z]{64}$'),
    oneTimeTokenHash VARCHAR(128) CHECK(oneTimeTokenHash REGEXP '^[0-9A-Za-z]{128}$') UNIQUE,
    FOREIGN KEY(userID) REFERENCES user(userID) ON DELETE CASCADE,
    CONSTRAINT newUser CHECK(
        (
            passwordHash IS NOT NULL
            AND passwordSalt IS NOT NULL
        )
        OR oneTimeTokenHash IS NOT NULL
    )
);
--
CREATE TABLE organizer(
    userID INT,
    FOREIGN KEY(userID) REFERENCES user(userID) ON DELETE CASCADE,
    affiliation VARCHAR(50)
);
CREATE TABLE Project (
    projectID INT PRIMARY KEY AUTO_INCREMENT,
    FOREIGN KEY (userID) REFERENCES user(userID) ON DELETE CASCADE,
    projectName VARCHAR(50),
    sponsor VARCHAR(255),
    description VARCHAR(500),
    teamSize INT CHECK (
        teamSize >= 4
        AND teamSize <= 6
    ),
    avatar VARCHAR(255),
    userID INT,
    maxTeams INT,
    team_assigned VARCHAR(255)
);
-- at some point a trigger should be made for when a team is empty it will be deleted.
CREATE TABLE Team(
    teamID INT PRIMARY KEY AUTO_INCREMENT,
    projectID INT,
    FOREIGN KEY (projectID) REFERENCES Project(projectID) ON DELETE
    SET NULL
);
CREATE TABLE student(
    userID INT PRIMARY KEY UNIQUE,
    FOREIGN KEY(userID) REFERENCES user(userID) ON DELETE CASCADE,
    resumeFile VARCHAR(255),
    phoneNumber VARCHAR(12),
    email VARCHAR(255),
    discord VARCHAR(255),
    groupme VARCHAR(255),
    instagram VARCHAR(255),
    avatar VARCHAR(255),
    teamID INT,
    FOREIGN KEY (teamID) REFERENCES Team(teamID) ON DELETE
    SET NULL,
        projectID INT,
        FOREIGN KEY (projectID) REFERENCES Team(teamID) ON DELETE
    SET NULL
);
CREATE TRIGGER fullTeam BEFORE
INSERT ON student FOR EACH ROW BEGIN IF (
        SELECT COUNT(*)
        FROM student
        WHERE teamID = NEW.teamID
    ) >= 6 THEN SIGNAL SQLSTATE '45000';
END IF;
END;
CREATE TRIGGER emptyTeam
AFTER DELETE ON student FOR EACH ROW BEGIN
DECLARE team_count INT;
IF OLD.teamID IS NOT NULL THEN IF NOT EXISTS (
    SELECT 1
    FROM student
    WHERE teamID = OLD.teamID
) THEN
DELETE FROM team
WHERE teamID = OLD.teamID;
END IF;
END IF;
END;
CREATE TABLE Faculty(
    userID INT PRIMARY KEY UNIQUE,
    FOREIGN KEY(userID) REFERENCES user(userID) ON DELETE CASCADE
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
    userID INT,
    FOREIGN KEY(userID) REFERENCES user(userID) ON DELETE CASCADE,
    projectID INT,
    FOREIGN KEY (projectID) REFERENCES Project(projectID) ON DELETE CASCADE,
    preference_number INT CHECK (
        preference_number BETWEEN 1 AND 5
    ),
    UNIQUE (userID, preference_number),
    UNIQUE (userID, projectID)
);
-- Skillcategory should be an enumrated list at some point.
CREATE TABLE Skills(
    skillID INT PRIMARY KEY AUTO_INCREMENT,
    skillName VARCHAR(20),
    skillCategory VARCHAR(20)
);
CREATE TABLE StudentSkillset(
    userID INT,
    FOREIGN KEY(userID) REFERENCES user(userID) ON DELETE CASCADE,
    skillID INT,
    FOREIGN KEY (skillID) REFERENCES Skills(skillID) ON DELETE CASCADE,
    PRIMARY KEY (userID, skillID),
    UNIQUE(userID, skillID)
);
CREATE TABLE ProjectSkillset(
    projectID INT,
    FOREIGN KEY (projectID) REFERENCES Project(projectID) ON DELETE CASCADE,
    skillID INT,
    FOREIGN KEY (skillID) REFERENCES Skills(skillID) ON DELETE CASCADE,
    required BOOLEAN,
    PRIMARY KEY (projectID, skillID),
    UNIQUE (projectID, skillID)
);
CREATE TABLE TeamPreferences(
    teamID INT,
    FOREIGN KEY (teamID) REFERENCES Team(teamID) ON DELETE CASCADE,
    projectID INT,
    FOREIGN KEY (projectID) REFERENCES Project(projectID) ON DELETE CASCADE,
    preference_number INT CHECK (
        preference_number BETWEEN 1 AND 5
    ),
    UNIQUE(teamID, preference_number),
    -- TODO: Limit? Maybe -5 to +5?
    PRIMARY KEY (teamID, projectID)
);
CREATE TABLE PendingInvites(
    sender INT,
    FOREIGN KEY (sender) REFERENCES user(userID) ON DELETE CASCADE,
    receiver INT,
    FOREIGN KEY (receiver) REFERENCES user(userID) ON DELETE CASCADE,
    message VARCHAR(255),
    PRIMARY KEY (sender, receiver),
    CONSTRAINT invite_yourself CHECK (sender <> receiver)
);
-- CREATE TRIGGER inviteExistingMember BEFORE
-- INSERT ON PendingInvites FOR EACH ROW BEGIN IF EXISTS (
--         SELECT 1
--         FROM Team
--         WHERE NEW.teamID = teamID
--             AND EXISTS(
--                 SELECT 1
--                 FROM student
--                 WHERE netID = NEW.netID
--             )
--     ) THEN SIGNAL SQLSTATE '45000'
-- SET MESSAGE_TEXT = 'Member is on that team.';
-- END IF;
-- END;