const { SlashCommandBuilder } = require('discord.js');
const Logger = require('../../utils/logger');
const { getQueue, pauseTrack, resumeTrack } = require('../../utils/lavalinkQueue');
const { createMessageCommandContext } = require('../../utils/commandContext');
const { createSuccessEmbed, createErrorEmbed } = require('../../utils/embeds');
const { freezeProgressClock, resumeProgressClock } = require('../../utils/progressUpdater');

function isLavalinkAvailable(client) {
    return Boolean(
        client.lavalinkManager &&
        typeof client.lavalinkManager.useable === 'boolean' &&
        client.lavalinkManager.useable
    );
}

module.exports = {
    name: 'resume',
    description: 'Pausa o reanuda la música',
    data: new SlashCommandBuilder()
        .setName('resume')
        .setDescription('Reanuda la música pausada')
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

        try {
            if (llQueue.isPaused) {
                await resumeTrack(client.lavalinkManager, guildId);
                resumeProgressClock(guildId);
                Logger.music(`▶️ Reanudado por ${ctx.user.tag}`, 'resume.js');
                return ctx.reply({ embeds: [createSuccessEmbed('▶️ Música reanudada')] });
            } else {
                await pauseTrack(client.lavalinkManager, guildId);
                freezeProgressClock(guildId);
                Logger.music(`⏸️ Pausado por ${ctx.user.tag}`, 'resume.js');
                return ctx.reply({ embeds: [createSuccessEmbed('⏸️ Música pausada')] });
            }
        } catch (error) {
            Logger.error('Error en resume (Lavalink)', error, 'resume.js');
            return ctx.reply({ embeds: [createErrorEmbed('Error de reproducción', 'No se pudo cambiar el estado de reproducción.')] });
        }
    }
};