import type {
	CCId,
	ControllerLogger,
	SendCommandOptions,
	SendCommandReturnType,
} from "@zwave-js/core";

/** Allows sending commands to one or more nodes */
export interface SendCommand {
	sendCommand<TResponse extends CCId | undefined = undefined>(
		command: CCId,
		options?: SendCommandOptions,
	): Promise<SendCommandReturnType<TResponse>>;
}

export type LogNode = Pick<ControllerLogger, "logNode">;
