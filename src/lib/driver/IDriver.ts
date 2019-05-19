import { CommandClass } from "../commandclass/CommandClass";
import { CommandClasses } from "../commandclass/CommandClasses";
import { ZWaveController } from "../controller/Controller";
import { Message } from "../message/Message";
import { SendMessageOptions } from "./Driver";

export interface DriverEventCallbacks {
	"driver ready": () => void;
	error: (err: Error) => void;
}

export type DriverEvents = Extract<keyof DriverEventCallbacks, string>;

export interface IDriver {
	controller: ZWaveController | undefined;

	getSafeCCVersionForNode(nodeId: number, cc: CommandClasses): number;

	// wotan-disable-next-line no-misused-generics
	sendMessage<TResponse extends Message = Message>(
		msg: Message,
		options?: SendMessageOptions,
	): Promise<TResponse>;

	// wotan-disable-next-line no-misused-generics
	sendCommand<TResponse extends CommandClass = CommandClass>(
		command: CommandClass,
		options?: SendMessageOptions,
	): Promise<TResponse | undefined>;

	on<TEvent extends DriverEvents>(
		event: TEvent,
		callback: DriverEventCallbacks[TEvent],
	): this;
	once<TEvent extends DriverEvents>(
		event: TEvent,
		callback: DriverEventCallbacks[TEvent],
	): this;
	removeListener<TEvent extends DriverEvents>(
		event: TEvent,
		callback: DriverEventCallbacks[TEvent],
	): this;
	off<TEvent extends DriverEvents>(
		event: TEvent,
		callback: DriverEventCallbacks[TEvent],
	): this;
	removeAllListeners(event?: DriverEvents): this;

	// Add more signatures as needed
}
