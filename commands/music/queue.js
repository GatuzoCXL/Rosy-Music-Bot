module.exports = {
    name: 'queue',
    description: 'Muestra las canciones en la cola',
    async execute(message, args, client) {
        const queue = client.distube.getQueue(message);

        if (!queue) {
            return message.reply('❌ No hay ninguna canción reproduciéndose.');
        }

        const songList = queue.songs.map((song, index) => `${index === 0 ? '🎶 Ahora' : `${index}.`} ${song.name}`).join('\n');

        message.channel.send(`🎵 **Canciones en la cola:**\n${songList}`);
    }
};
