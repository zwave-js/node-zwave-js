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
	type MessageDeserializationOptions,
	MessageType,
	messageTypes,
	priority,
} from "@zwave-js/serial";
import { getEnumMemberName } from "@zwave-js/shared";
import { tryParseRSSI } from "../transport/SendDataShared";
import { ApplicationCommandStatusFlags } from "./ApplicationCommandRequest";

@messageTypes(MessageType.Request, FunctionType.BridgeApplicationCommand)
// This does not expect a response. The controller sends us this when a node sends a command
@priority(MessagePriority.Normal)
export class BridgeApplicationCommandRequest extends Message
	implements ICommandClassContainer
{
	public constructor(
		options: MessageDeserializationOptions,
	) {
		super(options);
		this._ownNodeId = options.ctx.ownNodeId;

		// if (gotDeserializationOptions(options)) {
		// first byte is a status flag
		const status = this.payload[0];
		this.routedBusy = !!(status & ApplicationCommandStatusFlags.RoutedBusy);
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
		this.isExploreFrame = this.frameType === "broadcast"
			&& !!(status & ApplicationCommandStatusFlags.Explore);
		this.isForeignFrame = !!(
			status & ApplicationCommandStatusFlags.ForeignFrame
		);
		this.fromForeignHomeId = !!(
			status & ApplicationCommandStatusFlags.ForeignHomeId
		);

		let offset = 1;
		const { nodeId: destinationNodeId, bytesRead: dstNodeIdBytes } =
			parseNodeID(this.payload, options.ctx.nodeIdType, offset);
		offset += dstNodeIdBytes;
		const { nodeId: sourceNodeId, bytesRead: srcNodeIdBytes } = parseNodeID(
			this.payload,
			options.ctx.nodeIdType,
			offset,
		);
		offset += srcNodeIdBytes;
		// Parse the CC
		const commandLength = this.payload[offset++];
		this.command = CommandClass.from({
			data: this.payload.subarray(offset, offset + commandLength),
			nodeId: sourceNodeId,
			origin: options.origin,
			context: {
				sourceNodeId,
				...options.ctx,
			},
		}) as SinglecastCC<CommandClass>;
		offset += commandLength;

		// Read the correct target node id
		const multicastNodesLength = this.payload[offset];
		offset++;
		if (this.frameType === "multicast") {
			this.targetNodeId = parseNodeBitMask(
				this.payload.subarray(offset, offset + multicastNodesLength),
			);
		} else if (this.frameType === "singlecast") {
			this.targetNodeId = destinationNodeId;
		} else {
			this.targetNodeId = isLongRangeNodeId(sourceNodeId)
				? NODE_ID_BROADCAST_LR
				: NODE_ID_BROADCAST;
		}
		offset += multicastNodesLength;

		this.rssi = tryParseRSSI(this.payload, offset);
	}

	public readonly routedBusy: boolean;
	public readonly frameType: FrameType;
	public readonly targetNodeId: number | number[];
	public readonly isExploreFrame: boolean;
	public readonly isForeignFrame: boolean;
	public readonly fromForeignHomeId: boolean;
	public readonly rssi?: RSSI;

	private _ownNodeId: number;

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
