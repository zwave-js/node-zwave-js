// This module is the main entry point. Requiring reflect-metadata here avoids forgetting it
require("reflect-metadata");

// Load sentry.io so we get information about errors
import * as Integrations from "@sentry/integrations";
import * as Sentry from "@sentry/node";
import { ZWaveError, ZWaveErrorCodes } from "@zwave-js/core";
import { randomBytes } from "crypto";
import * as fs from "fs-extra";
import * as path from "path";
// By installing source map support, we get the original source
// locations in error messages
import "source-map-support/register";

/** The version of zwave-js, exported for your convenience */
// eslint-disable-next-line @typescript-eslint/no-var-requires
const libVersion: string = require("./package.json").version;
const libraryRootDir = path.join(__dirname, "..");

/** Checks if a filename is part of this library. Paths outside will be excluded from Sentry error reporting */
function isPartOfThisLib(filename: string): boolean {
	const relative = path.relative(libraryRootDir, filename);
	return (
		!!relative && !relative.startsWith("..") && !path.isAbsolute(relative)
	);
}

// Errors in files matching any entry in this array will always be reported
const pathWhitelists = ["node_modules/iobroker.zwave2"];

function isZWaveError(
	err: Error | string | null | undefined,
): err is ZWaveError {
	if (!err || typeof err === "string") return false;
	return "code" in err && typeof (err as any).code === "number";
}

/** Creates a new fingerprint or retrieves a previously-generated one */
async function getFingerprint(): Promise<string> {
	const fingerprintPath = path.join(__dirname, "fingerprint.txt");
	let fingerprint: string | undefined;
	if (await fs.pathExists(fingerprintPath)) {
		fingerprint = await fs.readFile(fingerprintPath, "utf8");
	}
	if (!fingerprint || fingerprint.length < 8) {
		fingerprint = randomBytes(8).toString("hex");
		try {
			await fs.writeFile(fingerprintPath, fingerprint, "utf8");
		} catch {
			/* ignore */
		}
	}
	return fingerprint;
}

// Parse package.json and init sentry
// eslint-disable-next-line @typescript-eslint/no-floating-promises
fs.readFile(path.join(libraryRootDir, "package.json"), "utf8").then(
	(fileContents) => {
		const packageJson = JSON.parse(fileContents) as {
			name: string;
			version: string;
		};
		Sentry.init({
			release: `${packageJson.name}@${packageJson.version}`,
			dsn:
				"https://3ac1c1077df6496b89d797b331a8ec4a@o327859.ingest.sentry.io/1839595",
			defaultIntegrations: false,
			integrations: [
				new Sentry.Integrations.OnUncaughtException(),
				new Sentry.Integrations.OnUnhandledRejection({
					mode: "strict",
				}),
				new Sentry.Integrations.FunctionToString(),
				new Integrations.Dedupe() as any,
			],
			maxBreadcrumbs: 30,
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
				if (!ignore && hint && isZWaveError(hint?.originalException)) {
					switch (hint.originalException.code) {
						// we don't care about timeouts
						case ZWaveErrorCodes.Controller_MessageDropped:
						// We don't care about failed node removal
						case ZWaveErrorCodes.RemoveFailedNode_Failed:
						case ZWaveErrorCodes.RemoveFailedNode_NodeOK:
						// Or failed inclusion processes:
						case ZWaveErrorCodes.Controller_InclusionFailed:
						case ZWaveErrorCodes.Controller_ExclusionFailed:
						// Or users that don't read the changelog:
						case ZWaveErrorCodes.Driver_NoErrorHandler:
							ignore = true;
							break;
						// Or users that try to manage associations on nodes that don't support it
						case ZWaveErrorCodes.CC_NotSupported:
							if (
								/does not support.+associations/.test(
									hint.originalException.message,
								)
							) {
								ignore = true;
							}
							break;
					}

					// Try to attach transaction context this way
					if (!ignore && hint.originalException.transactionSource) {
						event.contexts = {
							transaction: {
								stack: hint.originalException.transactionSource,
							},
						};
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
		// Try to group events by user (anonymously)
		getFingerprint()
			.then((fingerprint) => {
				Sentry.configureScope((scope) => {
					scope.setUser({ id: fingerprint });
				});
			})
			.catch(() => {
				/* ignore */
			});
	},
);

// Export some frequently-used things and types - this also loads all CC files including metadata
export * from "./CommandClass";
export * from "./Controller";
export * from "./Driver";
export * from "./Error";
export * from "./Node";
export * from "./Utils";
export * from "./Values";
export { libVersion };
