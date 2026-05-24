require("dotenv").config();
const fs = require("fs");
const {
	Client,
	GatewayIntentBits,
	Collection,
	ActivityType,
} = require("discord.js");
const Logger = require("./utils/logger");
const {
	createLavalinkManager,
	connectLavalink,
} = require("./utils/lavalinkManager");
require("events").EventEmitter.defaultMaxListeners = 15;

const client = new Client({
	intents: [
		GatewayIntentBits.Guilds,
		GatewayIntentBits.GuildVoiceStates,
		GatewayIntentBits.GuildMessages,
		GatewayIntentBits.MessageContent,
	],
});

client.commands = new Collection();
client.slashCommands = [];

const config = require("./config");
const perfil = require("./perfil");

let presenceIndex = 0;
let presenceTimer = null;

const ACTIVITY_TYPES = {
	Playing: ActivityType.Playing,
	Listening: ActivityType.Listening,
	Watching: ActivityType.Watching,
	Custom: ActivityType.Custom,
	Competing: ActivityType.Competing,
};

function setPresence(client) {
	const msgs = perfil.presence_messages;
	if (!msgs || !msgs.length) return;
	const msg = msgs[presenceIndex % msgs.length];
	const type =
		typeof msg.type === "string"
			? (ACTIVITY_TYPES[msg.type] ?? ActivityType.Playing)
			: msg.type;

	client.user.setPresence({
		activities: [{ name: msg.name, type }],
		status: perfil.presence_status || "idle",
	});
	presenceIndex = (presenceIndex + 1) % msgs.length;
}

client.once("clientReady", async () => {
	Logger.success(`¡Bot conectado como ${client.user.tag}!`, "index.js");

	require("./handlers/commands")(client);
	require("./handlers/events")(client);

	setPresence(client);
	if (perfil.presence_messages && perfil.presence_messages.length) {
		presenceTimer = setInterval(() => setPresence(client), 60_000);
	}

	if (process.env.DISABLE_LAVALINK === "true") {
		client.lavalinkManager = null;
		Logger.warn(
			"Lavalink deshabilitado por modo manual — los comandos de música estarán limitados",
			"index.js",
		);
		return;
	}

	// Initialize the Lavalink manager.
	try {
		client.lavalinkManager = createLavalinkManager({
			client,
			host: process.env.LAVALINK_HOST || "localhost",
			port: parseInt(process.env.LAVALINK_PORT, 10) || 23333,
			password: process.env.LAVALINK_PASSWORD || "rosy-local",
		});

		// Forward raw Discord events for Lavalink voice updates.
		client.on("raw", (data) => client.lavalinkManager.sendRawData(data));

		// Initialize the manager as required by lavalink-client v2.
		await client.lavalinkManager.init({
			id: client.user.id,
			username: client.user.username,
		});

		// Attach Lavalink event handlers.
		require("./events/lavalink/trackStart")(client.lavalinkManager);
		require("./events/lavalink/nodeConnect")(client.lavalinkManager);
		require("./events/lavalink/playerError")(client.lavalinkManager);
		require("./events/lavalink/queueEnd")(client.lavalinkManager);

		const connected = await connectLavalink(client.lavalinkManager);
		if (connected) {
			Logger.success("Lavalink Manager inicializado correctamente", "index.js");
		} else {
			Logger.warn(
				"Lavalink no disponible — el bot usará solo comandos de cola",
				"index.js",
			);
		}
	} catch (error) {
		Logger.warn("Error inicializando Lavalink Manager", "index.js");
		Logger.error("Detalle de error Lavalink", error, "index.js");
	}
});

client.on("messageCreate", async (message) => {
	if (message.author.bot || !message.content.startsWith(config.prefix)) return;

	const args = message.content.slice(config.prefix.length).trim().split(/ +/);
	const commandName = args.shift().toLowerCase();
	const command = client.commands.get(commandName);

	if (command) {
		Logger.command(commandName, message.author.tag, message.guild.name);
		try {
			await command.execute(message, args, client);
		} catch (error) {
			Logger.error(
				`Error ejecutando comando ${commandName}`,
				error,
				"index.js",
			);
			message.reply("❌ Hubo un error al ejecutar el comando").catch(() => {});
		}
	}
});

client.login(process.env.TOKEN);
