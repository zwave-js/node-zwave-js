import { CommandClasses } from "../commandclass/CommandClasses";
import { ZWaveController } from "../controller/Controller";
import { Message } from "../message/Message";
import { SendMessageOptions } from "./Driver";

export interface IDriver {
	controller: ZWaveController | undefined;

	getSafeCCVersionForNode(nodeId: number, cc: CommandClasses): number;

	// wotan-disable-next-line no-misused-generics
	sendMessage<TResponse extends Message = Message>(
		msg: Message,
		options?: SendMessageOptions,
	): Promise<TResponse>;

	// Add more signatures as needed
}
