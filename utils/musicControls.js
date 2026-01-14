const { ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');
const Logger = require('./logger');

function createMusicButtons() {
    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('music_pause')
                .setEmoji('⏸️')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('music_resume')
                .setEmoji('▶️')
                .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId('music_skip')
                .setEmoji('⏭️')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('music_stop')
                .setEmoji('⏹️')
                .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
                .setCustomId('music_loop')
                .setEmoji('🔁')
                .setStyle(ButtonStyle.Secondary)
        );
    
    return row;
}

function createVolumeButtons() {
    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('volume_down')
                .setLabel('-10%')
                .setEmoji('🔉')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('volume_up')
                .setLabel('+10%')
                .setEmoji('🔊')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('volume_mute')
                .setLabel('Silenciar')
                .setEmoji('🔇')
                .setStyle(ButtonStyle.Danger)
        );
    
    return row;
}

async function handleMusicButton(interaction, client) {
    const queue = client.distube.getQueue(interaction.guildId);
    
    if (!queue) {
        return interaction.reply({ 
            content: '❌ No hay música reproduciéndose', 
            flags: MessageFlags.Ephemeral
        });
    }

    const member = interaction.member;
    if (!member.voice.channel) {
        return interaction.reply({ 
            content: '❌ Debes estar en un canal de voz', 
            flags: MessageFlags.Ephemeral
        });
    }

    if (member.voice.channel.id !== queue.voiceChannel?.id) {
        return interaction.reply({ 
            content: '❌ Debes estar en el mismo canal de voz que el bot', 
            flags: MessageFlags.Ephemeral
        });
    }

    try {
        switch (interaction.customId) {
            case 'music_pause':
                if (queue.paused) {
                    await interaction.reply({ content: 'Ya está pausado', flags: MessageFlags.Ephemeral });
                } else {
                    queue.pause();
                    Logger.music(`⏸️ Pausado por ${member.user.tag}`, 'musicControls.js');
                    await interaction.reply({ content: '⏸️ Música pausada', flags: MessageFlags.Ephemeral });
                }
                break;

            case 'music_resume':
                if (!queue.paused) {
                    await interaction.reply({ content: 'Ya está reproduciéndose', flags: MessageFlags.Ephemeral });
                } else {
                    queue.resume();
                    Logger.music(`▶️ Reanudado por ${member.user.tag}`, 'musicControls.js');
                    await interaction.reply({ content: '▶️ Música reanudada', flags: MessageFlags.Ephemeral });
                }
                break;

            case 'music_skip':
                const song = queue.songs[0];
                await queue.skip();
                Logger.music(`⏭️ Saltado "${song.name}" por ${member.user.tag}`, 'musicControls.js');
                await interaction.reply({ content: `⏭️ Saltada: **${song.name}**`, flags: MessageFlags.Ephemeral });
                break;

            case 'music_stop':
                await queue.stop();
                Logger.music(`⏹️ Detenido por ${member.user.tag}`, 'musicControls.js');
                await interaction.reply({ content: '⏹️ Música detenida y cola limpiada', flags: MessageFlags.Ephemeral });
                break;

            case 'music_loop':
                const modes = ['desactivado', 'canción', 'cola'];
                const newMode = (queue.repeatMode + 1) % 3;
                queue.setRepeatMode(newMode);
                Logger.music(`🔁 Loop: ${modes[newMode]} por ${member.user.tag}`, 'musicControls.js');
                await interaction.reply({ 
                    content: `🔁 Loop de ${modes[newMode]}`, 
                    flags: MessageFlags.Ephemeral
                });
                break;

            case 'volume_up':
                const newVolUp = Math.min(queue.volume + 10, 100);
                queue.setVolume(newVolUp);
                Logger.music(`🔊 Volumen: ${newVolUp}% por ${member.user.tag}`, 'musicControls.js');
                await interaction.reply({ 
                    content: `🔊 Volumen: ${newVolUp}%`, 
                    flags: MessageFlags.Ephemeral
                });
                break;

            case 'volume_down':
                const newVolDown = Math.max(queue.volume - 10, 0);
                queue.setVolume(newVolDown);
                Logger.music(`🔉 Volumen: ${newVolDown}% por ${member.user.tag}`, 'musicControls.js');
                await interaction.reply({ 
                    content: `🔉 Volumen: ${newVolDown}%`, 
                    flags: MessageFlags.Ephemeral
                });
                break;

            case 'volume_mute':
                queue.setVolume(0);
                Logger.music(`🔇 Silenciado por ${member.user.tag}`, 'musicControls.js');
                await interaction.reply({ 
                    content: '🔇 Música silenciada', 
                    flags: MessageFlags.Ephemeral
                });
                break;
        }
    } catch (error) {
        Logger.error('Error en botón de música', error, 'musicControls.js');
        await interaction.reply({ 
            content: '❌ Error al procesar la acción', 
            flags: MessageFlags.Ephemeral
        });
    }
}

module.exports = {
    createMusicButtons,
    createVolumeButtons,
    handleMusicButton
};
