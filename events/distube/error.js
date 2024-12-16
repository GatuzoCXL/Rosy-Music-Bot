module.exports = (client) => {
    client.distube.on('error', (queue, error) => {
        console.error('[Error]', error);
        if (queue && queue.textChannel) {
            queue.textChannel.send(`❌ Error: ${error.message.slice(0, 1979)}`);
        }
    });
};
