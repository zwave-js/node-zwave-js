import { CommandClass } from "../commandclass/CommandClass";
import { ICommandClassContainer } from "../commandclass/ICommandClassContainer";
import { IDriver } from "../driver/IDriver";
import {
	FunctionType,
	MessagePriority,
	MessageType,
} from "../message/Constants";
import {
	gotDeserializationOptions,
	Message,
	MessageBaseOptions,
	MessageDeserializationOptions,
	messageTypes,
	priority,
} from "../message/Message";

enum StatusFlags {
	RoutedBusy = 1 << 0,
	Broadcast = 1 << 2,
}

interface ApplicationCommandRequestOptions extends MessageBaseOptions {
	isBroadcast?: boolean;
	routedBusy?: boolean;
	command: CommandClass;
}

@messageTypes(MessageType.Request, FunctionType.ApplicationCommand)
// This does not expect a response. The controller sends us this when a node sends a command
@priority(MessagePriority.Normal)
export class ApplicationCommandRequest extends Message
	implements ICommandClassContainer {
	public constructor(
		driver: IDriver,
		options:
			| MessageDeserializationOptions
			| ApplicationCommandRequestOptions,
	) {
		super(driver, options);
		if (gotDeserializationOptions(options)) {
			// first byte is a status flag
			const status = this.payload[0];
			this._isBroadcast = (status & StatusFlags.Broadcast) !== 0;
			this._routedBusy = (status & StatusFlags.RoutedBusy) !== 0;
			// followed by a command class
			this._command = CommandClass.from(
				this.driver,
				this.payload.slice(1),
			);
		} else {
			this._isBroadcast = !!options.isBroadcast;
			this._routedBusy = !!options.routedBusy;
			this._command = options.command;
		}
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

	public serialize(): Buffer {
		const statusByte =
			(this._isBroadcast ? StatusFlags.Broadcast : 0) |
			(this._routedBusy ? StatusFlags.RoutedBusy : 0);

		this.payload = Buffer.concat([
			Buffer.from([statusByte]),
			this._command.serialize(),
		]);

		return super.serialize();
	}
}
