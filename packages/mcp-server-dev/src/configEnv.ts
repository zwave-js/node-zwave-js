import { realpath } from "node:fs/promises";
import {
	basename,
	dirname,
	isAbsolute,
	join,
	relative,
	resolve,
	sep,
} from "node:path";
import { fileURLToPath } from "node:url";

import { fs as nodeFS } from "@zwave-js/core/bindings/fs/node";
import type { BytesView } from "@zwave-js/shared";
import type { FileSystem } from "@zwave-js/shared/bindings";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Get the repository root (go up from packages/mcp-server-dev/build to root)
export const REPO_ROOT = resolve(__dirname, "../../..");

// Root directory for device config files. This is the `rootDir` against which
// `~/`-prefixed `$import` specifiers (e.g. "~/templates/master_template.json")
// are resolved, matching how the config linter loads device files.
export const DEVICES_DIR = resolve(REPO_ROOT, "packages/config/config/devices");

/**
 * Canonicalizes a path, following symlinks. For paths that do not exist yet,
 * the nearest existing ancestor is canonicalized instead.
 */
async function realpathAllowMissing(file: string): Promise<string> {
	try {
		return await realpath(file);
	} catch (e: any) {
		const parent = dirname(file);
		if (e?.code !== "ENOENT" || parent === file) throw e;
		return join(await realpathAllowMissing(parent), basename(file));
	}
}

/**
 * Resolves a file path passed to a tool (relative paths against the repository root)
 * and returns its canonical absolute path, or `undefined` if it points outside the
 * device config directory.
 */
export async function resolveDeviceConfigPath(
	file: string,
): Promise<string | undefined> {
	let ret: string;
	let devicesDir: string;
	try {
		// Compare canonical paths, so symlinks cannot escape the device config directory
		ret = await realpathAllowMissing(resolve(REPO_ROOT, file));
		devicesDir = await realpath(DEVICES_DIR);
	} catch {
		return undefined;
	}
	const rel = relative(devicesDir, ret);
	if (rel === ".." || rel.startsWith(`..${sep}`) || isAbsolute(rel)) {
		return undefined;
	}
	return ret;
}

/**
 * Node.js filesystem binding used by the @zwave-js/config loaders. Nested `$import`s
 * are resolved by the loaders themselves, so every file read must be checked here
 * to keep symlinks from pulling in content from outside the device config directory.
 */
export const fs: FileSystem = {
	...nodeFS,
	async readFile(file: string): Promise<BytesView> {
		const resolved = await resolveDeviceConfigPath(file);
		if (!resolved) {
			throw new Error(
				`Refusing to read ${file}, which is located outside ${DEVICES_DIR}`,
			);
		}
		return nodeFS.readFile(resolved);
	},
};
