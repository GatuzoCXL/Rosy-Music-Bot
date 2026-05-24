// Handles player panel buttons and selectors using lavalinkQueue and progressUpdater.

const {
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
	MessageFlags,
} = require("discord.js");
const Logger = require("./logger");
const {
	getQueue,
	getQueuedTracks,
	skipTrack,
	pauseTrack,
	resumeTrack,
	stopPlayer,
	setVolume,
	getCurrentTrack,
	shuffleTrack,
	setRepeatMode,
	getAutoplay,
	toggleAutoplay,
	seekToPosition,
	playTrackNext,
} = require("./lavalinkQueue");
const {
	syncPlayerPanel,
	freezeProgressClock,
	resumeProgressClock,
	resetProgressClock,
	getCalculatedPosition,
} = require("./progressUpdater");
const { popTrack, markBackRestoring } = require("./playbackHistory");

function createMusicButtons() {
	return new ActionRowBuilder().addComponents(
		new ButtonBuilder()
			.setCustomId("music_pause")
			.setEmoji("⏸️")
			.setStyle(ButtonStyle.Primary),
		new ButtonBuilder()
			.setCustomId("music_resume")
			.setEmoji("▶️")
			.setStyle(ButtonStyle.Success),
		new ButtonBuilder()
			.setCustomId("music_skip")
			.setEmoji("⏭️")
			.setStyle(ButtonStyle.Primary),
		new ButtonBuilder()
			.setCustomId("music_stop")
			.setEmoji("⏹️")
			.setStyle(ButtonStyle.Danger),
	);
}

function createMusicToggleButton(isPaused) {
	return new ActionRowBuilder().addComponents(
		new ButtonBuilder()
			.setCustomId("music_toggle")
			.setEmoji(isPaused ? "▶️" : "⏸️")
			.setLabel(isPaused ? "Reanudar" : "Pausar")
			.setStyle(isPaused ? ButtonStyle.Success : ButtonStyle.Primary),
	);
}

function createVolumeButtons(currentVolume) {
	return new ActionRowBuilder().addComponents(
		new ButtonBuilder()
			.setCustomId("volume_down")
			.setLabel(`-10%  🔉 Volumen: ${currentVolume}%`)
			.setStyle(ButtonStyle.Secondary),
		new ButtonBuilder()
			.setCustomId("volume_up")
			.setLabel(`🔊 Volumen: ${currentVolume}%  +10%`)
			.setStyle(ButtonStyle.Secondary),
		new ButtonBuilder()
			.setCustomId("volume_mute")
			.setLabel("Silenciar")
			.setEmoji("🔇")
			.setStyle(ButtonStyle.Danger),
	);
}

function createSecondaryMusicButtons() {
	return new ActionRowBuilder().addComponents(
		new ButtonBuilder()
			.setCustomId("music_loop")
			.setEmoji("🔁")
			.setStyle(ButtonStyle.Secondary),
		new ButtonBuilder()
			.setCustomId("music_shuffle")
			.setEmoji("🔀")
			.setStyle(ButtonStyle.Secondary),
	);
}

function createSecondaryMusicButtonsWithAutoplay(autoplayEnabled) {
	return new ActionRowBuilder().addComponents(
		new ButtonBuilder()
			.setCustomId("music_loop")
			.setEmoji("🔁")
			.setStyle(ButtonStyle.Secondary),
		new ButtonBuilder()
			.setCustomId("music_shuffle")
			.setEmoji("🔀")
			.setStyle(ButtonStyle.Secondary),
		new ButtonBuilder()
			.setCustomId("music_autoplay")
			.setEmoji("🔄")
			.setLabel(autoplayEnabled ? "Autoplay: ON" : "Autoplay: OFF")
			.setStyle(autoplayEnabled ? ButtonStyle.Success : ButtonStyle.Secondary),
	);
}

function isUnknownInteractionError(error) {
	return error?.code === 10062 || error?.rawError?.code === 10062;
}

async function safeDeferReply(interaction) {
	if (interaction.deferred || interaction.replied) return true;
	try {
		await interaction.deferReply({ flags: MessageFlags.Ephemeral });
		return true;
	} catch (error) {
		if (!isUnknownInteractionError(error)) {
			Logger.error(
				"No se pudo diferir el botón de música",
				error,
				"musicControls.js",
			);
		}
		return false;
	}
}

async function safeRespond(interaction, payload) {
	const response = { flags: MessageFlags.Ephemeral, ...payload };
	try {
		if (interaction.deferred && !interaction.replied) {
			const { flags, ...editPayload } = response;
			return await interaction.editReply(editPayload);
		}
		if (interaction.replied) return await interaction.followUp(response);
		return await interaction.reply(response);
	} catch (error) {
		if (!isUnknownInteractionError(error)) {
			Logger.error(
				"No se pudo responder el botón de música",
				error,
				"musicControls.js",
			);
		}
		return null;
	}
}

function isLavalinkAvailable(client) {
	return Boolean(
		client?.lavalinkManager &&
			typeof client.lavalinkManager.useable === "boolean" &&
			client.lavalinkManager.useable,
	);
}

async function handleMusicButton(interaction, client) {
	const acknowledged = await safeDeferReply(interaction);
	if (!acknowledged) return;

	const guildId = interaction.guildId;

	if (!isLavalinkAvailable(client)) {
		return safeRespond(interaction, {
			content: "❌ Lavalink no está disponible",
		});
	}

	const llQueue = await getQueue(client.lavalinkManager, guildId);
	if (!llQueue) {
		return safeRespond(interaction, {
			content: "❌ No hay música reproduciéndose",
		});
	}

	const member = interaction.member;
	if (!member.voice?.channel) {
		return safeRespond(interaction, {
			content: "❌ Debes estar en un canal de voz",
		});
	}
	if (member.voice.channel.id !== llQueue.voiceChannel) {
		return safeRespond(interaction, {
			content: "❌ Debes estar en el mismo canal de voz que el bot",
		});
	}

	return handleLavalinkButton(interaction, client, llQueue);
}

async function handleLavalinkButton(interaction, client, queue) {
	const member = interaction.member;

	try {
		switch (interaction.customId) {
			case "music_pause":
				if (queue.isPaused) {
					await safeRespond(interaction, { content: "Ya está pausado" });
				} else {
					await pauseTrack(client.lavalinkManager, interaction.guildId);
					freezeProgressClock(interaction.guildId);
					Logger.music(`⏸️ Pausado por ${member.user.tag}`, "musicControls.js");
					await safeRespond(interaction, { content: "⏸️ Música pausada" });
					await syncPlayerPanel(client, interaction.guildId);
				}
				break;

			case "music_resume":
				if (!queue.isPaused) {
					await safeRespond(interaction, {
						content: "Ya está reproduciéndose",
					});
				} else {
					await resumeTrack(client.lavalinkManager, interaction.guildId);
					resumeProgressClock(interaction.guildId);
					Logger.music(
						`▶️ Reanudado por ${member.user.tag}`,
						"musicControls.js",
					);
					await safeRespond(interaction, { content: "▶️ Música reanudada" });
					await syncPlayerPanel(client, interaction.guildId);
				}
				break;

			case "music_toggle":
				if (queue.isPaused) {
					await resumeTrack(client.lavalinkManager, interaction.guildId);
					resumeProgressClock(interaction.guildId);
					Logger.music(
						`▶️ Reanudado (toggle) por ${member.user.tag}`,
						"musicControls.js",
					);
					await safeRespond(interaction, { content: "▶️ Música reanudada" });
				} else {
					await pauseTrack(client.lavalinkManager, interaction.guildId);
					freezeProgressClock(interaction.guildId);
					Logger.music(
						`⏸️ Pausado (toggle) por ${member.user.tag}`,
						"musicControls.js",
					);
					await safeRespond(interaction, { content: "⏸️ Música pausada" });
				}
				await syncPlayerPanel(client, interaction.guildId);
				break;

			case "music_back": {
				const BACK_THRESHOLD_SEC = 5;
				const elapsed = getCalculatedPosition(interaction.guildId);
				const currentTrack = getCurrentTrack(
					client.lavalinkManager,
					interaction.guildId,
				);
				const songName =
					currentTrack?.info?.title || currentTrack?.name || "canción";

				if (elapsed >= BACK_THRESHOLD_SEC) {
					try {
						await seekToPosition(
							client.lavalinkManager,
							interaction.guildId,
							0,
						);
						resetProgressClock(interaction.guildId);
						Logger.music(
							`⏮️ Reiniciando "${songName}" (elapsed=${elapsed}s) por ${member.user.tag}`,
							"musicControls.js",
						);
						await safeRespond(interaction, {
							content: `⏮️ Reiniciando: **${songName}**`,
						});
						await syncPlayerPanel(client, interaction.guildId);
					} catch (seekErr) {
						Logger.error("music_back: seek falló", seekErr, "musicControls.js");
						await safeRespond(interaction, {
							content: "❌ No se pudo reiniciar la canción",
						});
					}
				} else {
					const previousFromHistory = popTrack(
						interaction.guildId,
						currentTrack,
					);

					if (!previousFromHistory) {
						return safeRespond(interaction, {
							content:
								"⏮️ No hay canción anterior en el historial. Prueba reiniciar la canción.",
						});
					}

					markBackRestoring(interaction.guildId);

					try {
						await playTrackNext(
							client.lavalinkManager,
							interaction.guildId,
							previousFromHistory,
							currentTrack,
						);
					} catch (playError) {
						Logger.error(
							"music_back: playTrackNext falló",
							playError,
							"musicControls.js",
						);
						return safeRespond(interaction, {
							content: "❌ No se pudo restaurar la canción anterior.",
						});
					}

					const trackTitle =
						previousFromHistory?.info?.title || "Canción anterior";
					Logger.music(
						`⏮️ Volviendo a: "${trackTitle}" por ${member.user.tag}`,
						"musicControls.js",
					);
					await safeRespond(interaction, {
						content: `⏮️ Canción anterior: **${trackTitle}**`,
					});
				}
				break;
			}

			case "music_autoplay": {
				const newState = toggleAutoplay(interaction.guildId);
				await safeRespond(interaction, {
					content: newState
						? "🔄 Autoplay activado"
						: "🔄 Autoplay desactivado",
				});
				await syncPlayerPanel(client, interaction.guildId);
				break;
			}

			case "music_skip": {
				const currentSong = getCurrentTrack(
					client.lavalinkManager,
					interaction.guildId,
				);
				const songName =
					currentSong?.info?.title || currentSong?.name || "canción";
				const player = client.lavalinkManager.getPlayer(interaction.guildId);
				const upcoming = player ? getQueuedTracks(player) : [];

				if (!currentSong && upcoming.length === 0) {
					return safeRespond(interaction, {
						content: "⏭️ No hay una siguiente canción en la cola.",
					});
				}

				await skipTrack(client.lavalinkManager, interaction.guildId);
				Logger.music(
					`⏭️ Saltado "${songName}" por ${member.user.tag}`,
					"musicControls.js",
				);
				await safeRespond(interaction, {
					content: `⏭️ Saltada: **${songName}**`,
				});
				break;
			}

			case "music_stop":
				await stopPlayer(client.lavalinkManager, interaction.guildId);
				Logger.music(`⏹️ Detenido por ${member.user.tag}`, "musicControls.js");
				await safeRespond(interaction, {
					content: "⏹️ Música detenida y cola limpiada",
				});
				break;

			case "music_loop": {
				const freshQueue = await getQueue(
					client.lavalinkManager,
					interaction.guildId,
				);
				const currentMode = freshQueue?.repeatMode || "off";
				const cycle = { off: "track", track: "queue", queue: "off" };
				const nextMode = cycle[currentMode] || "off";
				try {
					await setRepeatMode(
						client.lavalinkManager,
						interaction.guildId,
						nextMode,
					);
					const modeText = {
						off: "❌ Desactivado",
						track: "🔂 Canción",
						queue: "🔁 Cola",
					};
					Logger.music(
						`🔁 Loop cambiado a "${nextMode}" por ${member.user.tag}`,
						"musicControls.js",
					);
					await safeRespond(interaction, {
						content: `🔁 Modo de repetición: ${modeText[nextMode]}`,
					});
				} catch (err) {
					Logger.error("Error en music_loop", err, "musicControls.js");
					await safeRespond(interaction, {
						content: "❌ No se pudo cambiar el modo de repetición",
					});
				}
				break;
			}

			case "music_shuffle": {
				const result = await shuffleTrack(
					client.lavalinkManager,
					interaction.guildId,
				);
				if (result.shuffled) {
					Logger.music(
						`🔀 Cola mezclada por ${member.user.tag}`,
						"musicControls.js",
					);
					await safeRespond(interaction, { content: "🔀 Cola mezclada" });
				} else {
					await safeRespond(interaction, {
						content: `❌ ${result.reason || "No se pudo mezclar la cola"}`,
					});
				}
				break;
			}

			case "music_lyrics": {
				const { fetchLyrics } = require("./lyricsProvider");
				const currentTrack = getCurrentTrack(
					client.lavalinkManager,
					interaction.guildId,
				);
				if (!currentTrack) {
					return safeRespond(interaction, {
						content: "❌ No hay nada reproduciéndose.",
					});
				}

				const artist = currentTrack.info?.author || "";
				const title = currentTrack.info?.title || "";

				try {
					const result = await fetchLyrics(artist, title);
					if (!result) {
						return safeRespond(interaction, {
							embeds: [
								new (require("discord.js").EmbedBuilder)()
									.setColor(0x0099ff)
									.setTitle("🎤 Letra no encontrada")
									.setDescription("ℹ️ No se encontró letra para esta canción."),
							],
						});
					}

					const { lyrics, source } = result;
					const sourceText = `Fuente: ${source}`;
					const MAX_CHARS = 3900;

					if (lyrics.length <= MAX_CHARS) {
						return safeRespond(interaction, {
							embeds: [
								new (require("discord.js").EmbedBuilder)()
									.setColor(0x0099ff)
									.setTitle(`🎤 Letra: ${result.title}`)
									.setDescription(`**${result.artist}**\n\n${lyrics}`)
									.setFooter({ text: sourceText }),
							],
						});
					}

					const truncated = lyrics.slice(0, MAX_CHARS).trimEnd();
					return safeRespond(interaction, {
						embeds: [
							new (require("discord.js").EmbedBuilder)()
								.setColor(0x0099ff)
								.setTitle(`🎤 Letra: ${result.title}`)
								.setDescription(
									`**${result.artist}**\n\n${truncated}\n… *(letra recortada)*`,
								)
								.setFooter({ text: sourceText }),
						],
					});
				} catch (err) {
					Logger.error("Error en music_lyrics", err, "musicControls.js");
					return safeRespond(interaction, {
						embeds: [
							new (require("discord.js").EmbedBuilder)()
								.setColor(0xff0000)
								.setTitle("❌ Error al obtener letra")
								.setDescription(
									"❌ No se pudo obtener la letra. Intenta de nuevo más tarde.",
								),
						],
					});
				}
				break;
			}

			case "volume_up": {
				const freshQueueUp = await getQueue(
					client.lavalinkManager,
					interaction.guildId,
				);
				const volUp = Math.min((freshQueueUp?.volume || 100) + 10, 100);
				await setVolume(client.lavalinkManager, interaction.guildId, volUp);
				Logger.music(
					`🔊 Volumen: ${volUp}% por ${member.user.tag}`,
					"musicControls.js",
				);
				await safeRespond(interaction, { content: `🔊 Volumen: ${volUp}%` });
				await syncPlayerPanel(client, interaction.guildId);
				break;
			}

			case "volume_down": {
				const freshQueueDown = await getQueue(
					client.lavalinkManager,
					interaction.guildId,
				);
				const volDown = Math.max((freshQueueDown?.volume || 100) - 10, 0);
				await setVolume(client.lavalinkManager, interaction.guildId, volDown);
				Logger.music(
					`🔉 Volumen: ${volDown}% por ${member.user.tag}`,
					"musicControls.js",
				);
				await safeRespond(interaction, { content: `🔉 Volumen: ${volDown}%` });
				await syncPlayerPanel(client, interaction.guildId);
				break;
			}

			case "volume_mute":
				await setVolume(client.lavalinkManager, interaction.guildId, 0);
				Logger.music(
					`🔇 Silenciado por ${member.user.tag}`,
					"musicControls.js",
				);
				await safeRespond(interaction, { content: "🔇 Música silenciada" });
				await syncPlayerPanel(client, interaction.guildId);
				break;
		}
	} catch (error) {
		Logger.error(
			"Error en botón de música (Lavalink)",
			error,
			"musicControls.js",
		);
		await safeRespond(interaction, {
			content: "❌ Error al procesar la acción",
		});
	}
}

async function handleQueueJumpSelect(interaction, client) {
	const acknowledged = await safeDeferReply(interaction);
	if (!acknowledged) return;

	const guildId = interaction.guildId;

	if (!isLavalinkAvailable(client)) {
		return safeRespond(interaction, {
			content: "❌ Lavalink no está disponible",
		});
	}

	const llQueue = await getQueue(client.lavalinkManager, guildId);
	if (!llQueue) {
		return safeRespond(interaction, {
			content: "❌ No hay música reproduciéndose",
		});
	}

	const member = interaction.member;
	if (!member.voice?.channel) {
		return safeRespond(interaction, {
			content: "❌ Debes estar en un canal de voz",
		});
	}
	if (member.voice.channel.id !== llQueue.voiceChannel) {
		return safeRespond(interaction, {
			content: "❌ Debes estar en el mismo canal de voz que el bot",
		});
	}

	try {
		const selectedValues = interaction.values;
		if (!selectedValues || selectedValues.length === 0) {
			return safeRespond(interaction, { content: "❌ Selección inválida" });
		}

		const position = parseInt(selectedValues[0], 10);
		if (isNaN(position) || position < 1) {
			return safeRespond(interaction, { content: "❌ Posición inválida" });
		}

		const { jumpToTrack } = require("./lavalinkQueue");
		await jumpToTrack(client.lavalinkManager, guildId, position);

		const currentSong = getCurrentTrack(client.lavalinkManager, guildId);
		const songName = currentSong?.info?.title || currentSong?.name || "canción";
		Logger.music(
			`Queue jump a posición ${position} por ${member.user.tag}`,
			"musicControls.js",
		);
		await safeRespond(interaction, {
			content: `⏭️ Saltada la cola hasta: **${songName}**`,
		});
		await syncPlayerPanel(client, guildId);
	} catch (error) {
		Logger.error("Error en queue jump", error, "musicControls.js");
		await safeRespond(interaction, { content: "❌ No se pudo saltar la cola" });
	}
}

// Backward-compatibility stub — renders via syncPlayerPanel
function renderControlRows(manager, guildId) {
	if (!manager?.getPlayer(guildId)) return null;
	return null;
}

module.exports = {
	createMusicButtons,
	createMusicToggleButton,
	createSecondaryMusicButtons,
	createSecondaryMusicButtonsWithAutoplay,
	createVolumeButtons,
	safeRespond,
	handleMusicButton,
	handleQueueJumpSelect,
	syncPlayerPanel,
	renderControlRows,
};
