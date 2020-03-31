// This module is the main entry point. Requiring reflect-metadata here avoids forgetting it
require("reflect-metadata");

// Load sentry.io so we get information about errors
import * as Integrations from "@sentry/integrations";
import * as Sentry from "@sentry/node";
import * as fs from "fs-extra";
import * as path from "path";
// By installing source map support, we get the original source
// locations in error messages
import "source-map-support/register";
import { ZWaveError, ZWaveErrorCodes } from "./lib/error/ZWaveError";
import log from "./lib/log";
import { stringify } from "./lib/util/strings";

const libraryRootDir = path.join(__dirname, "..");

/** Checks if a filename is part of this library. Paths outside will be excluded from Sentry error reporting */
function isPartOfThisLib(filename: string): boolean {
	const relative = path.relative(libraryRootDir, filename);
	return (
		!!relative && !relative.startsWith("..") && !path.isAbsolute(relative)
	);
}

// Errors in files matching any entry in  this array will always be reported
const pathWhitelists = ["node_modules/iobroker.zwave2"];

// Parse package.json and init sentry
fs.readFile(path.join(libraryRootDir, "package.json"), "utf8").then(
	(fileContents) => {
		const packageJson = JSON.parse(fileContents);
		Sentry.init({
			release: `${packageJson.name}@${packageJson.version}`,
			dsn: "https://841e902ca32842beadada39343a72479@sentry.io/1839595",
			integrations: [new Integrations.Dedupe()],
			beforeSend(event, hint) {
				let ignore = false;
				// By default we ignore errors that original outside this library
				// Look at the last stackframe to figure out the filename
				const filename = event.exception?.values?.[0]?.stacktrace?.frames?.slice(
					-1,
				)[0]?.filename;

				if (filename && !isPartOfThisLib(filename)) {
					ignore = true;
				}

				// Filter out specific errors that shouldn't create a report on sentry
				// because they should be handled by the library user
				if (!ignore && hint?.originalException instanceof ZWaveError) {
					switch (hint.originalException.code) {
						// we don't care about timeouts
						case ZWaveErrorCodes.Controller_MessageDropped:
							ignore = true;
							break;
					}
				}

				// Don't ignore explicitly whitelisted paths
				if (
					ignore &&
					filename &&
					pathWhitelists.some((w) =>
						path.normalize(filename).includes(path.normalize(w)),
					)
				) {
					ignore = false;
				}

				return ignore ? null : event;
			},
		});
	},
);

export { Driver } from "./lib/driver/Driver";
export { ZWaveNode } from "./lib/node/Node";

// Load all CCs to ensure all metadata gets loaded
const definedCCs = fs
	.readdirSync(path.join(__dirname, "lib/commandclass"))
	.filter((file) => /CC\.(js|ts)$/.test(file));
log.reflection.print(`loading CCs: ${stringify(definedCCs)}`);
for (const file of definedCCs) {
	require(`./lib/commandclass/${file}`);
}
