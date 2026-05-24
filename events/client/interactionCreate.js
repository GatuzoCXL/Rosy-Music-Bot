// Dispatches Discord interactions for music buttons, selectors, and slash commands.
const { handleMusicButton } = require("../../utils/musicControls");
const { createChatInputCommandContext } = require("../../utils/commandContext");
const { MessageFlags } = require("discord.js");
const Logger = require("../../utils/logger");
const { createErrorEmbed } = require("../../utils/embeds");

function isSlashCompatible(command) {
	return (
		typeof command?.executeContext === "function" ||
		typeof command?.executeInteraction === "function"
	);
}

module.exports = (client) => {
	client.on("interactionCreate", async (interaction) => {
		if (interaction.isButton()) {
			const buttonIds = [
				"music_pause",
				"music_resume",
				"music_toggle",
				"music_skip",
				"music_stop",
				"music_loop",
				"music_shuffle",
				"music_back",
				"volume_up",
				"volume_down",
				"volume_mute",
				"music_autoplay",
				"music_lyrics",
			];

			if (buttonIds.includes(interaction.customId)) {
				Logger.music(
					`Botón presionado: ${interaction.customId} por ${interaction.user.tag}`,
					"interactionCreate.js",
				);
				await handleMusicButton(interaction, client);
			}

			return;
		}

		if (interaction.isStringSelectMenu()) {
			const selectId = interaction.customId;
			if (selectId && selectId.startsWith("queue_jump")) {
				Logger.music(
					`Queue jump select: ${selectId} por ${interaction.user.tag}`,
					"interactionCreate.js",
				);
				const { handleQueueJumpSelect } = require("../../utils/musicControls");
				await handleQueueJumpSelect(interaction, client);
			}
			return;
		}

		if (!interaction.isChatInputCommand()) return;

		const command = client.commands.get(interaction.commandName);
		if (!command) return;

		Logger.command(
			interaction.commandName,
			interaction.user.tag,
			interaction.guild?.name || "DM",
		);

		try {
			if (!isSlashCompatible(command)) {
				await interaction.reply({
					content: `⚠️ El comando **/${interaction.commandName}** todavía no está disponible como slash. Por ahora usa \`r!${interaction.commandName}\`.`,
					flags: MessageFlags.Ephemeral,
				});
				return;
			}

			if (!interaction.deferred && !interaction.replied) {
				await interaction.deferReply();
			}

			const ctx = createChatInputCommandContext(interaction);

			if (typeof command.executeContext === "function") {
				await command.executeContext(ctx, client);
				return;
			}

			if (typeof command.executeInteraction === "function") {
				await command.executeInteraction(interaction, client);
				return;
			}
		} catch (error) {
			Logger.error(
				`Error ejecutando slash command ${interaction.commandName}`,
				error,
				"interactionCreate.js",
			);

			const payload = {
				embeds: [
					createErrorEmbed(
						"Error de comando",
						"Algo salió mal. Intenta nuevamente más tarde.",
					),
				],
			};

			if (interaction.deferred || interaction.replied) {
				await interaction
					.editReply(payload)
					.catch(() => interaction.followUp(payload).catch(() => {}));
				return;
			}

			await interaction.reply(payload).catch(() => {});
		}
	});
};
