const { createNowPlayingEmbed, createAddedToQueueEmbed, createQueueEmbed } = require('../../utils/embeds');
const { createMusicButtons, createVolumeButtons } = require('../../utils/musicControls');
const { startProgressUpdater } = require('../../utils/progressUpdater');
const Logger = require('../../utils/logger');

module.exports = (client) => {
    client.distube.on('playSong', async (queue, song) => {
        try {
            const embed = createNowPlayingEmbed(song, queue);
            const musicButtons = createMusicButtons();
            const volumeButtons = createVolumeButtons();

            const message = await queue.textChannel.send({
                embeds: [embed],
                components: [musicButtons, volumeButtons]
            });

            startProgressUpdater(message, queue, song);
            
            Logger.distube(`▶️ Reproduciendo: "${song.name}" [${song.formattedDuration}]`, 'playSong.js');
            Logger.music(`Pedido por ${song.user.tag} en ${queue.textChannel.guild.name}`, 'playSong.js');
        } catch (error) {
            Logger.error('Error en playSong', error, 'playSong.js');
            queue.textChannel.send('❌ Error al mostrar la información de la canción').catch(() => {});
        }
    });
};
