// Handles Lavalink node connection, disconnection, and debug events.
const Logger = require("../../utils/logger");

module.exports = function nodeConnectHandler(manager) {
	manager.on("nodeConnect", (node) => {
		Logger.success(
			`Nodo Lavalink conectado: ${node.id}`,
			"lavalink/nodeConnect.js",
		);
	});

	manager.on("nodeReconnect", (node) => {
		Logger.info(
			`Nodo Lavalink reconnectando: ${node.id}`,
			"lavalink/nodeReconnect.js",
		);
	});

	manager.on("nodeDisconnect", (node, event) => {
		if (event?.code === 1000) {
			Logger.info(
				`Nodo Lavalink desconectado (limpio): ${node.id}`,
				"lavalink/nodeDisconnect.js",
			);
		} else {
			Logger.warn(
				`Nodo Lavalink desconectado (anormal): ${node.id} código=${event?.code}`,
				"lavalink/nodeDisconnect.js",
			);
		}
	});

	manager.on("debug", (node, message) => {
		Logger.music(`[Lavalink debug] ${message}`, "lavalink/nodeConnect.js");
	});
};
