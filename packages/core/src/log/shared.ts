import { DeepPartial, flatMap } from "@zwave-js/shared";
import { padStart } from "alcalzone-shared/strings";
import type { Format, TransformableInfo, TransformFunction } from "logform";
import * as path from "path";
import { configs, MESSAGE } from "triple-beam";
import winston, { Logger } from "winston";
import DailyRotateFile from "winston-daily-rotate-file";
import type Transport from "winston-transport";
import type { ConsoleTransportInstance } from "winston/lib/winston/transports";
import { colorizer } from "./Colorizer";

const { combine, timestamp, label } = winston.format;

const loglevels = configs.npm.levels;
const isTTY = process.stdout.isTTY;
const isUnitTest = process.env.NODE_ENV === "test";

export const timestampFormatShort = "HH:mm:ss.SSS";
export const timestampPaddingShort = " ".repeat(
	timestampFormatShort.length + 1,
);
export const timestampPadding = " ".repeat(new Date().toISOString().length + 1);
const channelPadding = " ".repeat(7); // 6 chars channel name, 1 space

export type DataDirection = "inbound" | "outbound" | "none";

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export function getDirectionPrefix(direction: DataDirection) {
	return direction === "inbound"
		? "« "
		: direction === "outbound"
		? "» "
		: "  ";
}
/** The space the directional arrows, grouping brackets and padding occupies */
export const CONTROL_CHAR_WIDTH = 2;
export const directionPrefixPadding = " ".repeat(CONTROL_CHAR_WIDTH);

/**
 * The width of a log line in (visible) characters, excluding the timestamp and
 * label, but including the direction prefix
 */
export const LOG_WIDTH = 80;
/** The width of the columns containing the timestamp and channel */
export const LOG_PREFIX_WIDTH = 20;

export interface ZWaveLogInfo extends Omit<TransformableInfo, "message"> {
	direction: string;
	/** Primary tags are printed before the message and must fit into the first line.
	 * They don't have to be enclosed in square brackets */
	primaryTags?: string;
	/** Secondary tags are right-aligned in the first line and printed in a dim color */
	secondaryTags?: string;
	secondaryTagPadding?: number;
	multiline?: boolean;
	timestamp?: string;
	label?: string;
	message: string | string[];
}

export type MessageRecord = Record<
	string,
	string | number | boolean | null | undefined
>;

export interface MessageOrCCLogEntry {
	tags: string[];
	message?: MessageRecord;
}

/** Returns the tag used to log node related messages */
export function getNodeTag(nodeId: number): string {
	return "Node " + padStart(nodeId.toString(), 3, "0");
}

export type ZWaveLogger = Omit<Logger, "log"> & {
	log: (info: ZWaveLogInfo) => void;
};

export class ZWaveLoggerBase {
	constructor(loggers: ZWaveLogContainer, logLabel: string) {
		this.container = loggers;
		this.logger = this.container.getLogger(logLabel);
	}

	public logger: ZWaveLogger;
	public container: ZWaveLogContainer;
}

export interface LogConfig {
	enabled: boolean;
	level: string | number;
	transports: Transport[];
	logToFile: boolean;
	nodeFilter?: number[];
	filename: string;
	forceConsole: boolean;
}

function stringToNodeList(nodes?: string): number[] | undefined {
	if (!nodes) return undefined;
	return nodes
		.split(",")
		.map((n) => parseInt(n))
		.filter((n) => !Number.isNaN(n));
}

export class ZWaveLogContainer extends winston.Container {
	private fileTransport: DailyRotateFile | undefined;
	private consoleTransport: ConsoleTransportInstance | undefined;
	private loglevelVisibleCache = new Map<string, boolean>();

	private logConfig: LogConfig & { level: string } = {
		enabled: true,
		level: getTransportLoglevel(),
		logToFile: !!process.env.LOGTOFILE,
		nodeFilter: stringToNodeList(process.env.LOG_NODES),
		transports: undefined as any,
		filename: require.main
			? path.join(
					path.dirname(require.main.filename),
					`zwavejs_%DATE%.log`,
			  )
			: path.join(__dirname, "../../..", `zwave_%DATE%.log`),
		forceConsole: false,
	};

	constructor(config: DeepPartial<LogConfig> = {}) {
		super();
		this.updateConfiguration(config);
	}

	public getLogger(label: string): ZWaveLogger {
		if (!this.has(label)) {
			this.add(label, {
				transports: this.getAllTransports(),
				format: createLoggerFormat(label),
				// Accept all logs, no matter what. The individual loggers take care
				// of filtering the wrong loglevels
				level: "silly",
			});
		}

		return (this.get(label) as unknown) as ZWaveLogger;
	}

	public updateConfiguration(config: DeepPartial<LogConfig>): void {
		const changedLoggingTarget =
			(config.logToFile != undefined &&
				config.logToFile !== this.logConfig.logToFile) ||
			(config.forceConsole != undefined &&
				config.forceConsole !== this.logConfig.forceConsole);

		if (typeof config.level === "number") {
			config.level = loglevelFromNumber(config.level);
		}
		const changedLogLevel =
			config.level != undefined && config.level !== this.logConfig.level;

		if (
			config.filename != undefined &&
			!config.filename.includes("%DATE%")
		) {
			config.filename += "_%DATE%.log";
		}
		const changedFilename =
			config.filename != undefined &&
			config.filename !== this.logConfig.filename;

		this.logConfig = Object.assign(this.logConfig, config);

		// If the loglevel changed, our cached "is visible" info is out of date
		if (changedLogLevel) {
			this.loglevelVisibleCache.clear();
		}

		// When the log target (console, file, filename) was changed, recreate the internal transports
		// because at least the filename does not update dynamically
		// Also do this when configuring the logger for the first time
		const recreateInternalTransports =
			(this.fileTransport == undefined &&
				this.consoleTransport == undefined) ||
			changedLoggingTarget ||
			changedFilename;

		if (recreateInternalTransports) {
			this.fileTransport?.destroy();
			this.fileTransport = undefined;
			this.consoleTransport?.destroy();
			this.consoleTransport = undefined;
		}

		// When the internal transports or the custom transports were changed, we need to update the loggers
		if (recreateInternalTransports || config.transports != undefined) {
			this.loggers.forEach((logger) =>
				logger.configure({ transports: this.getAllTransports() }),
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
			!this.fileTransport &&
			!this.consoleTransport &&
			// wotan-disable-next-line no-useless-predicate
			(!this.logConfig.transports ||
				this.logConfig.transports.length === 0)
		) {
			return false;
		}

		if (!this.loglevelVisibleCache.has(loglevel)) {
			this.loglevelVisibleCache.set(
				loglevel,
				loglevel in loglevels &&
					loglevels[loglevel] <= loglevels[this.logConfig.level],
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
		if (this.logConfig.enabled && this.logConfig.logToFile) {
			if (!this.fileTransport) {
				this.fileTransport = this.createFileTransport();
			}
			ret.push(this.fileTransport);
		} else if (!isUnitTest && (isTTY || this.logConfig.forceConsole)) {
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
			datePattern: "YYYY-MM-DD",
			zippedArchive: true,
			maxFiles: "7d",
			format: createDefaultTransportFormat(false, false),
			silent: this.isFileTransportSilent(),
		});
		ret.on("new", (newFilename: string) => {
			console.log(`Logging to file:
	${newFilename}`);
		});
		return ret;
	}

	/**
	 * Checks the log configuration whether logs should be written for a given node id
	 */
	public shouldLogNode(nodeId: number): boolean {
		// If no filters are set, every node gets logged
		if (!this.logConfig.nodeFilter) return true;
		return this.logConfig.nodeFilter.includes(nodeId);
	}
}

function getTransportLoglevel(): string {
	return process.env.LOGLEVEL! in loglevels ? process.env.LOGLEVEL! : "debug";
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
		label({ label: channel }),
		// default to short timestamps
		timestamp(),
	);
}

/** Prints a formatted and colorized log message */
export function createLogMessagePrinter(shortTimestamps: boolean): Format {
	return {
		transform: (((info: ZWaveLogInfo) => {
			// The formatter has already split the message into multiple lines
			const messageLines = messageToLines(info.message);
			// Also this can only happen if the user forgot to call the formatter first
			if (info.secondaryTagPadding == undefined)
				info.secondaryTagPadding = -1;
			// Format the first message line
			let firstLine = [
				info.primaryTags,
				messageLines[0],
				info.secondaryTagPadding < 0
					? undefined
					: " ".repeat(info.secondaryTagPadding),
				// If the secondary tag padding is zero, the previous segment gets
				// filtered out and we have one less space than necessary
				info.secondaryTagPadding === 0 && info.secondaryTags
					? " " + info.secondaryTags
					: info.secondaryTags,
			]
				.filter((item) => !!item)
				.join(" ");
			// The directional arrows and the optional grouping lines must be prepended
			// without adding spaces
			firstLine = `${info.timestamp} ${info.label} ${info.direction}${firstLine}`;
			const lines = [firstLine];
			if (info.multiline) {
				// Format all message lines but the first
				lines.push(
					...messageLines.slice(1).map(
						(line) =>
							// Skip the columns for the timestamp and the channel name
							(shortTimestamps
								? timestampPaddingShort
								: timestampPadding) +
							channelPadding +
							// Skip the columns for directional arrows
							directionPrefixPadding +
							line,
					),
				);
			}
			info[MESSAGE as any] = lines.join("\n");
			return info;
		}) as unknown) as TransformFunction,
	};
}

/** Formats the log message and calculates the necessary paddings */
export const logMessageFormatter: Format = {
	transform: (((info: ZWaveLogInfo) => {
		const messageLines = messageToLines(info.message);
		const firstMessageLineLength = messageLines[0].length;
		info.multiline =
			messageLines.length > 1 ||
			!messageFitsIntoOneLine(info, info.message.length);
		// Align postfixes to the right
		if (info.secondaryTags) {
			// Calculate how many spaces are needed to right-align the postfix
			// Subtract 1 because the parts are joined by spaces
			info.secondaryTagPadding = Math.max(
				// -1 has the special meaning that we don't print any padding,
				// because the message takes all the available space
				-1,
				LOG_WIDTH -
					1 -
					calculateFirstLineLength(info, firstMessageLineLength),
			);
		}

		if (info.multiline) {
			// Break long messages into multiple lines
			const lines: string[] = [];
			let isFirstLine = true;
			for (let message of messageLines) {
				while (message.length) {
					const cut = Math.min(
						message.length,
						isFirstLine
							? LOG_WIDTH - calculateFirstLineLength(info, 0) - 1
							: LOG_WIDTH - CONTROL_CHAR_WIDTH,
					);
					isFirstLine = false;
					lines.push(message.substr(0, cut));
					message = message.substr(cut);
				}
			}
			info.message = lines.join("\n");
		}
		return info;
	}) as unknown) as TransformFunction,
};

/** The common logger format for built-in transports */
export function createDefaultTransportFormat(
	colorize: boolean,
	shortTimestamps: boolean,
): Format {
	const formats: Format[] = [
		// overwrite the default timestamp format if necessary
		shortTimestamps
			? timestamp({ format: timestampFormatShort })
			: undefined,
		logMessageFormatter,
		colorize ? colorizer() : undefined,
		createLogMessagePrinter(shortTimestamps),
	].filter((f): f is Format => !!f);
	return combine(...formats);
}

/**
 * Calculates the length the first line of a log message would occupy if it is not split
 * @param info The message and information to log
 * @param firstMessageLineLength The length of the first line of the actual message text, not including pre- and postfixes.
 */
function calculateFirstLineLength(
	info: ZWaveLogInfo,
	firstMessageLineLength: number,
): number {
	return (
		[
			CONTROL_CHAR_WIDTH - 1,
			firstMessageLineLength,
			(info.primaryTags || "").length,
			(info.secondaryTags || "").length,
		]
			// filter out empty parts
			.filter((len) => len > 0)
			// simulate adding spaces between parts
			.reduce((prev, val) => prev + (prev > 0 ? 1 : 0) + val)
	);
}

/**
 * Tests if a given message fits into a single log line
 * @param info The message that should be logged
 * @param messageLength The length that should be assumed for the actual message without pre and postfixes.
 * Can be set to 0 to exclude the message from the calculation
 */
export function messageFitsIntoOneLine(
	info: ZWaveLogInfo,
	messageLength: number,
): boolean {
	const totalLength = calculateFirstLineLength(info, messageLength);
	return totalLength <= LOG_WIDTH;
}

export function messageToLines(message: string | string[]): string[] {
	if (typeof message === "string") {
		return message.split("\n");
	} else if (message.length > 0) {
		return message;
	} else {
		return [""];
	}
}

/** Splits a message record into multiple lines and auto-aligns key-value pairs */
export function messageRecordToLines(message: MessageRecord): string[] {
	const entries = Object.entries(message);
	if (!entries.length) return [];

	const maxKeyLength = Math.max(...entries.map(([key]) => key.length));
	return flatMap(entries, ([key, value]) =>
		`${key}:${" ".repeat(
			Math.max(maxKeyLength - key.length + 1, 1),
		)}${value}`
			.split("\n")
			.map((line) => line.trimRight()),
	);
}

/** Wraps an array of strings in square brackets and joins them with spaces */
export function tagify(tags: string[]): string {
	return tags.map((pfx) => `[${pfx}]`).join(" ");
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
