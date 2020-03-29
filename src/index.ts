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

// Parse package.json and init sentry
fs.readFile(path.join(__dirname, "../package.json"), "utf8").then(
	(fileContents) => {
		const packageJson = JSON.parse(fileContents);
		Sentry.init({
			release: `${packageJson.name}@${packageJson.version}`,
			dsn: "https://841e902ca32842beadada39343a72479@sentry.io/1839595",
			integrations: [new Integrations.Dedupe()],
			beforeSend(event, hint) {
				// Filter out specific errors that shouldn't create a report on sentry
				// because they should be handled by the library user

				// TODO: Should this filter out all ZWaveErrors?

				if (hint?.originalException instanceof ZWaveError) {
					switch (hint.originalException.code) {
						// we don't care about timeouts
						case ZWaveErrorCodes.Controller_MessageDropped:
							return null;
					}
				}
				return event;
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
