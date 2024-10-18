import {
	type BasicDeviceClass,
	CommandClasses,
	type DataRate,
	type FLiRS,
	MAX_NODES,
	MAX_REPEATERS,
	type NodeInformationFrame,
	type NodeProtocolInfoAndDeviceClass,
	type NodeType,
	type ProtocolVersion,
	ZWaveDataRate,
	ZWaveError,
	ZWaveErrorCodes,
	encodeBitMask,
	encodeNodeInformationFrame,
	encodeNodeProtocolInfoAndDeviceClass,
	parseBitMask,
	parseNodeInformationFrame,
	parseNodeProtocolInfoAndDeviceClass,
	validatePayload,
} from "@zwave-js/core";
import type { CCEncodingContext } from "@zwave-js/host";
import {
	type CCCommandOptions,
	CommandClass,
	type CommandClassDeserializationOptions,
} from "../lib/CommandClass";
import {
	CCCommand,
	commandClass,
	expectedCCResponse,
	implementedVersion,
} from "../lib/CommandClassDecorators";
import {
	type NetworkTransferStatus,
	WakeUpTime,
	ZWaveProtocolCommand,
	parseWakeUpTime,
} from "../lib/_Types";

enum DataRateBitmask {
	"9k6" = 0b001,
	"40k" = 0b010,
	"100k" = 0b100,
}

function dataRate2Bitmask(dataRate: ZWaveDataRate): DataRateBitmask {
	return dataRate === ZWaveDataRate["100k"]
		? DataRateBitmask["100k"]
		: dataRate === ZWaveDataRate["40k"]
		? DataRateBitmask["40k"]
		: DataRateBitmask["9k6"];
}

function bitmask2DataRate(mask: DataRateBitmask): ZWaveDataRate {
	return mask === DataRateBitmask["100k"]
		? ZWaveDataRate["100k"]
		: mask === DataRateBitmask["40k"]
		? ZWaveDataRate["40k"]
		: ZWaveDataRate["9k6"];
}

@commandClass(CommandClasses["Z-Wave Protocol"])
@implementedVersion(1)
export class ZWaveProtocolCC extends CommandClass {
	declare ccCommand: ZWaveProtocolCommand;
}

// @publicAPI
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface ZWaveProtocolCCNodeInformationFrameOptions
	extends NodeInformationFrame
{}

@CCCommand(ZWaveProtocolCommand.NodeInformationFrame)
export class ZWaveProtocolCCNodeInformationFrame extends ZWaveProtocolCC
	implements NodeInformationFrame
{
	public constructor(
		options: ZWaveProtocolCCNodeInformationFrameOptions & CCCommandOptions,
	) {
		super(options);

		this.basicDeviceClass = options.basicDeviceClass;
		this.genericDeviceClass = options.genericDeviceClass;
		this.specificDeviceClass = options.specificDeviceClass;
		this.isListening = options.isListening;
		this.isFrequentListening = options.isFrequentListening;
		this.isRouting = options.isRouting;
		this.supportedDataRates = options.supportedDataRates;
		this.protocolVersion = options.protocolVersion;
		this.optionalFunctionality = options.optionalFunctionality;
		this.nodeType = options.nodeType;
		this.supportsSecurity = options.supportsSecurity;
		this.supportsBeaming = options.supportsBeaming;
		this.supportedCCs = options.supportedCCs;
	}

	public static parse(
		payload: Buffer,
		options: CommandClassDeserializationOptions,
	): ZWaveProtocolCCNodeInformationFrame {
		const nif = parseNodeInformationFrame(payload);

		return new ZWaveProtocolCCNodeInformationFrame({
			nodeId: options.context.sourceNodeId,
			...nif,
		});
	}

	public basicDeviceClass: BasicDeviceClass;
	public genericDeviceClass: number;
	public specificDeviceClass: number;
	public isListening: boolean;
	public isFrequentListening: FLiRS;
	public isRouting: boolean;
	public supportedDataRates: DataRate[];
	public protocolVersion: ProtocolVersion;
	public optionalFunctionality: boolean;
	public nodeType: NodeType;
	public supportsSecurity: boolean;
	public supportsBeaming: boolean;
	public supportedCCs: CommandClasses[];

	public serialize(ctx: CCEncodingContext): Buffer {
		this.payload = encodeNodeInformationFrame(this);
		return super.serialize(ctx);
	}
}

@CCCommand(ZWaveProtocolCommand.RequestNodeInformationFrame)
@expectedCCResponse(ZWaveProtocolCCNodeInformationFrame)
export class ZWaveProtocolCCRequestNodeInformationFrame
	extends ZWaveProtocolCC
{}

// @publicAPI
export interface ZWaveProtocolCCAssignIDsOptions {
	assignedNodeId: number;
	homeId: number;
}

@CCCommand(ZWaveProtocolCommand.AssignIDs)
export class ZWaveProtocolCCAssignIDs extends ZWaveProtocolCC {
	public constructor(
		options: ZWaveProtocolCCAssignIDsOptions & CCCommandOptions,
	) {
		super(options);
		this.assignedNodeId = options.assignedNodeId;
		this.homeId = options.homeId;
	}

	public static parse(
		payload: Buffer,
		options: CommandClassDeserializationOptions,
	): ZWaveProtocolCCAssignIDs {
		validatePayload(payload.length >= 5);
		const assignedNodeId = payload[0];
		const homeId = payload.readUInt32BE(1);

		return new ZWaveProtocolCCAssignIDs({
			nodeId: options.context.sourceNodeId,
			assignedNodeId,
			homeId,
		});
	}

	public assignedNodeId: number;
	public homeId: number;

	public serialize(ctx: CCEncodingContext): Buffer {
		this.payload = Buffer.allocUnsafe(5);
		this.payload[0] = this.assignedNodeId;
		this.payload.writeUInt32BE(this.homeId, 1);
		return super.serialize(ctx);
	}
}

// @publicAPI
export interface ZWaveProtocolCCFindNodesInRangeOptions {
	candidateNodeIds: number[];
	wakeUpTime: WakeUpTime;
	dataRate?: ZWaveDataRate;
}

@CCCommand(ZWaveProtocolCommand.FindNodesInRange)
export class ZWaveProtocolCCFindNodesInRange extends ZWaveProtocolCC {
	public constructor(
		options: ZWaveProtocolCCFindNodesInRangeOptions & CCCommandOptions,
	) {
		super(options);
		this.candidateNodeIds = options.candidateNodeIds;
		this.wakeUpTime = options.wakeUpTime;
		this.dataRate = options.dataRate ?? ZWaveDataRate["9k6"];
	}

	public static parse(
		payload: Buffer,
		options: CommandClassDeserializationOptions,
	): ZWaveProtocolCCFindNodesInRange {
		validatePayload(payload.length >= 1);
		const speedPresent = payload[0] & 0b1000_0000;
		const bitmaskLength = payload[0] & 0b0001_1111;

		validatePayload(payload.length >= 1 + bitmaskLength);
		const candidateNodeIds = parseBitMask(
			payload.subarray(1, 1 + bitmaskLength),
		);
		const rest = payload.subarray(1 + bitmaskLength);

		let dataRate: ZWaveDataRate;
		let wakeUpTime: WakeUpTime;
		if (speedPresent) {
			validatePayload(rest.length >= 1);
			if (rest.length === 1) {
				dataRate = rest[0] & 0b111;
				wakeUpTime = WakeUpTime.None;
			} else if (rest.length === 2) {
				wakeUpTime = parseWakeUpTime(rest[0]);
				dataRate = rest[1] & 0b111;
			} else {
				validatePayload.fail("Invalid payload length");
			}
		} else if (rest.length >= 1) {
			wakeUpTime = parseWakeUpTime(rest[0]);
			dataRate = ZWaveDataRate["9k6"];
		} else {
			wakeUpTime = WakeUpTime.None;
			dataRate = ZWaveDataRate["9k6"];
		}

		return new ZWaveProtocolCCFindNodesInRange({
			nodeId: options.context.sourceNodeId,
			candidateNodeIds,
			dataRate,
			wakeUpTime,
		});
	}

	public candidateNodeIds: number[];
	public wakeUpTime: WakeUpTime;
	public dataRate: ZWaveDataRate;

	public serialize(ctx: CCEncodingContext): Buffer {
		const nodesBitmask = encodeBitMask(this.candidateNodeIds, MAX_NODES);
		const speedAndLength = 0b1000_0000 | nodesBitmask.length;
		this.payload = Buffer.concat([
			Buffer.from([speedAndLength]),
			nodesBitmask,
			Buffer.from([this.wakeUpTime, this.dataRate]),
		]);
		return super.serialize(ctx);
	}
}

// @publicAPI
export interface ZWaveProtocolCCRangeInfoOptions {
	neighborNodeIds: number[];
	wakeUpTime?: WakeUpTime;
}

@CCCommand(ZWaveProtocolCommand.RangeInfo)
export class ZWaveProtocolCCRangeInfo extends ZWaveProtocolCC {
	public constructor(
		options: ZWaveProtocolCCRangeInfoOptions & CCCommandOptions,
	) {
		super(options);
		this.neighborNodeIds = options.neighborNodeIds;
		this.wakeUpTime = options.wakeUpTime;
	}

	public static parse(
		payload: Buffer,
		options: CommandClassDeserializationOptions,
	): ZWaveProtocolCCRangeInfo {
		validatePayload(payload.length >= 1);
		const bitmaskLength = payload[0] & 0b0001_1111;

		validatePayload(payload.length >= 1 + bitmaskLength);
		const neighborNodeIds = parseBitMask(
			payload.subarray(1, 1 + bitmaskLength),
		);

		let wakeUpTime: WakeUpTime | undefined;
		if (payload.length >= 2 + bitmaskLength) {
			wakeUpTime = parseWakeUpTime(
				payload[1 + bitmaskLength],
			);
		}

		return new ZWaveProtocolCCRangeInfo({
			nodeId: options.context.sourceNodeId,
			neighborNodeIds,
			wakeUpTime,
		});
	}

	public neighborNodeIds: number[];
	public wakeUpTime?: WakeUpTime;

	public serialize(ctx: CCEncodingContext): Buffer {
		const nodesBitmask = encodeBitMask(this.neighborNodeIds, MAX_NODES);
		this.payload = Buffer.concat([
			Buffer.from([nodesBitmask.length]),
			nodesBitmask,
			this.wakeUpTime != undefined
				? Buffer.from([this.wakeUpTime])
				: Buffer.alloc(0),
		]);
		return super.serialize(ctx);
	}
}

@CCCommand(ZWaveProtocolCommand.GetNodesInRange)
@expectedCCResponse(ZWaveProtocolCCRangeInfo)
export class ZWaveProtocolCCGetNodesInRange extends ZWaveProtocolCC {}

// @publicAPI
export interface ZWaveProtocolCCCommandCompleteOptions {
	sequenceNumber: number;
}

@CCCommand(ZWaveProtocolCommand.CommandComplete)
export class ZWaveProtocolCCCommandComplete extends ZWaveProtocolCC {
	public constructor(
		options: ZWaveProtocolCCCommandCompleteOptions & CCCommandOptions,
	) {
		super(options);
		this.sequenceNumber = options.sequenceNumber;
	}

	public static parse(
		payload: Buffer,
		options: CommandClassDeserializationOptions,
	): ZWaveProtocolCCCommandComplete {
		validatePayload(payload.length >= 1);
		const sequenceNumber = payload[0];

		return new ZWaveProtocolCCCommandComplete({
			nodeId: options.context.sourceNodeId,
			sequenceNumber,
		});
	}

	public sequenceNumber: number;

	public serialize(ctx: CCEncodingContext): Buffer {
		this.payload = Buffer.from([this.sequenceNumber]);
		return super.serialize(ctx);
	}
}

// @publicAPI
export interface ZWaveProtocolCCTransferPresentationOptions {
	supportsNWI: boolean;
	includeNode: boolean;
	excludeNode: boolean;
}

@CCCommand(ZWaveProtocolCommand.TransferPresentation)
export class ZWaveProtocolCCTransferPresentation extends ZWaveProtocolCC {
	public constructor(
		options: ZWaveProtocolCCTransferPresentationOptions & CCCommandOptions,
	) {
		super(options);
		if (options.includeNode && options.excludeNode) {
			throw new ZWaveError(
				`${this.constructor.name}: the includeNode and excludeNode options cannot both be true`,
				ZWaveErrorCodes.Argument_Invalid,
			);
		}
		this.supportsNWI = options.supportsNWI;
		this.includeNode = options.includeNode;
		this.excludeNode = options.excludeNode;
	}

	public static parse(
		payload: Buffer,
		options: CommandClassDeserializationOptions,
	): ZWaveProtocolCCTransferPresentation {
		validatePayload(payload.length >= 1);
		const option = payload[0];
		const supportsNWI = !!(option & 0b0001);
		const excludeNode = !!(option & 0b0010);
		const includeNode = !!(option & 0b0100);

		return new ZWaveProtocolCCTransferPresentation({
			nodeId: options.context.sourceNodeId,
			supportsNWI,
			excludeNode,
			includeNode,
		});
	}

	public supportsNWI: boolean;
	public includeNode: boolean;
	public excludeNode: boolean;

	public serialize(ctx: CCEncodingContext): Buffer {
		this.payload = Buffer.from([
			(this.supportsNWI ? 0b0001 : 0)
			| (this.excludeNode ? 0b0010 : 0)
			| (this.includeNode ? 0b0100 : 0),
		]);
		return super.serialize(ctx);
	}
}

// @publicAPI
export interface ZWaveProtocolCCTransferNodeInformationOptions
	extends NodeProtocolInfoAndDeviceClass
{
	sequenceNumber: number;
	sourceNodeId: number;
}

@CCCommand(ZWaveProtocolCommand.TransferNodeInformation)
export class ZWaveProtocolCCTransferNodeInformation extends ZWaveProtocolCC
	implements NodeProtocolInfoAndDeviceClass
{
	public constructor(
		options:
			& ZWaveProtocolCCTransferNodeInformationOptions
			& CCCommandOptions,
	) {
		super(options);

		this.sequenceNumber = options.sequenceNumber;
		this.sourceNodeId = options.sourceNodeId;

		this.basicDeviceClass = options.basicDeviceClass;
		this.genericDeviceClass = options.genericDeviceClass;
		this.specificDeviceClass = options.specificDeviceClass;
		this.isListening = options.isListening;
		this.isFrequentListening = options.isFrequentListening;
		this.isRouting = options.isRouting;
		this.supportedDataRates = options.supportedDataRates;
		this.protocolVersion = options.protocolVersion;
		this.optionalFunctionality = options.optionalFunctionality;
		this.nodeType = options.nodeType;
		this.supportsSecurity = options.supportsSecurity;
		this.supportsBeaming = options.supportsBeaming;
	}

	public static parse(
		payload: Buffer,
		options: CommandClassDeserializationOptions,
	): ZWaveProtocolCCTransferNodeInformation {
		validatePayload(payload.length >= 2);
		const sequenceNumber = payload[0];
		const sourceNodeId = payload[1];

		const { info } = parseNodeProtocolInfoAndDeviceClass(
			payload.subarray(2),
		);

		return new ZWaveProtocolCCTransferNodeInformation({
			nodeId: options.context.sourceNodeId,
			sequenceNumber,
			sourceNodeId,
			...info,
		});
	}

	public sequenceNumber: number;
	public sourceNodeId: number;
	public basicDeviceClass: BasicDeviceClass;
	public genericDeviceClass: number;
	public specificDeviceClass: number;
	public isListening: boolean;
	public isFrequentListening: FLiRS;
	public isRouting: boolean;
	public supportedDataRates: DataRate[];
	public protocolVersion: ProtocolVersion;
	public optionalFunctionality: boolean;
	public nodeType: NodeType;
	public supportsSecurity: boolean;
	public supportsBeaming: boolean;

	public serialize(ctx: CCEncodingContext): Buffer {
		this.payload = Buffer.concat([
			Buffer.from([this.sequenceNumber, this.sourceNodeId]),
			encodeNodeProtocolInfoAndDeviceClass(this),
		]);
		return super.serialize(ctx);
	}
}

// @publicAPI
export interface ZWaveProtocolCCTransferRangeInformationOptions {
	sequenceNumber: number;
	testedNodeId: number;
	neighborNodeIds: number[];
}

@CCCommand(ZWaveProtocolCommand.TransferRangeInformation)
export class ZWaveProtocolCCTransferRangeInformation extends ZWaveProtocolCC {
	public constructor(
		options:
			& ZWaveProtocolCCTransferRangeInformationOptions
			& CCCommandOptions,
	) {
		super(options);
		this.sequenceNumber = options.sequenceNumber;
		this.testedNodeId = options.testedNodeId;
		this.neighborNodeIds = options.neighborNodeIds;
	}

	public static parse(
		payload: Buffer,
		options: CommandClassDeserializationOptions,
	): ZWaveProtocolCCTransferRangeInformation {
		validatePayload(payload.length >= 3);
		const sequenceNumber = payload[0];
		const testedNodeId = payload[1];
		const bitmaskLength = payload[2];

		validatePayload(payload.length >= 3 + bitmaskLength);
		const neighborNodeIds = parseBitMask(
			payload.subarray(3, 3 + bitmaskLength),
		);

		return new ZWaveProtocolCCTransferRangeInformation({
			nodeId: options.context.sourceNodeId,
			sequenceNumber,
			testedNodeId,
			neighborNodeIds,
		});
	}

	public sequenceNumber: number;
	public testedNodeId: number;
	public neighborNodeIds: number[];

	public serialize(ctx: CCEncodingContext): Buffer {
		const nodesBitmask = encodeBitMask(this.neighborNodeIds, MAX_NODES);
		this.payload = Buffer.concat([
			Buffer.from([
				this.sequenceNumber,
				this.testedNodeId,
				nodesBitmask.length,
			]),
			nodesBitmask,
		]);
		return super.serialize(ctx);
	}
}

// @publicAPI
export interface ZWaveProtocolCCTransferEndOptions {
	status: NetworkTransferStatus;
}

@CCCommand(ZWaveProtocolCommand.TransferEnd)
export class ZWaveProtocolCCTransferEnd extends ZWaveProtocolCC {
	public constructor(
		options: ZWaveProtocolCCTransferEndOptions & CCCommandOptions,
	) {
		super(options);
		this.status = options.status;
	}

	public static parse(
		payload: Buffer,
		options: CommandClassDeserializationOptions,
	): ZWaveProtocolCCTransferEnd {
		validatePayload(payload.length >= 1);
		const status: NetworkTransferStatus = payload[0];

		return new ZWaveProtocolCCTransferEnd({
			nodeId: options.context.sourceNodeId,
			status,
		});
	}

	public status: NetworkTransferStatus;

	public serialize(ctx: CCEncodingContext): Buffer {
		this.payload = Buffer.from([this.status]);
		return super.serialize(ctx);
	}
}

// @publicAPI
export interface ZWaveProtocolCCAssignReturnRouteOptions {
	destinationNodeId: number;
	routeIndex: number;
	repeaters: number[];
	destinationWakeUp: WakeUpTime;
	destinationSpeed: ZWaveDataRate;
}

@CCCommand(ZWaveProtocolCommand.AssignReturnRoute)
export class ZWaveProtocolCCAssignReturnRoute extends ZWaveProtocolCC {
	public constructor(
		options: ZWaveProtocolCCAssignReturnRouteOptions & CCCommandOptions,
	) {
		super(options);
		if (options.repeaters.length > MAX_REPEATERS) {
			throw new ZWaveError(
				`${this.constructor.name}: too many repeaters`,
				ZWaveErrorCodes.Argument_Invalid,
			);
		}

		this.destinationNodeId = options.destinationNodeId;
		this.routeIndex = options.routeIndex;
		this.repeaters = options.repeaters;
		this.destinationWakeUp = options.destinationWakeUp;
		this.destinationSpeed = options.destinationSpeed;
	}

	public static parse(
		payload: Buffer,
		options: CommandClassDeserializationOptions,
	): ZWaveProtocolCCAssignReturnRoute {
		validatePayload(payload.length >= 7);
		const destinationNodeId = payload[0];
		const routeIndex = payload[1] >>> 4;
		const numRepeaters = payload[1] & 0b1111;
		const repeaters = [...payload.subarray(2, 2 + numRepeaters)];
		const speedAndWakeup = payload[2 + numRepeaters];
		const destinationSpeed = bitmask2DataRate(
			(speedAndWakeup >>> 3) & 0b111,
		);
		const destinationWakeUp: WakeUpTime = (speedAndWakeup >>> 1) & 0b11;

		return new ZWaveProtocolCCAssignReturnRoute({
			nodeId: options.context.sourceNodeId,
			destinationNodeId,
			routeIndex,
			repeaters,
			destinationSpeed,
			destinationWakeUp,
		});
	}

	public destinationNodeId: number;
	public routeIndex: number;
	public repeaters: number[];
	public destinationWakeUp: WakeUpTime;
	public destinationSpeed: ZWaveDataRate;

	public serialize(ctx: CCEncodingContext): Buffer {
		const routeByte = (this.routeIndex << 4) | this.repeaters.length;
		const speedMask = dataRate2Bitmask(this.destinationSpeed);
		const speedByte = (speedMask << 3) | (this.destinationWakeUp << 1);
		this.payload = Buffer.from([
			this.destinationNodeId,
			routeByte,
			...this.repeaters,
			speedByte,
		]);
		return super.serialize(ctx);
	}
}

// @publicAPI
export interface ZWaveProtocolCCNewNodeRegisteredOptions
	extends NodeInformationFrame
{
	newNodeId: number;
}

@CCCommand(ZWaveProtocolCommand.NewNodeRegistered)
export class ZWaveProtocolCCNewNodeRegistered extends ZWaveProtocolCC
	implements NodeInformationFrame
{
	public constructor(
		options: ZWaveProtocolCCNewNodeRegisteredOptions & CCCommandOptions,
	) {
		super(options);

		this.newNodeId = options.newNodeId;
		this.basicDeviceClass = options.basicDeviceClass;
		this.genericDeviceClass = options.genericDeviceClass;
		this.specificDeviceClass = options.specificDeviceClass;
		this.isListening = options.isListening;
		this.isFrequentListening = options.isFrequentListening;
		this.isRouting = options.isRouting;
		this.supportedDataRates = options.supportedDataRates;
		this.protocolVersion = options.protocolVersion;
		this.optionalFunctionality = options.optionalFunctionality;
		this.nodeType = options.nodeType;
		this.supportsSecurity = options.supportsSecurity;
		this.supportsBeaming = options.supportsBeaming;
		this.supportedCCs = options.supportedCCs;
	}

	public static parse(
		payload: Buffer,
		options: CommandClassDeserializationOptions,
	): ZWaveProtocolCCNewNodeRegistered {
		validatePayload(payload.length >= 1);
		const newNodeId = payload[0];

		const nif = parseNodeInformationFrame(payload.subarray(1));

		return new ZWaveProtocolCCNewNodeRegistered({
			nodeId: options.context.sourceNodeId,
			newNodeId,
			...nif,
		});
	}

	public newNodeId: number;
	public basicDeviceClass: BasicDeviceClass;
	public genericDeviceClass: number;
	public specificDeviceClass: number;
	public isListening: boolean;
	public isFrequentListening: FLiRS;
	public isRouting: boolean;
	public supportedDataRates: DataRate[];
	public protocolVersion: ProtocolVersion;
	public optionalFunctionality: boolean;
	public nodeType: NodeType;
	public supportsSecurity: boolean;
	public supportsBeaming: boolean;
	public supportedCCs: CommandClasses[];

	public serialize(ctx: CCEncodingContext): Buffer {
		this.payload = Buffer.concat([
			Buffer.from([this.newNodeId]),
			encodeNodeInformationFrame(this),
		]);
		return super.serialize(ctx);
	}
}

// @publicAPI
export interface ZWaveProtocolCCNewRangeRegisteredOptions {
	testedNodeId: number;
	neighborNodeIds: number[];
}

@CCCommand(ZWaveProtocolCommand.NewRangeRegistered)
export class ZWaveProtocolCCNewRangeRegistered extends ZWaveProtocolCC {
	public constructor(
		options: ZWaveProtocolCCNewRangeRegisteredOptions & CCCommandOptions,
	) {
		super(options);
		this.testedNodeId = options.testedNodeId;
		this.neighborNodeIds = options.neighborNodeIds;
	}

	public static parse(
		payload: Buffer,
		options: CommandClassDeserializationOptions,
	): ZWaveProtocolCCNewRangeRegistered {
		validatePayload(payload.length >= 2);
		const testedNodeId = payload[0];
		const numNeighbors = payload[1];
		const neighborNodeIds = [
			...payload.subarray(2, 2 + numNeighbors),
		];

		return new ZWaveProtocolCCNewRangeRegistered({
			nodeId: options.context.sourceNodeId,
			testedNodeId,
			neighborNodeIds,
		});
	}

	public testedNodeId: number;
	public neighborNodeIds: number[];

	public serialize(ctx: CCEncodingContext): Buffer {
		const nodesBitmask = encodeBitMask(this.neighborNodeIds, MAX_NODES);
		this.payload = Buffer.concat([
			Buffer.from([this.testedNodeId, nodesBitmask.length]),
			nodesBitmask,
		]);
		return super.serialize(ctx);
	}
}

// @publicAPI
export interface ZWaveProtocolCCTransferNewPrimaryControllerCompleteOptions {
	genericDeviceClass: number;
}

@CCCommand(ZWaveProtocolCommand.TransferNewPrimaryControllerComplete)
export class ZWaveProtocolCCTransferNewPrimaryControllerComplete
	extends ZWaveProtocolCC
{
	public constructor(
		options:
			& ZWaveProtocolCCTransferNewPrimaryControllerCompleteOptions
			& CCCommandOptions,
	) {
		super(options);
		this.genericDeviceClass = options.genericDeviceClass;
	}

	public static parse(
		payload: Buffer,
		options: CommandClassDeserializationOptions,
	): ZWaveProtocolCCTransferNewPrimaryControllerComplete {
		validatePayload(payload.length >= 1);
		const genericDeviceClass = payload[0];

		return new ZWaveProtocolCCTransferNewPrimaryControllerComplete({
			nodeId: options.context.sourceNodeId,
			genericDeviceClass,
		});
	}

	public genericDeviceClass: number;

	public serialize(ctx: CCEncodingContext): Buffer {
		this.payload = Buffer.from([this.genericDeviceClass]);
		return super.serialize(ctx);
	}
}

@CCCommand(ZWaveProtocolCommand.AutomaticControllerUpdateStart)
export class ZWaveProtocolCCAutomaticControllerUpdateStart
	extends ZWaveProtocolCC
{}

// @publicAPI
export interface ZWaveProtocolCCSUCNodeIDOptions {
	sucNodeId: number;
	isSIS: boolean;
}

@CCCommand(ZWaveProtocolCommand.SUCNodeID)
export class ZWaveProtocolCCSUCNodeID extends ZWaveProtocolCC {
	public constructor(
		options: ZWaveProtocolCCSUCNodeIDOptions & CCCommandOptions,
	) {
		super(options);
		this.sucNodeId = options.sucNodeId;
		this.isSIS = options.isSIS;
	}

	public static parse(
		payload: Buffer,
		options: CommandClassDeserializationOptions,
	): ZWaveProtocolCCSUCNodeID {
		validatePayload(payload.length >= 1);
		const sucNodeId = payload[0];
		const capabilities = payload[1] ?? 0;
		const isSIS = !!(capabilities & 0b1);

		return new ZWaveProtocolCCSUCNodeID({
			nodeId: options.context.sourceNodeId,
			sucNodeId,
			isSIS,
		});
	}

	public sucNodeId: number;
	public isSIS: boolean;

	public serialize(ctx: CCEncodingContext): Buffer {
		this.payload = Buffer.from([this.sucNodeId, this.isSIS ? 0b1 : 0]);
		return super.serialize(ctx);
	}
}

// @publicAPI
export interface ZWaveProtocolCCSetSUCOptions {
	enableSIS: boolean;
}

@CCCommand(ZWaveProtocolCommand.SetSUC)
export class ZWaveProtocolCCSetSUC extends ZWaveProtocolCC {
	public constructor(
		options: ZWaveProtocolCCSetSUCOptions & CCCommandOptions,
	) {
		super(options);
		this.enableSIS = options.enableSIS;
	}

	public static parse(
		payload: Buffer,
		options: CommandClassDeserializationOptions,
	): ZWaveProtocolCCSetSUC {
		validatePayload(payload.length >= 2);
		// Byte 0 must be 0x01 or ignored
		const capabilities = payload[1] ?? 0;
		const enableSIS = !!(capabilities & 0b1);

		return new ZWaveProtocolCCSetSUC({
			nodeId: options.context.sourceNodeId,
			enableSIS,
		});
	}

	public enableSIS: boolean;

	public serialize(ctx: CCEncodingContext): Buffer {
		this.payload = Buffer.from([0x01, this.enableSIS ? 0b1 : 0]);
		return super.serialize(ctx);
	}
}

// @publicAPI
export interface ZWaveProtocolCCSetSUCAckOptions {
	accepted: boolean;
	isSIS: boolean;
}

@CCCommand(ZWaveProtocolCommand.SetSUCAck)
export class ZWaveProtocolCCSetSUCAck extends ZWaveProtocolCC {
	public constructor(
		options: ZWaveProtocolCCSetSUCAckOptions & CCCommandOptions,
	) {
		super(options);
		this.accepted = options.accepted;
		this.isSIS = options.isSIS;
	}

	public static parse(
		payload: Buffer,
		options: CommandClassDeserializationOptions,
	): ZWaveProtocolCCSetSUCAck {
		validatePayload(payload.length >= 2);
		const accepted = payload[0] === 0x01;
		const capabilities = payload[1] ?? 0;
		const isSIS = !!(capabilities & 0b1);

		return new ZWaveProtocolCCSetSUCAck({
			nodeId: options.context.sourceNodeId,
			accepted,
			isSIS,
		});
	}

	public accepted: boolean;
	public isSIS: boolean;

	public serialize(ctx: CCEncodingContext): Buffer {
		this.payload = Buffer.from([
			this.accepted ? 0x01 : 0x00,
			this.isSIS ? 0b1 : 0,
		]);
		return super.serialize(ctx);
	}
}

@CCCommand(ZWaveProtocolCommand.AssignSUCReturnRoute)
export class ZWaveProtocolCCAssignSUCReturnRoute
	extends ZWaveProtocolCCAssignReturnRoute
{}

// @publicAPI
export interface ZWaveProtocolCCStaticRouteRequestOptions {
	nodeIds: number[];
}

@CCCommand(ZWaveProtocolCommand.StaticRouteRequest)
export class ZWaveProtocolCCStaticRouteRequest extends ZWaveProtocolCC {
	public constructor(
		options: ZWaveProtocolCCStaticRouteRequestOptions & CCCommandOptions,
	) {
		super(options);
		if (options.nodeIds.some((n) => n < 1 || n > MAX_NODES)) {
			throw new ZWaveError(
				`All node IDs must be between 1 and ${MAX_NODES}!`,
				ZWaveErrorCodes.Argument_Invalid,
			);
		}
		this.nodeIds = options.nodeIds;
	}

	public static parse(
		payload: Buffer,
		options: CommandClassDeserializationOptions,
	): ZWaveProtocolCCStaticRouteRequest {
		validatePayload(payload.length >= 5);
		const nodeIds = [...payload.subarray(0, 5)].filter(
			(id) => id > 0 && id <= MAX_NODES,
		);

		return new ZWaveProtocolCCStaticRouteRequest({
			nodeId: options.context.sourceNodeId,
			nodeIds,
		});
	}

	public nodeIds: number[];

	public serialize(ctx: CCEncodingContext): Buffer {
		this.payload = Buffer.alloc(5, 0);
		for (let i = 0; i < this.nodeIds.length && i < 5; i++) {
			this.payload[i] = this.nodeIds[i];
		}
		return super.serialize(ctx);
	}
}

// @publicAPI
export interface ZWaveProtocolCCLostOptions {
	lostNodeId: number;
}

@CCCommand(ZWaveProtocolCommand.Lost)
export class ZWaveProtocolCCLost extends ZWaveProtocolCC {
	public constructor(
		options: ZWaveProtocolCCLostOptions & CCCommandOptions,
	) {
		super(options);
		this.lostNodeId = options.lostNodeId;
	}

	public static parse(
		payload: Buffer,
		options: CommandClassDeserializationOptions,
	): ZWaveProtocolCCLost {
		validatePayload(payload.length >= 1);
		const lostNodeId = payload[0];

		return new ZWaveProtocolCCLost({
			nodeId: options.context.sourceNodeId,
			lostNodeId,
		});
	}

	public lostNodeId: number;

	public serialize(ctx: CCEncodingContext): Buffer {
		this.payload = Buffer.from([this.lostNodeId]);
		return super.serialize(ctx);
	}
}

// @publicAPI
export interface ZWaveProtocolCCAcceptLostOptions {
	accepted: boolean;
}

@CCCommand(ZWaveProtocolCommand.AcceptLost)
export class ZWaveProtocolCCAcceptLost extends ZWaveProtocolCC {
	public constructor(
		options: ZWaveProtocolCCAcceptLostOptions & CCCommandOptions,
	) {
		super(options);
		this.accepted = options.accepted;
	}

	public static parse(
		payload: Buffer,
		options: CommandClassDeserializationOptions,
	): ZWaveProtocolCCAcceptLost {
		validatePayload(payload.length >= 1);
		validatePayload(
			payload[0] === 0x04 || payload[0] === 0x05,
		);
		const accepted = payload[0] === 0x05;

		return new ZWaveProtocolCCAcceptLost({
			nodeId: options.context.sourceNodeId,
			accepted,
		});
	}

	public accepted: boolean;

	public serialize(ctx: CCEncodingContext): Buffer {
		this.payload = Buffer.from([this.accepted ? 0x05 : 0x04]);
		return super.serialize(ctx);
	}
}

// @publicAPI
export interface ZWaveProtocolCCNOPPowerOptions {
	powerDampening: number;
}

@CCCommand(ZWaveProtocolCommand.NOPPower)
export class ZWaveProtocolCCNOPPower extends ZWaveProtocolCC {
	public constructor(
		options: ZWaveProtocolCCNOPPowerOptions & CCCommandOptions,
	) {
		super(options);
		if (options.powerDampening < 0 || options.powerDampening > 14) {
			throw new ZWaveError(
				`${this.constructor.name}: power dampening must be between 0 and 14 dBm!`,
				ZWaveErrorCodes.Argument_Invalid,
			);
		}
		this.powerDampening = options.powerDampening;
	}

	public static parse(
		payload: Buffer,
		options: CommandClassDeserializationOptions,
	): ZWaveProtocolCCNOPPower {
		let powerDampening;

		if (payload.length >= 2) {
			// Ignore byte 0
			powerDampening = payload[1];
		} else if (payload.length === 1) {
			powerDampening = [
				0xf0,
				0xc8,
				0xa7,
				0x91,
				0x77,
				0x67,
				0x60,
				0x46,
				0x38,
				0x35,
				0x32,
				0x30,
				0x24,
				0x22,
				0x20,
			].indexOf(payload[0]);
			if (powerDampening === -1) powerDampening = 0;
		} else {
			validatePayload.fail("Invalid payload length!");
		}

		return new ZWaveProtocolCCNOPPower({
			nodeId: options.context.sourceNodeId,
			powerDampening,
		});
	}

	// Power dampening in (negative) dBm. A value of 2 means -2 dBm.
	public powerDampening: number;

	public serialize(ctx: CCEncodingContext): Buffer {
		this.payload = Buffer.from([0, this.powerDampening]);
		return super.serialize(ctx);
	}
}

// @publicAPI
export interface ZWaveProtocolCCReservedIDsOptions {
	reservedNodeIDs: number[];
}

@CCCommand(ZWaveProtocolCommand.ReservedIDs)
export class ZWaveProtocolCCReservedIDs extends ZWaveProtocolCC {
	public constructor(
		options: ZWaveProtocolCCReservedIDsOptions & CCCommandOptions,
	) {
		super(options);
		this.reservedNodeIDs = options.reservedNodeIDs;
	}

	public static parse(
		payload: Buffer,
		options: CommandClassDeserializationOptions,
	): ZWaveProtocolCCReservedIDs {
		validatePayload(payload.length >= 1);
		const numNodeIDs = payload[0];
		validatePayload(payload.length >= 1 + numNodeIDs);
		const reservedNodeIDs = [
			...payload.subarray(1, 1 + numNodeIDs),
		];

		return new ZWaveProtocolCCReservedIDs({
			nodeId: options.context.sourceNodeId,
			reservedNodeIDs,
		});
	}

	public reservedNodeIDs: number[];

	public serialize(ctx: CCEncodingContext): Buffer {
		this.payload = Buffer.from([
			this.reservedNodeIDs.length,
			...this.reservedNodeIDs,
		]);
		return super.serialize(ctx);
	}
}

// @publicAPI
export interface ZWaveProtocolCCReserveNodeIDsOptions {
	numNodeIDs: number;
}

@CCCommand(ZWaveProtocolCommand.ReserveNodeIDs)
@expectedCCResponse(ZWaveProtocolCCReservedIDs)
export class ZWaveProtocolCCReserveNodeIDs extends ZWaveProtocolCC {
	public constructor(
		options: ZWaveProtocolCCReserveNodeIDsOptions & CCCommandOptions,
	) {
		super(options);
		this.numNodeIDs = options.numNodeIDs;
	}

	public static parse(
		payload: Buffer,
		options: CommandClassDeserializationOptions,
	): ZWaveProtocolCCReserveNodeIDs {
		validatePayload(payload.length >= 1);
		const numNodeIDs = payload[0];

		return new ZWaveProtocolCCReserveNodeIDs({
			nodeId: options.context.sourceNodeId,
			numNodeIDs,
		});
	}

	public numNodeIDs: number;

	public serialize(ctx: CCEncodingContext): Buffer {
		this.payload = Buffer.from([this.numNodeIDs]);
		return super.serialize(ctx);
	}
}

// @publicAPI
export interface ZWaveProtocolCCNodesExistReplyOptions {
	nodeMaskType: number;
	nodeListUpdated: boolean;
}

@CCCommand(ZWaveProtocolCommand.NodesExistReply)
export class ZWaveProtocolCCNodesExistReply extends ZWaveProtocolCC {
	public constructor(
		options: ZWaveProtocolCCNodesExistReplyOptions & CCCommandOptions,
	) {
		super(options);
		this.nodeMaskType = options.nodeMaskType;
		this.nodeListUpdated = options.nodeListUpdated;
	}

	public static parse(
		payload: Buffer,
		options: CommandClassDeserializationOptions,
	): ZWaveProtocolCCNodesExistReply {
		validatePayload(payload.length >= 2);
		const nodeMaskType = payload[0];
		const nodeListUpdated = payload[1] === 0x01;

		return new ZWaveProtocolCCNodesExistReply({
			nodeId: options.context.sourceNodeId,
			nodeMaskType,
			nodeListUpdated,
		});
	}

	public nodeMaskType: number;
	public nodeListUpdated: boolean;

	public serialize(ctx: CCEncodingContext): Buffer {
		this.payload = Buffer.from([
			this.nodeMaskType,
			this.nodeListUpdated ? 0x01 : 0x00,
		]);
		return super.serialize(ctx);
	}
}

function testResponseForZWaveProtocolNodesExist(
	sent: ZWaveProtocolCCNodesExist,
	received: ZWaveProtocolCCNodesExistReply,
) {
	return received.nodeMaskType === sent.nodeMaskType;
}

// @publicAPI
export interface ZWaveProtocolCCNodesExistOptions {
	nodeMaskType: number;
	nodeIDs: number[];
}

@CCCommand(ZWaveProtocolCommand.NodesExist)
@expectedCCResponse(
	ZWaveProtocolCCNodesExistReply,
	testResponseForZWaveProtocolNodesExist,
)
export class ZWaveProtocolCCNodesExist extends ZWaveProtocolCC {
	public constructor(
		options: ZWaveProtocolCCNodesExistOptions & CCCommandOptions,
	) {
		super(options);
		this.nodeMaskType = options.nodeMaskType;
		this.nodeIDs = options.nodeIDs;
	}

	public static parse(
		payload: Buffer,
		options: CommandClassDeserializationOptions,
	): ZWaveProtocolCCNodesExist {
		validatePayload(payload.length >= 2);
		const nodeMaskType = payload[0];
		const numNodeIDs = payload[1];
		validatePayload(payload.length >= 2 + numNodeIDs);
		const nodeIDs = [...payload.subarray(2, 2 + numNodeIDs)];

		return new ZWaveProtocolCCNodesExist({
			nodeId: options.context.sourceNodeId,
			nodeMaskType,
			nodeIDs,
		});
	}

	public nodeMaskType: number;
	public nodeIDs: number[];

	public serialize(ctx: CCEncodingContext): Buffer {
		this.payload = Buffer.from([
			this.nodeMaskType,
			this.nodeIDs.length,
			...this.nodeIDs,
		]);
		return super.serialize(ctx);
	}
}

// @publicAPI
export interface ZWaveProtocolCCSetNWIModeOptions {
	enabled: boolean;
	timeoutMinutes?: number;
}

@CCCommand(ZWaveProtocolCommand.SetNWIMode)
export class ZWaveProtocolCCSetNWIMode extends ZWaveProtocolCC {
	public constructor(
		options: ZWaveProtocolCCSetNWIModeOptions & CCCommandOptions,
	) {
		super(options);
		this.enabled = options.enabled;
		this.timeoutMinutes = options.timeoutMinutes;
	}

	public static parse(
		payload: Buffer,
		options: CommandClassDeserializationOptions,
	): ZWaveProtocolCCSetNWIMode {
		validatePayload(payload.length >= 2);
		const enabled = payload[0] === 0x01;
		const timeoutMinutes: number | undefined = payload[1] || undefined;

		return new ZWaveProtocolCCSetNWIMode({
			nodeId: options.context.sourceNodeId,
			enabled,
			timeoutMinutes,
		});
	}

	public enabled: boolean;
	public timeoutMinutes?: number;

	public serialize(ctx: CCEncodingContext): Buffer {
		this.payload = Buffer.from([
			this.enabled ? 0x01 : 0x00,
			this.timeoutMinutes ?? 0x00,
		]);
		return super.serialize(ctx);
	}
}

@CCCommand(ZWaveProtocolCommand.ExcludeRequest)
export class ZWaveProtocolCCExcludeRequest
	extends ZWaveProtocolCCNodeInformationFrame
{}

// @publicAPI
export interface ZWaveProtocolCCAssignReturnRoutePriorityOptions {
	targetNodeId: number;
	routeNumber: number;
}

@CCCommand(ZWaveProtocolCommand.AssignReturnRoutePriority)
export class ZWaveProtocolCCAssignReturnRoutePriority extends ZWaveProtocolCC {
	public constructor(
		options:
			& ZWaveProtocolCCAssignReturnRoutePriorityOptions
			& CCCommandOptions,
	) {
		super(options);
		this.targetNodeId = options.targetNodeId;
		this.routeNumber = options.routeNumber;
	}

	public static parse(
		payload: Buffer,
		options: CommandClassDeserializationOptions,
	): ZWaveProtocolCCAssignReturnRoutePriority {
		validatePayload(payload.length >= 2);
		const targetNodeId = payload[0];
		const routeNumber = payload[1];

		return new ZWaveProtocolCCAssignReturnRoutePriority({
			nodeId: options.context.sourceNodeId,
			targetNodeId,
			routeNumber,
		});
	}

	public targetNodeId: number;
	public routeNumber: number;

	public serialize(ctx: CCEncodingContext): Buffer {
		this.payload = Buffer.from([this.targetNodeId, this.routeNumber]);
		return super.serialize(ctx);
	}
}

@CCCommand(ZWaveProtocolCommand.AssignSUCReturnRoutePriority)
export class ZWaveProtocolCCAssignSUCReturnRoutePriority
	extends ZWaveProtocolCCAssignReturnRoutePriority
{}

// @publicAPI
export interface ZWaveProtocolCCSmartStartIncludedNodeInformationOptions {
	nwiHomeId: Buffer;
}

@CCCommand(ZWaveProtocolCommand.SmartStartIncludedNodeInformation)
export class ZWaveProtocolCCSmartStartIncludedNodeInformation
	extends ZWaveProtocolCC
{
	public constructor(
		options:
			& ZWaveProtocolCCSmartStartIncludedNodeInformationOptions
			& CCCommandOptions,
	) {
		super(options);
		if (options.nwiHomeId.length !== 4) {
			throw new ZWaveError(
				`nwiHomeId must have length 4`,
				ZWaveErrorCodes.Argument_Invalid,
			);
		}
		this.nwiHomeId = options.nwiHomeId;
	}

	public static parse(
		payload: Buffer,
		options: CommandClassDeserializationOptions,
	): ZWaveProtocolCCSmartStartIncludedNodeInformation {
		validatePayload(payload.length >= 4);
		const nwiHomeId: Buffer = payload.subarray(0, 4);

		return new ZWaveProtocolCCSmartStartIncludedNodeInformation({
			nodeId: options.context.sourceNodeId,
			nwiHomeId,
		});
	}

	public nwiHomeId: Buffer;

	public serialize(ctx: CCEncodingContext): Buffer {
		this.payload = Buffer.from(this.nwiHomeId);
		return super.serialize(ctx);
	}
}

@CCCommand(ZWaveProtocolCommand.SmartStartPrime)
export class ZWaveProtocolCCSmartStartPrime
	extends ZWaveProtocolCCNodeInformationFrame
{}

@CCCommand(ZWaveProtocolCommand.SmartStartInclusionRequest)
export class ZWaveProtocolCCSmartStartInclusionRequest
	extends ZWaveProtocolCCNodeInformationFrame
{}
