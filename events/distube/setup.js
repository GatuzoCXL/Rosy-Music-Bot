module.exports = (client) => {
    // Aumentar el límite de listeners
    client.distube.setMaxListeners(25);

    // **Eliminar el manejador duplicado de 'error'**
    /*
    client.distube.on('error', (channel, error) => {
        console.error('[Error]', error);
        if (channel) channel.send(`❌ Error: ${error.message.slice(0, 1979)}`);
    });
    */

    // Manejo de desconexión
    client.distube.on('disconnect', queue => {
        queue.textChannel?.send('🔌 Desconectado del canal de voz.');
    });

    // Manejar errores de reproducción
    client.distube.on('playSong', (queue, song) => {
        // Reiniciar el stream si hay error
        if (queue.connection) {
            queue.connection.on('stateChange', (oldState, newState) => {
                if (newState.status === 'idle' || newState.status === 'disconnected') {
                    queue.resume();
                }
            });
        }
    });
};
