-- 'reminder to self not to forget about ON DELETE'
-- 'triggers to add at some point, checking for team size to not go above X, no more than X teams per a project.'
DROP DATABASE IF EXISTS team;
CREATE DATABASE team;
USE team;
-- set userID to automatically increment for now.
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
-- I have not added the FOREIGN KEY teamID yet.
-- this table will need to be created after the teams TABLE is made.
/*
 CREATE TABLE student(
 FOREIGN KEY(netID) REFERENCES UTD(netID) ON DELETE CASCADE,
 resumeFile BLOB,
 phoneNumber VARCHAR(10) CHECK (phoneNumber LIKE '(\+\d+)? \d{3}-\d{3}-\d{4}'),
 teamID
 );
 */
CREATE TABLE Faculty(
    netID CHAR(8),
    FOREIGN KEY(netID) REFERENCES UTD(netID) ON DELETE CASCADE
);