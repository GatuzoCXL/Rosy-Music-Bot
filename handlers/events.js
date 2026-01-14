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

    const distubeEventsPath = path.join(__dirname, '../events/distube');
    if (fs.existsSync(distubeEventsPath)) {
        const distubeEventFiles = fs.readdirSync(distubeEventsPath).filter(file => file.endsWith('.js'));
        
        for (const file of distubeEventFiles) {
            const filePath = path.join(distubeEventsPath, file);
            const event = require(filePath);
            if (typeof event === 'function') {
                event(client);
                Logger.success(`Evento de DisTube cargado: ${file}`, 'events.js');
            }
        }
    }
};
