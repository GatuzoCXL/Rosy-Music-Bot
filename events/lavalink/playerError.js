// Handles Lavalink player errors and notifies the text channel when possible.
const Logger = require("../../utils/logger");
const { createWarningEmbed } = require("../../utils/embeds");

module.exports = function playerErrorHandler(manager) {
	manager.on("playerError", async (player, slot, error) => {
		Logger.error(
			`Error en player Lavalink guild=${player.guildId} slot=${slot}`,
			error,
			"lavalink/playerError.js",
		);

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
								"❌ Error de reproducción",
								"Intentando continuar...",
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
