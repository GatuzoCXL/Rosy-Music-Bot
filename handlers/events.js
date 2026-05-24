const fs = require('fs');
const path = require('path');
const Logger = require('../utils/logger');

module.exports = (client) => {
    const clientEventsPath = path.join(__dirname, '../events/client');
    if (fs.existsSync(clientEventsPath)) {
        const clientEventFiles = fs.readdirSync(clientEventsPath).filter(file => file.endsWith('.js') && file !== 'messageCreate.js');
        
        for (const file of clientEventFiles) {
            const filePath = path.join(clientEventsPath, file);
            const event = require(filePath);
            if (typeof event === 'function') {
                event(client);
                Logger.success(`Evento de cliente cargado: ${file}`, 'events.js');
            }
        }
    }
};
