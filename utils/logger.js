class Logger {
    static getTimestamp() {
        const now = new Date();
        return now.toLocaleTimeString('es-ES', { hour12: false });
    }

    static music(message, location = '') {
        const loc = location ? ` | ${location}` : '';
        console.log(`[MUSIC] ${this.getTimestamp()}${loc} | ${message}`);
    }

    static distube(message, location = '') {
        const loc = location ? ` | ${location}` : '';
        console.log(`[DISTUBE] ${this.getTimestamp()}${loc} | ${message}`);
    }

    static voice(message, location = '') {
        const loc = location ? ` | ${location}` : '';
        console.log(`[VOICE] ${this.getTimestamp()}${loc} | ${message}`);
    }

    static error(message, error, location = '') {
        const loc = location ? ` | ${location}` : '';
        console.error(`[ERROR] ${this.getTimestamp()}${loc} | ${message}`);
        if (error?.stack) {
            console.error(error.stack);
        }
    }

    static warn(message, location = '') {
        const loc = location ? ` | ${location}` : '';
        console.warn(`[WARN] ${this.getTimestamp()}${loc} | ${message}`);
    }

    static success(message, location = '') {
        const loc = location ? ` | ${location}` : '';
        console.log(`[SUCCESS] ${this.getTimestamp()}${loc} | ${message}`);
    }

    static info(message, location = '') {
        const loc = location ? ` | ${location}` : '';
        console.log(`[INFO] ${this.getTimestamp()}${loc} | ${message}`);
    }

    static command(commandName, user, guild) {
        console.log(`[COMMAND] ${this.getTimestamp()} | ${commandName} ejecutado por ${user} en ${guild}`);
    }
}

module.exports = Logger;
