module.exports = {
    name: 'skip',
    description: 'Salta a la siguiente canción o a una posición específica en la cola',
    async execute(message, args, client) {
        const queue = client.distube.getQueue(message);
        if (!queue) return message.reply('❌ ¡No hay nada reproduciéndose!');
        
        try {
            if (args.length > 0) {
                const position = parseInt(args[0]);
                if (!isNaN(position) && position > 1 && position <= queue.songs.length) {
                    // Saltar a una posición específica
                    queue.jump(position - 1); // Utilizar el método 'jump' de DisTube
                    return message.reply(`⏭️ Saltando a: \`${queue.songs[position - 1].name}\``);
                } else {
                    return message.reply('❌ Posición inválida.');
                }
            }

            queue.skip();
            message.reply('⏭️ ¡Canción saltada!');
        } catch (e) {
            message.reply('❌ ¡No hay más canciones en la cola!');
        }
    }
};
