function normalizeOtpLocale(locale) {
    const normalized = String(locale || '').trim().toLowerCase();

    if (normalized.startsWith('es')) {
        return 'es';
    }

    if (normalized.startsWith('en')) {
        return 'en';
    }

    return 'en';
}

function getPasswordResetOtpCopy({ locale, expiresInMinutes, appName }) {
    const resolvedLocale = normalizeOtpLocale(locale);
    const safeAppName = String(appName || 'zCorvus').trim() || 'zCorvus';
    const safeMinutes = Number.isFinite(expiresInMinutes)
        ? Math.max(1, Math.round(expiresInMinutes))
        : 10;

    if (resolvedLocale === 'es') {
        return {
            locale: 'es',
            subject: `Codigo para restablecer tu contraseña - ${safeAppName}`,
            heading: 'Codigo de restablecimiento',
            lead: `Usa este codigo de un solo uso para restablecer tu contraseña de ${safeAppName}.`,
            otpLabel: 'Codigo',
            expiresLine: `Este codigo vence en ${safeMinutes} minutos y solo puede usarse una vez.`,
            singleUseLine: 'Por seguridad, no compartas este codigo con nadie.',
            ctaLabel: 'Restablecer contraseña',
            securityLine: 'Si no solicitaste este cambio, puedes ignorar este correo de forma segura.',
            footerLine: `Equipo de ${safeAppName}`
        };
    }

    return {
        locale: 'en',
        subject: `Password reset code - ${safeAppName}`,
        heading: 'Password reset code',
        lead: `Use this one-time code to reset your ${safeAppName} password.`,
        otpLabel: 'Code',
        expiresLine: `This code expires in ${safeMinutes} minutes and can only be used once.`,
        singleUseLine: 'For your security, do not share this code with anyone.',
        ctaLabel: 'Reset password',
        securityLine: 'If you did not request this change, you can safely ignore this email.',
        footerLine: `${safeAppName} team`
    };
}

module.exports = {
    normalizeOtpLocale,
    getPasswordResetOtpCopy
};
