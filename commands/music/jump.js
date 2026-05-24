const { SlashCommandBuilder } = require('discord.js');
const Logger = require('../../utils/logger');
const { getQueue, jumpToTrack } = require('../../utils/lavalinkQueue');
const { createMessageCommandContext } = require('../../utils/commandContext');
const { createSuccessEmbed, createErrorEmbed, createWarningEmbed, createNoMusicEmbed, createLavalinkUnavailableEmbed } = require('../../utils/embeds');

function isLavalinkAvailable(client) {
    return Boolean(
        client.lavalinkManager &&
        typeof client.lavalinkManager.useable === 'boolean' &&
        client.lavalinkManager.useable
    );
}

module.exports = {
    name: 'jump',
    description: 'Salta a una posición específica en la cola',
    data: new SlashCommandBuilder()
        .setName('jump')
        .setDescription('Salta a una posición específica en la cola')
        .setDMPermission(false)
        .addIntegerOption(option =>
            option
                .setName('posicion')
                .setDescription('Posición en la cola (1 = actual)')
                .setRequired(true)
                .setMinValue(1)
        ),
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

        const position = ctx.options.getInteger('posicion');
        if (position === null) {
            return ctx.reply({ embeds: [createWarningEmbed('Posición inválida', 'Debes especificar una posición entre 1 y N.')] });
        }

        if (position < 1 || position > llQueue.length) {
            return ctx.reply({ embeds: [createWarningEmbed('Posición inválida', 'Debes especificar una posición entre 1 y N.')] });
        }

        if (position === 1) {
            return ctx.reply({ embeds: [createWarningEmbed('Canción actual', 'Ya estás en la canción actual.')] });
        }

        try {
            await jumpToTrack(client.lavalinkManager, guildId, position);
            const nextSong = llQueue.songs[position - 1];
            const trackTitle = nextSong?.info?.title || 'Canción desconocida';
            Logger.music(`⏭️ Saltando a posición ${position} por ${ctx.user.tag}`, 'jump.js');
            return ctx.reply({ embeds: [createSuccessEmbed('⏭️ Salto', `**${trackTitle}**`)] });
        } catch (error) {
            Logger.error('Error en jump', error, 'jump.js');
            return ctx.reply({ embeds: [createErrorEmbed('Error al saltar', 'No se pudo saltar a esa posición.')] });
        }
    }
};