require('dotenv').config();
const { Client, GatewayIntentBits, Collection, ActivityType } = require('discord.js');
const { DisTube } = require('distube');
const { SpotifyPlugin } = require('@distube/spotify');
const { YtDlpPlugin } = require('@distube/yt-dlp');
const { generateDependencyReport } = require('@discordjs/voice');
const Logger = require('./utils/logger');
require('events').EventEmitter.defaultMaxListeners = 15;

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

Logger.info('Voice Dependency Report:');
console.log(generateDependencyReport());

client.commands = new Collection();

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
        new YtDlpPlugin({ update: true })
    ]
});

const config = require('./config');

client.once('clientReady', async () => {
    Logger.success(`¡Bot conectado como ${client.user.tag}!`, 'index.js');
    
    require('./handlers/commands')(client);
    require('./handlers/events')(client);
    
    client.user.setPresence({
        activities: [{ name: 'r!help 🎶', type: ActivityType.Listening }],
        status: 'idle'
    });
});

client.on('messageCreate', async message => {
    if (message.author.bot || !message.content.startsWith(config.prefix)) return;

    const args = message.content.slice(config.prefix.length).trim().split(/ +/);
    const commandName = args.shift().toLowerCase();
    const command = client.commands.get(commandName);

    if (command) {
        Logger.command(commandName, message.author.tag, message.guild.name);
        try {
            await command.execute(message, args, client);
        } catch (error) {
            Logger.error(`Error ejecutando comando ${commandName}`, error, 'index.js');
            message.reply('❌ Hubo un error al ejecutar el comando').catch(() => {});
        }
    }
});

client.login(process.env.TOKEN);