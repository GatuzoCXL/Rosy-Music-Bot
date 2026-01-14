const { createErrorEmbed, createInfoEmbed } = require('../../utils/embeds');
const Logger = require('../../utils/logger');
const playdl = require('play-dl');
const { ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');

module.exports = {
    name: 'play',
    description: 'Reproduce una canción',
    async execute(message, args, client) {
        const voiceChannel = message.member.voice.channel;
        
        if (!voiceChannel) {
            Logger.warn(`Usuario ${message.author.tag} intentó reproducir sin estar en canal de voz`, 'play.js');
            const embed = createErrorEmbed(
                'No estás en un canal de voz',
                'Debes unirte a un canal de voz primero para reproducir música.'
            );
            return message.reply({ embeds: [embed] });
        }

        const permissions = voiceChannel.permissionsFor(client.user);
        if (!permissions.has('Connect') || !permissions.has('Speak')) {
            Logger.error(`Permisos insuficientes en ${voiceChannel.name}`, null, 'play.js');
            const embed = createErrorEmbed(
                'Permisos insuficientes',
                'No tengo permisos para conectarme o hablar en ese canal de voz.'
            );
            return message.reply({ embeds: [embed] });
        }

        const query = args.join(' ');
        if (!query) {
            const embed = createInfoEmbed(
                'Falta la canción',
                '**Uso:** `r!play <canción o URL>`\n\n**Ejemplos:**\n`r!play the scientist`\n`r!play https://youtu.be/...`'
            );
            return message.reply({ embeds: [embed] });
        }

        try {
            Logger.music(`🔍 Búsqueda: "${query}" por ${message.author.tag}`, 'play.js');
            
            let finalUrl = query;
            
            if (!query.startsWith('http://') && !query.startsWith('https://')) {
                Logger.music(`Buscando con play-dl: "${query}"`, 'play.js');
                
                const searchResults = await playdl.search(query, { 
                    limit: 5,
                    source: { youtube: 'video' }
                });
                
                if (!searchResults || searchResults.length === 0) {
                    const embed = createErrorEmbed(
                        'No se encontró la canción',
                        `No encontré resultados para: **${query}**\n\n💡 Intenta con un nombre más específico`
                    );
                    return message.reply({ embeds: [embed] });
                }
                
                if (searchResults.length > 1) {
                    Logger.music(`📋 ${searchResults.length} resultados encontrados`, 'play.js');
                    
                    const options = searchResults.slice(0, 5).map((song, index) => ({
                        label: `${index + 1}. ${song.title.substring(0, 90)}`,
                        description: `${song.channel?.name || 'Canal desconocido'} • ${song.durationInSec ? `${Math.floor(song.durationInSec / 60)}:${String(song.durationInSec % 60).padStart(2, '0')}` : 'EN VIVO'}`,
                        value: song.url
                    }));
                    
                    const selectMenu = new StringSelectMenuBuilder()
                        .setCustomId('select_song')
                        .setPlaceholder('Elige una canción')
                        .addOptions(options);
                    
                    const row = new ActionRowBuilder().addComponents(selectMenu);
                    
                    const embed = createInfoEmbed(
                        '🎵 Elige una canción',
                        `Encontré ${searchResults.length} resultados para: **${query}**`
                    );
                    
                    const selectionMessage = await message.reply({ embeds: [embed], components: [row] });
                    
                    const filter = (interaction) => interaction.user.id === message.author.id && interaction.customId === 'select_song';
                    const collector = selectionMessage.createMessageComponentCollector({ filter, time: 20000 });
                    
                    collector.on('collect', async (interaction) => {
                        finalUrl = interaction.values[0];
                        Logger.music(`✅ Seleccionado: ${finalUrl}`, 'play.js');
                        
                        await interaction.deferUpdate();
                        selectionMessage.delete().catch(() => {});
                        
                        const confirmMessage = await message.channel.send({
                            content: `✅ **Canción agregada a la cola**`
                        }).catch(() => {});
                        
                        if (confirmMessage) {
                            setTimeout(() => {
                                confirmMessage.delete().catch(() => {});
                            }, 6000);
                        }
                        
                        await client.distube.play(voiceChannel, finalUrl, {
                            member: message.member,
                            textChannel: message.channel,
                            message: message
                        });
                    });
                    
                    collector.on('end', (collected) => {
                        if (collected.size === 0) {
                            selectionMessage.edit({ components: [] }).catch(() => {});
                            Logger.music(`Tiempo de selección agotado (20 segundos)`, 'play.js');
                        }
                    });
                    
                    return;
                }
                
                finalUrl = searchResults[0].url;
                Logger.music(`✅ Encontrado: "${searchResults[0].title}" - ${finalUrl}`, 'play.js');
            }
            
            await client.distube.play(voiceChannel, finalUrl, {
                member: message.member,
                textChannel: message.channel,
                message: message
            });
            
        } catch (error) {
            Logger.error('Error en play', error, 'play.js');
            
            let errorTitle = 'Error al reproducir';
            let errorDescription = error.message;
            
            if (error.message?.includes('NO_RESULT')) {
                errorTitle = 'No se encontró la canción';
                errorDescription = `No encontré resultados para: **${query}**\n\n💡 Intenta con:\n• Un nombre más específico\n• Una URL directa de YouTube\n• Verificar que la canción existe`;
            }
            
            const embed = createErrorEmbed(errorTitle, errorDescription);
            message.reply({ embeds: [embed] });
        }
    }
};