const { v4: uuidv4 } = require('uuid');

/**
 * Generar UUID v4
 */
const generateUUID = () => {
    return uuidv4();
};

/**
 * Validar formato UUID
 */
const isValidUUID = (uuid) => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
};

module.exports = {
    generateUUID,
    isValidUUID
};
