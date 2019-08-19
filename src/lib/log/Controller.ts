import { padStart } from "alcalzone-shared/strings";
import winston from "winston";
import { CommandClasses } from "../commandclass/CommandClasses";
import { InterviewStage, IZWaveNode } from "../node/INode";
import {
	ValueAddedArgs,
	ValueID,
	ValueRemovedArgs,
	ValueUpdatedArgs,
} from "../node/ValueDB";
import {
	createConsoleTransport,
	createLoggerFormat,
	DataDirection,
	getDirectionPrefix,
	tagify,
	ZWaveLogger,
} from "./shared";

const CONTROLLER_LABEL = "CNTRLR";
const CONTROLLER_LOGLEVEL = "info";

export const controllerLoggerFormat = createLoggerFormat(CONTROLLER_LABEL);

if (!winston.loggers.has("controller")) {
	winston.loggers.add("controller", {
		format: controllerLoggerFormat,
		transports: [createConsoleTransport()],
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

interface LogNodeOptions {
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

	const { level, message, direction } = messageOrOptions;

	logger.log({
		level: level || CONTROLLER_LOGLEVEL,
		primaryTags: tagify([getNodeTag(nodeId)]),
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

export type LogValueArgs<T> = T & { nodeId: number; internal?: boolean };

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
	let message = args.propertyName;
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
		level: CONTROLLER_LOGLEVEL,
		primaryTags: tagify(primaryTags),
		secondaryTags: tagify(secondaryTags),
		message,
		direction: getDirectionPrefix("none"),
	});
}

/** Returns the tag used to log node related messages */
function getNodeTag(nodeId: number): string {
	return "Node " + padStart(nodeId.toString(), 3, "0");
}

/** Logs the interview progress of a node */
export function interviewStage(node: IZWaveNode): void {
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
export function interviewStart(node: IZWaveNode): void {
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
