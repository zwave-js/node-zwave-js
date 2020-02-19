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
	RoutedBusy = 0b1, // A response route is locked by the application
	LowPower = 0b10, // Received at low output power level

	TypeSingle = 0b0000, // Received a single cast frame
	TypeBroad = 0b0100, // Received a broad cast frame
	TypeMulti = 0b1000, // Received a multi cast frame
	TypeMask = TypeSingle | TypeBroad | TypeMulti,

	Explore = 0b10000, // Received an explore frame

	ForeignFrame = 0b0100_0000, // Received a foreign frame (only promiscous mode)
	ForeignHomeId = 0b1000_0000, // The received frame is received from a foreign HomeID. Only Controllers in Smart Start AddNode mode can receive this status.
}

interface ApplicationCommandRequestOptions extends MessageBaseOptions {
	command: CommandClass;
	frameType?: ApplicationCommandRequest["frameType"];
	routedBusy?: boolean;
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
			this.routedBusy = !!(status & StatusFlags.RoutedBusy);
			switch (status & StatusFlags.TypeMask) {
				case StatusFlags.TypeMulti:
					this.frameType = "multicast";
					break;
				case StatusFlags.TypeBroad:
					this.frameType = "broadcast";
					break;
				default:
					this.frameType = "singlecast";
			}
			this.isExploreFrame =
				this.frameType === "broadcast" &&
				!!(status & StatusFlags.Explore);
			this.isForeignFrame = !!(status & StatusFlags.ForeignFrame);
			this.fromForeignHomeId = !!(status & StatusFlags.ForeignHomeId);

			// followed by a node ID
			const nodeId = this.payload[1];
			// and a command class
			const commandLength = this.payload[2];
			this.command = CommandClass.from(this.driver, {
				data: this.payload.slice(3, 3 + commandLength),
				nodeId,
			});
		} else {
			this.frameType = options.frameType ?? "singlecast";
			this.routedBusy = !!options.routedBusy;
			this.command = options.command;
			this.isExploreFrame = false;
			this.isForeignFrame = false;
			this.fromForeignHomeId = false;
		}
	}

	public readonly routedBusy: boolean;
	public readonly frameType: "singlecast" | "broadcast" | "multicast";
	public readonly isExploreFrame: boolean;
	public readonly isForeignFrame: boolean;
	public readonly fromForeignHomeId: boolean;

	// This needs to be writable or unwrapping MultiChannelCCs crashes
	public command: CommandClass;

	public serialize(): Buffer {
		const statusByte =
			(this.frameType === "broadcast"
				? StatusFlags.TypeBroad
				: this.frameType === "multicast"
				? StatusFlags.TypeMulti
				: 0) | (this.routedBusy ? StatusFlags.RoutedBusy : 0);

		const serializedCC = this.command.serialize();
		this.payload = Buffer.concat([
			Buffer.from([statusByte, this.command.nodeId, serializedCC.length]),
			serializedCC,
		]);

		return super.serialize();
	}
}
