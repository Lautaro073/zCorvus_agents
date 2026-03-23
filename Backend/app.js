const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const session = require('express-session');

const routes = require('./routes');
const { errorHandler } = require('./middlewares/errorHandler');
const { swaggerUi, swaggerDocs, swaggerUiOptions } = require('./config/swagger');

const app = express();

// Webhook raw body ANTES de otros middlewares (para Stripe)
app.post('/api/stripe/webhook', express.raw({ type: 'application/json' }), (req, res, next) => {
  next();
});

// Middlewares
app.use(helmet());
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir archivos estáticos (para swagger-custom.js)
app.use(express.static('public'));

// Session for 2FA temp secrets
app.use(session({
  secret: process.env.SESSION_SECRET || 'zcorvus-session-secret-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    maxAge: 10 * 60 * 1000 // 10 minutos
  }
}));

// Swagger Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs, swaggerUiOptions));

// Routes
/**
 * @swagger
 * /:
 *   get:
 *     summary: Welcome endpoint
 *     description: Returns a welcome message and API version
 *     tags: [General]
 *     responses:
 *       200:
 *         description: Welcome message
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Welcome to zCorvus API
 *                 version:
 *                   type: string
 *                   example: 1.0.0
 */
app.get('/', (req, res) => {
  res.json({
    message: 'Welcome to zCorvus API',
    version: '1.0.0',
    docs: '/api-docs'
  });
});

app.use('/api', routes);

// Error handling middleware
app.use(errorHandler);

module.exports = app;
