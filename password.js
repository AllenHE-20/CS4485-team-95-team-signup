const crypto = require("crypto");

function genPassword(password) {
    var salt = crypto.randomBytes(32).toString("hex");
    var genHash = crypto.pbkdf2Sync(password, salt, 10000, 64, "sha512").toString("hex");

    return {
        salt: salt,
        hash: genHash,
    };
}

function validatePassword(password, hash, salt) {
    var hashVerify = crypto.pbkdf2Sync(password, salt, 10000, 64, "sha512").toString("hex");
    return hash === hashVerify;
}

function createOneTimePasswordToken() {
    const token = crypto.randomBytes(32).toString("hex");
    const hash = crypto.createHash("sha512").update(token).digest("hex");
    return {
        token: token,
        hash: hash,
    };
}

function hashToken(token) {
    return crypto.createHash("sha512").update(token).digest("hex");
}

module.exports.validatePassword = validatePassword;
module.exports.genPassword = genPassword;
module.exports.createOneTimePasswordToken = createOneTimePasswordToken;
module.exports.hashToken = hashToken;
