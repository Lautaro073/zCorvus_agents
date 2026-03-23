const app = require('./app');
const config = require('./config/config');
const { testConnection } = require('./config/database');

const PORT = config.port || 3000;

// Iniciar servidor
const startServer = async () => {
    try {
        // Probar conexión a la base de datos
        await testConnection();

        // Iniciar servidor
        app.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
            console.log(`Environment: ${config.env}`);
            console.log(`API Docs: http://localhost:${PORT}/api-docs`);
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
};

startServer();
