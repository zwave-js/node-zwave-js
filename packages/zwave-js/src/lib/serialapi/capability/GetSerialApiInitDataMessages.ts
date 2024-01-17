import {
	MAX_NODES,
	MessagePriority,
	NUM_LR_NODEMASK_SEGMENT_BYTES,
	NUM_LR_NODES_PER_SEGMENT,
	NUM_NODEMASK_BYTES,
	NodeType,
	encodeBitMask,
	encodeLongRangeNodeBitMask,
	parseLongRangeNodeBitMask,
	parseNodeBitMask,
} from "@zwave-js/core";
import type { ZWaveHost } from "@zwave-js/host";
import {
	FunctionType,
	Message,
	type MessageBaseOptions,
	type MessageDeserializationOptions,
	MessageType,
	expectedResponse,
	gotDeserializationOptions,
	messageTypes,
	priority,
} from "@zwave-js/serial";
import {
	type UnknownZWaveChipType,
	getChipTypeAndVersion,
	getZWaveChipType,
} from "../../controller/ZWaveChipTypes";
import type { ZWaveApiVersion } from "../_Types";

@messageTypes(MessageType.Request, FunctionType.GetSerialApiInitData)
@expectedResponse(FunctionType.GetSerialApiInitData)
@priority(MessagePriority.Controller)
export class GetSerialApiInitDataRequest extends Message {}

export interface GetSerialApiInitDataResponseOptions
	extends MessageBaseOptions
{
	zwaveApiVersion: ZWaveApiVersion;
	isPrimary: boolean;
	nodeType: NodeType;
	supportsTimers: boolean;
	isSIS: boolean;
	nodeIds: number[];
	zwaveChipType?: string | UnknownZWaveChipType;
}

@messageTypes(MessageType.Response, FunctionType.GetSerialApiInitData)
export class GetSerialApiInitDataResponse extends Message {
	public constructor(
		host: ZWaveHost,
		options:
			| MessageDeserializationOptions
			| GetSerialApiInitDataResponseOptions,
	) {
		super(host, options);

		if (gotDeserializationOptions(options)) {
			const apiVersion = this.payload[0];
			if (apiVersion < 10) {
				this.zwaveApiVersion = {
					kind: "legacy",
					version: apiVersion,
				};
			} else {
				// this module uses the officially specified Host API
				this.zwaveApiVersion = {
					kind: "official",
					version: apiVersion - 9,
				};
			}

			const capabilities = this.payload[1];
			// The new "official" Host API specs incorrectly switched the meaning of some flags
			// Apparently this was never intended, and the firmware correctly uses the "old" encoding.
			// https://community.silabs.com/s/question/0D58Y00009qjEghSAE/bug-in-firmware-7191-get-init-data-response-does-not-match-host-api-specification?language=en_US
			this.nodeType = capabilities & 0b0001
				? NodeType["End Node"]
				: NodeType.Controller;
			this.supportsTimers = !!(capabilities & 0b0010);
			this.isPrimary = !(capabilities & 0b0100);
			this.isSIS = !!(capabilities & 0b1000);

			let offset = 2;
			this.nodeIds = [];
			if (this.payload.length > offset) {
				const nodeListLength = this.payload[offset];
				// Controller Nodes MUST set this field to 29
				if (
					nodeListLength === NUM_NODEMASK_BYTES
					&& this.payload.length >= offset + 1 + nodeListLength
				) {
					const nodeBitMask = this.payload.subarray(
						offset + 1,
						offset + 1 + nodeListLength,
					);
					this.nodeIds = parseNodeBitMask(nodeBitMask);
				}
				offset += 1 + nodeListLength;
			}

			// these might not be present:
			const chipType = this.payload[offset];
			const chipVersion = this.payload[offset + 1];
			if (chipType != undefined && chipVersion != undefined) {
				this.zwaveChipType = getZWaveChipType(chipType, chipVersion);
			}
		} else {
			this.zwaveApiVersion = options.zwaveApiVersion;
			this.isPrimary = options.isPrimary;
			this.nodeType = options.nodeType;
			this.supportsTimers = options.supportsTimers;
			this.isSIS = options.isSIS;
			this.nodeIds = options.nodeIds;
			this.zwaveChipType = options.zwaveChipType;
		}
	}

	public zwaveApiVersion: ZWaveApiVersion;

	public isPrimary: boolean;
	public nodeType: NodeType;
	public supportsTimers: boolean;
	public isSIS: boolean;

	public nodeIds: readonly number[];

	public zwaveChipType?: string | UnknownZWaveChipType;

	public serialize(): Buffer {
		let chipType: UnknownZWaveChipType | undefined;
		if (typeof this.zwaveChipType === "string") {
			chipType = getChipTypeAndVersion(this.zwaveChipType);
		} else {
			chipType = this.zwaveChipType;
		}

		this.payload = Buffer.allocUnsafe(
			3 + NUM_NODEMASK_BYTES + (chipType ? 2 : 0),
		);

		let capabilities = 0;
		if (this.supportsTimers) capabilities |= 0b0010;
		if (this.isSIS) capabilities |= 0b1000;
		if (this.zwaveApiVersion.kind === "legacy") {
			this.payload[0] = this.zwaveApiVersion.version;
			if (this.nodeType === NodeType["End Node"]) capabilities |= 0b0001;
			if (!this.isPrimary) capabilities |= 0b0100;
		} else {
			this.payload[0] = this.zwaveApiVersion.version + 9;
			if (this.nodeType === NodeType.Controller) capabilities |= 0b0001;
			if (this.isPrimary) capabilities |= 0b0100;
		}
		this.payload[1] = capabilities;

		this.payload[2] = NUM_NODEMASK_BYTES;
		const nodeBitMask = encodeBitMask(this.nodeIds, MAX_NODES);
		nodeBitMask.copy(this.payload, 3);

		if (chipType) {
			this.payload[3 + NUM_NODEMASK_BYTES] = chipType.type;
			this.payload[3 + NUM_NODEMASK_BYTES + 1] = chipType.version;
		}

		return super.serialize();
	}

	// public toLogEntry(): MessageOrCCLogEntry {
	// 	const message: MessageRecord = {
	// 		"Z-Wave API Version": `${this.zwaveApiVersion.version} (${this.zwaveApiVersion.kind})`,
	// 		"node type": getEnumMemberName(NodeType, this.nodeType),
	// 		role: this.isPrimary ? "primary" : "secondary",
	// 		"is SIS": this.isSIS,
	// 		"supports timers": this.supportsTimers,
	// 	};

	// 	if (this.zwaveChipType) {
	// 		message["Z-Wave chip type"] =
	// 			typeof this.zwaveChipType === "string"
	// 				? this.zwaveChipType
	// 				: `unknown (type = ${num2hex(
	// 						this.zwaveChipType.type,
	// 				  )}, version = ${num2hex(this.zwaveChipType.version)})`;
	// 	}
	// 	return {
	// 		...super.toLogEntry(),
	// 		message,
	// 	};
	// }
}

// Z-Stick 7, 7.15
// 12:15:28.505 DRIVER « [RES] [GetSerialApiInitData]
//                         Z-Wave API Version: 9 (proprietary)
//                         node type:          controller
//                         supports timers:    false
//                         is secondary:       false
//                         is SUC:             true
//                         chip type:          7
//                         chip version:       0

// ACC-UZB3
// 12:21:11.141 DRIVER « [RES] [GetSerialApiInitData]
//                         Z-Wave API Version: 8 (proprietary)
//                         node type:          controller
//                         supports timers:    false
//                         is secondary:       false
//                         is SUC:             true
//                         chip type:          5
//                         chip version:       0

// UZB7, 7.11
// 12:33:14.211 DRIVER « [RES] [GetSerialApiInitData]
//                         Z-Wave API Version: 8 (proprietary)
//                         node type:          controller
//                         supports timers:    false
//                         is secondary:       false
//                         is SUC:             true
//                         chip type:          7
//                         chip version:       0

// FIXME: Move these into their own file
export interface GetLongRangeNodesRequestOptions extends MessageBaseOptions {
	segmentNumber: number;
}

@messageTypes(MessageType.Request, FunctionType.GetLongRangeNodes)
@expectedResponse(FunctionType.GetLongRangeNodes)
@priority(MessagePriority.Controller)
export class GetLongRangeNodesRequest extends Message {
	public constructor(
		host: ZWaveHost,
		options:
			| MessageDeserializationOptions
			| GetLongRangeNodesRequestOptions,
	) {
		super(host, options);

		if (gotDeserializationOptions(options)) {
			this.segmentNumber = this.payload[0];
		} else {
			this.segmentNumber = options.segmentNumber;
		}
	}

	public segmentNumber: number;

	public serialize(): Buffer {
		this.payload = Buffer.from([this.segmentNumber]);
		return super.serialize();
	}
}

export interface GetLongRangeNodesResponseOptions extends MessageBaseOptions {
	moreNodes: boolean;
	segmentNumber: number;
	nodeIds: number[];
}

@messageTypes(MessageType.Response, FunctionType.GetLongRangeNodes)
export class GetLongRangeNodesResponse extends Message {
	public constructor(
		host: ZWaveHost,
		options:
			| MessageDeserializationOptions
			| GetLongRangeNodesResponseOptions,
	) {
		super(host, options);

		if (gotDeserializationOptions(options)) {
			this.moreNodes = this.payload[0] != 0;
			this.segmentNumber = this.payload[1];
			const listLength = this.payload[2];

			const listStart = 3;
			const listEnd = listStart + listLength;
			if (listEnd <= this.payload.length) {
				const nodeBitMask = this.payload.subarray(
					listStart,
					listEnd,
				);
				this.nodeIds = parseLongRangeNodeBitMask(
					nodeBitMask,
					this.listStartNode(),
				);
			} else {
				this.nodeIds = [];
			}
		} else {
			this.moreNodes = options.moreNodes;
			this.segmentNumber = options.segmentNumber;
			this.nodeIds = options.nodeIds;
		}
	}

	public moreNodes: boolean;
	public segmentNumber: number;
	public nodeIds: readonly number[];

	public serialize(): Buffer {
		this.payload = Buffer.allocUnsafe(
			3 + NUM_LR_NODEMASK_SEGMENT_BYTES,
		);

		this.payload[0] = this.moreNodes ? 1 : 0;
		this.payload[1] = this.segmentNumber;
		this.payload[2] = NUM_LR_NODEMASK_SEGMENT_BYTES;

		const nodeBitMask = encodeLongRangeNodeBitMask(
			this.nodeIds,
			this.listStartNode(),
		);
		nodeBitMask.copy(this.payload, 3);

		return super.serialize();
	}

	private listStartNode(): number {
		return 256 + NUM_LR_NODES_PER_SEGMENT * this.segmentNumber;
	}
}
