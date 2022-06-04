import { padStart } from "alcalzone-shared/strings";
import type { TransformableInfo } from "logform";
import type { Logger } from "winston";
import type Transport from "winston-transport";
import type { ValueID } from "../values/_Types";

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
	extends Omit<TransformableInfo, "message"> {
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

export type NodeLogContext = LogContext & { nodeId: number; type: "node" };
export type ValueLogContext = LogContext &
	ValueID & { nodeId: number; type: "value" };

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

export type ZWaveLogger<TContext extends LogContext = LogContext> = Omit<
	Logger,
	"log"
> & {
	log: <T extends TContext>(info: ZWaveLogInfo<T>) => void;
};

export interface LogConfig {
	enabled: boolean;
	level: string | number;
	transports: Transport[];
	logToFile: boolean;
	nodeFilter?: number[];
	filename: string;
	forceConsole: boolean;
}

/** @internal */
export function stringToNodeList(nodes?: string): number[] | undefined {
	if (!nodes) return undefined;
	return nodes
		.split(",")
		.map((n) => parseInt(n))
		.filter((n) => !Number.isNaN(n));
}
