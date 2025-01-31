import { getenv } from "@zwave-js/shared";
import { type Format } from "logform";
import path from "pathe";
import { configs } from "triple-beam";
import winston from "winston";
import DailyRotateFile from "winston-daily-rotate-file";
import type Transport from "winston-transport";
import type { ConsoleTransportInstance } from "winston/lib/winston/transports";
import { colorizer } from "../../log/Colorizer.js";
import {
	combine,
	formatLogMessage,
	label,
	printLogMessage,
	timestamp,
} from "../../log/format.js";
import {
	type LogConfig,
	type LogContext,
	type LogFactory,
	nonUndefinedLogConfigKeys,
	stringToNodeList,
	timestampFormatShort,
} from "../../log/shared.js";
import { type LogContainer, type ZWaveLogger } from "../../log/traits.js";

const isTTY = process.stdout.isTTY;
const isUnitTest = process.env.NODE_ENV === "test";

const loglevels = configs.npm.levels;

function getTransportLoglevel(): string {
	const loglevel = getenv("LOGLEVEL")!;
	return loglevel in loglevels ? loglevel : "debug";
}

/** Performs a reverse lookup of the numeric loglevel */
function loglevelFromNumber(numLevel: number | undefined): string | undefined {
	if (numLevel == undefined) return;
	for (const [level, value] of Object.entries(loglevels)) {
		if (value === numLevel) return level;
	}
}

/** Creates the common logger format for all loggers under a given channel */
export function createLoggerFormat(channel: string): Format {
	return combine(
		// add the channel as a label
		label(channel),
		// default to short timestamps
		timestamp(),
	) as unknown as Format;
}

/** The common logger format for built-in transports */
export function createDefaultTransportFormat(
	colorize: boolean,
	shortTimestamps: boolean,
): Format {
	const formats = [
		// overwrite the default timestamp format if necessary
		shortTimestamps
			? timestamp(timestampFormatShort)
			: undefined,
		formatLogMessage,
		colorize ? colorizer() : undefined,
		printLogMessage(shortTimestamps),
	].filter((f) => f != undefined);
	return combine(...formats) as unknown as Format;
}

/** Unsilences the console transport of a logger and returns the original value */
export function unsilence(logger: winston.Logger): boolean {
	const consoleTransport = logger.transports.find(
		(t) => (t as any).name === "console",
	);
	if (consoleTransport) {
		const ret = !!consoleTransport.silent;
		consoleTransport.silent = false;
		return ret;
	}
	return false;
}

/** Restores the console transport of a logger to its original silence state */
export function restoreSilence(
	logger: winston.Logger,
	original: boolean,
): void {
	const consoleTransport = logger.transports.find(
		(t) => (t as any).name === "console",
	);
	if (consoleTransport) {
		consoleTransport.silent = original;
	}
}

class ZWaveLogContainer extends winston.Container implements LogContainer {
	private fileTransport: DailyRotateFile | undefined;
	private consoleTransport: ConsoleTransportInstance | undefined;
	private loglevelVisibleCache = new Map<string, boolean>();

	private logConfig: LogConfig & { level: string } = {
		enabled: true,
		level: getTransportLoglevel(),
		logToFile: !!getenv("LOGTOFILE"),
		maxFiles: 7,
		nodeFilter: stringToNodeList(getenv("LOG_NODES")),
		transports: undefined as any,
		filename: path.join(process.cwd(), `zwavejs_%DATE%.log`),
		forceConsole: false,
	};

	constructor(config: Partial<LogConfig> = {}) {
		super();
		this.updateConfiguration(config);
	}

	public getLogger<TContext extends LogContext>(
		label: string,
	): ZWaveLogger<TContext> {
		if (!this.has(label)) {
			this.add(label, {
				transports: this.getAllTransports(),
				format: createLoggerFormat(label),
				// Accept all logs, no matter what. The individual loggers take care
				// of filtering the wrong loglevels
				level: "silly",
			});
		}

		return this.get(label) as unknown as ZWaveLogger<TContext>;
	}

	public updateConfiguration(config: Partial<LogConfig>): void {
		// Avoid overwriting configuration settings with undefined if they shouldn't be
		for (const key of nonUndefinedLogConfigKeys) {
			if (key in config && config[key] === undefined) {
				delete config[key];
			}
		}
		const changedLoggingTarget = (config.logToFile != undefined
			&& config.logToFile !== this.logConfig.logToFile)
			|| (config.forceConsole != undefined
				&& config.forceConsole !== this.logConfig.forceConsole);

		if (typeof config.level === "number") {
			config.level = loglevelFromNumber(config.level);
		}
		const changedLogLevel = config.level != undefined
			&& config.level !== this.logConfig.level;

		if (
			config.filename != undefined
			&& !config.filename.includes("%DATE%")
		) {
			config.filename += "_%DATE%.log";
		}
		const changedFilename = config.filename != undefined
			&& config.filename !== this.logConfig.filename;

		if (config.maxFiles != undefined) {
			if (
				typeof config.maxFiles !== "number"
				|| config.maxFiles < 1
				|| config.maxFiles > 365
			) {
				delete config.maxFiles;
			}
		}
		const changedMaxFiles = config.maxFiles != undefined
			&& config.maxFiles !== this.logConfig.maxFiles;

		this.logConfig = Object.assign(this.logConfig, config);

		// If the loglevel changed, our cached "is visible" info is out of date
		if (changedLogLevel) {
			this.loglevelVisibleCache.clear();
		}

		// When the log target (console, file, filename) was changed, recreate the internal transports
		// because at least the filename does not update dynamically
		// Also do this when configuring the logger for the first time
		const recreateInternalTransports = (this.fileTransport == undefined
			&& this.consoleTransport == undefined)
			|| changedLoggingTarget
			|| changedFilename
			|| changedMaxFiles;

		if (recreateInternalTransports) {
			this.fileTransport?.destroy();
			this.fileTransport = undefined;
			this.consoleTransport?.destroy();
			this.consoleTransport = undefined;
		}

		// When the internal transports or the custom transports were changed, we need to update the loggers
		if (recreateInternalTransports || config.transports != undefined) {
			this.loggers.forEach((logger) =>
				logger.configure({ transports: this.getAllTransports() })
			);
		}
	}

	public getConfiguration(): LogConfig {
		return this.logConfig;
	}

	/** Tests whether a log using the given loglevel will be logged */
	public isLoglevelVisible(loglevel: string): boolean {
		// If we are not connected to a TTY, not logging to a file and don't have any custom transports, we won't see anything
		if (
			!this.fileTransport
			&& !this.consoleTransport
			&& (!this.logConfig.transports
				|| this.logConfig.transports.length === 0)
		) {
			return false;
		}

		if (!this.loglevelVisibleCache.has(loglevel)) {
			this.loglevelVisibleCache.set(
				loglevel,
				loglevel in loglevels
					&& loglevels[loglevel] <= loglevels[this.logConfig.level],
			);
		}
		return this.loglevelVisibleCache.get(loglevel)!;
	}

	public destroy(): void {
		for (const key in this.loggers) {
			this.close(key);
		}

		this.fileTransport = undefined;
		this.consoleTransport = undefined;
		this.logConfig.transports = [];
	}

	private getAllTransports(): Transport[] {
		return [
			...this.getInternalTransports(),
			...(this.logConfig.transports ?? []),
		];
	}

	private getInternalTransports(): Transport[] {
		const ret: Transport[] = [];

		// If logging is disabled, don't log to any of the default transports
		if (!this.logConfig.enabled) {
			return ret;
		}

		// Log to file only when opted in
		if (this.logConfig.logToFile) {
			if (!this.fileTransport) {
				this.fileTransport = this.createFileTransport();
			}
			ret.push(this.fileTransport);
		}

		// Console logs can be noise, so only log to console...
		if (
			// when in production
			!isUnitTest
			// and stdout is a TTY while we're not already logging to a file
			&& ((isTTY && !this.logConfig.logToFile)
				// except when the user explicitly wants to
				|| this.logConfig.forceConsole)
		) {
			if (!this.consoleTransport) {
				this.consoleTransport = this.createConsoleTransport();
			}
			ret.push(this.consoleTransport);
		}

		return ret;
	}

	private createConsoleTransport(): ConsoleTransportInstance {
		return new winston.transports.Console({
			format: createDefaultTransportFormat(
				// Only colorize the output if logging to a TTY, otherwise we'll get
				// ansi color codes in logfiles or redirected shells
				isTTY || isUnitTest,
				// Only use short timestamps if logging to a TTY
				isTTY,
			),
			silent: this.isConsoleTransportSilent(),
		});
	}

	private isConsoleTransportSilent(): boolean {
		return process.env.NODE_ENV === "test" || !this.logConfig.enabled;
	}

	private isFileTransportSilent(): boolean {
		return !this.logConfig.enabled;
	}

	private createFileTransport(): DailyRotateFile {
		const ret = new DailyRotateFile({
			filename: this.logConfig.filename,
			auditFile: `${
				this.logConfig.filename
					.replace("_%DATE%", "_logrotate")
					.replace(/\.log$/, "")
			}.json`,
			datePattern: "YYYY-MM-DD",
			createSymlink: true,
			symlinkName: path
				.basename(this.logConfig.filename)
				.replace(`_%DATE%`, "_current"),
			zippedArchive: true,
			maxFiles: `${this.logConfig.maxFiles}d`,
			format: createDefaultTransportFormat(false, false),
			silent: this.isFileTransportSilent(),
		});
		ret.on("new", (newFilename: string) => {
			console.log(`Logging to file:
	${newFilename}`);
		});
		ret.on("error", (err: Error) => {
			console.error(`Error in file stream rotator: ${err.message}`);
		});
		return ret;
	}

	/**
	 * Checks the log configuration whether logs should be written for a given node id
	 */
	public isNodeLoggingVisible(nodeId: number): boolean {
		// If no filters are set, every node gets logged
		if (!this.logConfig.nodeFilter) return true;
		return this.logConfig.nodeFilter.includes(nodeId);
	}
}

export const log: LogFactory = (config?: Partial<LogConfig>) =>
	new ZWaveLogContainer(config);
