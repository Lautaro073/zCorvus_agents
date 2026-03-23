const { query } = require('../config/database');

/**
 * Ejecuta una consulta SELECT con parámetros
 * @param {string} table - Nombre de la tabla
 * @param {object} conditions - Condiciones WHERE como objeto {campo: valor}
 * @param {array} fields - Campos a seleccionar (default: ['*'])
 * @returns {Promise<array>} - Resultados de la consulta
 */
const select = async (table, conditions = {}, fields = ['*']) => {
    const fieldsList = fields.join(', ');
    const whereClause = Object.keys(conditions).length > 0
        ? 'WHERE ' + Object.keys(conditions).map(key => `${key} = ?`).join(' AND ')
        : '';

    const sql = `SELECT ${fieldsList} FROM ${table} ${whereClause}`;
    const values = Object.values(conditions);

    return await query(sql, values);
};

/**
 * Convierte valores Date a ISO string para SQLite
 */
const convertDateValues = (obj) => {
    const converted = {};
    for (const [key, value] of Object.entries(obj)) {
        if (value instanceof Date) {
            converted[key] = value.toISOString();
        } else {
            converted[key] = value;
        }
    }
    return converted;
};

/**
 * Ejecuta una consulta INSERT
 * @param {string} table - Nombre de la tabla
 * @param {object} data - Datos a insertar {campo: valor}
 * @returns {Promise<object>} - Resultado de la inserción
 */
const insert = async (table, data) => {
    const convertedData = convertDateValues(data);
    const fields = Object.keys(convertedData).join(', ');
    const placeholders = Object.keys(convertedData).map(() => '?').join(', ');
    const values = Object.values(convertedData);

    const sql = `INSERT INTO ${table} (${fields}) VALUES (${placeholders})`;

    return await query(sql, values);
};

/**
 * Ejecuta una consulta UPDATE
 * @param {string} table - Nombre de la tabla
 * @param {object} data - Datos a actualizar {campo: valor}
 * @param {object} conditions - Condiciones WHERE {campo: valor}
 * @returns {Promise<object>} - Resultado de la actualización
 */
const update = async (table, data, conditions) => {
    const convertedData = convertDateValues(data);
    const setClause = Object.keys(convertedData).map(key => `${key} = ?`).join(', ');
    const whereClause = Object.keys(conditions).map(key => `${key} = ?`).join(' AND ');

    const sql = `UPDATE ${table} SET ${setClause} WHERE ${whereClause}`;
    const values = [...Object.values(convertedData), ...Object.values(conditions)];

    return await query(sql, values);
};

/**
 * Ejecuta una consulta DELETE
 * @param {string} table - Nombre de la tabla
 * @param {object} conditions - Condiciones WHERE {campo: valor}
 * @returns {Promise<object>} - Resultado de la eliminación
 */
const deleteRow = async (table, conditions) => {
    const whereClause = Object.keys(conditions).map(key => `${key} = ?`).join(' AND ');

    const sql = `DELETE FROM ${table} WHERE ${whereClause}`;
    const values = Object.values(conditions);

    return await query(sql, values);
};

/**
 * Busca un registro por ID
 * @param {string} table - Nombre de la tabla
 * @param {number} id - ID del registro
 * @returns {Promise<object|null>} - Registro encontrado o null
 */
const findById = async (table, id) => {
    const results = await select(table, { id });
    return results.length > 0 ? results[0] : null;
};

/**
 * Busca un registro por un campo específico
 * @param {string} table - Nombre de la tabla
 * @param {string} field - Nombre del campo
 * @param {any} value - Valor a buscar
 * @returns {Promise<object|null>} - Registro encontrado o null
 */
const findByField = async (table, field, value) => {
    const results = await select(table, { [field]: value });
    return results.length > 0 ? results[0] : null;
};

module.exports = {
    select,
    insert,
    update,
    deleteRow,
    findById,
    findByField,
    query
};
