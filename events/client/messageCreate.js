// Handles legacy prefix commands such as r!play and r!queue.
const { prefix } = require("../../config");
const { createErrorEmbed } = require("../../utils/embeds");

module.exports = (client, message) => {
	if (message.author.bot) return;
	if (!message.content.startsWith(prefix)) return;

	const args = message.content.slice(prefix.length).trim().split(/ +/);
	const commandName = args.shift().toLowerCase();

	const command = client.commands.get(commandName);
	if (!command) return;

	try {
		command.execute(message, args, client);
	} catch (error) {
		console.error(`Error ejecutando el comando ${commandName}:`, error);
		message.reply({
			embeds: [
				createErrorEmbed(
					"Error en comando",
					"Hubo un error ejecutando el comando.",
				),
			],
		});
	}
};
