module.exports = {
    name: 'help',
    description: 'Muestra todos los comandos disponibles',
    async execute(message, args, client) {
        const commands = client.commands.map(cmd => `\`r!${cmd.name}\` - ${cmd.description}`);
        
        message.channel.send(`
🎵 **Comandos de Música Disponibles:**

${commands.join('\n')}

Para usar un comando, escribe r! seguido del nombre del comando.
Ejemplo: \`r!play\`, \`r!queue\`, etc.`);
    }
};
