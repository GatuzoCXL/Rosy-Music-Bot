const playdl = require('play-dl');

module.exports = {
    name: 'play',
    description: 'Reproduce una canción',
    async execute(message, args, client) {
        const voiceChannel = message.member.voice.channel;
        if (!voiceChannel) {
            return message.reply('¡Necesitas estar en un canal de voz!');
        }

        // Verificar permisos
        const permissions = voiceChannel.permissionsFor(client.user);
        if (!permissions.has('Connect') || !permissions.has('Speak')) {
            return message.reply('¡Necesito permisos para unirme y hablar en el canal de voz!');
        }

        const query = args.join(' ');
        if (!query) {
            return message.reply('¡Por favor proporciona una canción para reproducir!');
        }

        try {
            const { member, channel } = message;
            let songURL;

            // Verificar si el query es una URL
            if (playdl.yt_validate(query) === 'video') {
                songURL = query;
            } else {
                // Usar play-dl para buscar la canción
                const searchResult = await playdl.search(query, { limit: 1 });
                if (searchResult.length === 0) {
                    return message.reply(`❌ No se encontraron resultados para: \`${query}\`!`);
                }
                songURL = searchResult[0].url;
            }

            // Reproducir la canción con DisTube
            await client.distube.play(voiceChannel, songURL, {
                member,
                textChannel: channel,
                message
            });
        } catch (error) {
            console.error('Error en comando play:', error);
            message.channel.send(`❌ Error: ${error.message}`);
        }
    }
};
