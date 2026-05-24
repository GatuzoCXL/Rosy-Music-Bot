const { SlashCommandBuilder } = require('discord.js');
const Logger = require('../../utils/logger');
const { getQueue, removeFromQueue } = require('../../utils/lavalinkQueue');
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
    name: 'remove',
    description: 'Remueve una canción de la cola por su posición',
    data: new SlashCommandBuilder()
        .setName('remove')
        .setDescription('Remueve una canción de la cola por su posición')
        .setDMPermission(false)
        .addIntegerOption(option =>
            option
                .setName('posicion')
                .setDescription('Posición en la cola (1 = actual, no removable)')
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
            return ctx.reply({ embeds: [createWarningEmbed('Posición inválida', 'Debes especificar una posición válida.')] });
        }

        if (position === 1) {
            return ctx.reply({ embeds: [createWarningEmbed('Canción actual', 'No puedes remover la canción en reproducción. Usa `/skip` para saltarla.')] });
        }

        if (position < 1 || position > llQueue.length) {
            return ctx.reply({ embeds: [createWarningEmbed('Posición inválida', 'Especifica una posición válida.')] });
        }

        try {
            const queueIndex = position - 2;
            const removed = removeFromQueue(client.lavalinkManager, guildId, queueIndex);

            if (!removed) {
                return ctx.reply({ embeds: [createErrorEmbed('Error al remover', 'No se pudo remover la canción.')] });
            }

            const removedTitle = removed?.info?.title || 'Canción desconocida';
            Logger.music('\u{1F5D1} Removido "' + removedTitle + '" de cola por ' + ctx.user.tag, 'remove.js');
            return ctx.reply({ embeds: [createSuccessEmbed('\u{1F5D1} Removido', '**' + removedTitle + '** fue removida de la cola.')] });
        } catch (error) {
            Logger.error('Error en remove', error, 'remove.js');
            return ctx.reply({ embeds: [createErrorEmbed('Error al remover', 'No se pudo remover la canción.')] });
        }
    }
};