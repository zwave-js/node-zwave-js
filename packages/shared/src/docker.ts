// Shamelessly copied from https://github.com/sindresorhus/is-docker

import fs from "fs";

function hasDockerEnv(): boolean {
	try {
		fs.statSync("/.dockerenv");
		return true;
	} catch {
		return false;
	}
}

function hasDockerCGroup(): boolean {
	try {
		return fs.readFileSync("/proc/self/cgroup", "utf8").includes("docker");
	} catch {
		return false;
	}
}

let _isDocker: boolean | undefined;

/** Check if the process is running inside a Docker container */
export function isDocker(): boolean {
	if (_isDocker === undefined) {
		_isDocker = hasDockerEnv() || hasDockerCGroup();
	}
	return _isDocker;
}
