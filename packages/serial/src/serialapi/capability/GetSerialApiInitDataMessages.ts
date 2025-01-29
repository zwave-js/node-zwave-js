import {
	MAX_NODES,
	MessagePriority,
	NUM_NODEMASK_BYTES,
	NodeType,
	type SerialApiInitData,
	type ZWaveApiVersion,
	encodeBitMask,
	parseNodeBitMask,
} from "@zwave-js/core";
import {
	type UnknownZWaveChipType,
	getChipTypeAndVersion,
	getZWaveChipType,
} from "@zwave-js/core";
import {
	FunctionType,
	Message,
	type MessageBaseOptions,
	type MessageEncodingContext,
	type MessageParsingContext,
	type MessageRaw,
	MessageType,
	expectedResponse,
	messageTypes,
	priority,
} from "@zwave-js/serial";
import { Bytes } from "@zwave-js/shared/safe";

@messageTypes(MessageType.Request, FunctionType.GetSerialApiInitData)
@expectedResponse(FunctionType.GetSerialApiInitData)
@priority(MessagePriority.Controller)
export class GetSerialApiInitDataRequest extends Message {}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface GetSerialApiInitDataResponseOptions
	extends SerialApiInitData
{}

@messageTypes(MessageType.Response, FunctionType.GetSerialApiInitData)
export class GetSerialApiInitDataResponse extends Message {
	public constructor(
		options: GetSerialApiInitDataResponseOptions & MessageBaseOptions,
	) {
		super(options);

		this.zwaveApiVersion = options.zwaveApiVersion;
		this.isPrimary = options.isPrimary;
		this.nodeType = options.nodeType;
		this.supportsTimers = options.supportsTimers;
		this.isSIS = options.isSIS;
		this.nodeIds = options.nodeIds;
		this.zwaveChipType = options.zwaveChipType;
	}

	public static from(
		raw: MessageRaw,
		_ctx: MessageParsingContext,
	): GetSerialApiInitDataResponse {
		const apiVersion = raw.payload[0];
		let zwaveApiVersion: ZWaveApiVersion;

		if (apiVersion < 10) {
			zwaveApiVersion = {
				kind: "legacy",
				version: apiVersion,
			};
		} else {
			// this module uses the officially specified Host API
			zwaveApiVersion = {
				kind: "official",
				version: apiVersion - 9,
			};
		}

		const capabilities = raw.payload[1];
		// The new "official" Host API specs incorrectly switched the meaning of some flags
		// Apparently this was never intended, and the firmware correctly uses the "old" encoding.
		// https://community.silabs.com/s/question/0D58Y00009qjEghSAE/bug-in-firmware-7191-get-init-data-response-does-not-match-host-api-specification?language=en_US
		const nodeType: NodeType = capabilities & 0b0001
			? NodeType["End Node"]
			: NodeType.Controller;
		const supportsTimers = !!(capabilities & 0b0010);
		const isPrimary = !(capabilities & 0b0100);
		const isSIS = !!(capabilities & 0b1000);
		let offset = 2;
		let nodeIds: number[] = [];
		if (raw.payload.length > offset) {
			const nodeListLength = raw.payload[offset];
			// Controller Nodes MUST set this field to 29
			if (
				nodeListLength === NUM_NODEMASK_BYTES
				&& raw.payload.length >= offset + 1 + nodeListLength
			) {
				const nodeBitMask = raw.payload.subarray(
					offset + 1,
					offset + 1 + nodeListLength,
				);
				nodeIds = parseNodeBitMask(nodeBitMask);
			}
			offset += 1 + nodeListLength;
		}

		// these might not be present:
		const chipType = raw.payload[offset];
		const chipVersion = raw.payload[offset + 1];
		let zwaveChipType: string | UnknownZWaveChipType | undefined;

		if (chipType != undefined && chipVersion != undefined) {
			zwaveChipType = getZWaveChipType(chipType, chipVersion);
		}

		return new this({
			zwaveApiVersion,
			nodeType,
			supportsTimers,
			isPrimary,
			isSIS,
			nodeIds,
			zwaveChipType,
		});
	}

	public zwaveApiVersion: ZWaveApiVersion;

	public isPrimary: boolean;
	public nodeType: NodeType;
	public supportsTimers: boolean;
	public isSIS: boolean;

	public nodeIds: readonly number[];

	public zwaveChipType?: string | UnknownZWaveChipType;

	public serialize(ctx: MessageEncodingContext): Promise<Bytes> {
		let chipType: UnknownZWaveChipType | undefined;
		if (typeof this.zwaveChipType === "string") {
			chipType = getChipTypeAndVersion(this.zwaveChipType);
		} else {
			chipType = this.zwaveChipType;
		}

		this.payload = new Bytes(
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
		this.payload.set(nodeBitMask, 3);

		if (chipType) {
			this.payload[3 + NUM_NODEMASK_BYTES] = chipType.type;
			this.payload[3 + NUM_NODEMASK_BYTES + 1] = chipType.version;
		}

		return super.serialize(ctx);
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
