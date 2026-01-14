const { EmbedBuilder } = require('discord.js');

const COLORS = {
    PLAYING: 0x00FF00,
    PAUSED: 0xFFAA00,
    ERROR: 0xFF0000,
    INFO: 0x0099FF,
    QUEUE: 0x9B59B6,
    SUCCESS: 0x00FF88
};

function createProgressBar(current, total, length = 20) {
    if (!total || total === 0) return '▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬';
    
    const progress = Math.min(current / total, 1);
    const filledLength = Math.floor(progress * length);
    const emptyLength = length - filledLength;
    
    const filled = '━'.repeat(filledLength);
    const empty = '─'.repeat(emptyLength);
    
    return `${filled}🔘${empty}`;
}

function formatDuration(seconds) {
    if (!seconds || seconds === 0) return '🔴 En vivo';
    
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    
    if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    return `${m}:${s.toString().padStart(2, '0')}`;
}

function createNowPlayingEmbed(song, queue) {
    const currentTime = queue?.currentTime || 0;
    const duration = song.duration || 0;
    
    const progressBar = createProgressBar(currentTime, duration);
    const timeDisplay = `${formatDuration(currentTime)} / ${formatDuration(duration)}`;
    
    const loopModes = ['❌ Desactivado', '🔂 Canción', '🔁 Cola'];
    const loopText = loopModes[queue?.repeatMode || 0];
    
    const embed = new EmbedBuilder()
        .setColor(queue?.paused ? COLORS.PAUSED : COLORS.PLAYING)
        .setTitle(queue?.paused ? '⏸️ Pausado' : '🎵 Reproduciendo ahora')
        .setDescription(`**[${song.name}](${song.url})**`)
        .addFields(
            { name: '📺 Canal', value: song.uploader?.name || 'Desconocido', inline: true },
            { name: '⏱️ Duración', value: formatDuration(duration), inline: true },
            { name: '📊 Volumen', value: `${queue?.volume || 100}%`, inline: true }
        )
        .addFields(
            { name: '\u200B', value: `${progressBar}\n${timeDisplay}`, inline: false }
        )
        .addFields(
            { name: '🔁 Repetir', value: loopText, inline: true },
            { name: '📝 En cola', value: `${queue?.songs?.length || 1} canción${queue?.songs?.length !== 1 ? 'es' : ''}`, inline: true }
        )
        .setFooter({ 
            text: `Pedido por ${song.user.tag}`,
            iconURL: song.user.displayAvatarURL({ dynamic: true })
        })
        .setTimestamp();
    
    if (song.thumbnail) embed.setThumbnail(song.thumbnail);
    
    return embed;
}

function createAddedToQueueEmbed(song, position) {
    const embed = new EmbedBuilder()
        .setColor(COLORS.SUCCESS)
        .setTitle('✅ Añadido a la cola')
        .setDescription(`**[${song.name}](${song.url})**`)
        .addFields(
            { name: '⏱️ Duración', value: formatDuration(song.duration), inline: true },
            { name: '📍 Posición', value: `#${position}`, inline: true }
        )
        .setFooter({ 
            text: `Pedido por ${song.user.tag}`,
            iconURL: song.user.displayAvatarURL({ dynamic: true })
        })
        .setTimestamp();
    
    if (song.thumbnail) embed.setThumbnail(song.thumbnail);
    
    return embed;
}

function createErrorEmbed(title, description, userFriendly = true) {
    const embed = new EmbedBuilder()
        .setColor(COLORS.ERROR)
        .setTitle(`❌ ${title}`)
        .setDescription(description)
        .setTimestamp();
    
    if (userFriendly) {
        embed.setFooter({ text: '💡 Si el problema persiste, contacta al administrador' });
    }
    
    return embed;
}

function createInfoEmbed(title, description) {
    return new EmbedBuilder()
        .setColor(COLORS.INFO)
        .setTitle(`ℹ️ ${title}`)
        .setDescription(description)
        .setTimestamp();
}

function createQueueEmbed(queue) {
    const currentSong = queue.songs[0];
    const upcomingSongs = queue.songs.slice(1, 11);
    
    let queueList = upcomingSongs.map((song, i) => 
        `**${i + 1}.** [${song.name}](${song.url}) \`${formatDuration(song.duration)}\``
    ).join('\n');
    
    if (queue.songs.length > 11) {
        queueList += `\n*...y ${queue.songs.length - 11} canciones más*`;
    }
    
    const embed = new EmbedBuilder()
        .setColor(COLORS.QUEUE)
        .setTitle('📜 Cola de Reproducción')
        .setDescription(`**Reproduciendo ahora:**\n[${currentSong.name}](${currentSong.url})\n\n**Próximas canciones:**\n${queueList || 'No hay más canciones en la cola'}`)
        .addFields(
            { name: '📊 Total', value: `${queue.songs.length} canciones`, inline: true },
            { name: '⏱️ Duración total', value: formatDuration(queue.duration), inline: true },
            { name: '🔁 Loop', value: queue.repeatMode === 2 ? 'Cola' : queue.repeatMode === 1 ? 'Canción' : 'Desactivado', inline: true }
        )
        .setTimestamp();
    
    if (currentSong.thumbnail) embed.setThumbnail(currentSong.thumbnail);
    
    return embed;
}

module.exports = {
    COLORS,
    createProgressBar,
    formatDuration,
    createNowPlayingEmbed,
    createAddedToQueueEmbed,
    createErrorEmbed,
    createInfoEmbed,
    createQueueEmbed
};
