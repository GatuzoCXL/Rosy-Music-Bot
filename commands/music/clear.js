const { SlashCommandBuilder } = require('discord.js');
const { createSuccessEmbed, createErrorEmbed } = require('../../utils/embeds');
const Logger = require('../../utils/logger');
const { getQueue, clearQueue } = require('../../utils/lavalinkQueue');
const { createMessageCommandContext } = require('../../utils/commandContext');

function isLavalinkAvailable(client) {
    return Boolean(
        client.lavalinkManager &&
        typeof client.lavalinkManager.useable === 'boolean' &&
        client.lavalinkManager.useable
    );
}

module.exports = {
    name: 'clear',
    description: 'Limpia la cola de reproducción',
    data: new SlashCommandBuilder()
        .setName('clear')
        .setDescription('Limpia la cola de reproducción')
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
            clearQueue(client.lavalinkManager, guildId);
            Logger.music(`🗑️ Cola limpiada por ${ctx.user.tag}`, 'clear.js');
            return ctx.reply({ embeds: [createSuccessEmbed('🗑️ Cola limpiada', 'La canción actual sigue sonando')] });
        } catch (error) {
            Logger.error('Error en clear', error, 'clear.js');
            return ctx.reply({ embeds: [createErrorEmbed('Error al limpiar', 'No se pudo limpiar la cola.')] });
        }
    }
};