// Load sentry.io so we get information about errors
import * as Integrations from "@sentry/integrations";
import * as Sentry from "@sentry/node";
import {
	ZWaveErrorCodes,
	getErrorSuffix,
	type ZWaveError,
} from "@zwave-js/core";
import { randomBytes } from "crypto";
import * as fs from "fs-extra";
import * as path from "path";

// Errors in files matching any entry in this array will always be reported
const pathWhitelists = ["node_modules/iobroker.zwave2"];
// except if they are included in this array
const pathBlacklists = ["node_modules/@serialport"];
// like pathBlacklists but for exact matches
const pathBlacklistsExact = ["repl.js"];

function isZWaveError(
	err: Error | string | null | undefined,
): err is ZWaveError {
	if (!err || typeof err === "string") return false;
	return "code" in err && typeof (err as any).code === "number";
}

/** @internal */
export interface SentryContext {
	isPartOfThisLib(filename: string): boolean;
	shouldIgnore(event: Sentry.Event, hint?: Sentry.EventHint): boolean;
	getFingerprint(): Promise<string>;
}

const errorMessageTests = (() => {
	const tests: ((msg: string) => boolean | undefined)[] = [];

	// For some reason, working with ZWaveError instances directly doesn't work always.
	// Therefore check for the error codes' string representations.
	tests.push((msg) => {
		for (const code of [
			// we don't care about timeouts
			ZWaveErrorCodes.Controller_MessageDropped,
			// We don't care about failed node removal
			ZWaveErrorCodes.RemoveFailedNode_Failed,
			ZWaveErrorCodes.RemoveFailedNode_NodeOK,
			// Or failed inclusion processes:
			ZWaveErrorCodes.Controller_InclusionFailed,
			ZWaveErrorCodes.Controller_ExclusionFailed,
			// Or users that don't read the changelog:
			ZWaveErrorCodes.Driver_NoErrorHandler,
			// Or incorrect driver options:
			ZWaveErrorCodes.Driver_InvalidOptions,
		] as const) {
			if (msg.includes(getErrorSuffix(code))) {
				return true;
			}
		}
	});

	// Don't care about users that try to manage associations on nodes that don't support it
	tests.push(
		(msg) =>
			msg.includes(getErrorSuffix(ZWaveErrorCodes.CC_NotSupported)) &&
			/does not support.+associations/.test(msg),
	);

	// No such file or directory, cannot open /dev/ttyACM0
	// no such file or directory, rename '/usr/src/app/store/mqtt/incoming~'
	// Opening COM18: File not found
	// No such file or directory, cannot open Select Port
	tests.push(
		(msg) =>
			/(no such file|permission denied|cannot open|file not found)/i.test(
				msg,
			) && /(\/dev\/|\/mqtt\/|COM\d+|Select Port)/i.test(msg),
	);

	// EROFS: read-only file system, write
	// ENODEV: no such device, write
	// ENOSPC: no space left on device, write
	tests.push(
		(msg) =>
			/(EROFS|ENODEV|ENOSPC)/i.test(msg) &&
			/(read-only file system|no such device|no space left)/i.test(msg),
	);

	// Unknown system error -116: Unknown system error -116, write
	tests.push((msg) => /unknown system error/i.test(msg));

	// Input/output error setting custom baud rate of 115200
	tests.push((msg) => /custom baud rate/i.test(msg));

	// Could not locate the bindings file
	tests.push((msg) => /bindings\.node/i.test(msg));

	return tests;
})();

export function createSentryContext(libraryRootDir: string): SentryContext {
	/** Checks if a filename is part of this library. Paths outside will be excluded from Sentry error reporting */
	function isPartOfThisLib(filename: string): boolean {
		const relative = path.relative(libraryRootDir, filename);
		return (
			!!relative &&
			!relative.startsWith("..") &&
			!path.isAbsolute(relative)
		);
	}

	/** Creates a new fingerprint or retrieves a previously-generated one */
	async function getFingerprint(): Promise<string> {
		const fingerprintPath = path.join(libraryRootDir, "fingerprint.txt");
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

	/** Returns whether any line in the given stacktrace is whitelisted and none is blacklisted */
	function anyWhitelisted(filenames: string[]): boolean {
		const normalizedFilenames = filenames.map((f) => path.normalize(f));
		const normalizedWhitelists = pathWhitelists.map((w) =>
			path.normalize(w),
		);
		const normalizedBlacklists = pathBlacklists.map((b) =>
			path.normalize(b),
		);
		return (
			normalizedFilenames.some((f) =>
				normalizedWhitelists.some((w) => f.includes(w)),
			) &&
			!normalizedFilenames.some((f) =>
				normalizedBlacklists.some((b) => f.includes(b)),
			)
		);
	}

	/** Returns whether any line in the given stacktrace is blacklisted */
	function anyBlacklistedExact(filenames: string[]): boolean {
		const normalizedFilenames = filenames.map((f) => path.normalize(f));
		const normalizedBlacklistsExact = pathBlacklistsExact.map((b) =>
			path.normalize(b),
		);
		return normalizedFilenames.some((f) =>
			normalizedBlacklistsExact.some((b) => f === b),
		);
	}

	/** Returns whether the given Sentry event should be ignored */
	function shouldIgnore(
		event: Sentry.Event,
		hint?: Sentry.EventHint,
	): boolean {
		// Sentry orders stack traces from outside (index 0) to inside (index 0).
		// In order to figure out if the error was caused inside zwave-js, we need to
		// ignore all traces without a filename or from Node.js internals
		const filenames =
			event.exception?.values?.[0]?.stacktrace?.frames
				?.map((f) => f.filename)
				?.filter(
					(f): f is string => !!f && !f.startsWith("internal/"),
				) ?? [];
		// Definitely ignore errors which have nothing to do with this library, unless whitelisted
		if (!filenames.some((f) => isPartOfThisLib(f))) {
			return !anyWhitelisted(filenames);
		}

		// Definitely ignore errors where a part of the stack trace is blacklisted
		if (anyBlacklistedExact(filenames)) {
			return true;
		}

		let ignore = false;

		const culprit = filenames[filenames.length - 1];
		const culpritIsPartOfThisLib = isPartOfThisLib(culprit);

		// Maybe ignore errors that are raised outside zwave-js
		if (!culpritIsPartOfThisLib) ignore = true;

		// Filter out specific errors that are raised by zwave-js,
		// but shouldn't create a report on Sentry because they should be
		// handled by the library user
		if (!ignore && culpritIsPartOfThisLib && hint) {
			if (hint.originalException) {
				try {
					const msg = hint.originalException.toString();
					if (errorMessageTests.some((test) => test(msg))) {
						ignore = true;
					}
				} catch {
					// This doesn't seem to be representable as a string
				}

				// Try to attach transaction context if this is an actual ZWaveError instance
				if (
					!ignore &&
					isZWaveError(hint.originalException) &&
					hint.originalException.transactionSource
				) {
					event.contexts = {
						transaction: {
							stack: hint.originalException.transactionSource,
						},
					};
				}
			}
		}

		// Don't ignore explicitly whitelisted paths
		if (ignore && anyWhitelisted(filenames)) {
			ignore = false;
		}

		return ignore;
	}

	return {
		isPartOfThisLib,
		shouldIgnore,
		getFingerprint,
	};
}

export async function initSentry(
	libraryRootDir: string,
	libName: string,
	libVersion: string,
): Promise<void> {
	const context: SentryContext = createSentryContext(libraryRootDir);

	Sentry.init({
		release: `${libName}@${libVersion}`,
		dsn: "https://a66de07edd064106853cc639407ebe64@sentry.iobroker.net/119",
		defaultIntegrations: false,
		autoSessionTracking: false,
		integrations: [
			new Sentry.Integrations.OnUncaughtException(),
			new Sentry.Integrations.OnUnhandledRejection({
				mode: "none", // Let applications take care of force-exiting
			}),
			new Sentry.Integrations.FunctionToString(),
			new Integrations.Dedupe() as any,
		],
		maxBreadcrumbs: 30,
		beforeSend(event, hint) {
			return context.shouldIgnore(event, hint) ? null : event;
		},
	});
	// Try to group events by user (anonymously)
	try {
		const fingerprint = await context.getFingerprint();
		Sentry.configureScope((scope) => {
			scope.setUser({ id: fingerprint });
		});
	} catch {
		/* ignore */
	}
}
