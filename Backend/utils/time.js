/**
 * Parsear string de tiempo a milisegundos
 * Soporta: s (segundos), m (minutos), h (horas), d (días)
 * Ejemplos: '5m', '30s', '2h', '7d', '10d'
 */
const parseTimeToMs = (timeString) => {
    if (!timeString) {
        throw new Error('Time string is required');
    }

    // Si es un número puro, asumir milisegundos
    if (!isNaN(timeString)) {
        return parseInt(timeString);
    }

    const regex = /^(\d+)([smhd])$/;
    const match = timeString.match(regex);

    if (!match) {
        throw new Error(`Invalid time format: ${timeString}. Use format like '5m', '30s', '2h', '7d'`);
    }

    const value = parseInt(match[1]);
    const unit = match[2];

    const multipliers = {
        s: 1000,           // segundos
        m: 60 * 1000,      // minutos
        h: 60 * 60 * 1000, // horas
        d: 24 * 60 * 60 * 1000 // días
    };

    return value * multipliers[unit];
};

/**
 * Parsear string de tiempo a días
 * Útil para mostrar información al usuario
 */
const parseTimeToDays = (timeString) => {
    const ms = parseTimeToMs(timeString);
    return ms / (24 * 60 * 60 * 1000);
};

/**
 * Parsear string de tiempo a segundos
 */
const parseTimeToSeconds = (timeString) => {
    const ms = parseTimeToMs(timeString);
    return ms / 1000;
};

module.exports = {
    parseTimeToMs,
    parseTimeToDays,
    parseTimeToSeconds
};
