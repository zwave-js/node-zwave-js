import {
	CommandClasses,
	DataDirection,
	getDirectionPrefix,
	getNodeTag,
	tagify,
	ValueAddedArgs,
	ValueID,
	ValueNotificationArgs,
	ValueRemovedArgs,
	ValueUpdatedArgs,
	ZWaveLogContainer,
	ZWaveLoggerBase,
} from "@zwave-js/core";
import { isObject } from "alcalzone-shared/typeguards";
import type { ZWaveNode } from "../node/Node";
import { InterviewStage } from "../node/Types";

export const CONTROLLER_LABEL = "CNTRLR";
const CONTROLLER_LOGLEVEL = "info";
const VALUE_LOGLEVEL = "debug";

interface LogNodeOptions {
	message: string;
	level?: "verbose" | "warn" | "error";
	direction?: DataDirection;
	endpoint?: number;
}

export type LogValueArgs<T> = T & { nodeId: number; internal?: boolean };

export class ControllerLogger extends ZWaveLoggerBase {
	constructor(loggers: ZWaveLogContainer) {
		super(loggers, CONTROLLER_LABEL);
	}

	private isValueLogVisible(): boolean {
		return this.container.isLoglevelVisible(VALUE_LOGLEVEL);
	}

	private isControllerLogVisible(): boolean {
		return this.container.isLoglevelVisible(CONTROLLER_LOGLEVEL);
	}

	/**
	 * Logs a message
	 * @param msg The message to output
	 */
	public print(message: string, level?: "verbose" | "warn" | "error"): void {
		const actualLevel = level || CONTROLLER_LOGLEVEL;
		if (!this.container.isLoglevelVisible(actualLevel)) return;

		this.logger.log({
			level: actualLevel,
			message,
			direction: getDirectionPrefix("none"),
		});
	}

	/**
	 * Logs a node-related message with the correct prefix
	 * @param message The message to output
	 * @param level The optional loglevel if it should be different from "info"
	 */
	public logNode(
		nodeId: number,
		message: string,
		level?: "verbose" | "warn" | "error",
	): void;

	/**
	 * Logs a node-related message with the correct prefix
	 * @param node The node to log the message for
	 * @param options The message and other options
	 */
	public logNode(nodeId: number, options: LogNodeOptions): void;
	public logNode(
		nodeId: number,
		messageOrOptions: string | LogNodeOptions,
		logLevel?: "verbose" | "warn" | "error",
	): void {
		if (typeof messageOrOptions === "string") {
			return this.logNode(nodeId, {
				message: messageOrOptions,
				level: logLevel,
			});
		}

		const { level, message, direction, endpoint } = messageOrOptions;
		const actualLevel = level || CONTROLLER_LOGLEVEL;
		if (!this.container.isLoglevelVisible(actualLevel)) return;
		if (!this.container.shouldLogNode(nodeId)) return;

		this.logger.log({
			level: actualLevel,
			primaryTags: tagify([getNodeTag(nodeId)]),
			message,
			secondaryTags: endpoint
				? tagify([`Endpoint ${endpoint}`])
				: undefined,
			direction: getDirectionPrefix(direction || "none"),
		});
	}

	valueEventPrefixes = Object.freeze({
		added: "+",
		updated: "~",
		removed: "-",
		notification: "!",
	});

	private formatValue(value: unknown): string {
		if (isObject(value)) return JSON.stringify(value);
		if (typeof value !== "string") return String(value);
		return `"${value}"`;
	}

	/** Prints a log message for an added, updated or removed value */
	public value(change: "added", args: LogValueArgs<ValueAddedArgs>): void;
	public value(change: "updated", args: LogValueArgs<ValueUpdatedArgs>): void;
	public value(change: "removed", args: LogValueArgs<ValueRemovedArgs>): void;
	public value(
		change: "notification",
		args: LogValueArgs<ValueNotificationArgs>,
	): void;
	public value(
		change: "added" | "updated" | "removed" | "notification",
		args: LogValueArgs<ValueID>,
	): void {
		if (!this.isValueLogVisible()) return;
		if (!this.container.shouldLogNode(args.nodeId)) return;

		const primaryTags: string[] = [
			getNodeTag(args.nodeId),
			this.valueEventPrefixes[change],
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
				message += `: ${this.formatValue(
					((args as unknown) as ValueAddedArgs).newValue,
				)}`;
				break;
			case "updated": {
				const _args = (args as unknown) as ValueUpdatedArgs;
				message += `: ${this.formatValue(
					_args.prevValue,
				)} => ${this.formatValue(_args.newValue)}`;
				break;
			}
			case "removed":
				message += ` (was ${this.formatValue(
					((args as unknown) as ValueRemovedArgs).prevValue,
				)})`;
				break;
			case "notification":
				message += `: ${this.formatValue(
					((args as unknown) as ValueNotificationArgs).value,
				)}`;
				break;
		}
		this.logger.log({
			level: VALUE_LOGLEVEL,
			primaryTags: tagify(primaryTags),
			secondaryTags: tagify(secondaryTags),
			message,
			direction: getDirectionPrefix("none"),
		});
	}

	/** Prints a log message for updated metadata of a value id */
	public metadataUpdated(args: LogValueArgs<ValueID>): void {
		if (!this.isValueLogVisible()) return;
		if (!this.container.shouldLogNode(args.nodeId)) return;

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
		this.logger.log({
			level: VALUE_LOGLEVEL,
			primaryTags: tagify(primaryTags),
			secondaryTags: tagify(secondaryTags),
			message,
			direction: getDirectionPrefix("none"),
		});
	}

	/** Logs the interview progress of a node */
	public interviewStage(node: ZWaveNode): void {
		if (!this.isControllerLogVisible()) return;
		if (!this.container.shouldLogNode(node.id)) return;

		this.logger.log({
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
	public interviewStart(node: ZWaveNode): void {
		if (!this.isControllerLogVisible()) return;
		if (!this.container.shouldLogNode(node.id)) return;

		const message = `Beginning interview - last completed stage: ${
			InterviewStage[node.interviewStage]
		}`;
		this.logger.log({
			level: CONTROLLER_LOGLEVEL,
			primaryTags: tagify([getNodeTag(node.id)]),
			message,
			direction: getDirectionPrefix("none"),
		});
	}
}
