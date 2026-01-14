const { handleMusicButton } = require('../../utils/musicControls');
const Logger = require('../../utils/logger');

module.exports = (client) => {
    client.on('interactionCreate', async (interaction) => {
        if (!interaction.isButton()) return;

        const buttonIds = [
            'music_pause', 'music_resume', 'music_skip', 'music_stop', 'music_loop',
            'volume_up', 'volume_down', 'volume_mute'
        ];

        if (buttonIds.includes(interaction.customId)) {
            Logger.music(`Botón presionado: ${interaction.customId} por ${interaction.user.tag}`, 'interactionCreate.js');
            await handleMusicButton(interaction, client);
        }
    });
};
