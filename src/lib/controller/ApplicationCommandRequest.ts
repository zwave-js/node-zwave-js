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
			// followed by a node ID
			const nodeId = this.payload[1];
			// and a command class
			const commandLength = this.payload[2];
			this.command = CommandClass.from(this.driver, {
				data: this.payload.slice(3, 3 + commandLength),
				nodeId,
			});
		} else {
			this._isBroadcast = !!options.isBroadcast;
			this._routedBusy = !!options.routedBusy;
			this.command = options.command;
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

	// This needs to be writable or unwrapping MultiChannelCCs crashes
	public command: CommandClass;

	public serialize(): Buffer {
		const statusByte =
			(this._isBroadcast ? StatusFlags.Broadcast : 0) |
			(this._routedBusy ? StatusFlags.RoutedBusy : 0);

		const serializedCC = this.command.serialize();
		this.payload = Buffer.concat([
			Buffer.from([statusByte, this.command.nodeId, serializedCC.length]),
			serializedCC,
		]);

		return super.serialize();
	}
}
