const { SlashCommandBuilder } = require('discord.js');
const { createErrorEmbed, createSuccessEmbed } = require('../../utils/embeds');
const Logger = require('../../utils/logger');
const lavalinkQueue = require('../../utils/lavalinkQueue');
const { createMessageCommandContext } = require('../../utils/commandContext');

function isLavalinkAvailable(client) {
    return Boolean(
        client.lavalinkManager &&
        typeof client.lavalinkManager.useable === 'boolean' &&
        client.lavalinkManager.useable
    );
}

module.exports = {
    name: 'skip',
    description: 'Salta a la siguiente canción o a una posición específica en la cola',
    data: new SlashCommandBuilder()
        .setName('skip')
        .setDescription('Salta a la siguiente canción o a una posición específica en la cola')
        .setDMPermission(false)
        .addIntegerOption(option =>
            option
                .setName('posicion')
                .setDescription('Posición en la cola (1 = actual)')
                .setRequired(false)
                .setMinValue(1)
        ),
    async execute(message, args, client) {
        const ctx = createMessageCommandContext(message, args);
        return this.executeContext(ctx, client);
    },
    async executeContext(ctx, client) {
        const guildId = ctx.guild.id;

        if (!isLavalinkAvailable(client)) {
            return ctx.reply('❌ Lavalink no está disponible. No se puede saltar.');
        }

        const queue = await lavalinkQueue.getQueue(client.lavalinkManager, guildId);
        if (!queue) {
            return ctx.reply('❌ No hay nada reproduciéndose');
        }

        const position = ctx.options.getInteger('posicion');

        try {
            const songs = queue.songs;

            if (position !== null) {
                if (position < 1 || position > songs.length) {
                    return ctx.reply('❌ Posición inválida.');
                }

                if (position === 1) {
                    return ctx.reply('Ya estás en la canción actual. Usa `/skip` sin número para saltar.');
                }

                const tracksToRemove = position - 2;
                for (let i = 0; i < tracksToRemove; i++) {
                    lavalinkQueue.removeFromQueue(client.lavalinkManager, guildId, 0);
                }
                await lavalinkQueue.skipTrack(client.lavalinkManager, guildId);
                const nextSong = lavalinkQueue.getCurrentTrack(client.lavalinkManager, guildId);
                return ctx.reply(`⏭️ Saltando a: \`${nextSong?.info?.title || 'Canción desconocida'}\``);
            }

            const currentSong = songs[0];
            await lavalinkQueue.skipTrack(client.lavalinkManager, guildId);
            Logger.music(`⏭️ Saltado "${currentSong?.info?.title || currentSong?.name || 'canción'}" por ${ctx.user.tag}`, 'skip.js');
            return ctx.reply({ embeds: [createSuccessEmbed('⏭️ Canción saltada')] });

        } catch (error) {
            if (error.message?.includes('no hay player activo') ||
                error.message?.includes('no hay siguiente')) {
                return ctx.reply({ embeds: [createErrorEmbed('No hay más canciones', 'No hay más canciones en la cola.')] });
            }
            Logger.error('Error en skip (Lavalink)', error, 'skip.js');
            return ctx.reply({ embeds: [createErrorEmbed('Error al saltar', 'No se pudo saltar la canción.')] });
        }
    }
};
