import { type InterviewStage, type ValueID } from "../index_browser.js";
import type { DataDirection, LogContext } from "./shared.js";

export const CONTROLLER_LABEL = "CNTRLR";
export const CONTROLLER_LOGLEVEL = "info";
export const VALUE_LOGLEVEL = "debug";

export interface LogNodeOptions {
	message: string;
	level?: "silly" | "debug" | "verbose" | "warn" | "error";
	direction?: DataDirection;
	endpoint?: number;
}

export interface Interviewable {
	id: number;
	interviewStage: InterviewStage;
}

// FIXME: Do we need this to be a separate type?
export type NodeLogContext = LogContext & { nodeId: number; type: "node" };

export type ControllerNodeLogContext =
	& LogContext<"controller">
	& NodeLogContext
	& { endpoint?: number; direction: string };

// FIXME: Do we need this to be a separate type?
export type ValueLogContext =
	& LogContext
	& ValueID
	& { nodeId: number; type: "value" };

export type ControllerValueLogContext =
	& LogContext<"controller">
	& ValueLogContext
	& {
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

export interface LogNode {
	/**
	 * Logs a node-related message with the correct prefix
	 * @param message The message to output
	 * @param level The optional loglevel if it should be different from "info"
	 */
	logNode(
		nodeId: number,
		message: string,
		level?: LogNodeOptions["level"],
	): void;

	/**
	 * Logs a node-related message with the correct prefix
	 * @param node The node to log the message for
	 * @param options The message and other options
	 */
	logNode(nodeId: number, options: LogNodeOptions): void;
}
