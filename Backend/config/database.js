const { createClient } = require('@libsql/client');
const config = require('./config');

// Crear cliente de Turso/LibSQL
const client = createClient({
    url: config.db.url,
    authToken: config.db.authToken
});

// Función para ejecutar queries
const query = async (sql, params = []) => {
    try {
        const result = await client.execute({
            sql,
            args: params
        });
        return result.rows;
    } catch (error) {
        console.error('Database query error:', error);
        throw error;
    }
};

// Función para obtener una conexión (para compatibilidad)
const getConnection = async () => {
    // LibSQL no usa conexiones del pool, retornamos el cliente
    return {
        execute: async (sql, params) => {
            const result = await client.execute({ sql, args: params });
            return [result.rows];
        },
        release: () => { }, // No-op para compatibilidad
        beginTransaction: async () => {
            // Para transacciones, LibSQL usa batch
            return client;
        }
    };
};

// Función para probar la conexión
const testConnection = async () => {
    try {
        await client.execute('SELECT 1');
        console.log('Database connected successfully');
        return true;
    } catch (error) {
        console.error('Error connecting to database:', error.message);
        return false;
    }
};

module.exports = {
    client,
    query,
    getConnection,
    testConnection
};
