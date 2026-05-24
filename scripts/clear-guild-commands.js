require("dotenv").config();

const { REST, Routes } = require("discord.js");

const token = process.env.TOKEN;
const clientId = process.env.CLIENT_ID || process.env.DISCORD_CLIENT_ID;

// Allow --guild=XXXX to override the environment target.
const guildArg = process.argv.find((a) => a.startsWith("--guild="));
const guildId = guildArg
	? guildArg.split("=")[1]
	: process.env.GUILD_ID || process.env.DISCORD_GUILD_ID;

if (!token) throw new Error("Falta TOKEN en las variables de entorno.");
if (!clientId) throw new Error("Falta CLIENT_ID en las variables de entorno.");
if (!guildId)
	throw new Error(
		"GUILD_ID no está definida. Pásala como --guild=123456789 o en .env como DISCORD_GUILD_ID.",
	);

const rest = new REST({ version: "10" }).setToken(token);

(async () => {
	try {
		console.log(`🗑  Limpiando comandos del guild=${guildId} ...`);
		await rest.put(Routes.applicationGuildCommands(clientId, guildId), {
			body: [],
		});
		console.log("✅ Comandos del guild eliminados (puesta al día con []).");
		console.log("   Discord puede tardar hasta 1 hora en propagarlo.");
		console.log(
			"   Para verificar inmediatamente, lleva el bot a otro server o espera unos minutos.",
		);
	} catch (err) {
		console.error("❌ Error limpiando comandos guild:", err);
		process.exitCode = 1;
	}
})();
