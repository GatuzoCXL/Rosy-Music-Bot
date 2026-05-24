// Reports bot, voice, and current playback health for the active guild.
const { SlashCommandBuilder } = require("discord.js");
const {
	getCurrentTrack,
	getUpcomingTracks,
} = require("../../utils/lavalinkQueue");
const { createMessageCommandContext } = require("../../utils/commandContext");
const {
	formatDuration,
	truncateField,
	COLORS,
	createVisualProgressBar,
	formatVolumeBar,
	formatRemainingTime,
	formatProgressTimeDisplay,
} = require("../../utils/embeds");
const { getCalculatedPosition } = require("../../utils/progressUpdater");

const DISPLAY_DJS_VERSION = "14.25.1";

function isLavalinkAvailable(client) {
	return Boolean(
		client.lavalinkManager &&
			typeof client.lavalinkManager.useable === "boolean" &&
			client.lavalinkManager.useable,
	);
}

function getBotVoiceChannel(guild) {
	try {
		return guild.members?.me?.voice?.channel ?? null;
	} catch (_) {
		return null;
	}
}

function formatUptime(ms) {
	const totalSeconds = Math.floor(ms / 1000);
	const h = Math.floor(totalSeconds / 3600);
	const m = Math.floor((totalSeconds % 3600) / 60);
	const s = totalSeconds % 60;
	return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function classifyLatency(ping) {
	if (ping < 100) return { label: "Excelente", emoji: "🟢" };
	if (ping < 250) return { label: "Buena", emoji: "🟡" };
	if (ping < 500) return { label: "Regular", emoji: "🟠" };
	return { label: "Lenta", emoji: "🔴" };
}

function getMemoryUsageMB() {
	const heapMB = Math.round(process.memoryUsage().heapUsed / 1024 / 1024);
	return `${heapMB} MB`;
}

function getLavalinkNodeInfo(client) {
	if (!isLavalinkAvailable(client)) return null;
	try {
		const nodes = client.lavalinkManager.nodeManager?.nodes;
		if (!nodes || nodes.size === 0) return null;
		const node = nodes.values().next().value;
		if (!node) return null;
		const name = node.options?.name || node.identifier || "Nodo 1";
		const region = node.options?.region || "unknown";
		const load =
			node.load?.percentage != null
				? `${Math.round(node.load.percentage)}%`
				: node.stats?.cpu?.systemLoad != null
					? `${Math.round(node.stats.cpu.systemLoad * 100)}%`
					: "N/A";
		return { name, region, load };
	} catch (_) {
		return null;
	}
}

function getActivePlayersCount(client) {
	if (!isLavalinkAvailable(client)) return 0;
	try {
		let count = 0;
		for (const player of client.lavalinkManager.players?.values() ?? []) {
			if (player.connected) count++;
		}
		return count;
	} catch (_) {
		return 0;
	}
}

function getPlayerAggregateSummary(client, guild) {
	const activePlayers = getActivePlayersCount(client);
	let isCurrentGuildPlaying = false;
	let currentVoiceChannel = null;

	if (isLavalinkAvailable(client)) {
		try {
			const player = client.lavalinkManager.getPlayer(guild.id);
			if (player) {
				isCurrentGuildPlaying = Boolean(player.playing && !player.paused);
				currentVoiceChannel = player.voiceChannelId || null;
			}
		} catch (_) {}
	}

	const botVoiceChannel = getBotVoiceChannel(guild);
	if (!botVoiceChannel && currentVoiceChannel) {
		currentVoiceChannel = null;
	}

	return { activePlayers, isCurrentGuildPlaying, currentVoiceChannel };
}

function getCommandCount(client) {
	try {
		return client.commands?.size ?? 0;
	} catch (_) {
		return 0;
	}
}

function getGuildCount(client) {
	try {
		return client.guilds?.cache?.size ?? 0;
	} catch (_) {
		return 0;
	}
}

function getMemberCount(client) {
	try {
		let total = 0;
		for (const guild of client.guilds?.cache?.values() ?? []) {
			total += guild.memberCount ?? 0;
		}
		return total;
	} catch (_) {
		return 0;
	}
}

module.exports = {
	name: "status",
	description: "Muestra el estado del bot y sus permisos",
	data: new SlashCommandBuilder()
		.setName("status")
		.setDescription("Muestra el estado del bot y sus permisos")
		.setDMPermission(false),
	async execute(message, args, client) {
		const ctx = createMessageCommandContext(message, args);
		return this.executeContext(ctx, client);
	},
	async executeContext(ctx, client) {
		const guild = ctx.guild;

		const botUser = client.user;
		const latency = client.ws.ping ?? 0;
		const latencyHealth = classifyLatency(latency);
		const uptime = formatUptime(client.uptime ?? 0);
		const guildCount = getGuildCount(client);
		const memberCount = getMemberCount(client);
		const commandCount = getCommandCount(client);
		const memoryMB = getMemoryUsageMB();
		const nodeInfo = getLavalinkNodeInfo(client);
		const { activePlayers, isCurrentGuildPlaying, currentVoiceChannel } =
			getPlayerAggregateSummary(client, guild);

		const botVoiceChannel = getBotVoiceChannel(guild);
		let voiceStatus = "❌ Desconectado";
		let voicePerms = "N/A";
		if (botVoiceChannel) {
			const perms = botVoiceChannel.permissionsFor(client.user);
			const hasConnect = perms.has("Connect");
			const hasSpeak = perms.has("Speak");
			voiceStatus = "✅ En canal de voz";
			voicePerms = `Conectar: ${hasConnect ? "✅" : "❌"} | Hablar: ${hasSpeak ? "✅" : "❌"}`;
		}

		const fields = [];

		fields.push({
			name: "🤖 Bot",
			value: truncateField(
				`**Nombre**: ${botUser.username}\n**ID**: ${botUser.id}`,
			),
			inline: true,
		});

		fields.push({
			name: "📡 Latencia",
			value: `${latencyHealth.emoji} ${latency}ms (${latencyHealth.label})`,
			inline: true,
		});

		fields.push({
			name: "⏱️ Uptime",
			value: uptime,
			inline: true,
		});

		fields.push({
			name: "🖥️ Servidores",
			value: String(guildCount),
			inline: true,
		});

		fields.push({
			name: "👥 Usuarios aprox.",
			value: memberCount > 0 ? String(memberCount) : "N/A",
			inline: true,
		});

		fields.push({
			name: "📬 Comandos cargados",
			value: String(commandCount),
			inline: true,
		});

		fields.push({
			name: "🧠 Memoria",
			value: memoryMB,
			inline: true,
		});

		fields.push({
			name: "📦 Node.js",
			value: process.version.slice(1),
			inline: true,
		});

		fields.push({
			name: "📦 discord.js",
			value: DISPLAY_DJS_VERSION,
			inline: true,
		});

		fields.push({
			name: "🎤 Voz",
			value: truncateField(
				`**Estado**: ${voiceStatus}\n${botVoiceChannel ? `**Canal**: ${botVoiceChannel.name}` : currentVoiceChannel ? `**Canal ID**: ${currentVoiceChannel}` : ""}\n${voicePerms !== "N/A" ? `**Permisos**: ${voicePerms}` : ""}`,
			),
			inline: false,
		});

		if (nodeInfo) {
			fields.push({
				name: "🔗 Lavalink",
				value: `**Nodo**: ${nodeInfo.name}\n**Región**: ${nodeInfo.region}\n**Carga**: ${nodeInfo.load}`,
				inline: true,
			});
		} else {
			fields.push({
				name: "🔗 Lavalink",
				value: "⚠️ Desconectada",
				inline: true,
			});
		}

		fields.push({
			name: "▶️ Reproductores activos",
			value: String(activePlayers),
			inline: true,
		});

		const currentTrack = getCurrentTrack(client.lavalinkManager, guild.id);
		const queueSongs = getUpcomingTracks(
			client.lavalinkManager,
			guild.id,
		).length;
		if (currentTrack && currentTrack.info) {
			const currentTime = getCalculatedPosition(guild.id);
			const durationSec = Math.floor((currentTrack.info.length || 0) / 1000);
			const isStream = Boolean(currentTrack.info.isStream);
			const player = client.lavalinkManager.getPlayer(guild.id);
			const currentVolume = player?.volume ?? 100;

			const visualProgressBar = createVisualProgressBar(
				currentTime * 1000,
				durationSec * 1000,
				{ isStream },
			);
			const timeDisplay = formatProgressTimeDisplay(
				currentTime,
				durationSec,
				isStream,
			);
			const remainingTime = formatRemainingTime(
				currentTime * 1000,
				durationSec * 1000,
			);
			const volumeBar = formatVolumeBar(currentVolume);

			let progressFieldValue;
			if (isStream || !visualProgressBar) {
				progressFieldValue = `🔴 En vivo\n${timeDisplay}`;
			} else {
				const remainingLine = remainingTime ? `\n${remainingTime}` : "";
				progressFieldValue = `${visualProgressBar}\n${timeDisplay}${remainingLine}`;
			}

			const title = currentTrack.info.title || "Desconocido";
			const author = currentTrack.info.author || "Desconocido";

			fields.push({
				name: "🎵 Reproduciendo",
				value: truncateField(
					`**Título**: ${title}\n**Autor**: ${author}`,
					1024,
				),
				inline: false,
			});

			if (progressFieldValue) {
				fields.push({
					name: "\u200B",
					value: progressFieldValue,
					inline: false,
				});
			}

			fields.push({
				name: "🔊 Volumen",
				value: volumeBar,
				inline: true,
			});

			fields.push({
				name: "📂 Cola",
				value: `${queueSongs} canción${queueSongs !== 1 ? "es" : ""}`,
				inline: true,
			});

			if (durationSec > 0) {
				fields.push({
					name: "⏱️ Duración",
					value: formatDuration(durationSec),
					inline: true,
				});
			}
		}

		const embed = {
			color: isCurrentGuildPlaying
				? COLORS.PLAYING
				: nodeInfo
					? COLORS.INFO
					: COLORS.PAUSED,
			title: "🤖 Estado del Bot Rosy",
			thumbnail: { url: botUser.displayAvatarURL({ size: 256 }) },
			fields,
			footer: { text: "Usa /help para ver todos los comandos" },
		};

		if (currentTrack?.info?.thumbnail) {
			embed.thumbnail = { url: currentTrack.info.thumbnail };
		}

		return ctx.reply({ embeds: [embed] });
	},
};
