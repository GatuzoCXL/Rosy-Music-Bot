// Resolves search queries and URLs into Lavalink playback with interactive selection when needed.
const { createErrorEmbed, createInfoEmbed } = require("../../utils/embeds");
const Logger = require("../../utils/logger");
const playdl = require("play-dl");
const {
	ActionRowBuilder,
	SlashCommandBuilder,
	StringSelectMenuBuilder,
} = require("discord.js");
const { createMessageCommandContext } = require("../../utils/commandContext");
const lavalinkQueue = require("../../utils/lavalinkQueue");

const activeSearchSessions = new Map();

const SELECTION_TIMEOUT_MS = 15000;
const TIMEOUT_FEEDBACK_MS = 6000;

const YOUTUBE_PLAYLIST_HOSTS = new Set([
	"youtube.com",
	"www.youtube.com",
	"m.youtube.com",
	"music.youtube.com",
	"youtu.be",
]);

function isLavalinkAvailable(client) {
	return Boolean(
		client.lavalinkManager &&
			typeof client.lavalinkManager.useable === "boolean" &&
			client.lavalinkManager.useable,
	);
}

function isHttpUrl(query) {
	return /^https?:\/\//i.test(query);
}

function isYouTubePlaylistUrl(query) {
	if (!isHttpUrl(query)) return false;

	try {
		const url = new URL(query);
		const hostname = url.hostname.toLowerCase();

		return (
			YOUTUBE_PLAYLIST_HOSTS.has(hostname) &&
			Boolean(url.searchParams.get("list"))
		);
	} catch (_) {
		return false;
	}
}

function normalizeYouTubePlaylistUrl(query) {
	return query;
}

async function cancelActiveSearchSession(guild, user, reason) {
	const key = guild && user ? `${guild.id}:${user.id}` : null;
	if (!key) return;

	const session = activeSearchSessions.get(key);
	if (!session) return;

	activeSearchSessions.delete(key);

	if (session.collector && !session.collector.ended) {
		session.collector.stop(reason || "new_search");
	}

	if (session.messageId) {
		const channel = guild?.available
			? guild.channels.cache.get(session.channelId)
			: null;
		if (channel) {
			try {
				const msg = await channel.messages.fetch(session.messageId);
				await msg.delete().catch(() => {});
			} catch (_) {}
		}
	}

	Logger.music(
		`Cancelé búsqueda activa para ${user.tag}${reason ? ` (${reason})` : ""}`,
		"play.js",
	);
}

function createPlaylistUserError(error) {
	const message = error?.message || String(error || "Error desconocido");

	if (message.includes("tardó demasiado")) {
		return message;
	}

	return "No pude procesar esa playlist de YouTube Music. Prueba con una playlist pública de YouTube (`youtube.com/playlist?list=...`) o con un video directo.";
}

function createSafePlaylistLogError(error, originalUrl) {
	const message = error?.message || String(error || "Error desconocido");
	const hostLabel = originalUrl.hostname || "unknown";
	const safeError = new Error(
		`Fallo procesando playlist [${hostLabel}]. url=${originalUrl} message=${message.slice(0, 500)}`,
	);
	safeError.stack = error?.stack
		? error.stack.split("\n").slice(0, 8).join("\n")
		: safeError.stack;

	return safeError;
}

async function sendTimeoutFeedback(ctx, query) {
	const embed = createErrorEmbed(
		"Sin selección",
		`No elegiste una canción a tiempo.\n\n🔍 Vuelve a buscar con \`/play ${query}\`\n💡 Si el problema se repite, prueba con otro término o una URL directa de YouTube.`,
	);

	let feedbackMsg;
	try {
		feedbackMsg = await ctx.send({ embeds: [embed] });
	} catch (_) {
		return;
	}

	setTimeout(() => {
		feedbackMsg.delete().catch(() => {});
	}, TIMEOUT_FEEDBACK_MS);
}

async function playViaLavalink(client, voiceChannel, query, ctx) {
	if (!isLavalinkAvailable(client)) {
		throw new Error("Lavalink no está disponible");
	}

	try {
		await lavalinkQueue.playLavalink(
			client.lavalinkManager,
			ctx.guild.id,
			query,
			{
				requester: ctx.user,
				textChannelId: ctx.channel.id,
				voiceChannelId: voiceChannel.id,
			},
		);
		return true;
	} catch (error) {
		if (
			error.message?.includes("Lavalink no está disponible") ||
			error.message?.includes("no hay player activo")
		) {
			throw error;
		}
		throw error;
	}
}

module.exports = {
	name: "play",
	description: "Reproduce una canción",
	data: new SlashCommandBuilder()
		.setName("play")
		.setDescription("Reproduce una canción")
		.setDMPermission(false)
		.addStringOption((option) =>
			option
				.setName("cancion")
				.setDescription("Canción, búsqueda o URL para reproducir")
				.setRequired(true),
		),
	async execute(message, args, client) {
		const ctx = createMessageCommandContext(message, args);
		return this.executeContext(ctx, client);
	},
	async executeContext(ctx, client) {
		const voiceChannel = ctx.voiceChannel;

		if (!voiceChannel) {
			Logger.warn(
				`Usuario ${ctx.user.tag} intentó reproducir sin estar en canal de voz`,
				"play.js",
			);
			const embed = createErrorEmbed(
				"No estás en un canal de voz",
				"Debes unirte a un canal de voz primero para reproducir música.",
			);
			return ctx.reply({ embeds: [embed] });
		}

		const permissions = voiceChannel.permissionsFor(client.user);
		if (!permissions.has("Connect") || !permissions.has("Speak")) {
			Logger.error(
				`Permisos insuficientes en ${voiceChannel.name}`,
				null,
				"play.js",
			);
			const embed = createErrorEmbed(
				"Permisos insuficientes",
				"No tengo permisos para conectarme o hablar en ese canal de voz.",
			);
			return ctx.reply({ embeds: [embed] });
		}

		const query = ctx.query;
		if (!query) {
			const embed = createInfoEmbed(
				"Falta la canción",
				"**Uso:** `r!play <canción o URL>`\n\n**Ejemplos:**\n`r!play the scientist`\n`r!play https://youtu.be/...`",
			);
			return ctx.reply({ embeds: [embed] });
		}

		try {
			const isUrl = isHttpUrl(query);
			const isPlaylistUrl = isYouTubePlaylistUrl(query);

			Logger.music(
				`${isPlaylistUrl ? "📃 Playlist" : "🔍 Búsqueda"}: "${query}" por ${ctx.user.tag}`,
				"play.js",
			);

			let finalUrl = isPlaylistUrl ? normalizeYouTubePlaylistUrl(query) : query;

			if (!isUrl) {
				Logger.music(`Buscando con play-dl: "${query}"`, "play.js");

				let searchResults;
				try {
					searchResults = await playdl.search(query, {
						limit: 5,
						source: { youtube: "video" },
					});
				} catch (searchError) {
					Logger.error("Error en play-dl search", searchError, "play.js");
					const embed = createErrorEmbed(
						"No se pudo buscar esa canción",
						`Ocurrió un error al buscar: **${query}**\n\nPrueba con otro término o una URL directa de YouTube.`,
					);
					return ctx.reply({ embeds: [embed] });
				}

				if (!searchResults || searchResults.length === 0) {
					const embed = createErrorEmbed(
						"No se encontró la canción",
						`No encontré resultados para: **${query}**\n\n💡 Intenta con un nombre más específico`,
					);
					return ctx.reply({ embeds: [embed] });
				}

				if (searchResults.length === 1) {
					finalUrl = searchResults[0].url;
					Logger.music(
						`✅ Encontrado: "${searchResults[0].title}" - ${finalUrl}`,
						"play.js",
					);

					await playViaLavalink(client, voiceChannel, finalUrl, ctx);

					if (ctx.source === "interaction") {
						await ctx.deleteReply().catch(() => {});
					}
					return;
				}

				Logger.music(
					`📋 ${searchResults.length} resultados encontrados`,
					"play.js",
				);

				await cancelActiveSearchSession(ctx.guild, ctx.user, "new_search");

				const options = searchResults.slice(0, 5).map((song, index) => ({
					label: `${index + 1}. ${song.title.substring(0, 90)}`,
					description: `${song.channel?.name || "Canal desconocido"} • ${song.durationInSec ? `${Math.floor(song.durationInSec / 60)}:${String(song.durationInSec % 60).padStart(2, "0")}` : "EN VIVO"}`,
					value: song.url,
				}));

				const selectMenu = new StringSelectMenuBuilder()
					.setCustomId("select_song")
					.setPlaceholder("Elige una canción")
					.addOptions(options);

				const row = new ActionRowBuilder().addComponents(selectMenu);

				const embed = createInfoEmbed(
					"🎵 Elige una canción",
					`Encontré ${searchResults.length} resultados para: **${query}**\n*Tienes 15 segundos para elegir.*`,
				);

				const selectionMessage = await ctx.reply({
					embeds: [embed],
					components: [row],
				});

				const sessionKey = `${ctx.guild.id}:${ctx.user.id}`;
				const filter = (interaction) =>
					interaction.user.id === ctx.user.id &&
					interaction.customId === "select_song";
				const collector = ctx.createCollector(selectionMessage, {
					filter,
					time: SELECTION_TIMEOUT_MS,
				});

				activeSearchSessions.set(sessionKey, {
					messageId: selectionMessage.id,
					channelId: ctx.channel.id,
					collector,
				});

				collector.on("collect", async (interaction) => {
					try {
						const selectedUrl = interaction.values[0];
						Logger.music(`✅ Seleccionado: ${selectedUrl}`, "play.js");

						await interaction.deferUpdate();
						collector.stop("selected");

						if (ctx.source === "interaction") {
							await selectionMessage
								.edit({
									content: "⏳ **Preparando la canción seleccionada...**",
									embeds: [],
									components: [],
								})
								.catch(() => {});
						} else {
							selectionMessage.delete().catch(() => {});
						}

						await playViaLavalink(client, voiceChannel, selectedUrl, ctx);

						if (ctx.source === "interaction") {
							await ctx
								.deleteReply()
								.catch(() => selectionMessage.delete().catch(() => {}));
						} else {
							selectionMessage.delete().catch(() => {});
						}
					} catch (error) {
						Logger.error(
							"Error al reproducir canción seleccionada",
							error,
							"play.js",
						);

						const embed = createErrorEmbed(
							"Error al reproducir",
							error || "Ocurrió un error al preparar la canción seleccionada.",
						);

						if (ctx.source === "interaction") {
							await ctx.send({ embeds: [embed] }).catch(() =>
								selectionMessage
									.edit({
										embeds: [embed],
										components: [],
									})
									.catch(() => {}),
							);
						} else {
							await ctx.reply({ embeds: [embed] }).catch(() => {});
						}
					}
				});

				collector.on("end", async (collected, reason) => {
					activeSearchSessions.delete(sessionKey);

					if (collected.size === 0) {
						if (reason === "time") {
							selectionMessage.delete().catch(() => {});
							await sendTimeoutFeedback(ctx, query);
							Logger.music(
								`Tiempo de selección agotado (15 segundos)`,
								"play.js",
							);
						}
					}
				});

				return;
			}

			if (isPlaylistUrl) {
				const hostLabel = new URL(query).hostname;
				Logger.music(
					`📃 Playlist detectada (${hostLabel}): "${query}"`,
					"play.js",
				);
			}

			await playViaLavalink(client, voiceChannel, finalUrl, ctx);

			if (ctx.source === "interaction") {
				await ctx.deleteReply().catch(() => {});
			}
		} catch (error) {
			const isPlaylistError = isYouTubePlaylistUrl(query);

			if (isPlaylistError) {
				Logger.error(
					"Error procesando playlist",
					createSafePlaylistLogError(error, query),
					"play.js",
				);
			} else {
				Logger.error("Error en play", error, "play.js");
			}

			let errorTitle = "Error al reproducir";
			let errorDescription = error;

			if (
				!isPlaylistError &&
				(error.message?.includes("Cannot read properties of undefined") ||
					error.message?.includes("browseId") ||
					error.message?.includes("play-dl") ||
					error.stack?.includes("play-dl"))
			) {
				errorTitle = "No se pudo buscar esa canción";
				errorDescription = `Ocurrió un error al buscar: **${query}**\n\nPrueba con otro término o una URL directa de YouTube.`;
			} else if (error.message?.includes("NO_RESULT")) {
				errorTitle = "No se encontró la canción";
				errorDescription = `No encontré resultados para: **${query}**\n\n💡 Intenta con:\n• Un nombre más específico\n• Una URL directa de YouTube\n• Verificar que la canción existe`;
			} else if (isPlaylistError) {
				errorTitle = "No se pudo procesar la playlist";
				errorDescription = createPlaylistUserError(error);
			}

			const embed = createErrorEmbed(errorTitle, errorDescription);
			await ctx.reply({ embeds: [embed] });
		}
	},
	isYouTubePlaylistUrl,
	normalizeYouTubePlaylistUrl,
	createPlaylistUserError,
};
