module.exports = {
    name: 'resume',
    description: 'Pausa o reanuda la música',
    async execute(message, args, client) {
        const queue = client.distube.getQueue(message);
        if (!queue) return message.reply('❌ ¡No hay nada reproduciéndose!');

        if (queue.paused) {
            queue.resume();
            return message.reply('▶️ ¡Música reanudada!');
        }
        
        queue.pause();
        message.reply('⏸️ ¡Música pausada!');
    }
};
