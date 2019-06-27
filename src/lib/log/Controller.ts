import { padStart } from "alcalzone-shared/strings";
import * as winston from "winston";
import { CommandClasses } from "../commandclass/CommandClasses";
import { InterviewStage, ZWaveNode } from "../node/Node";
import {
	ValueAddedArgs,
	ValueBaseArgs,
	ValueRemovedArgs,
	ValueUpdatedArgs,
} from "../node/ValueDB";
import {
	createLoggerFormat,
	DataDirection,
	getDirectionPrefix,
	tagify,
	ZWaveLogger,
} from "./shared";

const CONTROLLER_LABEL = "CONTROLLER";
const CONTROLLER_LOGLEVEL = "info";

export const controllerLoggerFormat = createLoggerFormat(CONTROLLER_LABEL);

if (!winston.loggers.has("controller")) {
	winston.loggers.add("controller", {
		format: controllerLoggerFormat,
		transports: [
			new winston.transports.Console({
				level: "silly",
				silent: process.env.NODE_ENV === "test",
			}),
		],
	});
}
const logger: ZWaveLogger = winston.loggers.get("controller");

/**
 * Logs a message
 * @param msg The message to output
 */
export function print(message: string, level?: "warn" | "error"): void {
	logger.log({
		level: level || CONTROLLER_LOGLEVEL,
		message,
		direction: getDirectionPrefix("none"),
	});
}

export interface LogNodeOptions {
	message: string;
	level?: "warn" | "error";
	direction?: DataDirection;
}

/**
 * Logs a node-related message with the correct prefix
 * @param message The message to output
 * @param level The optional loglevel if it should be different from "info"
 */
export function logNode(
	node: ZWaveNode,
	message: string,
	level?: "warn" | "error",
): void;
/**
 * Logs a node-related message with the correct prefix
 * @param node The node to log the message for
 * @param options The message and other options
 */
export function logNode(node: ZWaveNode, options: LogNodeOptions): void;
export function logNode(
	node: ZWaveNode,
	messageOrOptions: string | LogNodeOptions,
	logLevel?: "warn" | "error",
): void {
	if (typeof messageOrOptions === "string") {
		return logNode(node, { message: messageOrOptions, level: logLevel });
	}

	const { level, message, direction } = messageOrOptions;

	logger.log({
		level: level || CONTROLLER_LOGLEVEL,
		primaryTags: tagify([getNodeTag(node)]),
		message,
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

export function value(change: "added", args: ValueAddedArgs): void;
export function value(change: "updated", args: ValueUpdatedArgs): void;
export function value(change: "removed", args: ValueRemovedArgs): void;
export function value(
	change: "added" | "updated" | "removed",
	args: ValueBaseArgs,
): void {
	const primaryTags: string[] = [
		valueEventPrefixes[change],
		CommandClasses[args.commandClass],
	];
	const secondaryTags: string[] = [];
	if (args.endpoint != undefined) {
		secondaryTags.push(`Endpoint ${args.endpoint}`);
	}
	let message = args.propertyName;
	if (args.propertyKey != undefined) {
		message += `[${args.propertyKey}]`;
	}
	switch (change) {
		case "added":
			message += `: ${formatValue((args as ValueAddedArgs).newValue)}`;
			break;
		case "updated":
			message += `: ${formatValue(
				(args as ValueUpdatedArgs).prevValue,
			)} => ${formatValue((args as ValueUpdatedArgs).newValue)}`;
			break;
		case "removed":
			message += ` (was ${formatValue(
				(args as ValueRemovedArgs).prevValue,
			)})`;
			break;
	}
	logger.log({
		level: CONTROLLER_LOGLEVEL,
		primaryTags: tagify(primaryTags),
		secondaryTags: tagify(secondaryTags),
		message,
		direction: getDirectionPrefix("none"),
	});
}

/** Returns the tag used to log node related messages */
function getNodeTag(node: ZWaveNode): string {
	return "Node " + padStart(node.id.toString(), 3, "0");
}

/** Logs the interview progress of a node */
export function interviewStage(node: ZWaveNode): void {
	logger.log({
		level: CONTROLLER_LOGLEVEL,
		primaryTags: tagify([getNodeTag(node)]),
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
	const message = `Beginning interview - last completed stage: ${
		InterviewStage[node.interviewStage]
	}`;
	logger.log({
		level: CONTROLLER_LOGLEVEL,
		primaryTags: tagify([getNodeTag(node)]),
		message,
		direction: getDirectionPrefix("none"),
	});
}
