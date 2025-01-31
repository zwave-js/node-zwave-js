import type { TransformableInfo } from "logform";
import type Transport from "winston-transport";
import { type LogContainer } from "./traits.js";

export const timestampFormatShort = "HH:mm:ss.SSS";
export const timestampPaddingShort = " ".repeat(
	timestampFormatShort.length + 1,
);
export const timestampPadding = " ".repeat(new Date().toISOString().length + 1);
/** @internal */
export const channelPadding = " ".repeat(7); // 6 chars channel name, 1 space

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

export interface ZWaveLogInfo<TContext extends LogContext = LogContext>
	extends Omit<TransformableInfo, "message">
{
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
	context: TContext;
}

export interface LogContext<T extends string = string> {
	/** Which logger this log came from */
	source: T;
	/** An optional identifier to distinguish different log types from the same logger */
	type?: string;
}

export type MessageRecord = Record<string, string | number | boolean>;

export interface MessageOrCCLogEntry {
	tags: string[];
	message?: MessageRecord;
}

/** Returns the tag used to log node related messages */
export function getNodeTag(nodeId: number): string {
	return "Node " + nodeId.toString().padStart(3, "0");
}

/** @internal */
export function stringToNodeList(nodes?: string): number[] | undefined {
	if (!nodes) return undefined;
	return nodes
		.split(",")
		.map((n) => parseInt(n))
		.filter((n) => !Number.isNaN(n));
}

/** Wraps an array of strings in square brackets and joins them with spaces */
export function tagify(tags: string[]): string {
	return tags.map((pfx) => `[${pfx}]`).join(" ");
}

/**
 * Calculates the length the first line of a log message would occupy if it is not split
 * @param info The message and information to log
 * @param firstMessageLineLength The length of the first line of the actual message text, not including pre- and postfixes.
 */
export function calculateFirstLineLength(
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
	return entries.flatMap(([key, value]) =>
		`${key}:${
			" ".repeat(
				Math.max(maxKeyLength - key.length + 1, 1),
			)
		}${value}`
			.split("\n")
			.map((line) => line.trimEnd())
	);
}
export interface LogConfig {
	enabled: boolean;
	level: string | number;
	transports: Transport[];
	logToFile: boolean;
	maxFiles: number;
	nodeFilter?: number[];
	filename: string;
	forceConsole: boolean;
}

/** @internal */
export const nonUndefinedLogConfigKeys = [
	"enabled",
	"level",
	"transports",
	"logToFile",
	"maxFiles",
	"filename",
	"forceConsole",
] as const;

export type LogFactory = (config?: Partial<LogConfig>) => LogContainer;
