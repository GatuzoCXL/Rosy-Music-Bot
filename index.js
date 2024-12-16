require('dotenv').config();
const { Client, GatewayIntentBits, Collection, ActivityType } = require('discord.js'); // Importar ActivityType
const { DisTube } = require('distube');
const { SpotifyPlugin } = require('@distube/spotify');
const { YtDlpPlugin } = require('@distube/yt-dlp');
const { generateDependencyReport } = require('@discordjs/voice');
require('events').EventEmitter.defaultMaxListeners = 15;

const play = require('play-dl');

// Configurar play-dl con la clave de API
if (process.env.YOUTUBE_API_KEY) {
    play.setToken('youtube', process.env.YOUTUBE_API_KEY); // Corregido el uso de setToken
    console.log('Play-dl configurado con la clave de API de YouTube.');
} else {
    console.error('YOUTUBE_API_KEY no está definido en el archivo .env.');
}

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildVoiceStates, // Añadido GuildVoiceStates
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

// Log del reporte de dependencias
console.log('Voice Dependency Report:', generateDependencyReport());

client.commands = new Collection();

// Crear instancia de DisTube
client.distube = new DisTube(client, {
    emitNewSongOnly: true,
    emitAddSongWhenCreatingQueue: false,
    plugins: [
        new SpotifyPlugin({
            api: {
                clientId: process.env.SPOTIFY_CLIENT_ID,
                clientSecret: process.env.SPOTIFY_CLIENT_SECRET
            }
        }),
        new YtDlpPlugin({
            update: true,
            dlChunkSize: 0
        })
    ]
});

// Antes de configurar los eventos de DisTube
client.distube.setMaxListeners(25);

// Eliminar los eventos duplicados
client.distube.removeAllListeners();

// Un solo lugar para todos los eventos de DisTube
const status = queue =>
    `Volumen: \`${queue.volume}%\` | Filtro: \`${queue.filters.names.join(', ') || 'Off'}\` | Loop: \`${
    queue.repeatMode ? (queue.repeatMode === 2 ? 'All Queue' : 'This Song') : 'Off'
    }\` | Autoplay: \`${queue.autoplay ? 'On' : 'Off'}\``;

const events = {
    playSong: (queue, song) => queue.textChannel?.send(
        `🎵 Reproduciendo \`${song.name}\` - \`${song.formattedDuration}\`\nPedido por: ${song.user}\n${status(queue)}`
    ),
    addSong: (queue, song) => queue.textChannel?.send(
        `✅ Añadido ${song.name} - \`${song.formattedDuration}\` a la cola por ${song.user}`
    ),
    finish: queue => queue.textChannel?.send('¡Cola terminada!')
};

// Registrar todos los eventos una sola vez
Object.entries(events).forEach(([event, handler]) => {
    client.distube.on(event, handler);
});

const config = require('./config'); // Importar configuración desde config.js
console.log('Configuración cargada:', config);

client.commands = new Collection();
console.log('Collection de comandos inicializada');

client.on('ready', async () => {
    console.log(`¡Bot listo! Conectado como ${client.user.tag}`);
    
    // Cargar comandos y eventos
    require('./handlers/commands')(client);
    require('./handlers/events')(client);
    
    // Mostrar todos los comandos cargados
    console.log('Comandos cargados:', [...client.commands.keys()]);
    
    // Configurar la presencia correctamente
    try {
        await client.user.setPresence({
            activities: [{ name: 'r!help 🎶', type: ActivityType.Listening }],
            status: 'idle'
        });
        console.log('Presencia actualizada correctamente');
    } catch (error) {
        console.error('Error al configurar la presencia:', error);
    }
});

client.on('messageCreate', async message => {
    if (message.author.bot) return;
    
    console.log('Mensaje recibido:', message.content);
    
    if (!message.content.startsWith(config.prefix)) {
        console.log('Mensaje no comienza con el prefix');
        return;
    }

    const args = message.content.slice(config.prefix.length).trim().split(/ +/);
    const commandName = args.shift().toLowerCase();
    
    console.log('Comando solicitado:', commandName);
    console.log('Argumentos:', args);

    const command = client.commands.get(commandName);
    if (!command) {
        console.log('Comando no encontrado');
        return;
    }

    try {
        console.log('Ejecutando comando:', commandName);
        await command.execute(message, args, client);
    } catch (error) {
        console.error('Error ejecutando comando:', error);
        message.reply('¡Hubo un error al ejecutar el comando!').catch(console.error);
    }
});

// Iniciar sesión del bot
client.login(process.env.TOKEN);

// Manejar errores no capturados
process.on('unhandledRejection', error => {
    console.error('Error no manejado:', error);
});