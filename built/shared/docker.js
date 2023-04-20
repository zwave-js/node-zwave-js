"use strict";
// Shamelessly copied from https://github.com/sindresorhus/is-docker
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.isDocker = void 0;
const fs_1 = __importDefault(require("fs"));
function hasDockerEnv() {
    try {
        fs_1.default.statSync("/.dockerenv");
        return true;
    }
    catch {
        return false;
    }
}
function hasDockerCGroup() {
    try {
        return fs_1.default.readFileSync("/proc/self/cgroup", "utf8").includes("docker");
    }
    catch {
        return false;
    }
}
let _isDocker;
/** Check if the process is running inside a Docker container */
function isDocker() {
    if (_isDocker === undefined) {
        _isDocker = hasDockerEnv() || hasDockerCGroup();
    }
    return _isDocker;
}
exports.isDocker = isDocker;
//# sourceMappingURL=docker.js.map