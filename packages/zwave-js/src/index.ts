// This module is the main entry point. Requiring reflect-metadata here avoids forgetting it
require("reflect-metadata");

import * as path from "path";
// By installing source map support, we get the original source
// locations in error messages
import "source-map-support/register";
import { initSentry } from "./lib/telemetry/sentry";

/** The version of zwave-js, exported for your convenience */
// eslint-disable-next-line @typescript-eslint/no-var-requires
const packageJson = require("zwave-js/package.json");
const libraryRootDir = path.join(__dirname, "..");
const libName: string = packageJson.name;
const libVersion: string = packageJson.version;

// Init sentry, unless we're running a a test or some custom-built userland or PR test versions
if (
	process.env.NODE_ENV !== "test" &&
	!/\-[a-f0-9]{7,}$/.test(libVersion) &&
	!/\-pr\-\d+\-$/.test(libVersion)
) {
	void initSentry(libraryRootDir, libName, libVersion).catch(() => {
		/* ignore */
	});
}

// Export some frequently-used things and types - this also loads all CC files including metadata
export * from "./CommandClass";
export * from "./Controller";
export * from "./Driver";
export * from "./Error";
export * from "./Node";
export * from "./Utils";
export * from "./Values";
export { libVersion };
