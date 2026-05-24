const { SlashCommandBuilder } = require('discord.js');
const { createInfoEmbed } = require('../../utils/embeds');
const { createMessageCommandContext } = require('../../utils/commandContext');

module.exports = {
    name: 'help',
    description: 'Muestra todos los comandos disponibles',
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('Muestra todos los comandos disponibles')
        .setDMPermission(false),
    async execute(message, args, client) {
        const ctx = createMessageCommandContext(message, args);
        return this.executeContext(ctx, client);
    },
    async executeContext(ctx, client) {
        const commands = client.commands.map(cmd => `\`/${cmd.name}\` - ${cmd.description}`).sort();

        const embed = createInfoEmbed(
            '🎵 Comandos Disponibles',
            commands.join('\n')
        );

        embed.addFields([
            {
                name: '📖 Ejemplos de Uso',
                value: '`/play the scientist` - Busca y reproduce la canción\n' +
                       '`/queue` - Muestra la cola de canciones\n' +
                       '`/skip` - Salta a la siguiente canción\n' +
                       '`/volume 50` - Establece volumen al 50%\n' +
                       '`/status` - Muestra el estado del bot',
                inline: false
            },
            {
                name: '⚡ Requisitos',
                value: '• Debes estar en un canal de voz\n' +
                       '• El bot debe estar en el mismo servidor\n' +
                       '• El bot necesita permisos de voz',
                inline: false
            }
        ]);

        embed.setFooter({ text: 'Escribe /status para ver el estado actual del bot' });

        return ctx.reply({ embeds: [embed] });
    }
};