import { isObject } from "alcalzone-shared/typeguards";
import { CommandClasses } from "../capabilities/CommandClasses";
import { InterviewStage } from "../consts/InterviewStage";
import type {
	ValueAddedArgs,
	ValueID,
	ValueNotificationArgs,
	ValueRemovedArgs,
	ValueUpdatedArgs,
} from "../values/_Types";
import { tagify, ZWaveLogContainer, ZWaveLoggerBase } from "./shared";
import {
	DataDirection,
	getDirectionPrefix,
	getNodeTag,
	LogContext,
	NodeLogContext,
	ValueLogContext,
} from "./shared_safe";

export const CONTROLLER_LABEL = "CNTRLR";
const CONTROLLER_LOGLEVEL = "info";
const VALUE_LOGLEVEL = "debug";

export interface LogNodeOptions {
	message: string;
	level?: "debug" | "verbose" | "warn" | "error";
	direction?: DataDirection;
	endpoint?: number;
}

export interface Interviewable {
	id: number;
	interviewStage: InterviewStage;
}

export type ControllerNodeLogContext = LogContext<"controller"> &
	NodeLogContext & { endpoint?: number; direction: string };

export type ControllerValueLogContext = LogContext<"controller"> &
	ValueLogContext & {
		direction?: string;
		change?: "added" | "updated" | "removed" | "notification";
		internal?: boolean;
	};

export type ControllerSelfLogContext = LogContext<"controller"> & {
	type: "controller";
};

export type ControllerLogContext =
	| ControllerSelfLogContext
	| ControllerNodeLogContext
	| ControllerValueLogContext;

export type LogValueArgs<T> = T & { nodeId: number; internal?: boolean };

export class ControllerLogger extends ZWaveLoggerBase<ControllerLogContext> {
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
	 * @param message The message to output
	 */
	public print(message: string, level?: "verbose" | "warn" | "error"): void {
		const actualLevel = level || CONTROLLER_LOGLEVEL;
		if (!this.container.isLoglevelVisible(actualLevel)) return;

		this.logger.log({
			level: actualLevel,
			message,
			direction: getDirectionPrefix("none"),
			context: { source: "controller", type: "controller" },
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
		level?: "debug" | "verbose" | "warn" | "error",
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
		logLevel?: "debug" | "verbose" | "warn" | "error",
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

		const context: ControllerNodeLogContext = {
			nodeId,
			source: "controller",
			type: "node",
			direction: direction || "none",
		};
		if (endpoint) context.endpoint = endpoint;

		this.logger.log({
			level: actualLevel,
			primaryTags: tagify([getNodeTag(nodeId)]),
			message,
			secondaryTags: endpoint
				? tagify([`Endpoint ${endpoint}`])
				: undefined,
			direction: getDirectionPrefix(direction || "none"),
			context,
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
		const context: ControllerValueLogContext = {
			nodeId: args.nodeId,
			change,
			commandClass: args.commandClass,
			internal: args.internal,
			property: args.property,
			source: "controller",
			type: "value",
		};
		const primaryTags: string[] = [
			getNodeTag(args.nodeId),
			this.valueEventPrefixes[change],
			CommandClasses[args.commandClass],
		];
		const secondaryTags: string[] = [];
		if (args.endpoint != undefined) {
			context.endpoint = args.endpoint;
			secondaryTags.push(`Endpoint ${args.endpoint}`);
		}
		if (args.internal === true) {
			secondaryTags.push("internal");
		}
		let message = args.property.toString();
		if (args.propertyKey != undefined) {
			context.propertyKey = args.propertyKey;
			message += `[${args.propertyKey}]`;
		}
		switch (change) {
			case "added":
				message += `: ${this.formatValue(
					(args as unknown as ValueAddedArgs).newValue,
				)}`;
				break;
			case "updated": {
				const _args = args as unknown as ValueUpdatedArgs;
				message += `: ${this.formatValue(
					_args.prevValue,
				)} => ${this.formatValue(_args.newValue)}`;
				break;
			}
			case "removed":
				message += ` (was ${this.formatValue(
					(args as unknown as ValueRemovedArgs).prevValue,
				)})`;
				break;
			case "notification":
				message += `: ${this.formatValue(
					(args as unknown as ValueNotificationArgs).value,
				)}`;
				break;
		}
		this.logger.log({
			level: VALUE_LOGLEVEL,
			primaryTags: tagify(primaryTags),
			secondaryTags: tagify(secondaryTags),
			message,
			direction: getDirectionPrefix("none"),
			context,
		});
	}

	/** Prints a log message for updated metadata of a value id */
	public metadataUpdated(args: LogValueArgs<ValueID>): void {
		if (!this.isValueLogVisible()) return;
		if (!this.container.shouldLogNode(args.nodeId)) return;
		const context: ControllerValueLogContext = {
			nodeId: args.nodeId,
			commandClass: args.commandClass,
			internal: args.internal,
			property: args.property,
			source: "controller",
			type: "value",
		};
		const primaryTags: string[] = [
			getNodeTag(args.nodeId),
			CommandClasses[args.commandClass],
		];
		const secondaryTags: string[] = [];
		if (args.endpoint != undefined) {
			context.endpoint = args.endpoint;
			secondaryTags.push(`Endpoint ${args.endpoint}`);
		}
		if (args.internal === true) {
			secondaryTags.push("internal");
		}
		let message = args.property.toString();
		if (args.propertyKey != undefined) {
			context.propertyKey = args.propertyKey;
			message += `[${args.propertyKey}]`;
		}
		message += ": metadata updated";
		this.logger.log({
			level: VALUE_LOGLEVEL,
			primaryTags: tagify(primaryTags),
			secondaryTags: tagify(secondaryTags),
			message,
			direction: getDirectionPrefix("none"),
			context,
		});
	}

	/** Logs the interview progress of a node */
	public interviewStage(node: Interviewable): void {
		if (!this.isControllerLogVisible()) return;
		if (!this.container.shouldLogNode(node.id)) return;

		this.logger.log<ControllerNodeLogContext>({
			level: CONTROLLER_LOGLEVEL,
			primaryTags: tagify([getNodeTag(node.id)]),
			message:
				node.interviewStage === InterviewStage.Complete
					? "Interview completed"
					: `Interview stage completed: ${
							InterviewStage[node.interviewStage]
					  }`,
			direction: getDirectionPrefix("none"),
			context: {
				nodeId: node.id,
				source: "controller",
				type: "node",
				direction: "none",
			},
		});
	}

	/** Logs the interview progress of a node */
	public interviewStart(node: Interviewable): void {
		if (!this.isControllerLogVisible()) return;
		if (!this.container.shouldLogNode(node.id)) return;

		const message = `Beginning interview - last completed stage: ${
			InterviewStage[node.interviewStage]
		}`;
		this.logger.log<ControllerNodeLogContext>({
			level: CONTROLLER_LOGLEVEL,
			primaryTags: tagify([getNodeTag(node.id)]),
			message,
			direction: getDirectionPrefix("none"),
			context: {
				nodeId: node.id,
				source: "controller",
				type: "node",
				direction: "none",
			},
		});
	}
}
