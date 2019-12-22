import { CommandClass } from "../commandclass/CommandClass";
import { CommandClasses } from "../commandclass/CommandClasses";
import { ZWaveController } from "../controller/Controller";
import { Message } from "../message/Message";
import { SendMessageOptions, ZWaveOptions } from "./Driver";

export interface DriverEventCallbacks {
	"driver ready": () => void;
	"all nodes ready": () => void;
	error: (err: Error) => void;
}

export type DriverEvents = Extract<keyof DriverEventCallbacks, string>;

export interface IDriver {
	controller: ZWaveController;
	/** @internal */
	options: ZWaveOptions;

	getSafeCCVersionForNode(
		cc: CommandClasses,
		nodeId: number,
		endpointIndex?: number,
	): number;

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

	getNextCallbackId(): number;

	// Add more signatures as needed
}
