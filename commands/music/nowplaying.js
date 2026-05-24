const { SlashCommandBuilder } = require('discord.js');
const Logger = require('../../utils/logger');
const { getQueue } = require('../../utils/lavalinkQueue');
const { createMessageCommandContext } = require('../../utils/commandContext');
const { createNowPlayingEmbed } = require('../../utils/embeds');
const { getCalculatedPosition } = require('../../utils/progressUpdater');

function isLavalinkAvailable(client) {
    return Boolean(
        client.lavalinkManager &&
        typeof client.lavalinkManager.useable === 'boolean' &&
        client.lavalinkManager.useable
    );
}

module.exports = {
    name: 'nowplaying',
    description: 'Muestra la canción que está sonando actualmente',
    data: new SlashCommandBuilder()
        .setName('nowplaying')
        .setDescription('Muestra la canción que está sonando actualmente')
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
        if (!llQueue || !llQueue.current) {
            return ctx.reply('❌ No hay nada reproduciéndose.');
        }

        const currentTime = getCalculatedPosition(guildId);

        const queueInfo = {
            currentTime,
            paused: llQueue.isPaused,
            volume: llQueue.volume,
            repeatMode: llQueue.repeatMode,
            songs: llQueue.songs || []
        };

        const embed = createNowPlayingEmbed(llQueue.current, queueInfo);

        Logger.music(`📋 Nowplaying por ${ctx.user.tag}`, 'nowplaying.js');
        return ctx.reply({ embeds: [embed] });
    }
};