// Handles Lavalink queue completion and clears active panel, history, and progress state.
const Logger = require("../../utils/logger");
const { removeActivePlayerMessage } = require("../../utils/playerMessage");
const { stopProgressUpdater } = require("../../utils/progressUpdater");
const { createWarningEmbed } = require("../../utils/embeds");
const { clearHistory } = require("../../utils/playbackHistory");

module.exports = function queueEndHandler(manager) {
	manager.on("queueEnd", async (player) => {
		Logger.music(
			`Cola Lavalink vacía para guild=${player.guildId}`,
			"lavalink/queueEnd.js",
		);

		stopProgressUpdater(player.guildId);
		removeActivePlayerMessage(player.guildId);
		clearHistory(player.guildId);

		const discordClient = manager.discordClient || manager.client;
		const textChannel = player.textChannelId
			? discordClient?.channels?.cache?.get(player.textChannelId)
			: null;

		if (textChannel) {
			try {
				await textChannel
					.send({
						embeds: [
							createWarningEmbed(
								"🎵 Cola vacía",
								"Usa /play para agregar más canciones.",
							),
						],
					})
					.catch(() => {});
			} catch (_) {
				// ignore notification failures
			}
		}
	});
};
