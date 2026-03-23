require('dotenv').config();

module.exports = {
  env: process.env.NODE_ENV || 'development',
  port: process.env.PORT || 3000,

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
  }
};
