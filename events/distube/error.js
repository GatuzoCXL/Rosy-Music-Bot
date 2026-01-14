const { createErrorEmbed } = require('../../utils/embeds');
const Logger = require('../../utils/logger');

module.exports = (client) => {
    client.distube.on('error', (queue, error) => {
        Logger.error('Error en DisTube', error, 'error.js');
        
        if (!queue?.textChannel) return;

        let errorTitle = 'Error de reproducción';
        let errorDescription = error.message || 'Error desconocido';

        if (error.message?.includes('VOICE_CONNECT_FAILED')) {
            errorTitle = 'No se pudo conectar al canal de voz';
            errorDescription = '**Posibles soluciones:**\n' +
                '• Verifica que el bot tenga permisos de voz\n' +
                '• Intenta reinvitar al bot al servidor\n' +
                '• Verifica tu conexión a internet';
        } else if (error.message?.includes('Video unavailable') || error.message?.includes('not found')) {
            errorTitle = 'Canción no disponible';
            errorDescription = 'Esta canción no se pudo encontrar o no está disponible.\n💡 Intenta con otra canción o URL.';
        } else if (error.message?.includes('PERMISSION') || error.message?.includes('Missing Permissions')) {
            errorTitle = 'Permisos insuficientes';
            errorDescription = 'El bot no tiene permisos necesarios para reproducir audio.\n💡 Contacta al administrador del servidor.';
        } else if (error.message?.includes('age restricted')) {
            errorTitle = 'Contenido restringido por edad';
            errorDescription = 'Esta canción tiene restricción de edad y no puede reproducirse.\n💡 Intenta con otra canción.';
        }

        const embed = createErrorEmbed(errorTitle, errorDescription);
        queue.textChannel.send({ embeds: [embed] }).catch(() => {});
    });
};
