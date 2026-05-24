// Handles track start, renders the player panel, and starts progress updates.
const {
	buildPlayerPanelPayload,
	startProgressUpdater,
	stopProgressUpdater,
	syncProgressClock,
	clearProgressClock,
} = require("../../utils/progressUpdater");
const { getQueuedTracks, getAutoplay } = require("../../utils/lavalinkQueue");
const {
	getActivePlayerMessage,
	setActivePlayerMessage,
	removeActivePlayerMessage,
} = require("../../utils/playerMessage");
const {
	pushTrack: historyPush,
	isBackRestoring,
	clearBackRestoring,
} = require("../../utils/playbackHistory");
const Logger = require("../../utils/logger");

module.exports = function trackStartHandler(manager) {
	manager.on("trackStart", async (player, track) => {
		try {
			const currentTrack = track || player.queue?.current;

			const discordClient = manager.discordClient || manager.client;
			const textChannel = player.textChannelId
				? discordClient?.channels?.cache?.get(player.textChannelId)
				: null;

			if (!textChannel) {
				Logger.warn(
					`trackStart: no se encontró textChannel para guild=${player.guildId}`,
					"lavalink/trackStart.js",
				);
				return;
			}

			stopProgressUpdater(player.guildId);
			clearProgressClock(player.guildId);

			const existing = getActivePlayerMessage(player.guildId);
			if (existing && existing.channelId === textChannel.id) {
				try {
					const existingMsg = await textChannel.messages
						.fetch(existing.messageId)
						.catch(() => null);
					if (existingMsg) {
						await existingMsg.delete().catch(() => {});
					}
				} catch (_) {}
				removeActivePlayerMessage(player.guildId);
			}

			const payload = buildPlayerPanelPayload(
				manager,
				player.guildId,
				currentTrack,
			);
			if (!payload) {
				Logger.warn(
					`trackStart: no se pudo construir payload para guild=${player.guildId}`,
					"lavalink/trackStart.js",
				);
				return;
			}

			const components = [
				payload.musicButtons,
				payload.secondaryButtons,
				payload.volumeButtons,
			];
			if (payload.queueSelectMenu) {
				components.push(payload.queueSelectMenu);
			}

			const message = await textChannel.send({
				embeds: [payload.embed],
				components,
			});

			setActivePlayerMessage(player.guildId, message.id, textChannel.id);
			syncProgressClock(player.guildId, currentTrack, false);
			startProgressUpdater(
				discordClient,
				message,
				{ id: player.guildId },
				currentTrack,
			);

			const requester =
				currentTrack?.requester || currentTrack?.userData?.requester;
			Logger.music(
				`▶️ Lavalink reproduciendo: "${currentTrack?.info?.title}"`,
				"lavalink/trackStart.js",
			);
			Logger.music(
				`Pedido por ${requester?.tag || "desconocido"} en ${textChannel.guild.name}`,
				"lavalink/trackStart.js",
			);

			if (!isBackRestoring(player.guildId)) {
				historyPush(player.guildId, currentTrack);
			} else {
				clearBackRestoring(player.guildId);
			}
		} catch (error) {
			Logger.error(
				"Error en trackStart (Lavalink)",
				error,
				"lavalink/trackStart.js",
			);
			const discordClient = manager.discordClient || manager.client;
			const textChannel = player.textChannelId
				? discordClient?.channels?.cache?.get(player.textChannelId)
				: null;
			textChannel
				?.send("❌ Error al mostrar la información de la canción")
				.catch(() => {});
		}
	});
};
