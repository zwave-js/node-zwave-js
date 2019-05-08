import { CommandClasses } from "../commandclass/CommandClasses";
import { ZWaveController } from "../controller/Controller";
import { Message } from "../message/Message";
import { SendMessageOptions } from "./Driver";

export interface IDriverEventCallbacks {
	"driver ready": () => void;
	error: (err: Error) => void;
}

export type IDriverEvents = Extract<keyof IDriverEventCallbacks, string>;

export interface IDriver {
	controller: ZWaveController | undefined;

	getSafeCCVersionForNode(nodeId: number, cc: CommandClasses): number;

	// wotan-disable-next-line no-misused-generics
	sendMessage<TResponse extends Message = Message>(
		msg: Message,
		options?: SendMessageOptions,
	): Promise<TResponse>;

	on<TEvent extends IDriverEvents>(
		event: TEvent,
		callback: IDriverEventCallbacks[TEvent],
	): this;
	once<TEvent extends IDriverEvents>(
		event: TEvent,
		callback: IDriverEventCallbacks[TEvent],
	): this;
	removeListener<TEvent extends IDriverEvents>(
		event: TEvent,
		callback: IDriverEventCallbacks[TEvent],
	): this;
	removeAllListeners(event?: IDriverEvents): this;

	// Add more signatures as needed
}
