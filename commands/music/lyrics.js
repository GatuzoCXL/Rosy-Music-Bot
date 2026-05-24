const { SlashCommandBuilder } = require('discord.js');
const Logger = require('../../utils/logger');
const { getCurrentTrack, getQueue } = require('../../utils/lavalinkQueue');
const { createMessageCommandContext } = require('../../utils/commandContext');
const { createInfoEmbed, createErrorEmbed } = require('../../utils/embeds');
const { fetchLyrics, fetchLyricsByQuery } = require('../../utils/lyricsProvider');

const MAX_EMBED_CHARS = 4096;
const TRUNCATE_THRESHOLD = 3900;
const MAX_PAGINATION_MESSAGES = 3;

function isLavalinkAvailable(client) {
    return Boolean(
        client?.lavalinkManager &&
        typeof client.lavalinkManager.useable === 'boolean' &&
        client.lavalinkManager.useable
    );
}

async function sendLyricsEmbed(ctx, lyricsData) {
    const { title, artist, lyrics, source } = lyricsData;
    const sourceText = `Fuente: ${source}`;

    if (lyrics.length <= TRUNCATE_THRESHOLD) {
        return ctx.reply({
            embeds: [
                new (require('discord.js').EmbedBuilder)()
                    .setColor(0x0099FF)
                    .setTitle(`🎤 Letra: ${title}`)
                    .setDescription(`**${artist}**\n\n${lyrics}`)
                    .setFooter({ text: sourceText })
            ]
        });
    }

    const chunks = splitLyricsByDoubleNewline(lyrics, MAX_PAGINATION_MESSAGES);

    if (chunks.length === 1) {
        const truncated = lyrics.slice(0, TRUNCATE_THRESHOLD).trimEnd();
        return ctx.reply({
            embeds: [
                new (require('discord.js').EmbedBuilder)()
                    .setColor(0x0099FF)
                    .setTitle(`🎤 Letra: ${title}`)
                    .setDescription(`**${artist}**\n\n${truncated}\n… *(letra recortada)*`)
                    .setFooter({ text: sourceText })
            ]
        });
    }

    const first = chunks[0];
    await ctx.reply({
        embeds: [
            new (require('discord.js').EmbedBuilder)()
                .setColor(0x0099FF)
                .setTitle(`🎤 Letra: ${title}`)
                .setDescription(`**${artist}**\n\n${first}`)
                .setFooter({ text: `${sourceText} · (1/${chunks.length})` })
        ]
    });

    for (let i = 1; i < chunks.length; i++) {
        const chunk = chunks[i];
        await ctx.send({
            embeds: [
                new (require('discord.js').EmbedBuilder)()
                    .setColor(0x0099FF)
                    .setDescription(chunk)
                    .setFooter({ text: `${sourceText} · (${i + 1}/${chunks.length})` })
            ]
        });
    }
}

function splitLyricsByDoubleNewline(text, maxChunks) {
    const paragraphs = text.split(/\n\n+/);
    const chunks = [];
    let current = '';

    for (const para of paragraphs) {
        if (current.length + para.length + 2 > TRUNCATE_THRESHOLD && current.length > 0) {
            chunks.push(current.trimEnd());
            current = para;
            if (chunks.length >= maxChunks - 1) break;
        } else {
            current += (current.length > 0 ? '\n\n' : '') + para;
        }
    }

    if (current.trimEnd().length > 0 && chunks.length < maxChunks) {
        chunks.push(current.trimEnd());
    }

    return chunks.length > 0 ? chunks : [text.slice(0, TRUNCATE_THRESHOLD)];
}

module.exports = {
    name: 'lyrics',
    description: 'Muestra la letra de la canción que está sonando',
    data: new SlashCommandBuilder()
        .setName('lyrics')
        .setDescription('Muestra la letra de la canción que está sonando')
        .setDMPermission(false)
        .addStringOption(option =>
            option.setName('cancion')
                .setDescription('Buscar letra para una canción específica')
                .setRequired(false)
        ),
    async execute(message, args, client) {
        const ctx = createMessageCommandContext(message, args);
        return this.executeContext(ctx, client);
    },
    async executeContext(ctx, client) {
        const guildId = ctx.guild?.id;

        if (!isLavalinkAvailable(client)) {
            return ctx.reply({ embeds: [createErrorEmbed('Error', '❌ Lavalink no está disponible.')] });
        }

        const queryOption = ctx.options?.getString('cancion') || ctx.query || '';

        let artist = '';
        let title = '';

        if (queryOption.trim()) {
            title = queryOption.trim();
            Logger.music(`/lyrics cancion:${title} por ${ctx.user.tag}`, 'lyrics.js');

            try {
                const result = await fetchLyricsByQuery(queryOption.trim());
                if (!result) {
                    return ctx.reply({
                        embeds: [
                            createInfoEmbed(
                                'Letra no encontrada',
                                'ℹ️ No se encontró letra para esta canción.'
                            )
                        ]
                    });
                }
                return sendLyricsEmbed(ctx, result);
            } catch (err) {
                Logger.error('Error en /lyrics (búsqueda por query)', err, 'lyrics.js');
                return ctx.reply({
                    embeds: [
                        createErrorEmbed(
                            'Error al obtener letra',
                            '❌ No se pudo obtener la letra. Intenta de nuevo más tarde.'
                        )
                    ]
                });
            }
        }

        const currentTrack = getCurrentTrack(client.lavalinkManager, guildId);
        if (!currentTrack) {
            return ctx.reply({
                embeds: [
                    createInfoEmbed(
                        'Sin música',
                        '❌ No hay nada reproduciéndose.'
                    )
                ]
            });
        }

        artist = currentTrack.info?.author || '';
        title = currentTrack.info?.title || '';

        Logger.music(`/lyrics (pista actual: ${title}) por ${ctx.user.tag}`, 'lyrics.js');

        try {
            const result = await fetchLyrics(artist, title);
            if (!result) {
                return ctx.reply({
                    embeds: [
                        createInfoEmbed(
                            'Letra no encontrada',
                            'ℹ️ No se encontró letra para esta canción.'
                        )
                    ]
                });
            }
            return sendLyricsEmbed(ctx, result);
        } catch (err) {
            Logger.error('Error en /lyrics (pista actual)', err, 'lyrics.js');
            return ctx.reply({
                embeds: [
                    createErrorEmbed(
                        'Error al obtener letra',
                        '❌ No se pudo obtener la letra. Intenta de nuevo más tarde.'
                    )
                ]
            });
        }
    }
};
