module.exports = {
    name: 'volume',
    description: 'Ajusta el volumen de la música (0-100)',
    async execute(message, args, client) {
        const queue = client.distube.getQueue(message);
        if (!queue) return message.reply('❌ ¡No hay nada reproduciéndose!');

        const volume = parseInt(args[0]);
        if (isNaN(volume)) {
            return message.reply(`🔊 Volumen actual: \`${queue.volume}%\``);
        }

        if (volume < 0 || volume > 100) {
            return message.reply('❌ ¡Por favor especifica un número entre 0 y 100!');
        }

        queue.setVolume(volume);
        message.reply(`🔊 Volumen ajustado a: \`${volume}%\``);
    }
};
