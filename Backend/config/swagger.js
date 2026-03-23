const swaggerJsDoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const swaggerOptions = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'zCorvus API',
            version: '1.0.0',
            description: 'Icon Library API - Backend for zCorvus icon library with user preferences and role-based access (Free, Pro, Admin)',
            contact: {
                name: 'API Support',
                email: 'support@zcorvus.com'
            }
        },
        servers: [
            {
                url: 'http://localhost:3001',
                description: 'Development server'
            },
            {
                url: 'https://z-corvus-backend.fly.dev',
                description: 'Production server'
            }
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                    description: 'JWT token obtained from /api/auth/login'
                }
            },
            schemas: {
                User: {
                    type: 'object',
                    properties: {
                        id: {
                            type: 'string',
                            format: 'uuid',
                            description: 'User unique identifier (UUID v4)'
                        },
                        username: {
                            type: 'string',
                            description: 'Unique username'
                        },
                        email: {
                            type: 'string',
                            format: 'email',
                            description: 'User email address'
                        },
                        two_factor_enabled: {
                            type: 'boolean',
                            description: '2FA status (enabled/disabled)',
                            example: false
                        },
                        two_factor_secret: {
                            type: 'string',
                            nullable: true,
                            description: 'TOTP secret for 2FA (encrypted)'
                        },
                        roles_id: {
                            type: 'integer',
                            description: 'Role ID: 1=Admin, 2=User/Free, 3=Pro'
                        },
                        settings_icons_id: {
                            type: 'string',
                            format: 'uuid',
                            nullable: true,
                            description: 'Reference to user visual preferences'
                        },
                        token_id: {
                            type: 'string',
                            format: 'uuid',
                            nullable: true,
                            description: 'Reference to active token'
                        },
                        created_at: {
                            type: 'string',
                            format: 'date-time'
                        },
                        updated_at: {
                            type: 'string',
                            format: 'date-time'
                        }
                    }
                },
                Token: {
                    type: 'object',
                    description: 'Access token for Pro users',
                    properties: {
                        id: {
                            type: 'string',
                            format: 'uuid',
                            description: 'Token unique identifier (UUID v4)'
                        },
                        token: {
                            type: 'string',
                            description: 'Token value'
                        },
                        type: {
                            type: 'string',
                            description: 'Token type (e.g., "pro", "premium")',
                            example: 'pro'
                        },
                        start_date: {
                            type: 'string',
                            format: 'date-time',
                            description: 'Token activation date'
                        },
                        finish_date: {
                            type: 'string',
                            format: 'date-time',
                            description: 'Token expiration date'
                        }
                    }
                },
                BackupCode: {
                    type: 'object',
                    description: 'Backup code for 2FA recovery',
                    properties: {
                        id: {
                            type: 'string',
                            format: 'uuid',
                            description: 'Backup code unique identifier (UUID v4)'
                        },
                        user_id: {
                            type: 'string',
                            format: 'uuid',
                            description: 'User ID owner of this backup code'
                        },
                        code: {
                            type: 'string',
                            description: '8-character hexadecimal backup code',
                            example: 'A1B2C3D4'
                        },
                        used: {
                            type: 'boolean',
                            description: 'Whether this code has been used',
                            example: false
                        },
                        created_at: {
                            type: 'string',
                            format: 'date-time'
                        },
                        used_at: {
                            type: 'string',
                            format: 'date-time',
                            nullable: true,
                            description: 'Timestamp when code was used'
                        }
                    }
                },
                Role: {
                    type: 'object',
                    properties: {
                        id: {
                            type: 'integer',
                            description: 'Role ID: 1=admin, 2=user, 3=pro'
                        },
                        name: {
                            type: 'string',
                            description: 'Role name'
                        }
                    }
                },
                SettingsIcons: {
                    type: 'object',
                    description: 'User visual preferences for icon display (not literal icons, but style preferences)',
                    properties: {
                        id: {
                            type: 'string',
                            format: 'uuid',
                            description: 'Settings unique identifier (UUID v4)'
                        },
                        icon: {
                            type: 'string',
                            nullable: true,
                            description: 'Visual style preference (e.g., "light", "dark", "outline", "filled")',
                            example: 'light'
                        },
                        layer: {
                            type: 'string',
                            nullable: true,
                            description: 'Layer or variant identifier for icon display (e.g., "solid", "outline", "duotone")',
                            example: 'solid'
                        }
                    }
                },
                Error: {
                    type: 'object',
                    properties: {
                        success: {
                            type: 'boolean',
                            example: false
                        },
                        message: {
                            type: 'string',
                            description: 'Error message'
                        }
                    }
                },
                Success: {
                    type: 'object',
                    properties: {
                        success: {
                            type: 'boolean',
                            example: true
                        },
                        message: {
                            type: 'string',
                            description: 'Success message'
                        },
                        data: {
                            type: 'object',
                            description: 'Response data'
                        }
                    }
                }
            }
        },
        security: [
            {
                bearerAuth: []
            }
        ]
    },
    apis: ['./routes/*.js', './controllers/*.js', './server.js', './app.js']
};

const swaggerDocs = swaggerJsDoc(swaggerOptions);

// Configuración personalizada de Swagger UI
const swaggerUiOptions = {
    swaggerOptions: {
        persistAuthorization: true, // Mantiene el token entre recargas
    },
    customCss: `
        .swagger-ui .topbar { display: none }
        .swagger-ui .info { margin: 20px 0; }
        .swagger-ui .scheme-container { 
            background: #fafafa; 
            padding: 15px; 
            border-radius: 4px;
            margin: 20px 0;
        }
        .swagger-ui .btn.authorize { 
            background: #4990e2;
            border-color: #4990e2;
        }
        .swagger-ui .btn.authorize:hover { 
            background: #357abd;
            border-color: #357abd;
        }
        .info-container {
            background: #e8f5e9;
            padding: 15px;
            border-radius: 4px;
            margin: 20px 0;
            border-left: 4px solid #4caf50;
        }
    `,
    customJs: '/swagger-custom.js', // Script personalizado para auto-login
    customSiteTitle: 'zCorvus API Documentation',
    customfavIcon: '/favicon.ico'
};

module.exports = { swaggerUi, swaggerDocs, swaggerUiOptions };
