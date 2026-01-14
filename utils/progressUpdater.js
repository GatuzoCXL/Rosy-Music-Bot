const { createNowPlayingEmbed } = require('./embeds');
const { createMusicButtons, createVolumeButtons } = require('./musicControls');
const Logger = require('./logger');

const activeUpdaters = new Map();

function startProgressUpdater(message, queue, song) {
    if (activeUpdaters.has(queue.id)) {
        stopProgressUpdater(queue.id);
    }

    const updateInterval = setInterval(async () => {
        try {
            if (!queue || queue.stopped) {
                stopProgressUpdater(queue.id);
                return;
            }

            const embed = createNowPlayingEmbed(song, queue);
            const musicButtons = createMusicButtons();
            const volumeButtons = createVolumeButtons();

            await message.edit({
                embeds: [embed],
                components: [musicButtons, volumeButtons]
            }).catch(() => {
                stopProgressUpdater(queue.id);
            });
        } catch (error) {
            Logger.error('Error actualizando progreso', error, 'progressUpdater.js');
            stopProgressUpdater(queue.id);
        }
    }, 10000);

    activeUpdaters.set(queue.id, {
        interval: updateInterval,
        messageId: message.id
    });

    Logger.distube(`Iniciado actualizador de progreso para cola ${queue.id}`, 'progressUpdater.js');
}

function stopProgressUpdater(queueId) {
    const updater = activeUpdaters.get(queueId);
    if (updater) {
        clearInterval(updater.interval);
        activeUpdaters.delete(queueId);
        Logger.distube(`Detenido actualizador de progreso para cola ${queueId}`, 'progressUpdater.js');
    }
}

function stopAllUpdaters() {
    activeUpdaters.forEach((updater, queueId) => {
        clearInterval(updater.interval);
        Logger.distube(`Detenido actualizador para cola ${queueId}`, 'progressUpdater.js');
    });
    activeUpdaters.clear();
}

module.exports = {
    startProgressUpdater,
    stopProgressUpdater,
    stopAllUpdaters
};
