// Normalizes command input access for both slash commands and prefix messages.
function getStringOption(interaction, optionNames) {
	const optionData = interaction.options?.data || [];

	for (const optionName of optionNames) {
		const directOption = optionData.find(
			(option) => option.name === optionName,
		);
		if (typeof directOption?.value === "string") {
			return directOption.value.trim();
		}

		let value = null;
		try {
			value = interaction.options.getString(optionName, false);
		} catch (_) {
			value = null;
		}

		if (typeof value === "string") {
			return value.trim();
		}
	}

	return "";
}

function getIntegerOption(interaction, optionNames) {
	const optionData = interaction.options?.data || [];

	for (const optionName of optionNames) {
		const directOption = optionData.find(
			(option) => option.name === optionName,
		);
		if (typeof directOption?.value === "number") {
			return directOption.value;
		}

		let value = null;
		try {
			value = interaction.options.getInteger(optionName, false);
		} catch (_) {
			value = null;
		}

		if (typeof value === "number") {
			return value;
		}
	}

	return null;
}

function getBooleanOption(interaction, optionNames) {
	const optionData = interaction.options?.data || [];

	for (const optionName of optionNames) {
		const directOption = optionData.find(
			(option) => option.name === optionName,
		);
		if (typeof directOption?.value === "boolean") {
			return directOption.value;
		}

		let value = null;
		try {
			value = interaction.options.getBoolean(optionName, false);
		} catch (_) {
			value = null;
		}

		if (typeof value === "boolean") {
			return value;
		}
	}

	return null;
}

function createChatInputCommandContext(interaction) {
	const query = getStringOption(interaction, ["cancion", "song", "query"]);

	return {
		source: "interaction",
		query,
		member: interaction.member,
		user: interaction.user,
		guild: interaction.guild,
		channel: interaction.channel,
		get voiceChannel() {
			return interaction.member?.voice?.channel || null;
		},
		options: {
			getString(name, fallback = "") {
				const value = getStringOption(interaction, [name]);
				return value !== "" ? value : fallback;
			},
			getInteger(name, fallback = null) {
				return getIntegerOption(interaction, [name]) ?? fallback;
			},
			getBoolean(name, fallback = null) {
				return getBooleanOption(interaction, [name]) ?? fallback;
			},
		},
		async reply(payload) {
			if (interaction.deferred && !interaction.replied) {
				return interaction.editReply(payload);
			}

			if (interaction.replied) {
				return interaction.followUp({ ...payload, fetchReply: true });
			}

			return interaction.reply({ ...payload, fetchReply: true });
		},
		async send(payload) {
			if (interaction.deferred || interaction.replied) {
				return interaction.followUp({ ...payload, fetchReply: true });
			}

			return interaction.channel.send(payload);
		},
		async deleteReply() {
			if (interaction.deferred || interaction.replied) {
				return interaction.deleteReply();
			}

			return null;
		},
		createCollector(messageWithComponents, options) {
			return messageWithComponents.createMessageComponentCollector(options);
		},
		createComponentCollectorFromReply(messageWithComponents, options) {
			return messageWithComponents.createMessageComponentCollector(options);
		},
		toDisTubeMetadata() {
			return {
				member: interaction.member,
				textChannel: interaction.channel,
			};
		},
		toLavalinkMetadata() {
			return {
				member: interaction.member,
				user: interaction.user,
				textChannel: interaction.channel,
			};
		},
	};
}

function createMessageCommandContext(message, args = []) {
	return {
		source: "message",
		query: args.join(" ").trim(),
		member: message.member,
		user: message.author,
		guild: message.guild,
		channel: message.channel,
		get voiceChannel() {
			return message.member?.voice?.channel || null;
		},
		options: {
			getString(name, fallback = "") {
				const joined = args.join(" ").trim();
				return joined !== "" ? joined : fallback;
			},
			getInteger(name, fallback = null) {
				if (args.length === 0) return fallback;
				const parsed = parseInt(args[0], 10);
				return isNaN(parsed) ? fallback : parsed;
			},
			getBoolean(name, fallback = null) {
				return fallback;
			},
		},
		async reply(payload) {
			return message.reply(payload);
		},
		async send(payload) {
			return message.channel.send(payload);
		},
		createCollector(messageWithComponents, options) {
			return messageWithComponents.createMessageComponentCollector(options);
		},
		createComponentCollectorFromReply(messageWithComponents, options) {
			return messageWithComponents.createMessageComponentCollector(options);
		},
		toDisTubeMetadata() {
			return {
				member: message.member,
				textChannel: message.channel,
				message,
			};
		},
		toLavalinkMetadata() {
			return {
				member: message.member,
				user: message.author,
				textChannel: message.channel,
				message,
			};
		},
	};
}

module.exports = {
	createMessageCommandContext,
	createChatInputCommandContext,
};
