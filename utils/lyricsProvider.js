// Fetches lyrics with LRCLib as the primary source and lyrics.ovh as fallback.

const https = require("https");

const cache = new Map();
const CACHE_TTL_MS = 15 * 60 * 1000;
const REQUEST_TIMEOUT_MS = 10 * 1000;

function httpsGet(url) {
	return new Promise((resolve, reject) => {
		const req = https.get(
			url,
			{ headers: { "User-Agent": "RosyMusicBot/1.0" } },
			(res) => {
				if (
					res.statusCode >= 300 &&
					res.statusCode < 400 &&
					res.headers.location
				) {
					const redirectReq = https.get(
						res.headers.location,
						{ headers: { "User-Agent": "RosyMusicBot/1.0" } },
						(redirectRes) => {
							let data = "";
							redirectRes.on("data", (chunk) => (data += chunk));
							redirectRes.on("end", () => resolve(data));
						},
					);
					redirectReq.on("error", reject);
					redirectReq.setTimeout(REQUEST_TIMEOUT_MS, () => {
						redirectReq.destroy();
						reject(new Error("Request timeout"));
					});
					return;
				}

				let data = "";
				res.on("data", (chunk) => (data += chunk));
				res.on("end", () => resolve(data));
			},
		);

		req.on("error", reject);
		req.setTimeout(REQUEST_TIMEOUT_MS, () => {
			req.destroy();
			reject(new Error("Request timeout"));
		});
	});
}

function buildCacheKey(artist, title) {
	return `${(artist || "").toLowerCase().trim()}|||${(title || "").toLowerCase().trim()}`;
}

function getCached(key) {
	const entry = cache.get(key);
	if (!entry) return null;
	if (Date.now() > entry.expiresAt) {
		cache.delete(key);
		return null;
	}
	return entry.data;
}

function setCached(key, data) {
	cache.set(key, { data, expiresAt: Date.now() + CACHE_TTL_MS });
}

async function fetchLyrics(artist, title) {
	if (!artist && !title) return null;

	const cacheKey = buildCacheKey(artist, title);
	const cached = getCached(cacheKey);
	if (cached) return cached;

	try {
		const query = `${artist} ${title}`.trim();
		const searchUrl = `https://lrclib.net/api/search?q=${encodeURIComponent(query)}`;

		const body = await httpsGet(searchUrl);
		const results = JSON.parse(body);

		if (Array.isArray(results) && results.length > 0) {
			const result = results[0];
			const plainLyrics = result.plainLyrics || result.syncedLyrics || null;

			if (plainLyrics && plainLyrics.trim().length > 0) {
				const data = {
					title: result.trackName || title,
					artist: result.artistName || artist,
					lyrics: plainLyrics.trim(),
					source: "LRCLib",
				};
				setCached(cacheKey, data);
				return data;
			}
		}

		return await fetchLyricsFromLyricsOvh(artist, title, cacheKey);
	} catch (err) {
		try {
			return await fetchLyricsFromLyricsOvh(artist, title, cacheKey);
		} catch (_) {
			return null;
		}
	}
}

async function fetchLyricsFromLyricsOvh(artist, title, cacheKey) {
	const lyricsUrl = `https://api.lyrics.ovh/v1/${encodeURIComponent(artist)}/${encodeURIComponent(title)}`;
	const body = await httpsGet(lyricsUrl);
	const parsed = JSON.parse(body);

	if (parsed.lyrics && parsed.lyrics.trim().length > 0) {
		const data = {
			title,
			artist,
			lyrics: parsed.lyrics.trim(),
			source: "lyrics.ovh",
		};
		setCached(cacheKey, data);
		return data;
	}

	return null;
}

async function fetchLyricsByQuery(query) {
	if (!query || !query.trim()) return null;

	const cacheKey = `query|||${query.toLowerCase().trim()}`;
	const cached = getCached(cacheKey);
	if (cached) return cached;

	try {
		const searchUrl = `https://lrclib.net/api/search?q=${encodeURIComponent(query.trim())}`;
		const body = await httpsGet(searchUrl);
		const results = JSON.parse(body);

		if (Array.isArray(results) && results.length > 0) {
			const result = results[0];
			const plainLyrics = result.plainLyrics || result.syncedLyrics || null;

			if (plainLyrics && plainLyrics.trim().length > 0) {
				const data = {
					title: result.trackName || query,
					artist: result.artistName || query,
					lyrics: plainLyrics.trim(),
					source: "LRCLib",
				};
				setCached(cacheKey, data);
				return data;
			}
		}

		return null;
	} catch (err) {
		return null;
	}
}

module.exports = {
	fetchLyrics,
	fetchLyricsByQuery,
};
