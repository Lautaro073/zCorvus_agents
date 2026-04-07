const { getPasswordResetOtpCopy } = require('./password-reset-otp.copy');

function getPasswordResetOtpText({ otp, expiresInMinutes, locale, resetUrl, appName }) {
    const copy = getPasswordResetOtpCopy({ locale, expiresInMinutes, appName });

    return [
        copy.heading,
        '',
        copy.lead,
        `${copy.otpLabel}: ${otp}`,
        copy.expiresLine,
        copy.singleUseLine,
        '',
        `${copy.ctaLabel}: ${resetUrl}`,
        '',
        copy.securityLine,
        copy.footerLine
    ].join('\n');
}

module.exports = {
    getPasswordResetOtpText
};
