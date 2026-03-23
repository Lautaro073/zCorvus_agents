const { parseTimeToMs, parseTimeToDays, parseTimeToSeconds } = require('../utils/time');

describe('Time Utils', () => {
    describe('parseTimeToMs', () => {
        it('should parse seconds correctly', () => {
            expect(parseTimeToMs('30s')).toBe(30 * 1000);
            expect(parseTimeToMs('1s')).toBe(1000);
            expect(parseTimeToMs('60s')).toBe(60000);
        });

        it('should parse minutes correctly', () => {
            expect(parseTimeToMs('5m')).toBe(5 * 60 * 1000);
            expect(parseTimeToMs('1m')).toBe(60 * 1000);
            expect(parseTimeToMs('30m')).toBe(30 * 60 * 1000);
        });

        it('should parse hours correctly', () => {
            expect(parseTimeToMs('2h')).toBe(2 * 60 * 60 * 1000);
            expect(parseTimeToMs('1h')).toBe(60 * 60 * 1000);
            expect(parseTimeToMs('24h')).toBe(24 * 60 * 60 * 1000);
        });

        it('should parse days correctly', () => {
            expect(parseTimeToMs('1d')).toBe(24 * 60 * 60 * 1000);
            expect(parseTimeToMs('7d')).toBe(7 * 24 * 60 * 60 * 1000);
            expect(parseTimeToMs('30d')).toBe(30 * 24 * 60 * 60 * 1000);
        });

        it('should parse plain numbers as milliseconds', () => {
            expect(parseTimeToMs('1000')).toBe(1000);
            expect(parseTimeToMs('5000')).toBe(5000);
        });

        it('should throw error for invalid format', () => {
            expect(() => parseTimeToMs('5x')).toThrow('Invalid time format');
            expect(() => parseTimeToMs('abc')).toThrow('Invalid time format');
            expect(() => parseTimeToMs('5 m')).toThrow('Invalid time format'); // con espacio
            expect(() => parseTimeToMs('')).toThrow('Time string is required');
        });
    });

    describe('parseTimeToDays', () => {
        it('should convert time to days', () => {
            expect(parseTimeToDays('1d')).toBe(1);
            expect(parseTimeToDays('7d')).toBe(7);
            expect(parseTimeToDays('24h')).toBe(1);
            expect(parseTimeToDays('48h')).toBe(2);
        });
    });

    describe('parseTimeToSeconds', () => {
        it('should convert time to seconds', () => {
            expect(parseTimeToSeconds('1m')).toBe(60);
            expect(parseTimeToSeconds('5m')).toBe(300);
            expect(parseTimeToSeconds('1h')).toBe(3600);
            expect(parseTimeToSeconds('30s')).toBe(30);
        });
    });
});
