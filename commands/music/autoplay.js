const { SlashCommandBuilder } = require('discord.js');
const { createSuccessEmbed, createErrorEmbed } = require('../../utils/embeds');
const Logger = require('../../utils/logger');
const { getQueue, getAutoplay, toggleAutoplay } = require('../../utils/lavalinkQueue');
const { createMessageCommandContext } = require('../../utils/commandContext');

function isLavalinkAvailable(client) {
    return Boolean(
        client.lavalinkManager &&
        typeof client.lavalinkManager.useable === 'boolean' &&
        client.lavalinkManager.useable
    );
}

module.exports = {
    name: 'autoplay',
    description: 'Activa o desactiva la reproducción automática',
    data: new SlashCommandBuilder()
        .setName('autoplay')
        .setDescription('Activa o desactiva la reproducción automática')
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
            const newState = toggleAutoplay(guildId);
            Logger.music(`Autoplay ${newState ? 'activado' : 'desactivado'} por ${ctx.user.tag}`, 'autoplay.js');
            if (newState) {
                return ctx.reply({ embeds: [createSuccessEmbed('✅ Autoplay activado', 'Se reproducirán canciones relacionadas automáticamente.')] });
            } else {
                return ctx.reply({ embeds: [createSuccessEmbed('Autoplay desactivado', 'Se han dejado de reproducir canciones relacionadas automáticamente.')] });
            }
        } catch (error) {
            Logger.error('Error en autoplay', error, 'autoplay.js');
            return ctx.reply({ embeds: [createErrorEmbed('Error de autoplay', 'No se pudo cambiar el estado de autoplay.')] });
        }
    }
};