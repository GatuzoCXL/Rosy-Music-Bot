const { SlashCommandBuilder } = require('discord.js');
const { createSuccessEmbed, createErrorEmbed } = require('../../utils/embeds');
const Logger = require('../../utils/logger');
const { shuffleTrack } = require('../../utils/lavalinkQueue');
const { createMessageCommandContext } = require('../../utils/commandContext');

function isLavalinkAvailable(client) {
    return Boolean(
        client.lavalinkManager &&
        typeof client.lavalinkManager.useable === 'boolean' &&
        client.lavalinkManager.useable
    );
}

module.exports = {
    name: 'shuffle',
    description: 'Mezcla la cola de reproducción',
    data: new SlashCommandBuilder()
        .setName('shuffle')
        .setDescription('Mezcla la cola de reproducción')
        .setDMPermission(false),
    async execute(message, args, client) {
        const ctx = createMessageCommandContext(message, args);
        return this.executeContext(ctx, client);
    },
    async executeContext(ctx, client) {
        const guildId = ctx.guild.id;

        if (!isLavalinkAvailable(client)) {
            return ctx.reply('❌ Lavalink no está disponible');
        }

        try {
            const result = await shuffleTrack(client.lavalinkManager, guildId);

            if (!result.shuffled) {
                return ctx.reply({ embeds: [createErrorEmbed('No se pudo mezclar', result.reason || 'No se pudo mezclar la cola.')] });
            }

            Logger.music(`🔀 Cola mezclada por ${ctx.user.tag}`, 'shuffle.js');
            return ctx.reply({ embeds: [createSuccessEmbed('🔀 Cola mezclada')] });
        } catch (error) {
            Logger.error('Error en shuffle', error, 'shuffle.js');
            return ctx.reply({ embeds: [createErrorEmbed('Error al mezclar', 'No se pudo mezclar la cola.')] });
        }
    }
};