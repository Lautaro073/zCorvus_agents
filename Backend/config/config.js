require('dotenv').config();

module.exports = {
  env: process.env.NODE_ENV || 'development',
  port: process.env.PORT || 3000,

  app: {
    name: process.env.APP_NAME || 'zCorvus',
    frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000'
  },

  db: {
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN
  },

  jwt: {
    secret: process.env.JWT_SECRET || 'your_secret_key',
    expire: process.env.JWT_EXPIRE || '7d'
  },

  cors: {
    origin: process.env.CORS_ORIGIN || '*'
  },

  mail: {
    url: process.env.MAIL_URL,
    service: process.env.MAIL_SERVICE,
    host: process.env.MAIL_HOST,
    port: Number(process.env.MAIL_PORT || 587),
    secure: process.env.MAIL_SECURE === 'true',
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS,
    from: process.env.MAIL_FROM || process.env.MAIL_USER
  },

  auth: {
    passwordResetOtpMinutes: Number(process.env.PASSWORD_RESET_OTP_MINUTES || 10)
  }
};
