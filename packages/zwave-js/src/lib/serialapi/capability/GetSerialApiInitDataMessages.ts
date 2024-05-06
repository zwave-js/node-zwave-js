import {
	MAX_NODES,
	MessagePriority,
	NUM_NODEMASK_BYTES,
	NodeType,
	encodeBitMask,
	parseNodeBitMask,
} from "@zwave-js/core";
import {
	type UnknownZWaveChipType,
	getChipTypeAndVersion,
	getZWaveChipType,
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
