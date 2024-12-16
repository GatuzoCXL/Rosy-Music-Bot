module.exports = {
    name: 'stop',
    description: 'Detiene la música y limpia la cola',
    async execute(message, args, client) {
        const queue = client.distube.getQueue(message);
        if (!queue) return message.reply('¡No hay nada reproduciéndose!');
        
        queue.stop();
        message.reply('⏹️ ¡Música detenida!');
    }
};
