module.exports = {
    name: 'pause',
    description: 'Pausa la música actual',
    async execute(message, args, client) {
        const queue = client.distube.getQueue(message);
        if (!queue) return message.reply('❌ ¡No hay nada reproduciéndose!');
        
        if (queue.paused) {
            return message.reply('⚠️ ¡La música ya está pausada! Usa !resume para reanudar.');
        }

        queue.pause();
        message.reply('⏸️ ¡Música pausada!');
    }
};
