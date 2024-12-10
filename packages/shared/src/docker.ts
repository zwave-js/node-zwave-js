// Shamelessly copied from https://github.com/sindresorhus/is-docker

import { createRequire } from "node:module";
const require = createRequire(import.meta.url);

function hasDockerEnv(): boolean {
	try {
		require("node:fs").statSync("/.dockerenv");
		return true;
	} catch {
		return false;
	}
}

function hasDockerCGroup(): boolean {
	try {
		return require("node:fs")
			.readFileSync("/proc/self/cgroup", "utf8")
			.includes("docker");
	} catch {
		return false;
	}
}

let _isDocker: boolean | undefined;

/**
 * Check if the process is running inside a Docker container
 * @deprecated Use `is-docker` package instead, or copy this code into your project
 */
export function isDocker(): boolean {
	if (_isDocker === undefined) {
		_isDocker = hasDockerEnv() || hasDockerCGroup();
	}
	return _isDocker;
}
