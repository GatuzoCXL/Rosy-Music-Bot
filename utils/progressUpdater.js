// Updates the player panel and maintains a local per-guild playback clock.

const { createNowPlayingEmbed } = require("./embeds");
const {
	createTransportButtons,
	createSecondaryMusicButtonsWithAutoplay,
	createVolumeButtons,
	createQueueSelectMenu,
} = require("./playerPanelButtons");
const { getAutoplay, getQueuedTracks } = require("./lavalinkQueue");
const { getActivePlayerMessage } = require("./playerMessage");
const Logger = require("./logger");

const PROGRESS_UPDATE_INTERVAL_MS = 3_000;

const activeUpdaters = new Map();

const progressClocks = new Map();

function getCalculatedPosition(guildId) {
	const clock = progressClocks.get(guildId);
	if (!clock) return 0;
	if (clock.isStream) return 0;
	if (clock.wasPaused) return clock.pausedAt;
	const elapsedSec = (Date.now() - clock.trackStartTime) / 1000;
	return Math.min(Math.floor(elapsedSec), clock.totalDuration || elapsedSec);
}

function syncProgressClock(guildId, track, isPaused) {
	const durationSec = track?.info?.length
		? Math.floor(track.info.length / 1000)
		: track?.info?.duration
			? Math.floor(track.info.duration / 1000)
			: 0;
	const isStream = Boolean(track?.info?.isStream);

	progressClocks.set(guildId, {
		trackStartTime: Date.now(),
		totalDuration: durationSec,
		isStream,
		pausedAt: isPaused ? 0 : 0,
		wasPaused: isPaused,
	});

	Logger.music(
		`syncProgressClock guild=${guildId} duration=${durationSec}s isStream=${isStream} paused=${isPaused}`,
		"progressUpdater.js",
	);
}

function freezeProgressClock(guildId) {
	const clock = progressClocks.get(guildId);
	if (!clock) return;

	if (!clock.wasPaused) {
		const elapsedSec = (Date.now() - clock.trackStartTime) / 1000;
		clock.pausedAt = Math.min(
			Math.floor(elapsedSec),
			clock.totalDuration || elapsedSec,
		);
	}

	clock.wasPaused = true;
	Logger.music(
		`freezeProgressClock guild=${guildId} pausedAt=${clock.pausedAt}s`,
		"progressUpdater.js",
	);
}

function resumeProgressClock(guildId) {
	const clock = progressClocks.get(guildId);
	if (!clock) return;

	clock.trackStartTime = Date.now() - clock.pausedAt * 1000;
	clock.wasPaused = false;

	Logger.music(`resumeProgressClock guild=${guildId}`, "progressUpdater.js");
}

function resetProgressClock(guildId) {
	const clock = progressClocks.get(guildId);
	if (!clock) return;

	clock.trackStartTime = Date.now();
	clock.pausedAt = 0;
	clock.wasPaused = false;

	Logger.music(`resetProgressClock guild=${guildId}`, "progressUpdater.js");
}

function clearProgressClock(guildId) {
	progressClocks.delete(guildId);
}

// Single source of truth for player panel payload — ensures embed + buttons never diverge.
function buildPlayerPanelPayload(manager, guildId, overrideTrack = null) {
	const player = manager?.getPlayer(guildId);
	if (!player) return null;

	const currentTrack =
		overrideTrack ?? player.track ?? player.queue?.current ?? null;
	const isPaused = player.paused ?? false;
	const currentVolume = player.volume ?? 100;
	const autoplayEnabled = getAutoplay(guildId);

	const currentTime = getCalculatedPosition(guildId);
	const upcomingTracks = getQueuedTracks(player);
	const queueInfo = {
		id: guildId,
		songs: currentTrack ? [currentTrack, ...upcomingTracks] : upcomingTracks,
		current: currentTrack,
		currentTime,
		paused: isPaused,
		volume: currentVolume,
	};

	const embed = createNowPlayingEmbed(currentTrack, queueInfo);
	const musicButtons = createTransportButtons(isPaused);
	const secondaryButtons =
		createSecondaryMusicButtonsWithAutoplay(autoplayEnabled);
	const volumeButtons = createVolumeButtons(currentVolume);

	const queueSelectMenu =
		upcomingTracks.length > 0 ? createQueueSelectMenu(upcomingTracks) : null;

	const result = { embed, musicButtons, secondaryButtons, volumeButtons };
	if (queueSelectMenu) result.queueSelectMenu = queueSelectMenu;
	return result;
}

async function syncPlayerPanel(client, guildId, overrideTrack = null) {
	try {
		const msgInfo = getActivePlayerMessage(guildId);
		if (!msgInfo) return;

		const channel = client.channels?.cache?.get(msgInfo.channelId);
		if (!channel) return;

		const message = await channel.messages
			.fetch(msgInfo.messageId)
			.catch(() => null);
		if (!message) return;

		const manager = client.lavalinkManager;
		const payload = buildPlayerPanelPayload(manager, guildId, overrideTrack);
		if (!payload) return;

		const components = [
			payload.musicButtons,
			payload.secondaryButtons,
			payload.volumeButtons,
		];
		if (payload.queueSelectMenu) components.push(payload.queueSelectMenu);

		await message.edit({ embeds: [payload.embed], components }).catch(() => {});
	} catch (error) {
		Logger.error("syncPlayerPanel failed", error, "progressUpdater.js");
	}
}

function startProgressUpdater(discordClient, message, queue) {
	if (activeUpdaters.has(queue.id)) stopProgressUpdater(queue.id);

	const client = discordClient;
	const guildId = queue.id;

	const updateInterval = setInterval(async () => {
		try {
			const msgInfo = getActivePlayerMessage(guildId);
			if (!msgInfo) {
				stopProgressUpdater(guildId);
				return;
			}
			if (!client?.lavalinkManager) {
				stopProgressUpdater(guildId);
				return;
			}
			await syncPlayerPanel(client, guildId);
		} catch (error) {
			Logger.error("Error actualizando progreso", error, "progressUpdater.js");
			stopProgressUpdater(guildId);
		}
	}, PROGRESS_UPDATE_INTERVAL_MS);

	activeUpdaters.set(queue.id, {
		interval: updateInterval,
		messageId: message.id,
	});
	Logger.music(
		`Iniciado actualizador de progreso para cola ${queue.id}`,
		"progressUpdater.js",
	);
}

function stopProgressUpdater(queueId) {
	const updater = activeUpdaters.get(queueId);
	if (updater) {
		clearInterval(updater.interval);
		activeUpdaters.delete(queueId);
		Logger.music(
			`Detenido actualizador de progreso para cola ${queueId}`,
			"progressUpdater.js",
		);
	}
}

function stopAllUpdaters() {
	activeUpdaters.forEach((updater, queueId) => {
		clearInterval(updater.interval);
		Logger.music(
			`Detenido actualizador para cola ${queueId}`,
			"progressUpdater.js",
		);
	});
	activeUpdaters.clear();
}

module.exports = {
	buildPlayerPanelPayload,
	syncPlayerPanel,
	startProgressUpdater,
	stopProgressUpdater,
	stopAllUpdaters,
	syncProgressClock,
	freezeProgressClock,
	resumeProgressClock,
	resetProgressClock,
	clearProgressClock,
	getCalculatedPosition,
};
