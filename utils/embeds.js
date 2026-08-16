// Provides embed helpers for player UI, queue views, errors, and bot responses.

const { EmbedBuilder } = require("discord.js");

const COLORS = {
	PLAYING: 0x00ff00,
	PAUSED: 0xffaa00,
	ERROR: 0xff0000,
	INFO: 0x0099ff,
	QUEUE: 0x9b59b6,
	SUCCESS: 0x00ff88,
	WARNING: 0xffaa00,
};

const MAX_EMBED_DESCRIPTION_LENGTH = 4096;

function truncateForEmbed(text, maxLength = MAX_EMBED_DESCRIPTION_LENGTH) {
	if (text.length <= maxLength) return text;
	return `${text.slice(0, maxLength - 25).trimEnd()}\n… *(mensaje recortado)*`;
}

function stringifyEmbedDescription(
	value,
	fallback = "Ocurrió un error inesperado.",
) {
	if (typeof value === "string") {
		const trimmed = value.trim();
		return truncateForEmbed(trimmed || fallback);
	}

	if (value instanceof AggregateError) {
		const messages = value.errors
			.map((error) => stringifyEmbedDescription(error, "Error sin detalle"))
			.filter(Boolean);
		const summary = value.message ? `${value.message}\n` : "";
		return truncateForEmbed(
			`${summary}${messages.map((message) => `• ${message}`).join("\n")}.trim() || fallback`,
		);
	}

	if (value instanceof Error) {
		const details = value.cause
			? `${value.message}\nCausa: ${stringifyEmbedDescription(value.cause, "Error sin detalle")}`
			: value.message;
		return truncateForEmbed((details || fallback).trim());
	}

	if (Array.isArray(value)) {
		const messages = value
			.map((item) => stringifyEmbedDescription(item, "Error sin detalle"))
			.filter(Boolean);
		return truncateForEmbed(messages.join("\n") || fallback);
	}

	if (value && typeof value === "object") {
		const message =
			value.message || value.rawError?.message || value.errors || value.cause;
		if (message) return stringifyEmbedDescription(message, fallback);
		try {
			return truncateForEmbed(JSON.stringify(value, null, 2));
		} catch (_) {
			return fallback;
		}
	}

	if (value === undefined || value === null) return fallback;
	return truncateForEmbed(String(value).trim() || fallback);
}

function deriveYoutubeThumbnail(input) {
	if (!input || typeof input !== "string") return null;
	const patterns = [
		/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/)([a-zA-Z0-9_-]{11})/,
		/^([a-zA-Z0-9_-]{11})$/,
	];
	for (const pattern of patterns) {
		const match = input.match(pattern);
		if (match && match[1]) {
			return `https://img.youtube.com/vi/${match[1]}/hqdefault.jpg`;
		}
	}
	return null;
}

function truncateField(value, maxLength = 1024) {
	if (!value || typeof value !== "string") return "";
	if (value.length <= maxLength) return value;
	return `${value.slice(0, maxLength - 3).trimEnd()}…`;
}

function normalizeTrack(song) {
	if (!song) return null;

	if (song.info && typeof song.info === "object") {
		const lengthMs = song.info.length || song.info.duration || 0;
		const requester = song.requester || song.userData?.requester || null;
		const isStream = Boolean(song.info.isStream);

		let thumbnail = song.info.thumbnail || null;
		if (!thumbnail)
			thumbnail = deriveYoutubeThumbnail(
				song.info.uri || song.info.url || null,
			);

		return {
			name: song.info.title || "Desconocido",
			url: song.info.uri || null,
			uploader: { name: song.info.author || "Desconocido" },
			duration: isStream ? 0 : Math.floor(lengthMs / 1000),
			thumbnail,
			user: requester,
			isStream,
		};
	}

	let thumbnail = song.thumbnail || null;
	if (!thumbnail) thumbnail = deriveYoutubeThumbnail(song.url || null);

	return {
		name: song.name || "Desconocido",
		url: song.url || null,
		uploader: {
			name: song.uploader?.name || song.channel?.name || "Desconocido",
		},
		duration: song.duration || 0,
		thumbnail,
		user: song.user || null,
		isStream: Boolean(song.isStream || song.live),
	};
}

function createVisualProgressBar(positionMs, durationMs, options) {
	const isStream = options?.isStream ?? false;
	const barLength = options?.barLength ?? 16;

	if (isStream || !durationMs || durationMs === 0) return null;

	const positionSeconds = positionMs / 1000;
	const durationSeconds = durationMs / 1000;
	const progress = Math.min(positionSeconds / durationSeconds, 1);
	const filledLength = Math.floor(progress * barLength);
	const emptyLength = barLength - filledLength;

	const filled = "▓".repeat(filledLength);
	const cursor = "▒";
	const empty = "░".repeat(emptyLength);
	const percent = Math.round(progress * 100);

	return `${filled}${cursor}${empty} ${percent}%`;
}

function formatVolumeBar(volumePercent, options) {
	const clampedVolume = Math.max(0, Math.min(100, Math.round(volumePercent)));
	const blockCount = options?.blockCount ?? 8;
	const filledBlocks = Math.round(clampedVolume / (100 / blockCount));
	const emptyBlocks = blockCount - filledBlocks;
	return `${"▓".repeat(filledBlocks)}${"░".repeat(emptyBlocks)} ${clampedVolume}%`;
}

function createTrackSummaryBlock(track, requester) {
	if (!track) return "";

	const name = track.name || "Desconocido";
	const artist = track.uploader?.name || track.uploader || "Desconocido";

	let summary;
	if (track.url) {
		summary = `🎶 Escuchando: **[${name}](${track.url})** por: **[${artist}](${track.url})** 🎶`;
	} else {
		summary = `🎶 Escuchando: **${name}** por: **${artist}** 🎶`;
	}

	if (requester) {
		const userTag = requester.tag || requester.username || "Desconocido";
		summary += `\n• Pedido por @${userTag}`;
	}
	return summary;
}

function formatRemainingTime(positionMs, durationMs) {
	if (!durationMs || durationMs === 0) return null;
	const positionSeconds = positionMs / 1000;
	const durationSeconds = durationMs / 1000;
	const remainingSeconds = durationSeconds - positionSeconds;
	if (remainingSeconds < 0) return "-0:00";
	const minutes = Math.floor(remainingSeconds / 60);
	const seconds = Math.floor(remainingSeconds % 60);
	return `-${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function createProgressBar(current, total, isStream = false) {
	if (!total || total === 0 || isStream) return "▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬";
	const length = 20;
	const progress = Math.min(current / total, 1);
	const filledLength = Math.floor(progress * length);
	const emptyLength = length - filledLength;
	return `🔘${"━".repeat(filledLength)}│${"─".repeat(emptyLength)}`;
}

function formatProgressTimeDisplay(current, total, isStream = false) {
	const elapsed = formatDuration(current, isStream);
	if (!total || total === 0 || isStream)
		return isStream ? "🔴 En vivo" : `⏱ ${elapsed}`;
	return `${elapsed} / ${formatDuration(total, isStream)}`;
}

function formatDuration(seconds, isStream = false) {
	if ((!seconds || seconds === 0) && isStream) return "🔴 En vivo";
	const h = Math.floor(seconds / 3600);
	const m = Math.floor((seconds % 3600) / 60);
	const s = Math.floor(seconds % 60);
	if (h > 0)
		return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
	return `${m}:${s.toString().padStart(2, "0")}`;
}

function createNowPlayingEmbed(song, queue) {
	const normalized = normalizeTrack(song);
	const currentTime = queue?.currentTime || 0;
	const duration = normalized?.duration || 0;
	const isStream = normalized?.isStream || false;

	const visualProgressBar = createVisualProgressBar(
		currentTime * 1000,
		duration * 1000,
		{ isStream },
	);
	const timeDisplay = formatProgressTimeDisplay(
		currentTime,
		duration,
		isStream,
	);
	const remainingTime = formatRemainingTime(
		currentTime * 1000,
		duration * 1000,
	);

	const loopModes = {
		0: "❌ Desactivado",
		1: "🔂 Canción",
		2: "🔁 Cola",
		off: "❌ Desactivado",
		track: "🔂 Canción",
		song: "🔂 Canción",
		queue: "🔁 Cola",
	};
	const loopText = loopModes[queue?.repeatMode ?? "off"] || "❌ Desactivado";

	let progressFieldValue;
	if (isStream || !visualProgressBar) {
		progressFieldValue = `🔴 En vivo\n${timeDisplay}`;
	} else {
		const remainingLine = remainingTime ? `\n${remainingTime}` : "";
		progressFieldValue = `${visualProgressBar}\n${timeDisplay}${remainingLine}`;
	}

	const description =
		createTrackSummaryBlock(normalized, normalized?.user) ||
		"🎵 Sin información de track";

	const embed = new EmbedBuilder()
		.setColor(queue?.paused ? COLORS.PAUSED : COLORS.PLAYING)
		.setTitle(queue?.paused ? "⏸️ Pausado" : "🎵 Reproduciendo ahora")
		.setDescription(description)
		.addFields(
			{
				name: "📺 Canal",
				value: normalized?.uploader?.name || "Desconocido",
				inline: true,
			},
			{
				name: "⏱️ Duración",
				value: formatDuration(duration, isStream),
				inline: true,
			},
			{
				name: "🔊 Volumen",
				value: formatVolumeBar(queue?.volume ?? 100),
				inline: true,
			},
		)
		.addFields({ name: "\u200B", value: progressFieldValue, inline: false })
		.addFields(
			{ name: "🔁 Repetir", value: loopText, inline: true },
			{
				name: "📝 En cola",
				value: `${queue?.songs?.length || 1} canción${queue?.songs?.length !== 1 ? "es" : ""}`,
				inline: true,
			},
		);

	if (normalized?.user) {
		const userTag =
			normalized.user.tag || normalized.user.username || "Desconocido";
		const avatarUrl = normalized.user.displayAvatarURL
			? typeof normalized.user.displayAvatarURL === "function"
				? normalized.user.displayAvatarURL({ dynamic: true })
				: normalized.user.displayAvatarURL
			: null;
		embed.setFooter({ text: `Pedido por ${userTag}`, iconURL: avatarUrl });
	}

	embed.setTimestamp();
	if (normalized?.thumbnail) embed.setThumbnail(normalized.thumbnail);

	return embed;
}

function createAddedToQueueEmbed(song, position) {
	const normalized = normalizeTrack(song);
	const embed = new EmbedBuilder()
		.setColor(COLORS.SUCCESS)
		.setTitle("✅ Añadido a la cola")
		.setDescription(
			normalized?.url
				? `**[${normalized.name}](${normalized.url})**`
				: `**${normalized?.name || "Desconocido"}**`,
		)
		.addFields(
			{
				name: "⏱️ Duración",
				value: formatDuration(normalized?.duration || 0),
				inline: true,
			},
			{ name: "📍 Posición", value: `#${position}`, inline: true },
		);

	if (normalized?.user) {
		const userTag =
			normalized.user.tag || normalized.user.username || "Desconocido";
		const avatarUrl = normalized.user.displayAvatarURL
			? typeof normalized.user.displayAvatarURL === "function"
				? normalized.user.displayAvatarURL({ dynamic: true })
				: normalized.user.displayAvatarURL
			: null;
		embed.setFooter({ text: `Pedido por ${userTag}`, iconURL: avatarUrl });
	}

	embed.setTimestamp();
	if (normalized?.thumbnail) embed.setThumbnail(normalized.thumbnail);

	return embed;
}

function createErrorEmbed(title, description, userFriendly = true) {
	const embed = new EmbedBuilder()
		.setColor(COLORS.ERROR)
		.setTitle(`❌ ${title}`)
		.setDescription(stringifyEmbedDescription(description))
		.setTimestamp();
	if (userFriendly)
		embed.setFooter({
			text: "💡 Si el problema persiste, contacta al administrador",
		});
	return embed;
}

function createInfoEmbed(title, description) {
	return new EmbedBuilder()
		.setColor(COLORS.INFO)
		.setTitle(`ℹ️ ${title}`)
		.setDescription(description)
		.setTimestamp();
}

function createWarningEmbed(title, description) {
	return new EmbedBuilder()
		.setColor(COLORS.WARNING)
		.setTitle(`⚠️ ${title}`)
		.setDescription(description)
		.setTimestamp();
}

function createSuccessEmbed(title, description) {
	const embed = new EmbedBuilder()
		.setColor(COLORS.SUCCESS)
		.setTitle(title)
		.setTimestamp();

	if (description !== undefined && description !== null) {
		embed.setDescription(stringifyEmbedDescription(description));
	}

	return embed;
}

function createNoMusicEmbed(description) {
	return new EmbedBuilder()
		.setColor(COLORS.INFO)
		.setTitle("🎵 Sin música")
		.setDescription(description)
		.setTimestamp();
}

function createLavalinkUnavailableEmbed() {
	return new EmbedBuilder()
		.setColor(COLORS.ERROR)
		.setTitle("❌ Lavalink no disponible")
		.setDescription(
			"No se puede procesar la solicitud. El servicio de música no está disponible.",
		)
		.setFooter({
			text: "💡 Si el problema persiste, contacta al administrador.",
		})
		.setTimestamp();
}

function createQueueEmbed(queue) {
	const songs = (queue.songs || []).map(normalizeTrack);
	const currentSong = songs[0];
	const upcomingSongs = songs.slice(1, 11);

	let queueList = upcomingSongs
		.map((song, i) => {
			const name = song?.name || "Desconocido";
			const url = song?.url;
			const duration = formatDuration(song?.duration || 0);
			return url
				? `**${i + 1}.** [${name}](${url}) \`${duration}\``
				: `**${i + 1}.** ${name} \`${duration}\``;
		})
		.join("\n");

	if ((queue.songs || []).length > 11) {
		queueList += `\n*...y ${queue.songs.length - 11} canciones más*`;
	}

	const embed = new EmbedBuilder()
		.setColor(COLORS.QUEUE)
		.setTitle("📜 Cola de Reproducción")
		.setDescription(
			`**Reproduciendo ahora:**\n${currentSong?.url ? `[${currentSong.name}](${currentSong.url})` : currentSong?.name || "Desconocido"}\n\n**Próximas canciones:**\n${queueList || "No hay más canciones en la cola"}`,
		)
		.addFields(
			{
				name: "📊 Total",
				value: `${queue.songs?.length || 0} canciones`,
				inline: true,
			},
			{
				name: "⏱️ Duración total",
				value: formatDuration(queue.duration || 0),
				inline: true,
			},
			{
				name: "🔁 Loop",
				value:
					queue.repeatMode === 2
						? "Cola"
						: queue.repeatMode === 1
							? "Canción"
							: "Desactivado",
				inline: true,
			},
		)
		.setTimestamp();

	if (currentSong?.thumbnail) embed.setThumbnail(currentSong.thumbnail);

	return embed;
}

module.exports = {
	COLORS,
	normalizeTrack,
	deriveYoutubeThumbnail,
	stringifyEmbedDescription,
	truncateField,
	createProgressBar,
	createVisualProgressBar,
	formatVolumeBar,
	createTrackSummaryBlock,
	formatRemainingTime,
	formatDuration,
	formatProgressTimeDisplay,
	createNowPlayingEmbed,
	createAddedToQueueEmbed,
	createErrorEmbed,
	createInfoEmbed,
	createWarningEmbed,
	createSuccessEmbed,
	createNoMusicEmbed,
	createLavalinkUnavailableEmbed,
	createQueueEmbed,
};
