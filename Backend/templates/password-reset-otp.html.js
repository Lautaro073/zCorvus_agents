const { getPasswordResetOtpCopy } = require('./password-reset-otp.copy');

function escapeHtml(value) {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function getPasswordResetOtpHtml({ otp, expiresInMinutes, locale, resetUrl, appName }) {
    const copy = getPasswordResetOtpCopy({ locale, expiresInMinutes, appName });
    const safeOtp = escapeHtml(otp);
    const safeResetUrl = escapeHtml(resetUrl);
    const safeSubject = escapeHtml(copy.subject);
    const safeHeading = escapeHtml(copy.heading);
    const safeLead = escapeHtml(copy.lead);
    const safeOtpLabel = escapeHtml(copy.otpLabel);
    const safeExpiresLine = escapeHtml(copy.expiresLine);
    const safeSingleUseLine = escapeHtml(copy.singleUseLine);
    const safeCtaLabel = escapeHtml(copy.ctaLabel);
    const safeSecurityLine = escapeHtml(copy.securityLine);
    const safeFooterLine = escapeHtml(copy.footerLine);

    return `
<!doctype html>
<html lang="${copy.locale}">
  <head>
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${safeSubject}</title>
  </head>
  <body style="margin:0; padding:0; background:#f3f4f6; color:#111827;">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#f3f4f6; padding:24px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:560px; background:#ffffff; border:1px solid #e5e7eb; border-radius:12px; overflow:hidden;">
            <tr>
              <td style="padding:20px 24px; border-bottom:1px solid #e5e7eb; font-family:Georgia, 'Times New Roman', serif; font-size:18px; font-weight:700; letter-spacing:0.2px; color:#111827;">
                zCorvus
              </td>
            </tr>
            <tr>
              <td style="padding:24px; font-family:Georgia, 'Times New Roman', serif;">
                <h1 style="margin:0 0 12px; font-size:30px; line-height:1.2; color:#111827;">${safeHeading}</h1>
                <p style="margin:0 0 16px; font-family:Arial, Helvetica, sans-serif; font-size:16px; line-height:1.5; color:#111827;">${safeLead}</p>

                <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 14px; background:#f3f4f6; border:1px solid #e5e7eb; border-radius:12px;">
                  <tr>
                    <td style="padding:18px 16px; text-align:center;">
                      <div style="margin:0 0 8px; font-family:Arial, Helvetica, sans-serif; font-size:12px; letter-spacing:0.14em; text-transform:uppercase; color:#6b7280;">${safeOtpLabel}</div>
                      <div style="font-family:'Courier New', Courier, monospace; font-size:38px; font-weight:700; letter-spacing:6px; line-height:1; color:#111827;">${safeOtp}</div>
                    </td>
                  </tr>
                </table>

                <p style="margin:0 0 8px; font-family:Arial, Helvetica, sans-serif; font-size:15px; line-height:1.5; color:#111827;">${safeExpiresLine}</p>
                <p style="margin:0 0 20px; font-family:Arial, Helvetica, sans-serif; font-size:15px; line-height:1.5; color:#111827;">${safeSingleUseLine}</p>

                <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 20px;">
                  <tr>
                    <td align="center" bgcolor="#111827" style="border-radius:10px;">
                      <a href="${safeResetUrl}" target="_blank" rel="noopener noreferrer" style="display:inline-block; padding:12px 18px; font-family:Arial, Helvetica, sans-serif; font-size:14px; font-weight:600; color:#ffffff; text-decoration:none;">${safeCtaLabel}</a>
                    </td>
                  </tr>
                </table>

                <hr style="border:none; border-top:1px solid #e5e7eb; margin:0 0 14px;" />
                <p style="margin:0 0 6px; font-family:Arial, Helvetica, sans-serif; font-size:14px; line-height:1.5; color:#4b5563;">${safeSecurityLine}</p>
                <p style="margin:0; font-family:Arial, Helvetica, sans-serif; font-size:13px; color:#6b7280;">${safeFooterLine}</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

module.exports = {
    getPasswordResetOtpHtml
};
