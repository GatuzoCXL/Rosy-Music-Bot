module.exports = (client) => {
    // Solo agregar eventos de depuración que no existan en index.js
    client.distube
        .on('initQueue', (queue) => {
            console.log('[QUEUE] Nueva cola iniciada');
            queue.autoplay = false;
            queue.volume = 100;
        })
        .on('disconnect', (queue) => {
            console.log('[DISCONNECT] Bot desconectado');
        })
        .on('finishSong', (queue, song) => {
            console.log(`[FINISH_SONG] Canción terminada: ${song.name}`);
        });
};
