const passport = require("passport");
const database = require("./database");
const validatePassword = require("./password").validatePassword;
const LocalStrategy = require("passport-local").Strategy;

const studentVerifyCallback = (email, password, done) => {
    database.getLoginByEmail(email)
        .then((user) => {
            if (!user) { return done(null, false); }

            const isValid = validatePassword(password, user.passwordHash, user.passwordSalt);

            if (isValid) {
                return done(null, user);
            } else {
                return done(null, false);
            }
        })
        .catch((err) => {
            done(err);
        });
}

passport.use(new LocalStrategy({usernameField: "email"}, studentVerifyCallback));

passport.serializeUser((user, done) => {
    done(null, user.email);
});

passport.deserializeUser((email, done) => {
    database.getUserByEmail(email)
        .then((email) => {
            done(null, email);
        })
        .catch((err) => done(err));
});
