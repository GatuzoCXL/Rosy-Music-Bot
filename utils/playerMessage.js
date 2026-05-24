// Stores the active now-playing message per guild so only one panel stays live.
const Logger = require("./logger");

const activePlayerMessages = new Map();

const pendingPlaylistMessages = new Map();

function getActivePlayerMessage(guildId) {
	return activePlayerMessages.get(guildId) || null;
}

function setActivePlayerMessage(guildId, messageId, channelId) {
	activePlayerMessages.set(guildId, { messageId, channelId, guildId });
	Logger.music(
		`Player message registrado para guild=${guildId} msg=${messageId}`,
		"playerMessage.js",
	);
}

function removeActivePlayerMessage(guildId) {
	if (activePlayerMessages.has(guildId)) {
		activePlayerMessages.delete(guildId);
		Logger.music(
			`Player message removido para guild=${guildId}`,
			"playerMessage.js",
		);
	}
}

function clearAllPlayerMessages() {
	activePlayerMessages.clear();
	Logger.music("Player message registry limpiado", "playerMessage.js");
}

function getAllActivePlayerMessages() {
	return new Map(activePlayerMessages);
}

function setPendingPlaylistMessage(guildId, messageId, channelId) {
	pendingPlaylistMessages.set(guildId, { messageId, channelId, guildId });
	Logger.music(
		`Pending playlist msg registrado para guild=${guildId} msg=${messageId}`,
		"playerMessage.js",
	);
}

function getPendingPlaylistMessage(guildId) {
	return pendingPlaylistMessages.get(guildId) || null;
}

function removePendingPlaylistMessage(guildId) {
	if (pendingPlaylistMessages.has(guildId)) {
		pendingPlaylistMessages.delete(guildId);
		Logger.music(
			`Pending playlist msg removido para guild=${guildId}`,
			"playerMessage.js",
		);
	}
}

function clearPendingPlaylistMessages() {
	pendingPlaylistMessages.clear();
	Logger.music(
		"Pending playlist message registry limpiado",
		"playerMessage.js",
	);
}

module.exports = {
	getActivePlayerMessage,
	setActivePlayerMessage,
	removeActivePlayerMessage,
	clearAllPlayerMessages,
	getAllActivePlayerMessages,
	setPendingPlaylistMessage,
	getPendingPlaylistMessage,
	removePendingPlaylistMessage,
	clearPendingPlaylistMessages,
};
