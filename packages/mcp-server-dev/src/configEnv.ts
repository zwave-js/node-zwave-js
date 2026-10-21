import { dirname, isAbsolute, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Get the repository root (go up from packages/mcp-server-dev/build to root)
export const REPO_ROOT = resolve(__dirname, "../../..");

// Root directory for device config files. This is the `rootDir` against which
// `~/`-prefixed `$import` specifiers (e.g. "~/templates/master_template.json")
// are resolved, matching how the config linter loads device files.
export const DEVICES_DIR = resolve(REPO_ROOT, "packages/config/config/devices");

/**
 * Resolves a file path passed to a tool and returns it as an absolute path,
 * or `undefined` if it points outside the device config directory.
 */
export function resolveDeviceConfigPath(file: string): string | undefined {
	const ret = resolve(file);
	const rel = relative(DEVICES_DIR, ret);
	if (rel === ".." || rel.startsWith(`..${sep}`) || isAbsolute(rel)) {
		return undefined;
	}
	return ret;
}

// Node.js filesystem binding used by the @zwave-js/config loaders
export { fs } from "@zwave-js/core/bindings/fs/node";
