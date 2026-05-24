'use strict';

// Player Panel Button Builders — pure view primitives (no circular deps).
const { ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } = require('discord.js');

function createTransportButtons(isPaused) {
    return new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('music_back')
                .setEmoji('⏮️')
                .setLabel('Atrás')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('music_toggle')
                .setEmoji(isPaused ? '▶️' : '⏸️')
                .setLabel(isPaused ? 'Reanudar' : 'Pausar')
                .setStyle(isPaused ? ButtonStyle.Success : ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('music_skip')
                .setEmoji('⏭️')
                .setLabel('Saltar')
                .setStyle(ButtonStyle.Secondary)
        );
}

function createMusicToggleButton(isPaused) {
    return new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('music_toggle')
                .setEmoji(isPaused ? '▶️' : '⏸️')
                .setLabel(isPaused ? 'Reanudar' : 'Pausar')
                .setStyle(isPaused ? ButtonStyle.Success : ButtonStyle.Primary)
        );
}

function createVolumeButtons(currentVolume) {
    return new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('volume_down')
                .setLabel(`-10%  🔉 Volumen: ${currentVolume}%`)
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('volume_up')
                .setLabel(`🔊 Volumen: ${currentVolume}%  +10%`)
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('volume_mute')
                .setLabel('Silenciar')
                .setEmoji('🔇')
                .setStyle(ButtonStyle.Danger)
        );
}

function createSecondaryMusicButtonsWithAutoplay(autoplayEnabled) {
    return new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('music_loop')
                .setEmoji('🔁')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('music_shuffle')
                .setEmoji('🔀')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('music_autoplay')
                .setEmoji('🔄')
                .setLabel(autoplayEnabled ? 'Autoplay: ON' : 'Autoplay: OFF')
                .setStyle(autoplayEnabled ? ButtonStyle.Success : ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('music_lyrics')
                .setEmoji('🎤')
                .setLabel('Letras')
                .setStyle(ButtonStyle.Secondary)
        );
}

function createQueueSelectMenu(tracks) {
    const sliced = tracks.slice(0, 10);

    const options = sliced.map((track, idx) => {
        const position = idx + 2;
        const title = (track.info?.title || track.name || 'Canción unknown').slice(0, 100);
        const author = track.info?.author || track.author || '';
        const description = author ? `${author.slice(0, 50)} • #${position}` : `#${position}`;

        return {
            label: title,
            description,
            value: String(position)
        };
    });

    return new ActionRowBuilder()
        .addComponents(
            new StringSelectMenuBuilder()
                .setCustomId('queue_jump')
                .setPlaceholder('🎵 Saltar a canción en cola…')
                .addOptions(options)
                .setMinValues(1)
                .setMaxValues(1)
        );
}

function createSecondaryMusicButtons() {
    return new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('music_loop')
                .setEmoji('🔁')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('music_shuffle')
                .setEmoji('🔀')
                .setStyle(ButtonStyle.Secondary)
        );
}

function createMusicButtons() {
    return new ActionRowBuilder()
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
                .setStyle(ButtonStyle.Danger)
        );
}

module.exports = {
    createMusicButtons,
    createMusicToggleButton,
    createTransportButtons,
    createSecondaryMusicButtons,
    createSecondaryMusicButtonsWithAutoplay,
    createVolumeButtons,
    createQueueSelectMenu
};