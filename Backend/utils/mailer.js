const nodemailer = require('nodemailer');
const config = require('../config/config');

let transporter;

function buildTransportConfig() {
    if (!config.mail.user || !config.mail.pass) {
        throw new Error('Mail configuration is incomplete. Check MAIL_USER and MAIL_PASS env vars.');
    }

    if (config.mail.url) {
        return {
            url: config.mail.url,
            auth: {
                user: config.mail.user,
                pass: config.mail.pass
            }
        };
    }

    if (config.mail.service) {
        return {
            service: config.mail.service,
            auth: {
                user: config.mail.user,
                pass: config.mail.pass
            }
        };
    }

    if (config.mail.host) {
        return {
            host: config.mail.host,
            port: config.mail.port,
            secure: config.mail.secure,
            auth: {
                user: config.mail.user,
                pass: config.mail.pass
            }
        };
    }

    return {
        auth: {
            user: config.mail.user,
            pass: config.mail.pass
        }
    };
}

function getTransporter() {
    if (transporter) {
        return transporter;
    }

    transporter = nodemailer.createTransport(buildTransportConfig());

    return transporter;
}

async function sendMail({ to, subject, html, text }) {
    const activeTransporter = getTransporter();

    return activeTransporter.sendMail({
        from: config.mail.from,
        to,
        subject,
        text,
        html
    });
}

module.exports = {
    sendMail
};
