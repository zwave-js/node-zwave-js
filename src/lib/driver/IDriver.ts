import { CommandClasses } from "../commandclass/CommandClasses";
import { ZWaveController } from "../controller/Controller";
import { MessagePriority } from "../message/Constants";
import { Message } from "../message/Message";
import { MessageSupportCheck } from "./Driver";

export interface IDriver {
	controller: ZWaveController | undefined;

	getSafeCCVersionForNode(nodeId: number, cc: CommandClasses): number;

	// wotan-disable no-misused-generics
	sendMessage<TResponse extends Message = Message>(
		msg: Message,
		priority?: MessagePriority,
	): Promise<TResponse>;
	sendMessage<TResponse extends Message = Message>(
		msg: Message,
		supportCheck?: MessageSupportCheck,
	): Promise<TResponse>;
	sendMessage<TResponse extends Message = Message>(
		msg: Message,
		priority: MessagePriority,
		supportCheck: MessageSupportCheck,
	): Promise<TResponse>;
	// wotan-enable no-misused-generics

	// Add more signatures as needed
}
