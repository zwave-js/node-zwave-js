import {
	MessageOrCCLogEntry,
	MessageRecord,
	NODE_ID_BROADCAST,
} from "@zwave-js/core";
import { getEnumMemberName } from "@zwave-js/shared";
import { CommandClass, SinglecastCC } from "../commandclass/CommandClass";
import type { ICommandClassContainer } from "../commandclass/ICommandClassContainer";
import type { Driver } from "../driver/Driver";
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
import { ApplicationCommandStatusFlags } from "./ApplicationCommandRequest";
import { parseRSSI, RSSI, RssiError } from "./SendDataShared";

@messageTypes(MessageType.Request, FunctionType.BridgeApplicationCommand)
// This does not expect a response. The controller sends us this when a node sends a command
@priority(MessagePriority.Normal)
export class BridgeApplicationCommandRequest
	extends Message
	implements ICommandClassContainer
{
	public constructor(driver: Driver, options: MessageDeserializationOptions) {
		super(driver, options);
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
		this.isExploreFrame =
			this.frameType === "broadcast" &&
			!!(status & ApplicationCommandStatusFlags.Explore);
		this.isForeignFrame = !!(
			status & ApplicationCommandStatusFlags.ForeignFrame
		);
		this.fromForeignHomeId = !!(
			status & ApplicationCommandStatusFlags.ForeignHomeId
		);

		const sourceNodeId = this.payload[2];
		// Parse the CC
		const commandLength = this.payload[3];
		let offset = 4;
		this.command = CommandClass.from(this.driver, {
			data: this.payload.slice(offset, offset + commandLength),
			nodeId: sourceNodeId,
		}) as SinglecastCC;
		offset += commandLength;

		// Read the correct target node id
		const multicastNodesLength = this.payload[offset];
		offset++;
		if (this.frameType === "multicast") {
			this.targetNodeId = [
				...this.payload.slice(offset, offset + multicastNodesLength),
			];
		} else if (this.frameType === "singlecast") {
			this.targetNodeId = this.payload[1];
		} else {
			this.targetNodeId = NODE_ID_BROADCAST;
		}
		offset += multicastNodesLength;

		this.rssi = parseRSSI(this.payload, offset);
	}

	public readonly routedBusy: boolean;
	public readonly frameType: "singlecast" | "broadcast" | "multicast";
	public readonly targetNodeId: number | number[];
	public readonly isExploreFrame: boolean;
	public readonly isForeignFrame: boolean;
	public readonly fromForeignHomeId: boolean;
	public readonly rssi: RSSI;

	// This needs to be writable or unwrapping MultiChannelCCs crashes
	public command: SinglecastCC;

	public toLogEntry(): MessageOrCCLogEntry {
		const message: MessageRecord = {};
		if (this.frameType !== "singlecast") {
			message.type = this.frameType;
		}
		if (this.targetNodeId !== this.driver.controller.ownNodeId) {
			message["target node"] =
				typeof this.targetNodeId === "number"
					? this.targetNodeId
					: this.targetNodeId.join(", ");
		}
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
		return {
			...super.toLogEntry(),
			message,
		};
	}
}
