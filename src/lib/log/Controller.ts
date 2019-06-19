import * as winston from "winston";
import { CommandClasses } from "../commandclass/CommandClasses";
import {
	ValueAddedArgs,
	ValueBaseArgs,
	ValueRemovedArgs,
	ValueUpdatedArgs,
} from "../node/ValueDB";
import { colorizer } from "./Colorizer";
import {
	getDirectionPrefix,
	logMessageFormatter,
	logMessagePrinter,
	tagify,
	ZWaveLogger,
} from "./shared";
const { combine, timestamp, label } = winston.format;

const CONTROLLER_LABEL = "CONTROLLER";
const CONTROLLER_LOGLEVEL = "info";

export const controllerLoggerFormat = combine(
	label({ label: CONTROLLER_LABEL }),
	timestamp(),
	logMessageFormatter,
	colorizer(),
	logMessagePrinter,
);

if (!winston.loggers.has("controller")) {
	winston.loggers.add("controller", {
		format: controllerLoggerFormat,
		// transports: [new winston.transports.Console({ level: "silly" })],
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
