module.exports = {
    name: 'status',
    description: 'Muestra el estado del bot y sus permisos',
    async execute(message, args, client) {
        const voiceChannel = message.member.voice.channel;
        const guild = message.guild;
        
        // Información general del bot
        const botUser = client.user;
        const botMember = guild.members.cache.get(botUser.id);
        const botPermissions = botMember?.permissions;
        
        // Información de conexión de voz
        let voiceStatus = voiceChannel ? '✅ En canal de voz' : '❌ No en canal de voz';
        let voiceChannelName = voiceChannel?.name || 'N/A';
        let voicePerms = voiceChannel ? 'Verificando...' : 'N/A';
        
        if (voiceChannel) {
            const perms = voiceChannel.permissionsFor(client.user);
            const hasConnect = perms.has('Connect');
            const hasSpeak = perms.has('Speak');
            voicePerms = `Connect: ${hasConnect ? '✅' : '❌'} | Speak: ${hasSpeak ? '✅' : '❌'}`;
        }

        // Info de DisTube
        const queue = client.distube.getQueue(guild);
        const queueStatus = queue ? `✅ Activa (${queue.songs.length} canciones)` : '❌ Sin cola activa';
        
        message.reply({
            embeds: [{
                color: 0x0099FF,
                title: '🤖 Estado del Bot Rosy',
                thumbnail: { url: botUser.displayAvatarURL({ size: 256 }) },
                fields: [
                    {
                        name: '📊 Información del Bot',
                        value: `**Nombre**: ${botUser.username}\n**ID**: ${botUser.id}\n**Status**: En línea`,
                        inline: false
                    },
                    {
                        name: '🎤 Micrófono/Voz',
                        value: `**Estado**: ${voiceStatus}\n**Canal**: ${voiceChannelName}\n**Permisos**: ${voicePerms}`,
                        inline: false
                    },
                    {
                        name: '🎵 Cola de Reproducción',
                        value: queueStatus,
                        inline: false
                    },
                    {
                        name: '⚙️ Servidor',
                        value: `**Nombre**: ${guild.name}\n**ID**: ${guild.id}\n**Miembros**: ${guild.memberCount}`,
                        inline: false
                    },
                    {
                        name: '💻 Sistema',
                        value: `**Latencia**: ${client.ws.ping}ms\n**Uptime**: ${Math.round(client.uptime / 1000)}s`,
                        inline: false
                    }
                ],
                footer: { text: 'Usa r!help para ver todos los comandos' }
            }]
        });
    }
};
