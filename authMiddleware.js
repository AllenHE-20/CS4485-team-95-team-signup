const httpStatus = require("./http_status");

function isAuthenticated(req, res, next) {
    res.locals.isAdmin = req.isAuthenticated() && req.user.admin;
    if (req.isAuthenticated()) {        
        res.locals.isAdmin = req.user.admin;
        next();
    } else {
        res.status(httpStatus.UNAUTHORIZED).send('You are not authorized to view this resource');
    }
}

function isAdmin(req, res, next) {
    if (req.isAuthenticated() && req.user.admin) {
        res.locals.isAdmin = req.user.admin;
        next();
    } else {
        res.status(httpStatus.UNAUTHORIZED).send('You are not authorized to view this resource because you are not an admin.');
    }
}

module.exports.isAuthenticated = isAuthenticated;
module.exports.isAdmin = isAdmin;
