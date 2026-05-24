// Stores per-guild local history for /back and jump restoration.

const Logger = require("./logger");

const historyMap = new Map();

const backRestoring = new Set();

const MAX_HISTORY = 20;

function pushTrack(guildId, entry) {
	if (!entry) return;

	let stack = historyMap.get(guildId);
	if (!stack) {
		stack = [];
		historyMap.set(guildId, stack);
	}

	const effectiveTrack = entry.track ?? entry;

	if (stack.length > 0) {
		const top = stack[stack.length - 1];
		const topTrack = top?.track ?? top;

		// Reference equality for plain tracks
		if (topTrack === effectiveTrack) return;

		const isTopJump = top?.track && Array.isArray(top?.forwardTracks);
		const isEntryJump = entry?.track && Array.isArray(entry?.forwardTracks);
		if (isTopJump && isEntryJump) {
			const sameInner = top.track.info?.title === entry.track.info?.title;
			let sameFwd = top.forwardTracks === entry.forwardTracks;
			if (!sameFwd && top.forwardTracks.length === entry.forwardTracks.length) {
				sameFwd = top.forwardTracks.every(
					(t, i) => t?.info?.title === entry.forwardTracks[i]?.info?.title,
				);
			}
			if (sameInner && sameFwd) return;
		}

		// Upgrade a plain top entry into a jump entry.
		let bothSameTrack = false;
		if (!isTopJump && !isEntryJump) {
			bothSameTrack = topTrack === effectiveTrack;
		} else if (isTopJump && isEntryJump) {
			bothSameTrack = top.track.info?.title === entry.track.info?.title;
		} else if (!isTopJump && isEntryJump) {
			bothSameTrack = top?.info?.title === entry.track.info?.title;
		} else {
			bothSameTrack = top.track.info?.title === effectiveTrack?.info?.title;
		}
		if (bothSameTrack && isEntryJump && !isTopJump) {
			stack.pop();
			stack.push(entry);
			return;
		}
		if (bothSameTrack && !isEntryJump && isTopJump) return;
	}

	stack.push(entry);
	if (stack.length > MAX_HISTORY) {
		stack.shift();
		Logger.music(
			`playbackHistory: guild=${guildId} limit reached, evicted oldest`,
			"playbackHistory.js",
		);
	}
}

// Pop the most recent entry and discard stale entries for the current track.
function popTrack(guildId, currentTrack = null) {
	const stack = historyMap.get(guildId);
	if (!stack || stack.length === 0) return null;

	let top = stack[stack.length - 1];
	const isPlainTrack = Boolean(top?.info);
	const currentTitle = currentTrack?.info?.title;

	// Discard stale entries (trackStart fired after jump/skip)
	if (isPlainTrack && currentTitle && top?.info?.title === currentTitle) {
		stack.pop();
		if (stack.length === 0) return null;
		top = stack[stack.length - 1];
	} else if (
		!isPlainTrack &&
		top?.track &&
		currentTitle &&
		top.track.info?.title === currentTitle
	) {
		stack.pop();
		if (stack.length === 0) return null;
		top = stack[stack.length - 1];
	}

	if (!top) return null;
	stack.pop();
	return top;
}

function peekHistory(guildId) {
	const stack = historyMap.get(guildId);
	if (!stack || stack.length === 0) return null;
	return stack[stack.length - 1];
}

function getHistory(guildId) {
	const stack = historyMap.get(guildId);
	return stack ? [...stack] : [];
}

function getHistoryLength(guildId) {
	const stack = historyMap.get(guildId);
	return stack ? stack.length : 0;
}

function clearHistory(guildId) {
	if (historyMap.has(guildId)) {
		historyMap.delete(guildId);
		Logger.music(
			`playbackHistory: cleared for guild=${guildId}`,
			"playbackHistory.js",
		);
	}
}

function markBackRestoring(guildId) {
	backRestoring.add(guildId);
}

function isBackRestoring(guildId) {
	return backRestoring.has(guildId);
}

function clearBackRestoring(guildId) {
	backRestoring.delete(guildId);
}

module.exports = {
	pushTrack,
	popTrack,
	peekHistory,
	getHistory,
	getHistoryLength,
	clearHistory,
	markBackRestoring,
	isBackRestoring,
	clearBackRestoring,
};
