import { CommandClass } from "../commandclass/CommandClass";
import { ICommandClassContainer } from "../commandclass/ICommandClassContainer";
import { Driver } from "../driver/Driver";
import {
	FunctionType,
	MessagePriority,
	MessageType,
} from "../message/Constants";
import {
	Message,
	MessageDeserializationOptions,
	messageTypes,
	priority,
} from "../message/Message";

const enum StatusFlags {
	RoutedBusy = 1 << 0,
	Broadcast = 1 << 2,
}

@messageTypes(MessageType.Request, FunctionType.ApplicationCommand)
// This does not expect a response. The controller sends us this when a node sends a command
@priority(MessagePriority.Normal)
export class ApplicationCommandRequest extends Message
	implements ICommandClassContainer {
	public constructor(driver: Driver, options: MessageDeserializationOptions) {
		super(driver, options);
		// first byte is a status flag
		const status = this.payload[0];
		this._isBroadcast = (status & StatusFlags.Broadcast) !== 0;
		this._routedBusy = (status & StatusFlags.RoutedBusy) !== 0;
		// followed by a command class
		this._command = CommandClass.from(this.driver, this.payload.slice(1));
	}

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
}
