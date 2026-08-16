// Adapts the lavalink-client queue to the flow used by the music commands.

const Logger = require("./logger");
const {
	pushTrack: historyPush,
	clearHistory: historyClear,
	isBackRestoring,
} = require("./playbackHistory");

function detectQueueType(queue) {
	if (!queue) return "other";
	if (typeof queue.tracks !== "undefined") return "queue-class";
	if (Array.isArray(queue)) return "array";
	return "other";
}

function getMutableQueueTracks(player) {
	const q = player?.queue;
	if (!q) return null;
	if (Array.isArray(q)) return q;
	if (typeof q.splice === "function") return q.tracks;
	return null;
}

function getQueuedTracks(player) {
	const q = player?.queue;
	if (!q) return [];
	if (Array.isArray(q)) return q;
	if (typeof q.splice === "function") return q.tracks ?? [];
	if (Array.isArray(q.tracks)) return q.tracks;
	if (Array.isArray(q.items)) return q.items;
	if (Array.isArray(q.data)) return q.data;
	if (typeof q.values === "function") return Array.from(q.values());
	if (typeof q.toArray === "function") return q.toArray();
	return [];
}

async function getQueue(manager, guildId) {
	if (!manager) {
		Logger.warn("getQueue llamada sin manager", "lavalinkQueue.js");
		return null;
	}

	try {
		const player = manager.getPlayer(guildId);
		if (!player) return null;

		const track = player.queue?.current || player.track;
		const queue = getQueuedTracks(player);

		return {
			songs: track ? [track, ...queue] : queue,
			current: track || null,
			previous: player.previousTrack || null,
			paused: player.paused ?? false,
			playing: !(player.paused ?? false),
			volume: player.volume ?? 100,
			repeatMode: normalizeRepeatMode(player.repeatMode ?? "off"),
			voiceChannel: player.voiceChannelId || null,
			play: (query) => playTrack(manager, guildId, query),
			skip: () => skipTrack(manager, guildId),
			jump: (index) => jumpToTrack(manager, guildId, index),
			pause: () => pauseTrack(manager, guildId),
			resume: () => resumeTrack(manager, guildId),
			stop: () => stopPlayer(manager, guildId),
			setVolume: (percent) => setVolume(manager, guildId, percent),
			setRepeatMode: (mode) => setRepeatMode(manager, guildId, mode),
			length: queue.length + (track ? 1 : 0),
			isPlaying: !(player.paused ?? false),
			isPaused: player.paused ?? false,
		};
	} catch (error) {
		Logger.error(`Error getQueue guild=${guildId}`, error, "lavalinkQueue.js");
		return null;
	}
}

async function playLavalink(
	manager,
	guildId,
	query,
	{ requester, textChannelId, voiceChannelId, autoPlay = true } = {},
) {
	if (!manager)
		throw new Error(
			"[lavalinkQueue] playLavalink: manager no está inicializado",
		);
	if (!manager.useable)
		throw new Error(
			"[lavalinkQueue] playLavalink: Lavalink no está disponible (sin nodos conectados)",
		);
	if (!voiceChannelId)
		throw new Error(
			"[lavalinkQueue] playLavalink: se requiere voiceChannelId para unirse",
		);

	try {
		let player = manager.getPlayer(guildId);
		if (!player) {
			player = manager.createPlayer({
				guildId,
				voiceChannelId,
				textChannelId: textChannelId || null,
				volume: 50,
				selfDeaf: true,
				selfMute: false,
				instaUpdateFiltersFix: true,
				applyVolumeAsFilter: false,
			});
			Logger.music(
				`Player creado para guild=${guildId} canal=${voiceChannelId}`,
				"lavalinkQueue.js",
			);
		}

		if (!player.connected) {
			await player.connect();
			Logger.music(
				`Player conectado a voz guild=${guildId} canal=${voiceChannelId}`,
				"lavalinkQueue.js",
			);
		}

		const requesterData = requester
			? {
					id: requester.id,
					tag: requester.tag,
					displayAvatarURL: requester.displayAvatarURL
						? requester.displayAvatarURL({ dynamic: true })
						: null,
				}
			: null;

		const searchResult = await player.search(query, requesterData, false);
		if (
			!searchResult ||
			(Array.isArray(searchResult.tracks) && searchResult.tracks.length === 0)
		) {
			throw new Error(
				"[lavalinkQueue] No se encontraron resultados para: " + query,
			);
		}

		const tracks = searchResult.tracks || [];
		if (tracks.length === 0)
			throw new Error(
				"[lavalinkQueue] No se encontraron tracks para: " + query,
			);

		for (const track of tracks) {
			track.userData = { ...(track.userData || {}), requester: requesterData };
		}

		await player.queue.add(
			searchResult.loadType === "playlist" ? tracks : tracks[0],
		);
		if (!player.playing) await player.play({ volume: 50, paused: false });
		Logger.music(
			`Lavalink play: "${tracks[0].info?.title}" guild=${guildId} por=${requesterData?.tag || "desconocido"}`,
			"lavalinkQueue.js",
		);
	} catch (error) {
		Logger.error(
			`Error playLavalink guild=${guildId} query=${query}`,
			error,
			"lavalinkQueue.js",
		);
		throw error;
	}
}

async function playTrack(manager, guildId, query) {
	if (!manager)
		throw new Error("[lavalinkQueue] playTrack: manager no está inicializado");
	const player = manager.getPlayer(guildId);
	if (!player)
		throw new Error(
			"[lavalinkQueue] playTrack: no hay player activo para este guild",
		);
	try {
		await manager.play(guildId, query);
	} catch (error) {
		Logger.error(
			`Error playTrack guild=${guildId} query=${query}`,
			error,
			"lavalinkQueue.js",
		);
		throw error;
	}
}

async function skipTrack(manager, guildId, options = {}) {
	if (!manager)
		throw new Error("[lavalinkQueue] skipTrack: manager no está inicializado");
	const player = manager.getPlayer(guildId);
	if (!player)
		throw new Error("[lavalinkQueue] skipTrack: no hay player activo");

	// Record current track in history before skipping; skip if in back restoration
	const current = player.track ?? player.queue?.current ?? null;
	const shouldRecordHistory = options.recordHistory !== false;
	if (shouldRecordHistory && !isBackRestoring(guildId)) {
		const { getHistory } = require("./playbackHistory");
		const stack = getHistory(guildId);
		if (stack.length > 0) {
			const top = stack[stack.length - 1];
			const topIsJumpEntry = top?.track && Array.isArray(top?.forwardTracks);
			if (topIsJumpEntry && current?.info?.title === top.track.info?.title) {
				// Jump entry already exists — preserve forwardTracks intact
			} else {
				historyPush(guildId, current);
			}
		} else {
			historyPush(guildId, current);
		}
	}

	try {
		if (typeof player.skip === "function") {
			await player.skip();
		} else if (typeof player.playNext === "function") {
			await player.playNext();
		} else {
			throw new Error("[lavalinkQueue] skipTrack: player.skip no disponible");
		}
	} catch (error) {
		Logger.error(`Error skipTrack guild=${guildId}`, error, "lavalinkQueue.js");
		throw error;
	}
}

async function jumpToTrack(manager, guildId, position) {
	if (!manager)
		throw new Error(
			"[lavalinkQueue] jumpToTrack: manager no está inicializado",
		);
	const player = manager.getPlayer(guildId);
	if (!player)
		throw new Error("[lavalinkQueue] jumpToTrack: no hay player activo");

	const queue = getQueuedTracks(player);
	const totalTracks = queue.length + 1;

	if (position < 1 || position > totalTracks) {
		throw new Error("[lavalinkQueue] jumpToTrack: posición inválida");
	}

	if (position === 1) return;

	// Position 2 removes 0 items; position 3 removes 1 item so the target track becomes next.
	const tracksToRemove = position - 2;

	const current = player.track ?? player.queue?.current ?? null;
	if (!isBackRestoring(guildId)) {
		const queueBefore = getQueuedTracks(player);
		const skipped = queueBefore.slice(0, tracksToRemove);
		if (skipped.length > 0) {
			// Jump entry: track=current, forwardTracks=skipped intermediates
			historyPush(guildId, { track: current, forwardTracks: skipped });
		} else {
			historyPush(guildId, current);
		}
	}

	if (tracksToRemove > 0) {
		const q = player.queue;
		if (typeof q?.splice === "function") {
			await q.splice(0, tracksToRemove);
		} else if (Array.isArray(q)) {
			q.splice(0, tracksToRemove);
		} else {
			const knownKeys = q ? Object.keys(q).slice(0, 10).join(", ") : "null";
			throw new Error(
				`[lavalinkQueue] jumpToTrack: cola sin método de mutación soportado. Keys conocidos: ${knownKeys}`,
			);
		}
	}

	await skipTrack(manager, guildId, { recordHistory: false });
	Logger.music(
		`jumpToTrack guild=${guildId} posición=${position}`,
		"lavalinkQueue.js",
	);
}

async function pauseTrack(manager, guildId) {
	if (!manager)
		throw new Error("[lavalinkQueue] pauseTrack: manager no está inicializado");
	const player = manager.getPlayer(guildId);
	if (!player)
		throw new Error("[lavalinkQueue] pauseTrack: no hay player activo");

	try {
		if (player.paused) {
			Logger.music(
				`pauseTrack: ya estaba pausado guild=${guildId}`,
				"lavalinkQueue.js",
			);
			return;
		}
		if (typeof player.pause === "function") {
			await player.pause(true);
		} else {
			throw new Error("[lavalinkQueue] pauseTrack: player.pause no disponible");
		}
	} catch (error) {
		Logger.error(
			`Error pauseTrack guild=${guildId}`,
			error,
			"lavalinkQueue.js",
		);
		throw error;
	}
}

async function resumeTrack(manager, guildId) {
	if (!manager)
		throw new Error(
			"[lavalinkQueue] resumeTrack: manager no está inicializado",
		);
	const player = manager.getPlayer(guildId);
	if (!player)
		throw new Error("[lavalinkQueue] resumeTrack: no hay player activo");

	try {
		if (!player.paused) {
			Logger.music(
				`resumeTrack: ya estaba reproduciendo guild=${guildId}`,
				"lavalinkQueue.js",
			);
			return;
		}
		if (typeof player.resume === "function") {
			await player.resume();
		} else {
			throw new Error(
				"[lavalinkQueue] resumeTrack: player.resume no disponible",
			);
		}
	} catch (error) {
		Logger.error(
			`Error resumeTrack guild=${guildId}`,
			error,
			"lavalinkQueue.js",
		);
		throw error;
	}
}

async function stopPlayer(manager, guildId) {
	if (!manager)
		throw new Error("[lavalinkQueue] stopPlayer: manager no está inicializado");
	const player = manager.getPlayer(guildId);
	if (!player)
		throw new Error("[lavalinkQueue] stopPlayer: no hay player activo");

	try {
		if (typeof player.stopPlaying === "function") {
			await player.stopPlaying(true, false);
		} else {
			throw new Error(
				"[lavalinkQueue] stopPlayer: player.stopPlaying no disponible",
			);
		}
	} catch (error) {
		Logger.error(
			`Error stopPlayer guild=${guildId}`,
			error,
			"lavalinkQueue.js",
		);
		throw error;
	}

	historyClear(guildId);
	const { clearProgressState } = require("./progressUpdater");
	clearProgressState(guildId);
}

async function setVolume(manager, guildId, percent) {
	if (!manager)
		throw new Error("[lavalinkQueue] setVolume: manager no está inicializado");
	const player = manager.getPlayer(guildId);
	if (!player)
		throw new Error("[lavalinkQueue] setVolume: no hay player activo");

	const clamped = Math.max(0, Math.min(100, percent));
	try {
		if (typeof player.setVolume === "function") {
			await player.setVolume(clamped);
		} else {
			throw new Error(
				"[lavalinkQueue] setVolume: player.setVolume no disponible",
			);
		}
	} catch (error) {
		Logger.error(
			`Error setVolume guild=${guildId} vol=${clamped}`,
			error,
			"lavalinkQueue.js",
		);
		throw error;
	}
}

async function setRepeatMode(manager, guildId, mode) {
	if (!manager)
		throw new Error(
			"[lavalinkQueue] setRepeatMode: manager no está inicializado",
		);
	const player = manager.getPlayer(guildId);
	if (!player)
		throw new Error("[lavalinkQueue] setRepeatMode: no hay player activo");

	const normalizedMode = normalizeRepeatMode(mode);
	const validModes = ["off", "track", "queue"];
	if (!validModes.includes(normalizedMode)) {
		throw new Error(
			`[lavalinkQueue] setRepeatMode: modo inválido "${mode}". Usar: off, track/song, queue`,
		);
	}

	try {
		if (typeof player.setRepeatMode === "function") {
			await player.setRepeatMode(normalizedMode);
		} else {
			throw new Error(
				"[lavalinkQueue] setRepeatMode: player.setRepeatMode no disponible en este nodo Lavalink",
			);
		}
	} catch (error) {
		Logger.error(
			`Error setRepeatMode guild=${guildId} mode=${normalizedMode}`,
			error,
			"lavalinkQueue.js",
		);
		throw error;
	}
}

function normalizeRepeatMode(mode) {
	if (mode === 0) return "off";
	if (mode === 1) return "track";
	if (mode === 2) return "queue";
	if (mode === "song") return "track";
	if (mode === "track" || mode === "queue" || mode === "off") return mode;
	return "off";
}

function getCurrentTrack(manager, guildId) {
	if (!manager) return null;
	const player = manager.getPlayer(guildId);
	if (!player) return null;
	return player.track ?? player.queue?.current ?? null;
}

function getUpcomingTracks(manager, guildId) {
	if (!manager) return [];
	const player = manager.getPlayer(guildId);
	if (!player) return [];
	return getQueuedTracks(player);
}

function getQueueLength(manager, guildId) {
	const tracks = getUpcomingTracks(manager, guildId);
	const current = getCurrentTrack(manager, guildId);
	return tracks.length + (current ? 1 : 0);
}

function getVoiceChannelId(manager, guildId) {
	if (!manager) return null;
	const player = manager.getPlayer(guildId);
	return player?.voiceChannelId ?? null;
}

// Inserts a track or jump entry at the front of the queue, then skips so it plays next.
// Jump entries { track, forwardTracks } become [restore, ...forward, current].
// Uses queue.tracks for lavalink-client v2, where Queue persists direct mutations.
async function playTrackNext(manager, guildId, entry, currentTrack = null) {
	if (!manager)
		throw new Error(
			"[lavalinkQueue] playTrackNext: manager no está inicializado",
		);
	const player = manager.getPlayer(guildId);
	if (!player)
		throw new Error("[lavalinkQueue] playTrackNext: no hay player activo");

	const q = player.queue;
	if (!q)
		throw new Error("[lavalinkQueue] playTrackNext: player.queue es null");

	const tracks = getMutableQueueTracks(player);
	if (!tracks) {
		const knownKeys = Object.keys(q).slice(0, 10).join(", ");
		throw new Error(
			`[lavalinkQueue] playTrackNext: no se pudo obtener array mutable de la cola. Keys conocidos: ${knownKeys}`,
		);
	}

	const isJumpEntry =
		entry && typeof entry === "object" && !entry.info && entry.track;
	const restoreTrack = isJumpEntry ? entry.track : entry;
	const forwardTracks = isJumpEntry ? entry.forwardTracks || [] : [];

	if (isJumpEntry && forwardTracks.length > 0) {
		// Jump restore: insert [restore, ...forward, current]
		const sequence = [restoreTrack, ...forwardTracks];
		const last = sequence[sequence.length - 1];
		if (currentTrack && last?.info?.title !== currentTrack?.info?.title) {
			sequence.push(currentTrack);
		}
		tracks.splice(0, 0, ...sequence);
		Logger.music(
			`playTrackNext: jump-restore sequence="${sequence.map((t) => t?.info?.title).join(" → ")}" guild=${guildId}`,
			"lavalinkQueue.js",
		);
	} else {
		if (currentTrack) {
			tracks.splice(0, 0, restoreTrack, currentTrack);
		} else {
			tracks.unshift(restoreTrack);
		}
		Logger.music(
			`playTrackNext: inserted track="${restoreTrack?.info?.title}" currentTrack="${currentTrack?.info?.title || "none"}" guild=${guildId}`,
			"lavalinkQueue.js",
		);
	}

	await skipTrack(manager, guildId);
}

function addToQueue(manager, guildId, track) {
	if (!manager)
		throw new Error("[lavalinkQueue] addToQueue: manager no está inicializado");
	const player = manager.getPlayer(guildId);
	if (!player)
		throw new Error(
			"[lavalinkQueue] addToQueue: no hay player activo para este guild",
		);

	const q = player.queue;
	if (!q)
		throw new Error(
			"[lavalinkQueue] addToQueue: player.queue es null (sin player activo)",
		);

	if (typeof q.add === "function") {
		q.add(track);
		Logger.music(
			`Track agregado a cola guild=${guildId} title=${track?.info?.title}`,
			"lavalinkQueue.js",
		);
		return;
	}

	if (Array.isArray(q)) {
		q.push(track);
		Logger.music(
			`Track agregado a cola guild=${guildId} title=${track?.info?.title}`,
			"lavalinkQueue.js",
		);
		return;
	}

	const knownKeys = Object.keys(q).slice(0, 10).join(", ");
	throw new Error(
		`[lavalinkQueue] addToQueue: cola sin método de adición soportado. Keys conocidos: ${knownKeys}`,
	);
}

function removeFromQueue(manager, guildId, index) {
	if (!manager)
		throw new Error(
			"[lavalinkQueue] removeFromQueue: manager no está inicializado",
		);
	const player = manager.getPlayer(guildId);
	if (!player)
		throw new Error("[lavalinkQueue] removeFromQueue: no hay player activo");

	const q = player.queue;
	if (!q) return null;

	const tracks = getQueuedTracks(player);
	if (index < 0 || index >= tracks.length) return null;

	if (typeof q.splice === "function") {
		const removed = q.splice(index, 1);
		const track = Array.isArray(removed) ? removed[0] : null;
		Logger.music(
			`Track removido de cola guild=${guildId} índice=${index}`,
			"lavalinkQueue.js",
		);
		return track ?? null;
	}

	if (Array.isArray(q)) {
		const removed = q.splice(index, 1)[0];
		Logger.music(
			`Track removido de cola guild=${guildId} índice=${index}`,
			"lavalinkQueue.js",
		);
		return removed;
	}

	const knownKeys = Object.keys(q).slice(0, 10).join(", ");
	throw new Error(
		`[lavalinkQueue] removeFromQueue: cola sin método de mutación soportado. Keys conocidos: ${knownKeys}`,
	);
}

async function clearQueue(manager, guildId) {
	if (!manager)
		throw new Error("[lavalinkQueue] clearQueue: manager no está inicializado");
	const player = manager.getPlayer(guildId);
	if (!player)
		throw new Error("[lavalinkQueue] clearQueue: no hay player activo");

	const q = player.queue;
	if (!q) return;

	if (typeof q.splice === "function") {
		await q.splice(0);
		Logger.music(`Cola limpiada guild=${guildId}`, "lavalinkQueue.js");
		return;
	}

	if (Array.isArray(q)) {
		q.splice(0);
		Logger.music(`Cola limpiada guild=${guildId}`, "lavalinkQueue.js");
		return;
	}

	const knownKeys = Object.keys(q).slice(0, 10).join(", ");
	throw new Error(
		`[lavalinkQueue] clearQueue: cola sin método de mutación soportado. Keys conocidos: ${knownKeys}`,
	);
}

async function shuffleTrack(manager, guildId) {
	if (!manager)
		throw new Error(
			"[lavalinkQueue] shuffleTrack: manager no está inicializado",
		);
	const player = manager.getPlayer(guildId);
	if (!player)
		throw new Error("[lavalinkQueue] shuffleTrack: no hay player activo");

	const queue = getQueuedTracks(player);
	if (queue.length < 2) {
		return {
			shuffled: false,
			reason: "Se necesitaban al menos 2 canciones en la cola para mezclar",
		};
	}

	try {
		if (typeof player.queue?.shuffle === "function") {
			await player.queue.shuffle();
			Logger.music(
				`Cola mezclada (native) guild=${guildId}`,
				"lavalinkQueue.js",
			);
			return { shuffled: true };
		}

		const arr = getMutableQueueTracks(player);
		if (!arr) {
			const knownKeys = Object.keys(player.queue ?? {})
				.slice(0, 10)
				.join(", ");
			return {
				shuffled: false,
				reason: `No se pudo obtener array mutable de la cola. Keys: ${knownKeys}`,
			};
		}
		for (let i = arr.length - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1));
			[arr[i], arr[j]] = [arr[j], arr[i]];
		}

		Logger.music(
			`Cola mezclada (Fisher-Yates fallback) guild=${guildId}`,
			"lavalinkQueue.js",
		);
		return { shuffled: true };
	} catch (error) {
		Logger.error(
			`Error shuffleTrack guild=${guildId}`,
			error,
			"lavalinkQueue.js",
		);
		return { shuffled: false, reason: "No se pudo mezclar la cola." };
	}
}

// Stores the autoplay flag per guild.
const autoplayFlags = new Map();

function getAutoplay(guildId) {
	return autoplayFlags.get(guildId) ?? false;
}

function toggleAutoplay(guildId) {
	const current = getAutoplay(guildId);
	const next = !current;
	autoplayFlags.set(guildId, next);
	Logger.music(
		`Autoplay toggled guild=${guildId} → ${next}`,
		"lavalinkQueue.js",
	);
	return next;
}

function clearAutoplay(guildId) {
	autoplayFlags.delete(guildId);
}

async function seekToPosition(manager, guildId, positionSec) {
	if (!manager)
		throw new Error(
			"[lavalinkQueue] seekToPosition: manager no está inicializado",
		);
	const player = manager.getPlayer(guildId);
	if (!player)
		throw new Error("[lavalinkQueue] seekToPosition: no hay player activo");

	try {
		if (typeof player.seek === "function") {
			await player.seek(Math.floor(positionSec * 1000));
			Logger.music(
				`seekToPosition guild=${guildId} pos=${positionSec}s`,
				"lavalinkQueue.js",
			);
			return;
		}

		if (typeof player.play === "function") {
			await player.play({ position: Math.floor(positionSec * 1000) });
			Logger.music(
				`seekToPosition (play fallback) guild=${guildId} pos=${positionSec}s`,
				"lavalinkQueue.js",
			);
			return;
		}

		throw new Error(
			"[lavalinkQueue] seekToPosition: player.seek no disponible",
		);
	} catch (error) {
		Logger.error(
			`Error seekToPosition guild=${guildId} pos=${positionSec}s`,
			error,
			"lavalinkQueue.js",
		);
		throw error;
	}
}

function getPreviousTrack(manager, guildId) {
	if (!manager) return null;
	const player = manager.getPlayer(guildId);
	if (!player) return null;
	return player.previousTrack ?? null;
}

module.exports = {
	getQueue,
	getCurrentTrack,
	getUpcomingTracks,
	getQueueLength,
	getVoiceChannelId,
	addToQueue,
	removeFromQueue,
	clearQueue,
	playLavalink,
	playTrack,
	skipTrack,
	jumpToTrack,
	pauseTrack,
	resumeTrack,
	stopPlayer,
	setVolume,
	setRepeatMode,
	shuffleTrack,
	normalizeRepeatMode,
	getQueuedTracks,
	getMutableQueueTracks,
	detectQueueType,
	getAutoplay,
	toggleAutoplay,
	clearAutoplay,
	getPreviousTrack,
	seekToPosition,
	playTrackNext,
};
