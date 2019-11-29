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

// Parse package.json and init sentry
fs.readFile(path.join(__dirname, "../package.json"), "utf8").then(
	fileContents => {
		const packageJson = JSON.parse(fileContents);
		Sentry.init({
			release: `${packageJson.name}@${packageJson.version}`,
			dsn: "https://841e902ca32842beadada39343a72479@sentry.io/1839595",
			integrations: [new Integrations.Dedupe()],
		});
	},
);

export { Driver } from "./lib/driver/Driver";
export { ZWaveNode } from "./lib/node/Node";
