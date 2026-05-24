const { SlashCommandBuilder } = require('discord.js');
const Logger = require('../../utils/logger');
const { getQueue, pauseTrack } = require('../../utils/lavalinkQueue');
const { createMessageCommandContext } = require('../../utils/commandContext');
const { createSuccessEmbed, createErrorEmbed, createWarningEmbed } = require('../../utils/embeds');
const { freezeProgressClock } = require('../../utils/progressUpdater');

function isLavalinkAvailable(client) {
    return Boolean(
        client.lavalinkManager &&
        typeof client.lavalinkManager.useable === 'boolean' &&
        client.lavalinkManager.useable
    );
}

module.exports = {
    name: 'pause',
    description: 'Pausa la música actual',
    data: new SlashCommandBuilder()
        .setName('pause')
        .setDescription('Pausa la música actual')
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

        const llQueue = await getQueue(client.lavalinkManager, guildId);
        if (!llQueue) {
            return ctx.reply('❌ No hay nada reproduciéndose');
        }

        if (llQueue.isPaused) {
            return ctx.reply({ embeds: [createWarningEmbed('Música ya pausada', 'Usa `/resume` para reanudar')] });
        }

        try {
            await pauseTrack(client.lavalinkManager, guildId);
            freezeProgressClock(guildId);
            Logger.music(`⏸️ Pausado por ${ctx.user.tag}`, 'pause.js');
            return ctx.reply({ embeds: [createSuccessEmbed('⏸️ Música pausada')] });
        } catch (error) {
            Logger.error('Error en pause (Lavalink)', error, 'pause.js');
            return ctx.reply({ embeds: [createErrorEmbed('Error al pausar', 'No se pudo pausar la música.')] });
        }
    }
};