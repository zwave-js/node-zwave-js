import { DeepPartial, flatMap } from "@zwave-js/shared";
import { padStart } from "alcalzone-shared/strings";
import type { Format, TransformableInfo, TransformFunction } from "logform";
import * as path from "path";
import { configs, MESSAGE } from "triple-beam";
import winston, { Logger } from "winston";
import type Transport from "winston-transport";
import { colorizer } from "./Colorizer";

const { combine, timestamp, label } = winston.format;

const loglevels = configs.npm.levels;
const isTTY = process.stdout.isTTY;
const isUnitTest = process.env.NODE_ENV === "test";

export const timestampFormat = "HH:mm:ss.SSS";
const timestampPadding = " ".repeat(timestampFormat.length + 1);
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
	level: number;
	transports: Transport[];
	logToFile: boolean;
	filename: string;
	forceConsole: boolean;
}

export class ZWaveLogContainer extends winston.Container {
	private fileTransport: Transport | undefined;
	private consoleTransport: Transport | undefined;
	private loglevelVisibleCache = new Map<string, boolean>();

	private logConfig: LogConfig = {
		enabled: true,
		level: getTransportLoglevelNumeric(),
		logToFile: !!process.env.LOGTOFILE,
		transports: undefined as any,
		filename: require.main
			? path.join(
					path.dirname(require.main.filename),
					`zwave-${process.pid}.log`,
			  )
			: path.join(__dirname, "../../..", `zwave-${process.pid}.log`),
		forceConsole: false,
	};

	constructor(config: DeepPartial<LogConfig> = {}) {
		super();
		this.updateConfiguration(config);
	}

	public getLogger(label: string): ZWaveLogger {
		if (!this.has(label)) {
			this.add(label, {
				transports: this.getConfiguredTransports(),
				format: this.createLoggerFormat(label),
			});
		}

		return (this.get(label) as unknown) as ZWaveLogger;
	}

	public updateConfiguration(config: DeepPartial<LogConfig>): void {
		this.logConfig = Object.assign(this.logConfig, config);
		if (!this.logConfig.transports?.length) {
			this.logConfig.transports = this.createLogTransports();
		}

		for (const transport of this.logConfig.transports) {
			if (transport === this.consoleTransport) {
				transport.silent = this.isConsoleTransportSilent();
			} else if (transport === this.fileTransport) {
				transport.silent = this.isFileTransportSilent();
			} else {
				transport.silent = !this.logConfig.enabled;
			}
		}
	}

	public getConfiguredTransports(): Transport[] {
		return this.logConfig.transports;
	}

	/** The common logger format for all channels */
	public createLoggerFormat(channel: string): Format {
		// Only colorize the output if logging to a TTY, otherwise we'll get
		// ansi color codes in logfiles
		const colorize = !this.logConfig.logToFile && (isTTY || isUnitTest);
		const formats: Format[] = [];
		formats.push(
			label({ label: channel }),
			timestamp({ format: timestampFormat }),
			this.logMessageFormatter,
		);
		if (colorize) formats.push(colorizer());
		formats.push(this.logMessagePrinter);

		return combine(...formats);
	}

	/** Prints a formatted and colorized log message */
	public logMessagePrinter: Format = {
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
							timestampPadding +
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

	/** Formats the log message and calculates the necessary paddings */
	public logMessageFormatter: Format = {
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
								? LOG_WIDTH -
										calculateFirstLineLength(info, 0) -
										1
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

	/** Tests whether a log using the given loglevel will be logged */
	public isLoglevelVisible(loglevel: string): boolean {
		// If we are not connected to a TTY, not unit testing and not logging to a file, we won't see anything
		if (isUnitTest) return true;
		if (!isTTY && !this.logConfig.logToFile && !this.logConfig.forceConsole)
			return false;

		if (!this.loglevelVisibleCache.has(loglevel)) {
			this.loglevelVisibleCache.set(
				loglevel,
				loglevel in loglevels &&
					loglevels[loglevel] <= this.logConfig.level,
			);
		}
		return this.loglevelVisibleCache.get(loglevel)!;
	}

	private createLogTransports(): Transport[] {
		const ret: Transport[] = [];
		if (this.logConfig.logToFile && this.logConfig.enabled) {
			if (!this.fileTransport) {
				console.log(`Logging to file:
	${this.logConfig.filename}`);
				this.fileTransport = this.createFileTransport();
			}
			ret.push(this.fileTransport);
		} else {
			if (!this.consoleTransport) {
				this.consoleTransport = this.createConsoleTransport();
			}
			ret.push(this.consoleTransport);
		}
		return ret;
	}

	private createConsoleTransport(): Transport {
		return new winston.transports.Console({
			level: getTransportLoglevel(),
			silent: this.isConsoleTransportSilent(),
		});
	}

	private isConsoleTransportSilent(): boolean {
		return process.env.NODE_ENV === "test" || !this.logConfig.enabled;
	}

	private isFileTransportSilent(): boolean {
		return !this.logConfig.enabled;
	}

	private createFileTransport(): Transport {
		return new winston.transports.File({
			filename: this.logConfig.filename,
			level: getTransportLoglevel(),
			silent: this.isFileTransportSilent(),
		});
	}
}

function getTransportLoglevel(): string {
	return process.env.LOGLEVEL! in loglevels ? process.env.LOGLEVEL! : "debug";
}
function getTransportLoglevelNumeric(): number {
	return loglevels[getTransportLoglevel()];
}

/**
 * Checks the LOG_NODES env variable whether logs should be written for a given node id
 */
export function shouldLogNode(nodeId: number): boolean {
	const activeFilters = (process.env.LOG_NODES ?? "*").split(",");
	if (activeFilters.includes("*")) return true;
	if (activeFilters.includes(nodeId.toString())) return true;
	return false;
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
