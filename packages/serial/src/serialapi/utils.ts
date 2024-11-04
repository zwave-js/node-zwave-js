import { CommandClass } from "@zwave-js/cc";
import { type Message } from "@zwave-js/serial";
import { isUint8Array } from "@zwave-js/shared";
import { ApplicationCommandRequest } from "./application/ApplicationCommandRequest.js";
import { BridgeApplicationCommandRequest } from "./application/BridgeApplicationCommandRequest.js";
import {
	type SendDataMessage,
	isSendData,
} from "./transport/SendDataShared.js";

export type CommandRequest =
	| ApplicationCommandRequest
	| BridgeApplicationCommandRequest;

export function isCommandRequest(
	msg: Message,
): msg is CommandRequest {
	return msg instanceof ApplicationCommandRequest
		|| msg instanceof BridgeApplicationCommandRequest;
}

export interface MessageWithCC {
	serializedCC: Uint8Array | undefined;
	command: CommandClass | undefined;
}

export function isMessageWithCC(
	msg: Message,
): msg is
	| SendDataMessage
	| CommandRequest
{
	return isSendData(msg) || isCommandRequest(msg);
}

export interface ContainsSerializedCC {
	serializedCC: Uint8Array;
}

export function containsSerializedCC<T extends object>(
	container: T | undefined,
): container is T & ContainsSerializedCC {
	return !!container
		&& "serializedCC" in container
		&& isUint8Array(container.serializedCC);
}

export interface ContainsCC<T extends CommandClass = CommandClass> {
	command: T;
}

export function containsCC<T extends object>(
	container: T | undefined,
): container is T & ContainsCC {
	return !!container
		&& "command" in container
		&& container.command instanceof CommandClass;
}
