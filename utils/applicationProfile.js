// Syncs the Discord application profile only when the remote state differs.
const perfil = require("../perfil");

const API_BASE = "https://discord.com/api/v10";

function buildProfilePayload() {
	return {
		description: perfil.description,
		tags: perfil.tags,
		install_params: perfil.install_params,
	};
}

async function syncApplicationProfile(token, options = {}) {
	const { verbose = false } = options;
	const payload = buildProfilePayload();

	if (verbose) {
		console.log(`   description : ${payload.description}`);
		console.log(`   tags        : [${payload.tags.join(", ")}]`);
		console.log(
			`   scopes      : [${payload.install_params.scopes.join(", ")}]`,
		);
		console.log(`   permissions : ${payload.install_params.permissions}`);
	}

	let current;
	try {
		const res = await fetch(`${API_BASE}/applications/@me`, {
			method: "GET",
			headers: {
				Authorization: `Bot ${token}`,
				"Content-Type": "application/json",
				"User-Agent": "DiscordBot (rosy-music-bot, 1.0.0)",
			},
		});

		if (!res.ok) {
			const text = await res.text().catch(() => "");
			let errMsg = `HTTP ${res.status}`;
			try {
				errMsg = JSON.parse(text).message || errMsg;
			} catch {}
			return { ok: false, changed: false, status: res.status, message: errMsg };
		}

		current = await res.json();
	} catch (err) {
		return { ok: false, changed: false, status: 0, message: err.message };
	}

	const tagsEqual =
		JSON.stringify(current.tags || []) === JSON.stringify(payload.tags);
	const installEqual =
		JSON.stringify(current.install_params || {}) ===
		JSON.stringify(payload.install_params);
	const descriptionChanged = current.description !== payload.description;
	const tagsChanged = !tagsEqual;
	const installChanged = !installEqual;

	if (!descriptionChanged && !tagsChanged && !installChanged) {
		if (verbose) console.log("   Sin cambios — omitiendo PATCH");
		return { ok: true, changed: false, status: 200, message: "Sin cambios" };
	}

	try {
		const res = await fetch(`${API_BASE}/applications/@me`, {
			method: "PATCH",
			headers: {
				Authorization: `Bot ${token}`,
				"Content-Type": "application/json",
				"User-Agent": "DiscordBot (rosy-music-bot, 1.0.0)",
			},
			body: JSON.stringify(payload),
		});

		const text = await res.text();

		if (res.ok) {
			return {
				ok: true,
				changed: true,
				status: res.status,
				message: "Actualizado",
			};
		}

		let errMsg = `HTTP ${res.status}`;
		try {
			errMsg = JSON.parse(text).message || errMsg;
		} catch {}
		return { ok: false, changed: false, status: res.status, message: errMsg };
	} catch (err) {
		return { ok: false, changed: false, status: 0, message: err.message };
	}
}

module.exports = {
	buildProfilePayload,
	syncApplicationProfile,
};
