require("dotenv").config();

const fs = require("fs");
const path = require("path");
const { REST, Routes } = require("discord.js");

const token = process.env.TOKEN;
const clientId = process.env.CLIENT_ID || process.env.DISCORD_CLIENT_ID;
const guildId = process.env.GUILD_ID || process.env.DISCORD_GUILD_ID;

const clearGuild = process.argv.includes("--clear-guild");
const overrideGuild = process.argv.find((a) => a.startsWith("--guild="));
const targetGuild = overrideGuild ? overrideGuild.split("=")[1] : guildId;

if (!token) {
	throw new Error("Falta TOKEN en las variables de entorno.");
}

if (!clientId) {
	throw new Error(
		"Falta CLIENT_ID o DISCORD_CLIENT_ID en las variables de entorno.",
	);
}

const commands = [];
const commandsPath = path.join(__dirname, "../commands");
const commandFolders = fs.readdirSync(commandsPath);

for (const folder of commandFolders) {
	const folderPath = path.join(commandsPath, folder);
	const commandFiles = fs
		.readdirSync(folderPath)
		.filter((file) => file.endsWith(".js"));

	for (const file of commandFiles) {
		const filePath = path.join(folderPath, file);
		const command = require(filePath);

		if (
			command.data &&
			(typeof command.executeContext === "function" ||
				typeof command.executeInteraction === "function")
		) {
			commands.push(command.data.toJSON());
		}
	}
}

const rest = new REST({ version: "10" }).setToken(token);

(async () => {
	try {
		// Cleanup mode: delete guild commands and exit without registering new ones.
		if (clearGuild && targetGuild) {
			console.log(`🗑  Limpiando comandos del guild=${targetGuild} ...`);
			await rest.put(Routes.applicationGuildCommands(clientId, targetGuild), {
				body: [],
			});
			console.log("✅ Comandos del guild eliminados.");
			console.log(
				"   Discord puede tardar hasta 1 hora en propagar el cambio.",
			);
			return;
		}

		if (targetGuild) {
			console.log(
				`Registrando ${commands.length} comando(s) en guild=${targetGuild} (desarrollo)...`,
			);
			await rest.put(Routes.applicationGuildCommands(clientId, targetGuild), {
				body: commands,
			});
			console.log(
				"✅ Comandos registrados en guild. Usalos directamente en ese servidor.",
			);
		} else {
			console.log(`Registrando ${commands.length} comando(s) global(es)...`);
			await rest.put(Routes.applicationCommands(clientId), { body: commands });
			console.log(
				"✅ Comandos globales registrados. Discord puede tardar en propagarlos (hasta 1 hora).",
			);
		}
	} catch (error) {
		console.error("❌ Error registrando comandos:", error);
		process.exitCode = 1;
	}
})();
