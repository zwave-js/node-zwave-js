import { type CCEncodingContext, type CommandClass } from "@zwave-js/cc";
import {
	type FrameType,
	type MessageOrCCLogEntry,
	MessagePriority,
	type MessageRecord,
	NODE_ID_BROADCAST,
	NODE_ID_BROADCAST_LR,
	type RSSI,
	RssiError,
	ZWaveError,
	ZWaveErrorCodes,
	encodeNodeID,
	isLongRangeNodeId,
	parseNodeBitMask,
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
import { Bytes, getEnumMemberName } from "@zwave-js/shared";
import { tryParseRSSI } from "../transport/SendDataShared.js";
import { type MessageWithCC } from "../utils.js";
import { ApplicationCommandStatusFlags } from "./ApplicationCommandRequest.js";

export type BridgeApplicationCommandRequestOptions =
	& (
		| { command: CommandClass }
		| {
			nodeId: number;
			serializedCC: Uint8Array;
		}
	)
	& {
		routedBusy: boolean;
		frameType: FrameType;
		isExploreFrame: boolean;
		isForeignFrame: boolean;
		fromForeignHomeId: boolean;
		ownNodeId: number;
		targetNodeId: number | number[];
		rssi?: number;
	};

@messageTypes(MessageType.Request, FunctionType.BridgeApplicationCommand)
// This does not expect a response. The controller sends us this when a node sends a command
@priority(MessagePriority.Normal)
export class BridgeApplicationCommandRequest extends Message
	implements MessageWithCC
{
	public constructor(
		options: BridgeApplicationCommandRequestOptions & MessageBaseOptions,
	) {
		super(options);

		if ("command" in options) {
			this.command = options.command;
		} else {
			this._nodeId = options.nodeId;
			this.serializedCC = options.serializedCC;
		}

		this.routedBusy = options.routedBusy;
		this.frameType = options.frameType;
		this.isExploreFrame = options.isExploreFrame;
		this.isForeignFrame = options.isForeignFrame;
		this.fromForeignHomeId = options.fromForeignHomeId;
		// FIXME: We only need this in the toLogEntry context
		this.ownNodeId = options.ownNodeId;
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
		// Extract the CC payload
		const commandLength = raw.payload[offset++];
		const serializedCC = raw.payload.subarray(
			offset,
			offset + commandLength,
		);
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

		return new this({
			routedBusy,
			frameType,
			isExploreFrame,
			isForeignFrame,
			fromForeignHomeId,
			nodeId: sourceNodeId,
			serializedCC,
			ownNodeId: ctx.ownNodeId,
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

	public readonly ownNodeId: number;

	public serializedCC: Uint8Array | undefined;
	public async serializeCC(ctx: CCEncodingContext): Promise<Uint8Array> {
		if (!this.serializedCC) {
			if (!this.command) {
				throw new ZWaveError(
					`Cannot serialize a ${this.constructor.name} without a command`,
					ZWaveErrorCodes.Argument_Invalid,
				);
			}
			this.serializedCC = await this.command.serialize(ctx);
		}
		return this.serializedCC;
	}

	// This needs to be writable or unwrapping MultiChannelCCs crashes
	public command: CommandClass | undefined;

	private _nodeId: number | undefined;
	public override getNodeId(): number | undefined {
		if (this.command?.isSinglecast()) {
			return this.command.nodeId;
		}
		return this._nodeId ?? super.getNodeId();
	}

	public async serialize(ctx: MessageEncodingContext): Promise<Bytes> {
		let rxStatus = 0;
		if (this.routedBusy) {
			rxStatus |= ApplicationCommandStatusFlags.RoutedBusy;
		}
		switch (this.frameType) {
			case "multicast":
				rxStatus |= ApplicationCommandStatusFlags.TypeMulti;
				break;
			case "broadcast":
				rxStatus |= ApplicationCommandStatusFlags.TypeBroad;
				break;
			default:
				rxStatus |= ApplicationCommandStatusFlags.TypeSingle;
		}
		if (this.isExploreFrame) {
			rxStatus |= ApplicationCommandStatusFlags.Explore;
		}
		if (this.isForeignFrame) {
			rxStatus |= ApplicationCommandStatusFlags.ForeignFrame;
		}
		if (this.fromForeignHomeId) {
			rxStatus |= ApplicationCommandStatusFlags.ForeignHomeId;
		}
		const destinationNodeId = encodeNodeID(
			typeof this.targetNodeId === "number" ? this.targetNodeId : 0,
			ctx.nodeIdType,
		);
		const sourceNodeId = encodeNodeID(
			this.getNodeId() ?? 0,
			ctx.nodeIdType,
		);
		const serializedCC = await this.serializeCC(ctx);
		const multicastNodeMask = typeof this.targetNodeId === "number"
			? Uint8Array.from([0])
			: Uint8Array.from([this.targetNodeId.length, ...this.targetNodeId]);

		this.payload = Bytes.concat([
			[rxStatus],
			destinationNodeId,
			sourceNodeId,
			[serializedCC.length],
			serializedCC,
			multicastNodeMask,
			[RssiError.NotAvailable],
		]);

		if (this.rssi != undefined) {
			this.payload.writeInt8(this.rssi, this.payload.length - 1);
		}

		return super.serialize(ctx);
	}

	public toLogEntry(): MessageOrCCLogEntry {
		const message: MessageRecord = {};
		if (this.frameType !== "singlecast") {
			message.type = this.frameType;
		}
		if (this.targetNodeId !== this.ownNodeId) {
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
