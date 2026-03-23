const { client } = require('../config/database');

afterAll(async () => {
    // LibSQL/Turso no necesita cerrar la conexión como MySQL
    // El cliente se cierra automáticamente al finalizar el proceso
});
