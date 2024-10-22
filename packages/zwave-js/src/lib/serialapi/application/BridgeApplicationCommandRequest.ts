import { CommandClass, type ICommandClassContainer } from "@zwave-js/cc";
import {
	type FrameType,
	type MessageOrCCLogEntry,
	MessagePriority,
	type MessageRecord,
	NODE_ID_BROADCAST,
	NODE_ID_BROADCAST_LR,
	type RSSI,
	RssiError,
	type SinglecastCC,
	isLongRangeNodeId,
	parseNodeBitMask,
	parseNodeID,
} from "@zwave-js/core";
import {
	FunctionType,
	Message,
	type MessageBaseOptions,
	type MessageParsingContext,
	type MessageRaw,
	MessageType,
	messageTypes,
	priority,
} from "@zwave-js/serial";
import { getEnumMemberName } from "@zwave-js/shared";
import { tryParseRSSI } from "../transport/SendDataShared";
import { ApplicationCommandStatusFlags } from "./ApplicationCommandRequest";

export interface BridgeApplicationCommandRequestOptions {
	routedBusy: boolean;
	frameType: FrameType;
	isExploreFrame: boolean;
	isForeignFrame: boolean;
	fromForeignHomeId: boolean;
	command: SinglecastCC<CommandClass>;
	targetNodeId: number | number[];
	rssi?: number;
}

@messageTypes(MessageType.Request, FunctionType.BridgeApplicationCommand)
// This does not expect a response. The controller sends us this when a node sends a command
@priority(MessagePriority.Normal)
export class BridgeApplicationCommandRequest extends Message
	implements ICommandClassContainer
{
	public constructor(
		options: BridgeApplicationCommandRequestOptions & MessageBaseOptions,
	) {
		super(options);

		this.routedBusy = options.routedBusy;
		this.frameType = options.frameType;
		this.isExploreFrame = options.isExploreFrame;
		this.isForeignFrame = options.isForeignFrame;
		this.fromForeignHomeId = options.fromForeignHomeId;
		this.command = options.command;
		this.targetNodeId = options.targetNodeId;
		this.rssi = options.rssi;
	}

	public static from(
		raw: MessageRaw,
		ctx: MessageParsingContext,
	): BridgeApplicationCommandRequest {
		// first byte is a status flag
		const status = raw.payload[0];
		const routedBusy =
			!!(status & ApplicationCommandStatusFlags.RoutedBusy);
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

		const isExploreFrame = frameType === "broadcast"
			&& !!(status & ApplicationCommandStatusFlags.Explore);
		const isForeignFrame = !!(
			status & ApplicationCommandStatusFlags.ForeignFrame
		);
		const fromForeignHomeId = !!(
			status & ApplicationCommandStatusFlags.ForeignHomeId
		);
		let offset = 1;
		const { nodeId: destinationNodeId, bytesRead: dstNodeIdBytes } =
			parseNodeID(raw.payload, ctx.nodeIdType, offset);
		offset += dstNodeIdBytes;
		const { nodeId: sourceNodeId, bytesRead: srcNodeIdBytes } = parseNodeID(
			raw.payload,
			ctx.nodeIdType,
			offset,
		);
		offset += srcNodeIdBytes;
		// Parse the CC
		const commandLength = raw.payload[offset++];
		const command: SinglecastCC<CommandClass> = CommandClass.parse(
			raw.payload.subarray(offset, offset + commandLength),
			{
				sourceNodeId,
				...ctx,
				frameType: frameType,
			},
		) as SinglecastCC<CommandClass>;
		offset += commandLength;
		// Read the correct target node id
		const multicastNodesLength = raw.payload[offset];
		offset++;
		let targetNodeId: number | number[];
		if (frameType === "multicast") {
			targetNodeId = parseNodeBitMask(
				raw.payload.subarray(offset, offset + multicastNodesLength),
			);
		} else if (frameType === "singlecast") {
			targetNodeId = destinationNodeId;
		} else {
			targetNodeId = isLongRangeNodeId(sourceNodeId)
				? NODE_ID_BROADCAST_LR
				: NODE_ID_BROADCAST;
		}

		offset += multicastNodesLength;
		const rssi: number | undefined = tryParseRSSI(raw.payload, offset);

		return new BridgeApplicationCommandRequest({
			routedBusy,
			frameType,
			isExploreFrame,
			isForeignFrame,
			fromForeignHomeId,
			command,
			targetNodeId,
			rssi,
		});
	}

	public readonly routedBusy: boolean;
	public readonly frameType: FrameType;
	public readonly targetNodeId: number | number[];
	public readonly isExploreFrame: boolean;
	public readonly isForeignFrame: boolean;
	public readonly fromForeignHomeId: boolean;
	public readonly rssi?: RSSI;

	// This needs to be writable or unwrapping MultiChannelCCs crashes
	public command: SinglecastCC<CommandClass>; // TODO: why is this a SinglecastCC?

	public override getNodeId(): number | undefined {
		if (this.command.isSinglecast()) {
			return this.command.nodeId;
		}
		return super.getNodeId();
	}

	public toLogEntry(): MessageOrCCLogEntry {
		const message: MessageRecord = {};
		if (this.frameType !== "singlecast") {
			message.type = this.frameType;
		}
		if (this.targetNodeId !== this._ownNodeId) {
			if (typeof this.targetNodeId === "number") {
				message["target node"] = this.targetNodeId;
			} else if (this.targetNodeId.length === 1) {
				message["target node"] = this.targetNodeId[0];
			} else {
				message["target nodes"] = this.targetNodeId.join(", ");
			}
		}
		if (this.rssi !== undefined) {
			switch (true) {
				case this.rssi === RssiError.ReceiverSaturated:
				case this.rssi === RssiError.NoSignalDetected:
					message.RSSI = getEnumMemberName(RssiError, this.rssi);
					break;
				// case this.rssi < RSSI_RESERVED_START:
				default:
					message.RSSI = `${this.rssi} dBm`;
					break;
			}
		}
		return {
			...super.toLogEntry(),
			message,
		};
	}
}
