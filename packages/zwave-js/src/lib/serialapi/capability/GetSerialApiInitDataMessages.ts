import { NodeType, NUM_NODEMASK_BYTES } from "@zwave-js/core";
import { parseNodeBitMask } from "../../controller/NodeBitMask";
import {
	getZWaveChipType,
	UnknownZWaveChipType,
} from "../../controller/ZWaveChipTypes";
import type { Driver } from "../../driver/Driver";
import {
	FunctionType,
	MessagePriority,
	MessageType,
} from "../../message/Constants";
import {
	expectedResponse,
	Message,
	MessageDeserializationOptions,
	messageTypes,
	priority,
} from "../../message/Message";
import type { ZWaveApiVersion } from "../_Types";

@messageTypes(MessageType.Request, FunctionType.GetSerialApiInitData)
@expectedResponse(FunctionType.GetSerialApiInitData)
@priority(MessagePriority.Controller)
export class GetSerialApiInitDataRequest extends Message {}

@messageTypes(MessageType.Response, FunctionType.GetSerialApiInitData)
export class GetSerialApiInitDataResponse extends Message {
	public constructor(driver: Driver, options: MessageDeserializationOptions) {
		super(driver, options);

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
		this.initVersion = apiVersion;

		const capabilities = this.payload[1];
		if (this.zwaveApiVersion.kind === "official") {
			// The new "official" Host API specs sneakily switched the meaning of some flags
			this.nodeType =
				capabilities & 0b0001
					? NodeType.Controller
					: NodeType["End Node"];
			this.supportsTimers = !!(capabilities & 0b0010);
			this.isPrimary = !!(capabilities & 0b0100);
			this.isSIS = !!(capabilities & 0b1000);
		} else {
			this.nodeType =
				capabilities & 0b0001
					? NodeType["End Node"]
					: NodeType.Controller;
			this.supportsTimers = !!(capabilities & 0b0010);
			this.isPrimary = !(capabilities & 0b0100);
			this.isSIS = !!(capabilities & 0b1000);
		}

		let offset = 2;
		this.nodeIds = [];
		if (this.payload.length > offset) {
			const nodeListLength = this.payload[offset];
			// Controller Nodes MUST set this field to 29
			if (
				nodeListLength === NUM_NODEMASK_BYTES &&
				this.payload.length >= offset + 1 + nodeListLength
			) {
				const nodeBitMask = this.payload.slice(
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
	}

	/** @deprecated use {@link zwaveApiVersion} instead */
	public readonly initVersion: number;
	public readonly zwaveApiVersion: ZWaveApiVersion;

	public readonly isPrimary: boolean;
	public readonly nodeType: NodeType;
	public readonly supportsTimers: boolean;
	public readonly isSIS: boolean;

	public readonly nodeIds: readonly number[];

	public readonly zwaveChipType?: string | UnknownZWaveChipType;

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
