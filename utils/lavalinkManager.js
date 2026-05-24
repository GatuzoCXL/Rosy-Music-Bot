// Manages the Lavalink client lifecycle and node configuration.
const { LavalinkManager, Node } = require("lavalink-client");
const Logger = require("./logger");

const DEFAULT_LAVALINK_HOST = process.env.LAVALINK_HOST || "localhost";
const DEFAULT_LAVALINK_PORT = parseInt(process.env.LAVALINK_PORT, 10) || 23333;
const DEFAULT_LAVALINK_PASSWORD = process.env.LAVALINK_PASSWORD || "rosy-local";

function createLavalinkManager({ client, host, port, password }) {
	const resolvedHost = host || DEFAULT_LAVALINK_HOST;
	const resolvedPort = port || DEFAULT_LAVALINK_PORT;
	const resolvedPassword = password || DEFAULT_LAVALINK_PASSWORD;

	Logger.info(
		`Configurando Lavalink Manager — host=${resolvedHost}:${resolvedPort}`,
		"lavalinkManager.js",
	);

	const managerOptions = {
		nodes: [
			{
				id: "rosy-main",
				host: resolvedHost,
				port: resolvedPort,
				authorization: resolvedPassword,
				secure: false,
				requestSignalTimeoutMS: 10000,
			},
		],
		sendToShard: (guildId, payload) => {
			const guild = client.guilds.cache.get(guildId);
			if (!guild) {
				Logger.warn(
					`sendToShard: guild ${guildId} not found in cache`,
					"lavalinkManager.js",
				);
				return;
			}
			if (!guild.shard) {
				Logger.warn(
					`sendToShard: guild ${guildId} has no shard`,
					"lavalinkManager.js",
				);
				return;
			}
			try {
				guild.shard.send(payload);
			} catch (err) {
				Logger.error(
					`sendToShard: failed to send to shard for guild ${guildId}`,
					err,
					"lavalinkManager.js",
				);
			}
		},
		client: {
			id: client.user?.id ?? "unknown",
			username: client.user?.username ?? "RosyBot",
		},
		autoPlay: true,
		queueOptions: {
			awayTimeout: 300,
		},
		playerOptions: {
			onEmptyQueue: {
				behavior: "Stop",
			},
		},
	};

	const lavalinkManager = new LavalinkManager(managerOptions);
	lavalinkManager.discordClient = client;

	lavalinkManager.nodeManager?.on?.("error", (node, error) => {
		const nodeId = node?.id || node?.options?.id || "desconocido";
		Logger.error(
			`Error en NodeManager Lavalink ${nodeId}`,
			error,
			"lavalinkManager.js",
		);
	});

	lavalinkManager.on("ready", (node) => {
		Logger.success(
			`Nodo Lavalink conectado: ${node.id} [${resolvedHost}:${resolvedPort}]`,
			"lavalinkManager.js",
		);
	});

	lavalinkManager.on("disconnect", (node, event) => {
		Logger.warn(`Nodo Lavalink desconectado: ${node.id}`, "lavalinkManager.js");
		if (event?.code === 1000) {
			Logger.info("Desconexión limpia del nodo Lavalink", "lavalinkManager.js");
		} else {
			Logger.warn(
				`Desconexión anormal del nodo ${node.id} — código=${event?.code}`,
				"lavalinkManager.js",
			);
		}
	});

	lavalinkManager.on("error", (node, error) => {
		Logger.error(
			`Error en nodo Lavalink ${node.id}`,
			error,
			"lavalinkManager.js",
		);
	});

	lavalinkManager.on("debug", (node, message) => {
		Logger.music(`[Lavalink debug] ${message}`, "lavalinkManager.js");
	});

	lavalinkManager.on("playerUpdate", (player, data) => {
		if (data.state === "PLAYING") {
			Logger.music(
				`Player update — guild=${player.guildId} estado=PLAYING`,
				"lavalinkManager.js",
			);
		}
	});

	lavalinkManager.on("playerDisconnect", (player, voiceChannel) => {
		Logger.music(
			`Player desconectado — guild=${player.guildId} canal=${voiceChannel?.id}`,
			"lavalinkManager.js",
		);
	});

	return lavalinkManager;
}

// Safe to call more than once.
async function connectLavalink(manager) {
	try {
		const nodeManager = manager.nodeManager;
		if (!nodeManager || !nodeManager.nodes || nodeManager.nodes.size === 0) {
			Logger.error(
				"No hay nodos Lavalink configurados",
				null,
				"lavalinkManager.js",
			);
			return false;
		}

		const mainNode = [...nodeManager.nodes.values()][0];
		if (!mainNode) {
			Logger.error(
				"No se encontró el nodo principal de Lavalink",
				null,
				"lavalinkManager.js",
			);
			return false;
		}

		const nodeHost =
			mainNode.host || mainNode.options?.host || DEFAULT_LAVALINK_HOST;
		const nodePort =
			mainNode.port || mainNode.options?.port || DEFAULT_LAVALINK_PORT;
		Logger.info(
			`Conectando a Lavalink: ${nodeHost}:${nodePort}`,
			"lavalinkManager.js",
		);

		return true;
	} catch (error) {
		Logger.error("Error al conectar con Lavalink", error, "lavalinkManager.js");
		return false;
	}
}

function isConnected(manager) {
	if (!manager?.nodeManager?.nodes || manager.nodeManager.nodes.size === 0)
		return false;
	const node = manager.nodeManager.nodes.values().next().value;
	return node?.connected ?? false;
}

function getPlayer(manager, guildId) {
	if (!manager) return null;
	return manager.getPlayer(guildId) || null;
}

function getCurrentTrack(manager, guildId) {
	const player = getPlayer(manager, guildId);
	return player?.track ?? null;
}

async function healthCheck(
	host = DEFAULT_LAVALINK_HOST,
	port = DEFAULT_LAVALINK_PORT,
) {
	try {
		const http = require("http");
		const url = `http://${host}:${port}/`;

		return new Promise((resolve) => {
			const req = http.get(url, (res) => {
				if (res.statusCode >= 200 && res.statusCode < 600) {
					resolve(true);
					return;
				}
				resolve(false);
			});

			req.on("error", () => resolve(false));
			req.setTimeout(3000, () => {
				req.destroy();
				resolve(false);
			});
		});
	} catch {
		return false;
	}
}

module.exports = {
	createLavalinkManager,
	connectLavalink,
	isConnected,
	getPlayer,
	getCurrentTrack,
	healthCheck,
	DEFAULT_LAVALINK_HOST,
	DEFAULT_LAVALINK_PORT,
	DEFAULT_LAVALINK_PASSWORD,
};
