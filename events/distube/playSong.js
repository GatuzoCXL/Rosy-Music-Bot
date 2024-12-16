const status = (queue) =>
    `Volumen: \`${queue.volume}%\` | Filtro: \`${queue.filters.names.join(', ') || 'Off'}\` | Loop: \`${
        queue.repeatMode ? (queue.repeatMode === 2 ? 'All Queue' : 'This Song') : 'Off'
    }\` | Autoplay: \`${queue.autoplay ? 'On' : 'Off'}\``;

module.exports = (client) => {
    client.distube.on('playSong', (queue, song) => {
        queue.textChannel.send(
            `🎵 Reproduciendo \`${song.name}\` - \`${song.formattedDuration}\`\nPedido por: ${song.user}\n${status(queue)}`
        );
    });
};
