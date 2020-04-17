import winston from "winston";
import { CommandClasses } from "../commandclass/CommandClasses";
import type { ZWaveNode } from "../node/Node";
import { InterviewStage } from "../node/Types";
import type {
	ValueAddedArgs,
	ValueID,
	ValueRemovedArgs,
	ValueUpdatedArgs,
} from "../node/ValueDB";
import {
	createLogTransports,
	DataDirection,
	getDirectionPrefix,
	getNodeTag,
	isLoglevelVisible,
	shouldLogNode,
	tagify,
	ZWaveLogger,
} from "./shared";

export const CONTROLLER_LABEL = "CNTRLR";
const CONTROLLER_LOGLEVEL = "info";
const VALUE_LOGLEVEL = "debug";

if (!winston.loggers.has("controller")) {
	winston.loggers.add("controller", {
		transports: createLogTransports(CONTROLLER_LABEL),
	});
}
const logger = (winston.loggers.get("controller") as unknown) as ZWaveLogger;
const isValueLogVisible = isLoglevelVisible(VALUE_LOGLEVEL);
const isControllerLogVisible = isLoglevelVisible(CONTROLLER_LOGLEVEL);

/**
 * Logs a message
 * @param msg The message to output
 */
export function print(message: string, level?: "warn" | "error"): void {
	const actualLevel = level || CONTROLLER_LOGLEVEL;
	if (!isLoglevelVisible(actualLevel)) return;

	logger.log({
		level: actualLevel,
		message,
		direction: getDirectionPrefix("none"),
	});
}

interface LogNodeOptions {
	message: string;
	level?: "warn" | "error";
	direction?: DataDirection;
	endpoint?: number;
}

/**
 * Logs a node-related message with the correct prefix
 * @param message The message to output
 * @param level The optional loglevel if it should be different from "info"
 */
export function logNode(
	nodeId: number,
	message: string,
	level?: "warn" | "error",
): void;
/**
 * Logs a node-related message with the correct prefix
 * @param node The node to log the message for
 * @param options The message and other options
 */
export function logNode(nodeId: number, options: LogNodeOptions): void;
export function logNode(
	nodeId: number,
	messageOrOptions: string | LogNodeOptions,
	logLevel?: "warn" | "error",
): void {
	if (typeof messageOrOptions === "string") {
		return logNode(nodeId, { message: messageOrOptions, level: logLevel });
	}

	const { level, message, direction, endpoint } = messageOrOptions;
	const actualLevel = level || CONTROLLER_LOGLEVEL;
	if (!isLoglevelVisible(actualLevel)) return;
	if (!shouldLogNode(nodeId)) return;

	logger.log({
		level: actualLevel,
		primaryTags: tagify([getNodeTag(nodeId)]),
		message,
		secondaryTags: endpoint ? tagify([`Endpoint ${endpoint}`]) : undefined,
		direction: getDirectionPrefix(direction || "none"),
	});
}

const valueEventPrefixes = Object.freeze({
	added: "+",
	updated: "~",
	removed: "-",
});

function formatValue(value: any): string {
	if (typeof value !== "string") return `${value}`;
	return `"${value}"`;
}

export type LogValueArgs<T> = T & { nodeId: number; internal?: boolean };

/** Prints a log message for an added, updated or removed value */
export function value(
	change: "added",
	args: LogValueArgs<ValueAddedArgs>,
): void;
export function value(
	change: "updated",
	args: LogValueArgs<ValueUpdatedArgs>,
): void;
export function value(
	change: "removed",
	args: LogValueArgs<ValueRemovedArgs>,
): void;
export function value(
	change: "added" | "updated" | "removed",
	args: LogValueArgs<ValueID>,
): void {
	if (!isValueLogVisible) return;

	const primaryTags: string[] = [
		getNodeTag(args.nodeId),
		valueEventPrefixes[change],
		CommandClasses[args.commandClass],
	];
	const secondaryTags: string[] = [];
	if (args.endpoint != undefined) {
		secondaryTags.push(`Endpoint ${args.endpoint}`);
	}
	if (args.internal === true) {
		secondaryTags.push("internal");
	}
	let message = args.property.toString();
	if (args.propertyKey != undefined) {
		message += `[${args.propertyKey}]`;
	}
	switch (change) {
		case "added":
			message += `: ${formatValue(
				((args as unknown) as ValueAddedArgs).newValue,
			)}`;
			break;
		case "updated": {
			const _args = (args as unknown) as ValueUpdatedArgs;
			message += `: ${formatValue(_args.prevValue)} => ${formatValue(
				_args.newValue,
			)}`;
			break;
		}
		case "removed":
			message += ` (was ${formatValue(
				((args as unknown) as ValueRemovedArgs).prevValue,
			)})`;
			break;
	}
	logger.log({
		level: VALUE_LOGLEVEL,
		primaryTags: tagify(primaryTags),
		secondaryTags: tagify(secondaryTags),
		message,
		direction: getDirectionPrefix("none"),
	});
}

/** Prints a log message for updated metadata of a value id */
export function metadataUpdated(args: LogValueArgs<ValueID>): void {
	if (!isValueLogVisible) return;

	const primaryTags: string[] = [
		getNodeTag(args.nodeId),
		CommandClasses[args.commandClass],
	];
	const secondaryTags: string[] = [];
	if (args.endpoint != undefined) {
		secondaryTags.push(`Endpoint ${args.endpoint}`);
	}
	if (args.internal === true) {
		secondaryTags.push("internal");
	}
	let message = args.property.toString();
	if (args.propertyKey != undefined) {
		message += `[${args.propertyKey}]`;
	}
	message += ": metadata updated";
	logger.log({
		level: VALUE_LOGLEVEL,
		primaryTags: tagify(primaryTags),
		secondaryTags: tagify(secondaryTags),
		message,
		direction: getDirectionPrefix("none"),
	});
}

/** Logs the interview progress of a node */
export function interviewStage(node: ZWaveNode): void {
	if (!isControllerLogVisible) return;
	if (!shouldLogNode(node.id)) return;

	logger.log({
		level: CONTROLLER_LOGLEVEL,
		primaryTags: tagify([getNodeTag(node.id)]),
		message:
			node.interviewStage === InterviewStage.Complete
				? "Interview completed"
				: `Interview stage completed: ${
						InterviewStage[node.interviewStage]
				  }`,
		direction: getDirectionPrefix("none"),
	});
}

/** Logs the interview progress of a node */
export function interviewStart(node: ZWaveNode): void {
	if (!isControllerLogVisible) return;
	if (!shouldLogNode(node.id)) return;

	const message = `Beginning interview - last completed stage: ${
		InterviewStage[node.interviewStage]
	}`;
	logger.log({
		level: CONTROLLER_LOGLEVEL,
		primaryTags: tagify([getNodeTag(node.id)]),
		message,
		direction: getDirectionPrefix("none"),
	});
}
