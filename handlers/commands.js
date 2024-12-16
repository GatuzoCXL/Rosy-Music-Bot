const fs = require('fs');
const path = require('path');

module.exports = (client) => {
    const commandsPath = path.join(__dirname, '../commands');
    const commandFolders = fs.readdirSync(commandsPath);

    for (const folder of commandFolders) {
        const folderPath = path.join(commandsPath, folder);
        const commandFiles = fs.readdirSync(folderPath).filter(file => file.endsWith('.js'));
        
        for (const file of commandFiles) {
            const filePath = path.join(folderPath, file);
            const command = require(filePath);
            if (command.name) {
                client.commands.set(command.name, command);
                console.log(`Comando cargado: ${command.name}`);
            } else {
                console.warn(`El comando en ${filePath} no tiene una propiedad 'name'.`);
            }
        }
    }
};
