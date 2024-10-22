import { CommandClass, type ICommandClassContainer } from "@zwave-js/cc";
import {
	type FrameType,
	type MessageOrCCLogEntry,
	MessagePriority,
	type MessageRecord,
	type SinglecastCC,
	ZWaveError,
	ZWaveErrorCodes,
	encodeNodeID,
	parseNodeID,
} from "@zwave-js/core";
import {
	FunctionType,
	Message,
	type MessageBaseOptions,
	type MessageEncodingContext,
	type MessageParsingContext,
	type MessageRaw,
	MessageType,
	messageTypes,
	priority,
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

export interface ApplicationCommandRequestOptions {
	command: CommandClass;
	frameType?: ApplicationCommandRequest["frameType"];
	routedBusy?: boolean;
	isExploreFrame?: boolean;
	isForeignFrame?: boolean;
	fromForeignHomeId?: boolean;
}

@messageTypes(MessageType.Request, FunctionType.ApplicationCommand)
// This does not expect a response. The controller sends us this when a node sends a command
@priority(MessagePriority.Normal)
export class ApplicationCommandRequest extends Message
	implements ICommandClassContainer
{
	public constructor(
		options: ApplicationCommandRequestOptions & MessageBaseOptions,
	) {
		super(options);
		// TODO: This logic is unsound
		if (!options.command.isSinglecast()) {
			throw new ZWaveError(
				`ApplicationCommandRequest can only be used for singlecast CCs`,
				ZWaveErrorCodes.Argument_Invalid,
			);
		}

		this.frameType = options.frameType ?? "singlecast";
		this.routedBusy = options.routedBusy ?? false;
		this.command = options.command;
		this.isExploreFrame = options.isExploreFrame ?? false;
		this.isForeignFrame = options.isForeignFrame ?? false;
		this.fromForeignHomeId = options.fromForeignHomeId ?? false;
	}

	public static from(
		raw: MessageRaw,
		ctx: MessageParsingContext,
	): ApplicationCommandRequest {
		// first byte is a status flag
		const status = raw.payload[0];
		const routedBusy = !!(
			status & ApplicationCommandStatusFlags.RoutedBusy
		);
		let frameType: FrameType;

		switch (status & ApplicationCommandStatusFlags.TypeMask) {
			case ApplicationCommandStatusFlags.TypeMulti:
				frameType = "multicast";
				break;
			case ApplicationCommandStatusFlags.TypeBroad:
				frameType = "broadcast";
				break;
			default:
				frameType = "singlecast";
		}
		const isExploreFrame: boolean = frameType === "broadcast"
			&& !!(status & ApplicationCommandStatusFlags.Explore);
		const isForeignFrame = !!(
			status & ApplicationCommandStatusFlags.ForeignFrame
		);
		const fromForeignHomeId = !!(
			status & ApplicationCommandStatusFlags.ForeignHomeId
		);

		// followed by a node ID
		let offset = 1;
		const { nodeId, bytesRead: nodeIdBytes } = parseNodeID(
			raw.payload,
			ctx.nodeIdType,
			offset,
		);
		offset += nodeIdBytes;
		// and a command class
		const commandLength = raw.payload[offset++];
		const command: SinglecastCC<CommandClass> = CommandClass.parse(
			raw.payload.subarray(offset, offset + commandLength),
			{
				sourceNodeId: nodeId,
				...ctx,
				frameType: frameType,
			},
		) as SinglecastCC<CommandClass>;

		return new ApplicationCommandRequest({
			routedBusy,
			frameType,
			isExploreFrame,
			isForeignFrame,
			fromForeignHomeId,
			command,
		});
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

	public serialize(ctx: MessageEncodingContext): Buffer {
		const statusByte = (this.frameType === "broadcast"
			? ApplicationCommandStatusFlags.TypeBroad
			: this.frameType === "multicast"
			? ApplicationCommandStatusFlags.TypeMulti
			: 0)
			| (this.routedBusy ? ApplicationCommandStatusFlags.RoutedBusy : 0);

		const serializedCC = this.command.serialize(ctx);
		const nodeId = encodeNodeID(
			this.getNodeId() ?? ctx.ownNodeId,
			ctx.nodeIdType,
		);
		this.payload = Buffer.concat([
			Buffer.from([statusByte]),
			nodeId,
			Buffer.from([serializedCC.length]),
			serializedCC,
		]);

		return super.serialize(ctx);
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
