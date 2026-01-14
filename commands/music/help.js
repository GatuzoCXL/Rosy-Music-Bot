module.exports = {
    name: 'help',
    description: 'Muestra todos los comandos disponibles',
    async execute(message, args, client) {
        const commands = client.commands.map(cmd => `\`r!${cmd.name}\` - ${cmd.description}`).sort();
        
        message.reply({
            embeds: [{
                color: 0x0099FF,
                title: '🎵 Comandos Disponibles',
                description: commands.join('\n'),
                fields: [
                    {
                        name: '📖 Ejemplos de Uso',
                        value: '`r!play the scientist` - Busca y reproduce la canción\n' +
                               '`r!queue` - Muestra la cola de canciones\n' +
                               '`r!skip` - Salta a la siguiente canción\n' +
                               '`r!volume 50` - Establece volumen al 50%\n' +
                               '`r!status` - Muestra el estado del bot',
                        inline: false
                    },
                    {
                        name: '⚡ Requisitos',
                        value: '• Debes estar en un canal de voz\n' +
                               '• El bot debe estar en el mismo servidor\n' +
                               '• El bot necesita permisos de voz',
                        inline: false
                    }
                ],
                footer: { text: 'Escribe r!status para ver el estado actual del bot' }
            }]
        });
    }
};

