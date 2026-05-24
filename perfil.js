// Defines the public Discord application profile and rotating presence messages.

module.exports = {
	description: " hola w <a:pepe_guitar:984320182698803210>",
	tags: ["music", "entertainment", "utility"],
	install_params: {
		scopes: ["bot", "applications.commands"],
		permissions: "36785152",
	},
	presence_status: "idle",
	presence_messages: [
		{ name: "r!help 🎶", type: "Listening" },
		{ name: "/play 🎵 — prueba los comandos", type: "Playing" },
		{ name: "gato 🎵", type: "Playing" },
	],
};
