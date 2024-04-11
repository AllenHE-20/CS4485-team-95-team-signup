const nodemailer = require('nodemailer');

async function sendEmail(email, subject, message) {
    const transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: process.env.EMAIL_PORT,
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASSWORD,
        },
    });

    const emailOptions = {
        from: "Team Sign-up Registration<registration@example.com>",
        to: email,
        subject: subject,
        text: message,
    };

    await transporter.sendMail(emailOptions);
}

module.exports = sendEmail;
