import { CommandClass, type ICommandClassContainer } from "@zwave-js/cc";
import {
	MessagePriority,
	ZWaveError,
	ZWaveErrorCodes,
	encodeNodeID,
	parseNodeID,
	type FrameType,
	type MessageOrCCLogEntry,
	type MessageRecord,
	type SinglecastCC,
} from "@zwave-js/core";
import type { ZWaveHost } from "@zwave-js/host";
import {
	FunctionType,
	Message,
	MessageType,
	gotDeserializationOptions,
	messageTypes,
	priority,
	type MessageBaseOptions,
	type MessageDeserializationOptions,
} from "@zwave-js/serial";

export enum ApplicationCommandStatusFlags {
	RoutedBusy = 0b1, // A response route is locked by the application
	LowPower = 0b10, // Received at low output power level

	TypeSingle = 0b0000, // Received a single cast frame
	TypeBroad = 0b0100, // Received a broad cast frame
	TypeMulti = 0b1000, // Received a multi cast frame
	TypeMask = TypeSingle | TypeBroad | TypeMulti,

	Explore = 0b10000, // Received an explore frame

	ForeignFrame = 0b0100_0000, // Received a foreign frame (only promiscuous mode)
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
export class ApplicationCommandRequest
	extends Message
	implements ICommandClassContainer
{
	public constructor(
		host: ZWaveHost,
		options:
			| MessageDeserializationOptions
			| ApplicationCommandRequestOptions,
	) {
		super(host, options);
		if (gotDeserializationOptions(options)) {
			// first byte is a status flag
			const status = this.payload[0];
			this.routedBusy = !!(
				status & ApplicationCommandStatusFlags.RoutedBusy
			);
			switch (status & ApplicationCommandStatusFlags.TypeMask) {
				case ApplicationCommandStatusFlags.TypeMulti:
					this.frameType = "multicast";
					break;
				case ApplicationCommandStatusFlags.TypeBroad:
					this.frameType = "broadcast";
					break;
				default:
					this.frameType = "singlecast";
			}
			this.isExploreFrame =
				this.frameType === "broadcast" &&
				!!(status & ApplicationCommandStatusFlags.Explore);
			this.isForeignFrame = !!(
				status & ApplicationCommandStatusFlags.ForeignFrame
			);
			this.fromForeignHomeId = !!(
				status & ApplicationCommandStatusFlags.ForeignHomeId
			);

			// followed by a node ID
			let offset = 1;
			const { nodeId, bytesRead: nodeIdBytes } = parseNodeID(
				this.payload,
				host.nodeIdType,
				offset,
			);
			offset += nodeIdBytes;
			// and a command class
			const commandLength = this.payload[offset++];
			this.command = CommandClass.from(this.host, {
				data: this.payload.slice(offset, offset + commandLength),
				nodeId,
				origin: options.origin,
				frameType: this.frameType,
			}) as SinglecastCC<CommandClass>;
		} else {
			// TODO: This logic is unsound
			if (!options.command.isSinglecast()) {
				throw new ZWaveError(
					`ApplicationCommandRequest can only be used for singlecast CCs`,
					ZWaveErrorCodes.Argument_Invalid,
				);
			}

			this.frameType = options.frameType ?? "singlecast";
			this.routedBusy = !!options.routedBusy;
			this.command = options.command;
			this.isExploreFrame = false;
			this.isForeignFrame = false;
			this.fromForeignHomeId = false;
		}
	}

	public readonly routedBusy: boolean;
	public readonly frameType: FrameType;
	public readonly isExploreFrame: boolean;
	public readonly isForeignFrame: boolean;
	public readonly fromForeignHomeId: boolean;

	// This needs to be writable or unwrapping MultiChannelCCs crashes
	public command: SinglecastCC<CommandClass>; // TODO: why is this a SinglecastCC?

	public override getNodeId(): number | undefined {
		if (this.command.isSinglecast()) {
			return this.command.nodeId;
		}
		return super.getNodeId();
	}

	public serialize(): Buffer {
		const statusByte =
			(this.frameType === "broadcast"
				? ApplicationCommandStatusFlags.TypeBroad
				: this.frameType === "multicast"
				? ApplicationCommandStatusFlags.TypeMulti
				: 0) |
			(this.routedBusy ? ApplicationCommandStatusFlags.RoutedBusy : 0);

		const serializedCC = this.command.serialize();
		const nodeId = encodeNodeID(
			this.getNodeId() ?? this.host.ownNodeId,
			this.host.nodeIdType,
		);
		this.payload = Buffer.concat([
			Buffer.from([statusByte]),
			nodeId,
			Buffer.from([serializedCC.length]),
			serializedCC,
		]);

		return super.serialize();
	}

	public toLogEntry(): MessageOrCCLogEntry {
		const message: MessageRecord = {};
		if (this.frameType !== "singlecast") {
			message.type = this.frameType;
		}
		return {
			...super.toLogEntry(),
			message,
		};
	}
}
