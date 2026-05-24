// Shows the current track and paginated upcoming queue for the active guild.
const {
	SlashCommandBuilder,
	EmbedBuilder,
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
} = require("discord.js");
const { normalizeTrack, COLORS } = require("../../utils/embeds");
const Logger = require("../../utils/logger");
const {
	getCurrentTrack,
	getQueuedTracks,
} = require("../../utils/lavalinkQueue");
const { createMessageCommandContext } = require("../../utils/commandContext");

const PAGE_SIZE = 10;
const BUTTON_IDLE_MS = 40_000;

function isLavalinkAvailable(client) {
	return Boolean(
		client.lavalinkManager &&
			typeof client.lavalinkManager.useable === "boolean" &&
			client.lavalinkManager.useable,
	);
}

function buildTrackList(allTracks, startIndex, totalUpcoming) {
	const end = Math.min(startIndex + PAGE_SIZE, totalUpcoming);
	const lines = [];

	for (let i = startIndex; i < end; i++) {
		const song = allTracks[i + 1];
		if (!song) break;
		const normalized = normalizeTrack(song);
		const title = normalized?.name || "Desconocido";
		const url = normalized?.url;
		const duration = formatDuration(normalized?.duration || 0);
		const position = i + 2;
		const line = url
			? `**${position}.** [${title}](${url}) \`${duration}\``
			: `**${position}.** ${title} \`${duration}\``;
		lines.push(line);
	}

	return lines.join("\n") || "No hay canciones en la cola";
}

function formatDuration(seconds) {
	if (!seconds || seconds === 0) return "0:00";
	const h = Math.floor(seconds / 3600);
	const m = Math.floor((seconds % 3600) / 60);
	const s = Math.floor(seconds % 60);
	if (h > 0)
		return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
	return `${m}:${s.toString().padStart(2, "0")}`;
}

function totalPages(totalUpcoming) {
	return Math.max(1, Math.ceil(totalUpcoming / PAGE_SIZE));
}

function buildQueueEmbed(allTracks, currentPage, totalUpcoming) {
	const currentTrack = allTracks[0] || null;
	const normalizedCurrent = currentTrack ? normalizeTrack(currentTrack) : null;
	const pages = totalPages(totalUpcoming);
	const pageStart = (currentPage - 1) * PAGE_SIZE;

	let currentSection = "";
	if (normalizedCurrent) {
		const name = normalizedCurrent.name || "Desconocido";
		const url = normalizedCurrent.url;
		currentSection = url ? `**[${name}](${url})**` : `**${name}**`;
		if (
			normalizedCurrent.uploader?.name &&
			normalizedCurrent.uploader.name !== "Desconocido"
		) {
			currentSection += `\n${normalizedCurrent.uploader.name}`;
		}
	} else {
		currentSection = "No hay nada reproduciéndose";
	}

	const trackList = buildTrackList(allTracks, pageStart, totalUpcoming);

	let pageNote = "";
	if (pages > 1) {
		pageNote = `\n*Página ${currentPage}/${pages}*`;
	}

	const embed = new EmbedBuilder()
		.setColor(COLORS.QUEUE)
		.setTitle("📜 Cola de reproducción")
		.addFields({
			name: "Reproduciendo ahora",
			value: currentSection,
			inline: false,
		});

	if (totalUpcoming > 0) {
		embed.addFields({
			name: "En cola",
			value: trackList + pageNote,
			inline: false,
		});
	}

	const totalCount = allTracks.length;
	embed.setFooter({
		text: `${totalCount} canción${totalCount !== 1 ? "es" : ""} en total`,
	});
	embed.setTimestamp();

	if (normalizedCurrent?.thumbnail) {
		embed.setThumbnail(normalizedCurrent.thumbnail);
	}

	return embed;
}

function buildPaginationRow(currentPage, pages, commandUserId) {
	if (pages <= 1) return null;

	return new ActionRowBuilder().addComponents(
		new ButtonBuilder()
			.setCustomId(`queue_page_prev|${currentPage - 1}|${commandUserId}`)
			.setLabel("◀️ Anterior")
			.setStyle(ButtonStyle.Secondary)
			.setDisabled(currentPage <= 1),
		new ButtonBuilder()
			.setCustomId(`queue_page_next|${currentPage + 1}|${commandUserId}`)
			.setLabel("Siguiente ▶️")
			.setStyle(ButtonStyle.Secondary)
			.setDisabled(currentPage >= pages),
	);
}

module.exports = {
	name: "queue",
	description: "Muestra las canciones en la cola",
	data: new SlashCommandBuilder()
		.setName("queue")
		.setDescription("Muestra las canciones en la cola")
		.setDMPermission(false),
	async execute(message, args, client) {
		const ctx = createMessageCommandContext(message, args);
		return this.executeContext(ctx, client);
	},
	async executeContext(ctx, client) {
		const guildId = ctx.guild.id;
		const lm = client.lavalinkManager;

		if (!isLavalinkAvailable(client)) {
			return ctx.reply("❌ Lavalink no está disponible.");
		}

		const currentTrack = getCurrentTrack(lm, guildId);
		const player = lm.getPlayer(guildId);
		const upcomingTracks = player ? getQueuedTracks(player) : [];

		if (!currentTrack && upcomingTracks.length === 0) {
			return ctx.reply("❌ No hay ninguna canción reproduciéndose.");
		}

		const allTracks = currentTrack
			? [currentTrack, ...upcomingTracks]
			: upcomingTracks;
		const totalUpcoming = upcomingTracks.length;
		const pages = totalPages(totalUpcoming);

		const embed = buildQueueEmbed(allTracks, 1, totalUpcoming);
		const paginationRow = buildPaginationRow(1, pages, ctx.user.id);

		const payload = paginationRow
			? { embeds: [embed], components: [paginationRow] }
			: { embeds: [embed] };

		const reply = await ctx.send(payload);

		if (paginationRow && reply && reply.createMessageComponentCollector) {
			const collector = reply.createMessageComponentCollector({
				filter: (interaction) => {
					return interaction.user.id === ctx.user.id;
				},
				idle: BUTTON_IDLE_MS,
			});

			collector.on("collect", async (interaction) => {
				if (!interaction.isButton()) return;

				const customId = interaction.customId;
				if (!customId.startsWith("queue_page_")) return;

				const parts = customId.split("|");
				if (parts.length !== 3) return;

				const direction = parts[0];
				let newPage = parseInt(parts[1], 10);

				newPage = Math.max(1, Math.min(newPage, pages));

				const newEmbed = buildQueueEmbed(allTracks, newPage, totalUpcoming);
				const newPaginationRow = buildPaginationRow(
					newPage,
					pages,
					ctx.user.id,
				);

				const newPayload = newPaginationRow
					? { embeds: [newEmbed], components: [newPaginationRow] }
					: { embeds: [newEmbed] };

				try {
					if (interaction.deferred || interaction.replied) {
						await interaction.update(newPayload);
					} else {
						await interaction.update(newPayload);
					}
				} catch (err) {
					Logger.error(
						"Error actualizando paginación de cola",
						err,
						"queue.js",
					);
				}
			});

			collector.on("end", (_collected, reason) => {
				if (reason === "idle" && !reply.partial) {
					reply.edit({ components: [] }).catch(() => {});
				}
			});
		}
	},
};
