// Detects Docker availability and opens Docker Desktop when recovery is possible.
const { spawn } = require("child_process");

const MAX_RETRY = 3;

async function checkDockerState() {
	const infoResult = await tryCommand("docker", ["info"], false);
	if (infoResult.exitCode !== 0) {
		const versionResult = await tryCommand(
			"docker",
			["compose", "version"],
			false,
		);
		if (versionResult.exitCode !== 0) {
			return "missing";
		}
		return "daemon_stopped";
	}

	const versionResult = await tryCommand(
		"docker",
		["compose", "version"],
		false,
	);
	if (versionResult.exitCode !== 0) {
		return "daemon_stopped";
	}

	return "available";
}

function tryCommand(cmd, args, inheritStdio = false) {
	return new Promise((resolve) => {
		const proc = spawn(cmd, args, {
			shell: false,
			windowsHide: true,
			stdio: inheritStdio ? "inherit" : "pipe",
		});

		let stderr = "";
		if (!inheritStdio) {
			proc.stderr.on("data", (d) => {
				stderr += d.toString();
			});
		}

		proc.on("close", (code) => {
			resolve({ exitCode: code ?? -1, stderr });
		});

		proc.on("error", () => {
			resolve({ exitCode: -1, stderr: "" });
		});
	});
}

function openBrowser(url) {
	const { platform } = process;
	let cmd;
	let args;

	if (platform === "win32") {
		cmd = "cmd";
		args = ["/c", "start", "", url];
	} else if (platform === "darwin") {
		cmd = "open";
		args = [url];
	} else {
		cmd = "xdg-open";
		args = [url];
	}

	try {
		spawn(cmd, args, { shell: false, windowsHide: true, stdio: "ignore" });
	} catch {}
}

function startDockerDesktop() {
	if (process.platform !== "win32") return false;

	const fs = require("fs");
	const path = require("path");
	const exePaths = [];

	if (process.env.ProgramFiles) {
		exePaths.push(
			path.join(
				process.env.ProgramFiles,
				"Docker",
				"Docker",
				"Docker Desktop.exe",
			),
		);
	}
	if (process.env.LocalAppData) {
		exePaths.push(
			path.join(
				process.env.LocalAppData,
				"Docker",
				"Docker",
				"Docker Desktop.exe",
			),
		);
	}

	for (const exePath of exePaths) {
		try {
			if (fs.existsSync(exePath)) {
				spawn(exePath, [], {
					shell: false,
					windowsHide: true,
					stdio: "ignore",
					detached: true,
				});
				return true;
			}
		} catch {}
	}

	try {
		spawn("cmd", ["/c", "start", "", "Docker Desktop"], {
			shell: false,
			windowsHide: true,
			stdio: "ignore",
			detached: true,
		});
		return true;
	} catch {
		return false;
	}
}

module.exports = {
	checkDockerState,
	startDockerDesktop,
	openBrowser,
	MAX_RETRY,
};
