const { SlashCommandBuilder } = require('discord.js');
const Logger = require('../../utils/logger');
const { getQueue, getPreviousTrack, getCurrentTrack, playTrackNext } = require('../../utils/lavalinkQueue');
const { createMessageCommandContext } = require('../../utils/commandContext');
const { createSuccessEmbed, createErrorEmbed, createNoMusicEmbed, createWarningEmbed, createLavalinkUnavailableEmbed } = require('../../utils/embeds');
const { popTrack, markBackRestoring } = require('../../utils/playbackHistory');

function isLavalinkAvailable(client) {
    return Boolean(
        client.lavalinkManager &&
        typeof client.lavalinkManager.useable === 'boolean' &&
        client.lavalinkManager.useable
    );
}

module.exports = {
    name: 'back',
    description: 'Reproduce la canción anterior',
    data: new SlashCommandBuilder()
        .setName('back')
        .setDescription('Reproduce la canción anterior')
        .setDMPermission(false),
    async execute(message, args, client) {
        const ctx = createMessageCommandContext(message, args);
        return this.executeContext(ctx, client);
    },
    async executeContext(ctx, client) {
        const guildId = ctx.guild.id;

        if (!isLavalinkAvailable(client)) {
            return ctx.reply({ embeds: [createLavalinkUnavailableEmbed()] });
        }

        const llQueue = await getQueue(client.lavalinkManager, guildId);
        if (!llQueue) {
            return ctx.reply({ embeds: [createNoMusicEmbed('No hay nada reproduciéndose.')] });
        }

        try {
            const currentTrack = getCurrentTrack(client.lavalinkManager, guildId);
            const previousFromHistory = popTrack(guildId, currentTrack);

            if (previousFromHistory) {
                markBackRestoring(guildId);

                try {
                    await playTrackNext(client.lavalinkManager, guildId, previousFromHistory, currentTrack);
                } catch (playError) {
                    Logger.error('back: playTrackNext falló', playError, 'back.js');
                    return ctx.reply({
                        embeds: [createErrorEmbed(
                            'No se pudo restaurar',
                            'No se pudo reproducir la canción anterior.'
                        )]
                    });
                }

                const trackTitle = previousFromHistory?.info?.title || 'Canción anterior';
                Logger.music(`⏮️ Volviendo a: "${trackTitle}" por ${ctx.user.tag}`, 'back.js');
                return ctx.reply({ embeds: [createSuccessEmbed('⏮️ Canción anterior', `**${trackTitle}**`)] });
            }

            const previousTrack = getPreviousTrack(client.lavalinkManager, guildId);

            if (!previousTrack) {
                Logger.music(`back: sin historial local ni Lavalink previousTrack para guild=${guildId}. Enviando embed informativo.`, 'back.js');
                return ctx.reply({
                    embeds: [createWarningEmbed(
                        'Sin canción anterior',
                        'No hay canción anterior disponible. Quizás usaste `/jump` recientemente y no hay pista previa que restaurar.'
                    )]
                });
            }

            markBackRestoring(guildId);

            try {
                await playTrackNext(client.lavalinkManager, guildId, previousTrack, currentTrack);
            } catch (playError) {
                Logger.error('back: playTrackNext falló', playError, 'back.js');
                return ctx.reply({
                    embeds: [createErrorEmbed(
                        'No se pudo restaurar',
                        'No se pudo reproducir la canción anterior.'
                    )]
                });
            }

            const trackTitle = previousTrack?.info?.title || 'Canción anterior';
            Logger.music(`⏮️ Volviendo a: "${trackTitle}" por ${ctx.user.tag}`, 'back.js');
            return ctx.reply({ embeds: [createSuccessEmbed('⏮️ Canción anterior', `**${trackTitle}**`)] });
        } catch (error) {
            Logger.error('Error en back', error, 'back.js');
            return ctx.reply({ embeds: [createErrorEmbed('Error al volver', 'No se pudo volver a la canción anterior.')] });
        }
    }
};