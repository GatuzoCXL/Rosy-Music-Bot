const { SlashCommandBuilder } = require('discord.js');
const Logger = require('../../utils/logger');
const { stopPlayer } = require('../../utils/lavalinkQueue');
const { createMessageCommandContext } = require('../../utils/commandContext');
const { createSuccessEmbed, createErrorEmbed } = require('../../utils/embeds');

function isLavalinkAvailable(client) {
    return Boolean(
        client.lavalinkManager &&
        typeof client.lavalinkManager.useable === 'boolean' &&
        client.lavalinkManager.useable
    );
}

module.exports = {
    name: 'stop',
    description: 'Detiene la música y limpia la cola',
    data: new SlashCommandBuilder()
        .setName('stop')
        .setDescription('Detiene la música y limpia la cola')
        .setDMPermission(false),
    async execute(message, args, client) {
        const ctx = createMessageCommandContext(message, args);
        return this.executeContext(ctx, client);
    },
    async executeContext(ctx, client) {
        const guildId = ctx.guild.id;

        if (!isLavalinkAvailable(client)) {
            return ctx.reply('❌ Lavalink no está disponible.');
        }

        if (!client.lavalinkManager.getPlayer(guildId)) {
            return ctx.reply('❌ No hay nada reproduciéndose');
        }

        try {
            await stopPlayer(client.lavalinkManager, guildId);
            Logger.music(`⏹️ Detenido por ${ctx.user.tag}`, 'stop.js');
            return ctx.reply({ embeds: [createSuccessEmbed('⏹️ Música detenida', 'La reproducción y la cola se detuvieron.')] });
        } catch (error) {
            Logger.error('Error en stop (Lavalink)', error, 'stop.js');
            return ctx.reply({ embeds: [createErrorEmbed('Error al detener', 'No se pudo detener la música.')] });
        }
    }
};
