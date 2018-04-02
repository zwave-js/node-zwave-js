import { FunctionType, MessagePriority, MessageType } from "../message/Constants";
import { expectedResponse, Message, messageTypes, priority} from "../message/Message";
import { CommandClass, CommandClasses } from "./CommandClass";

const enum StatusFlags {
	RoutedBusy = 1 << 0,
	Broadcast = 1 << 2,
}

@messageTypes(MessageType.Request, FunctionType.ApplicationCommand)
// This does not expect a response. The controller sends us this when a node sends a command
@priority(MessagePriority.Normal)
export class ApplicationCommandRequest extends Message {

	private _routedBusy: boolean;
	public get routedBusy(): boolean {
		return this._routedBusy;
	}

	private _isBroadcast: boolean;
	public get isBroadcast(): boolean {
		return this._isBroadcast;
	}

	private _command: CommandClass;
	public get command(): CommandClass {
		return this._command;
	}

	public serialize(): Buffer {
		throw new Error("serialize() for ApplicationCommandRequest not implemented");
	}

	public deserialize(data: Buffer): number {
		const ret = super.deserialize(data);

		// first byte is a status flag
		const status = this.payload[0];
		this._isBroadcast = (status & StatusFlags.Broadcast) !== 0;
		this._routedBusy = (status & StatusFlags.RoutedBusy) !== 0;
		// followed by a command class
		this._command = CommandClass.from(this.payload.slice(1));

		return ret;
	}
}
