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
import type { ZWaveHost } from "@zwave-js/host";
import {
	type CCCommandOptions,
	CommandClass,
	type CommandClassDeserializationOptions,
	gotDeserializationOptions,
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
export interface ZWaveProtocolCCNodeInformationFrameOptions
	extends CCCommandOptions, NodeInformationFrame
{}

@CCCommand(ZWaveProtocolCommand.NodeInformationFrame)
export class ZWaveProtocolCCNodeInformationFrame extends ZWaveProtocolCC
	implements NodeInformationFrame
{
	public constructor(
		host: ZWaveHost,
		options:
			| CommandClassDeserializationOptions
			| ZWaveProtocolCCNodeInformationFrameOptions,
	) {
		super(host, options);

		let nif: NodeInformationFrame;
		if (gotDeserializationOptions(options)) {
			nif = parseNodeInformationFrame(this.payload);
		} else {
			nif = options;
		}

		this.basicDeviceClass = nif.basicDeviceClass;
		this.genericDeviceClass = nif.genericDeviceClass;
		this.specificDeviceClass = nif.specificDeviceClass;
		this.isListening = nif.isListening;
		this.isFrequentListening = nif.isFrequentListening;
		this.isRouting = nif.isRouting;
		this.supportedDataRates = nif.supportedDataRates;
		this.protocolVersion = nif.protocolVersion;
		this.optionalFunctionality = nif.optionalFunctionality;
		this.nodeType = nif.nodeType;
		this.supportsSecurity = nif.supportsSecurity;
		this.supportsBeaming = nif.supportsBeaming;
		this.supportedCCs = nif.supportedCCs;
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

	public serialize(): Buffer {
		this.payload = encodeNodeInformationFrame(this);
		return super.serialize();
	}
}

@CCCommand(ZWaveProtocolCommand.RequestNodeInformationFrame)
@expectedCCResponse(ZWaveProtocolCCNodeInformationFrame)
export class ZWaveProtocolCCRequestNodeInformationFrame
	extends ZWaveProtocolCC
{}

// @publicAPI
export interface ZWaveProtocolCCAssignIDsOptions extends CCCommandOptions {
	assignedNodeId: number;
	homeId: number;
}

@CCCommand(ZWaveProtocolCommand.AssignIDs)
export class ZWaveProtocolCCAssignIDs extends ZWaveProtocolCC {
	public constructor(
		host: ZWaveHost,
		options:
			| CommandClassDeserializationOptions
			| ZWaveProtocolCCAssignIDsOptions,
	) {
		super(host, options);
		if (gotDeserializationOptions(options)) {
			validatePayload(this.payload.length >= 5);
			this.assignedNodeId = this.payload[0];
			this.homeId = this.payload.readUInt32BE(1);
		} else {
			this.assignedNodeId = options.assignedNodeId;
			this.homeId = options.homeId;
		}
	}

	public assignedNodeId: number;
	public homeId: number;

	public serialize(): Buffer {
		this.payload = Buffer.allocUnsafe(5);
		this.payload[0] = this.assignedNodeId;
		this.payload.writeUInt32BE(this.homeId, 1);
		return super.serialize();
	}
}

// @publicAPI
export interface ZWaveProtocolCCFindNodesInRangeOptions
	extends CCCommandOptions
{
	candidateNodeIds: number[];
	wakeUpTime: WakeUpTime;
	dataRate?: ZWaveDataRate;
}

@CCCommand(ZWaveProtocolCommand.FindNodesInRange)
export class ZWaveProtocolCCFindNodesInRange extends ZWaveProtocolCC {
	public constructor(
		host: ZWaveHost,
		options:
			| CommandClassDeserializationOptions
			| ZWaveProtocolCCFindNodesInRangeOptions,
	) {
		super(host, options);
		if (gotDeserializationOptions(options)) {
			validatePayload(this.payload.length >= 1);
			const speedPresent = this.payload[0] & 0b1000_0000;
			const bitmaskLength = this.payload[0] & 0b0001_1111;

			validatePayload(this.payload.length >= 1 + bitmaskLength);
			this.candidateNodeIds = parseBitMask(
				this.payload.subarray(1, 1 + bitmaskLength),
			);

			const rest = this.payload.subarray(1 + bitmaskLength);
			if (speedPresent) {
				validatePayload(rest.length >= 1);
				if (rest.length === 1) {
					this.dataRate = rest[0] & 0b111;
					this.wakeUpTime = WakeUpTime.None;
				} else if (rest.length === 2) {
					this.wakeUpTime = parseWakeUpTime(rest[0]);
					this.dataRate = rest[1] & 0b111;
				} else {
					throw validatePayload.fail("Invalid payload length");
				}
			} else if (rest.length >= 1) {
				this.wakeUpTime = parseWakeUpTime(rest[0]);
				this.dataRate = ZWaveDataRate["9k6"];
			} else {
				this.wakeUpTime = WakeUpTime.None;
				this.dataRate = ZWaveDataRate["9k6"];
			}
		} else {
			this.candidateNodeIds = options.candidateNodeIds;
			this.wakeUpTime = options.wakeUpTime;
			this.dataRate = options.dataRate ?? ZWaveDataRate["9k6"];
		}
	}

	public candidateNodeIds: number[];
	public wakeUpTime: WakeUpTime;
	public dataRate: ZWaveDataRate;

	public serialize(): Buffer {
		const nodesBitmask = encodeBitMask(this.candidateNodeIds, MAX_NODES);
		const speedAndLength = 0b1000_0000 | nodesBitmask.length;
		this.payload = Buffer.concat([
			Buffer.from([speedAndLength]),
			nodesBitmask,
			Buffer.from([this.wakeUpTime, this.dataRate]),
		]);
		return super.serialize();
	}
}

// @publicAPI
export interface ZWaveProtocolCCRangeInfoOptions extends CCCommandOptions {
	neighborNodeIds: number[];
	wakeUpTime?: WakeUpTime;
}

@CCCommand(ZWaveProtocolCommand.RangeInfo)
export class ZWaveProtocolCCRangeInfo extends ZWaveProtocolCC {
	public constructor(
		host: ZWaveHost,
		options:
			| CommandClassDeserializationOptions
			| ZWaveProtocolCCRangeInfoOptions,
	) {
		super(host, options);
		if (gotDeserializationOptions(options)) {
			validatePayload(this.payload.length >= 1);
			const bitmaskLength = this.payload[0] & 0b0001_1111;

			validatePayload(this.payload.length >= 1 + bitmaskLength);
			this.neighborNodeIds = parseBitMask(
				this.payload.subarray(1, 1 + bitmaskLength),
			);
			if (this.payload.length >= 2 + bitmaskLength) {
				this.wakeUpTime = parseWakeUpTime(
					this.payload[1 + bitmaskLength],
				);
			}
		} else {
			this.neighborNodeIds = options.neighborNodeIds;
			this.wakeUpTime = options.wakeUpTime;
		}
	}

	public neighborNodeIds: number[];
	public wakeUpTime?: WakeUpTime;

	public serialize(): Buffer {
		const nodesBitmask = encodeBitMask(this.neighborNodeIds, MAX_NODES);
		this.payload = Buffer.concat([
			Buffer.from([nodesBitmask.length]),
			nodesBitmask,
			this.wakeUpTime != undefined
				? Buffer.from([this.wakeUpTime])
				: Buffer.alloc(0),
		]);
		return super.serialize();
	}
}

@CCCommand(ZWaveProtocolCommand.GetNodesInRange)
@expectedCCResponse(ZWaveProtocolCCRangeInfo)
export class ZWaveProtocolCCGetNodesInRange extends ZWaveProtocolCC {}

// @publicAPI
export interface ZWaveProtocolCCCommandCompleteOptions
	extends CCCommandOptions
{
	sequenceNumber: number;
}

@CCCommand(ZWaveProtocolCommand.CommandComplete)
export class ZWaveProtocolCCCommandComplete extends ZWaveProtocolCC {
	public constructor(
		host: ZWaveHost,
		options:
			| CommandClassDeserializationOptions
			| ZWaveProtocolCCCommandCompleteOptions,
	) {
		super(host, options);
		if (gotDeserializationOptions(options)) {
			validatePayload(this.payload.length >= 1);
			this.sequenceNumber = this.payload[0];
		} else {
			this.sequenceNumber = options.sequenceNumber;
		}
	}

	public sequenceNumber: number;

	public serialize(): Buffer {
		this.payload = Buffer.from([this.sequenceNumber]);
		return super.serialize();
	}
}

// @publicAPI
export interface ZWaveProtocolCCTransferPresentationOptions
	extends CCCommandOptions
{
	supportsNWI: boolean;
	includeNode: boolean;
	excludeNode: boolean;
}

@CCCommand(ZWaveProtocolCommand.TransferPresentation)
export class ZWaveProtocolCCTransferPresentation extends ZWaveProtocolCC {
	public constructor(
		host: ZWaveHost,
		options:
			| CommandClassDeserializationOptions
			| ZWaveProtocolCCTransferPresentationOptions,
	) {
		super(host, options);
		if (gotDeserializationOptions(options)) {
			validatePayload(this.payload.length >= 1);
			const option = this.payload[0];
			this.supportsNWI = !!(option & 0b0001);
			this.excludeNode = !!(option & 0b0010);
			this.includeNode = !!(option & 0b0100);
		} else {
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
	}

	public supportsNWI: boolean;
	public includeNode: boolean;
	public excludeNode: boolean;

	public serialize(): Buffer {
		this.payload = Buffer.from([
			(this.supportsNWI ? 0b0001 : 0)
			| (this.excludeNode ? 0b0010 : 0)
			| (this.includeNode ? 0b0100 : 0),
		]);
		return super.serialize();
	}
}

// @publicAPI
export interface ZWaveProtocolCCTransferNodeInformationOptions
	extends CCCommandOptions, NodeProtocolInfoAndDeviceClass
{
	sequenceNumber: number;
	sourceNodeId: number;
}

@CCCommand(ZWaveProtocolCommand.TransferNodeInformation)
export class ZWaveProtocolCCTransferNodeInformation extends ZWaveProtocolCC
	implements NodeProtocolInfoAndDeviceClass
{
	public constructor(
		host: ZWaveHost,
		options:
			| CommandClassDeserializationOptions
			| ZWaveProtocolCCTransferNodeInformationOptions,
	) {
		super(host, options);

		let info: NodeProtocolInfoAndDeviceClass;
		if (gotDeserializationOptions(options)) {
			validatePayload(this.payload.length >= 2);
			this.sequenceNumber = this.payload[0];
			this.sourceNodeId = this.payload[1];
			info = parseNodeProtocolInfoAndDeviceClass(
				this.payload.subarray(2),
			).info;
		} else {
			this.sequenceNumber = options.sequenceNumber;
			this.sourceNodeId = options.sourceNodeId;
			info = options;
		}

		this.basicDeviceClass = info.basicDeviceClass;
		this.genericDeviceClass = info.genericDeviceClass;
		this.specificDeviceClass = info.specificDeviceClass;
		this.isListening = info.isListening;
		this.isFrequentListening = info.isFrequentListening;
		this.isRouting = info.isRouting;
		this.supportedDataRates = info.supportedDataRates;
		this.protocolVersion = info.protocolVersion;
		this.optionalFunctionality = info.optionalFunctionality;
		this.nodeType = info.nodeType;
		this.supportsSecurity = info.supportsSecurity;
		this.supportsBeaming = info.supportsBeaming;
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

	public serialize(): Buffer {
		this.payload = Buffer.concat([
			Buffer.from([this.sequenceNumber, this.sourceNodeId]),
			encodeNodeProtocolInfoAndDeviceClass(this),
		]);
		return super.serialize();
	}
}

// @publicAPI
export interface ZWaveProtocolCCTransferRangeInformationOptions
	extends CCCommandOptions
{
	sequenceNumber: number;
	testedNodeId: number;
	neighborNodeIds: number[];
}

@CCCommand(ZWaveProtocolCommand.TransferRangeInformation)
export class ZWaveProtocolCCTransferRangeInformation extends ZWaveProtocolCC {
	public constructor(
		host: ZWaveHost,
		options:
			| CommandClassDeserializationOptions
			| ZWaveProtocolCCTransferRangeInformationOptions,
	) {
		super(host, options);
		if (gotDeserializationOptions(options)) {
			validatePayload(this.payload.length >= 3);
			this.sequenceNumber = this.payload[0];
			this.testedNodeId = this.payload[1];
			const bitmaskLength = this.payload[2];
			validatePayload(this.payload.length >= 3 + bitmaskLength);
			this.neighborNodeIds = parseBitMask(
				this.payload.subarray(3, 3 + bitmaskLength),
			);
		} else {
			this.sequenceNumber = options.sequenceNumber;
			this.testedNodeId = options.testedNodeId;
			this.neighborNodeIds = options.neighborNodeIds;
		}
	}

	public sequenceNumber: number;
	public testedNodeId: number;
	public neighborNodeIds: number[];

	public serialize(): Buffer {
		const nodesBitmask = encodeBitMask(this.neighborNodeIds, MAX_NODES);
		this.payload = Buffer.concat([
			Buffer.from([
				this.sequenceNumber,
				this.testedNodeId,
				nodesBitmask.length,
			]),
			nodesBitmask,
		]);
		return super.serialize();
	}
}

// @publicAPI
export interface ZWaveProtocolCCTransferEndOptions extends CCCommandOptions {
	status: NetworkTransferStatus;
}

@CCCommand(ZWaveProtocolCommand.TransferEnd)
export class ZWaveProtocolCCTransferEnd extends ZWaveProtocolCC {
	public constructor(
		host: ZWaveHost,
		options:
			| CommandClassDeserializationOptions
			| ZWaveProtocolCCTransferEndOptions,
	) {
		super(host, options);
		if (gotDeserializationOptions(options)) {
			validatePayload(this.payload.length >= 1);
			this.status = this.payload[0];
		} else {
			this.status = options.status;
		}
	}

	public status: NetworkTransferStatus;

	public serialize(): Buffer {
		this.payload = Buffer.from([this.status]);
		return super.serialize();
	}
}

// @publicAPI
export interface ZWaveProtocolCCAssignReturnRouteOptions
	extends CCCommandOptions
{
	destinationNodeId: number;
	routeIndex: number;
	repeaters: number[];
	destinationWakeUp: WakeUpTime;
	destinationSpeed: ZWaveDataRate;
}

@CCCommand(ZWaveProtocolCommand.AssignReturnRoute)
export class ZWaveProtocolCCAssignReturnRoute extends ZWaveProtocolCC {
	public constructor(
		host: ZWaveHost,
		options:
			| CommandClassDeserializationOptions
			| ZWaveProtocolCCAssignReturnRouteOptions,
	) {
		super(host, options);
		if (gotDeserializationOptions(options)) {
			validatePayload(this.payload.length >= 7);
			this.destinationNodeId = this.payload[0];
			this.routeIndex = this.payload[1] >>> 4;
			const numRepeaters = this.payload[1] & 0b1111;
			this.repeaters = [...this.payload.subarray(2, 2 + numRepeaters)];
			const speedAndWakeup = this.payload[2 + numRepeaters];
			this.destinationSpeed = bitmask2DataRate(
				(speedAndWakeup >>> 3) & 0b111,
			);
			this.destinationWakeUp = (speedAndWakeup >>> 1) & 0b11;
		} else {
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
	}

	public destinationNodeId: number;
	public routeIndex: number;
	public repeaters: number[];
	public destinationWakeUp: WakeUpTime;
	public destinationSpeed: ZWaveDataRate;

	public serialize(): Buffer {
		const routeByte = (this.routeIndex << 4) | this.repeaters.length;
		const speedMask = dataRate2Bitmask(this.destinationSpeed);
		const speedByte = (speedMask << 3) | (this.destinationWakeUp << 1);
		this.payload = Buffer.from([
			this.destinationNodeId,
			routeByte,
			...this.repeaters,
			speedByte,
		]);
		return super.serialize();
	}
}

// @publicAPI
export interface ZWaveProtocolCCNewNodeRegisteredOptions
	extends CCCommandOptions, NodeInformationFrame
{
	newNodeId: number;
}

@CCCommand(ZWaveProtocolCommand.NewNodeRegistered)
export class ZWaveProtocolCCNewNodeRegistered extends ZWaveProtocolCC
	implements NodeInformationFrame
{
	public constructor(
		host: ZWaveHost,
		options:
			| CommandClassDeserializationOptions
			| ZWaveProtocolCCNewNodeRegisteredOptions,
	) {
		super(host, options);

		let nif: NodeInformationFrame;
		if (gotDeserializationOptions(options)) {
			validatePayload(this.payload.length >= 1);
			this.newNodeId = this.payload[0];
			nif = parseNodeInformationFrame(this.payload.subarray(1));
		} else {
			this.newNodeId = options.newNodeId;
			nif = options;
		}

		this.basicDeviceClass = nif.basicDeviceClass;
		this.genericDeviceClass = nif.genericDeviceClass;
		this.specificDeviceClass = nif.specificDeviceClass;
		this.isListening = nif.isListening;
		this.isFrequentListening = nif.isFrequentListening;
		this.isRouting = nif.isRouting;
		this.supportedDataRates = nif.supportedDataRates;
		this.protocolVersion = nif.protocolVersion;
		this.optionalFunctionality = nif.optionalFunctionality;
		this.nodeType = nif.nodeType;
		this.supportsSecurity = nif.supportsSecurity;
		this.supportsBeaming = nif.supportsBeaming;
		this.supportedCCs = nif.supportedCCs;
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

	public serialize(): Buffer {
		this.payload = Buffer.concat([
			Buffer.from([this.newNodeId]),
			encodeNodeInformationFrame(this),
		]);
		return super.serialize();
	}
}

// @publicAPI
export interface ZWaveProtocolCCNewRangeRegisteredOptions
	extends CCCommandOptions
{
	testedNodeId: number;
	neighborNodeIds: number[];
}

@CCCommand(ZWaveProtocolCommand.NewRangeRegistered)
export class ZWaveProtocolCCNewRangeRegistered extends ZWaveProtocolCC {
	public constructor(
		host: ZWaveHost,
		options:
			| CommandClassDeserializationOptions
			| ZWaveProtocolCCNewRangeRegisteredOptions,
	) {
		super(host, options);
		if (gotDeserializationOptions(options)) {
			validatePayload(this.payload.length >= 2);
			this.testedNodeId = this.payload[0];
			const numNeighbors = this.payload[1];
			this.neighborNodeIds = [
				...this.payload.subarray(2, 2 + numNeighbors),
			];
		} else {
			this.testedNodeId = options.testedNodeId;
			this.neighborNodeIds = options.neighborNodeIds;
		}
	}

	public testedNodeId: number;
	public neighborNodeIds: number[];

	public serialize(): Buffer {
		const nodesBitmask = encodeBitMask(this.neighborNodeIds, MAX_NODES);
		this.payload = Buffer.concat([
			Buffer.from([this.testedNodeId, nodesBitmask.length]),
			nodesBitmask,
		]);
		return super.serialize();
	}
}

// @publicAPI
export interface ZWaveProtocolCCTransferNewPrimaryControllerCompleteOptions
	extends CCCommandOptions
{
	genericDeviceClass: number;
}

@CCCommand(ZWaveProtocolCommand.TransferNewPrimaryControllerComplete)
export class ZWaveProtocolCCTransferNewPrimaryControllerComplete
	extends ZWaveProtocolCC
{
	public constructor(
		host: ZWaveHost,
		options:
			| CommandClassDeserializationOptions
			| ZWaveProtocolCCTransferNewPrimaryControllerCompleteOptions,
	) {
		super(host, options);
		if (gotDeserializationOptions(options)) {
			validatePayload(this.payload.length >= 1);
			this.genericDeviceClass = this.payload[0];
		} else {
			this.genericDeviceClass = options.genericDeviceClass;
		}
	}

	public genericDeviceClass: number;

	public serialize(): Buffer {
		this.payload = Buffer.from([this.genericDeviceClass]);
		return super.serialize();
	}
}

@CCCommand(ZWaveProtocolCommand.AutomaticControllerUpdateStart)
export class ZWaveProtocolCCAutomaticControllerUpdateStart
	extends ZWaveProtocolCC
{}

// @publicAPI
export interface ZWaveProtocolCCSUCNodeIDOptions extends CCCommandOptions {
	sucNodeId: number;
	isSIS: boolean;
}

@CCCommand(ZWaveProtocolCommand.SUCNodeID)
export class ZWaveProtocolCCSUCNodeID extends ZWaveProtocolCC {
	public constructor(
		host: ZWaveHost,
		options:
			| CommandClassDeserializationOptions
			| ZWaveProtocolCCSUCNodeIDOptions,
	) {
		super(host, options);
		if (gotDeserializationOptions(options)) {
			validatePayload(this.payload.length >= 1);
			this.sucNodeId = this.payload[0];
			const capabilities = this.payload[1] ?? 0;
			this.isSIS = !!(capabilities & 0b1);
		} else {
			this.sucNodeId = options.sucNodeId;
			this.isSIS = options.isSIS;
		}
	}

	public sucNodeId: number;
	public isSIS: boolean;

	public serialize(): Buffer {
		this.payload = Buffer.from([this.sucNodeId, this.isSIS ? 0b1 : 0]);
		return super.serialize();
	}
}

// @publicAPI
export interface ZWaveProtocolCCSetSUCOptions extends CCCommandOptions {
	enableSIS: boolean;
}

@CCCommand(ZWaveProtocolCommand.SetSUC)
export class ZWaveProtocolCCSetSUC extends ZWaveProtocolCC {
	public constructor(
		host: ZWaveHost,
		options:
			| CommandClassDeserializationOptions
			| ZWaveProtocolCCSetSUCOptions,
	) {
		super(host, options);
		if (gotDeserializationOptions(options)) {
			validatePayload(this.payload.length >= 2);
			// Byte 0 must be 0x01 or ignored
			const capabilities = this.payload[1] ?? 0;
			this.enableSIS = !!(capabilities & 0b1);
		} else {
			this.enableSIS = options.enableSIS;
		}
	}

	public enableSIS: boolean;

	public serialize(): Buffer {
		this.payload = Buffer.from([0x01, this.enableSIS ? 0b1 : 0]);
		return super.serialize();
	}
}

// @publicAPI
export interface ZWaveProtocolCCSetSUCAckOptions extends CCCommandOptions {
	accepted: boolean;
	isSIS: boolean;
}

@CCCommand(ZWaveProtocolCommand.SetSUCAck)
export class ZWaveProtocolCCSetSUCAck extends ZWaveProtocolCC {
	public constructor(
		host: ZWaveHost,
		options:
			| CommandClassDeserializationOptions
			| ZWaveProtocolCCSetSUCAckOptions,
	) {
		super(host, options);
		if (gotDeserializationOptions(options)) {
			validatePayload(this.payload.length >= 2);
			this.accepted = this.payload[0] === 0x01;
			const capabilities = this.payload[1] ?? 0;
			this.isSIS = !!(capabilities & 0b1);
		} else {
			this.accepted = options.accepted;
			this.isSIS = options.isSIS;
		}
	}

	public accepted: boolean;
	public isSIS: boolean;

	public serialize(): Buffer {
		this.payload = Buffer.from([
			this.accepted ? 0x01 : 0x00,
			this.isSIS ? 0b1 : 0,
		]);
		return super.serialize();
	}
}

@CCCommand(ZWaveProtocolCommand.AssignSUCReturnRoute)
export class ZWaveProtocolCCAssignSUCReturnRoute
	extends ZWaveProtocolCCAssignReturnRoute
{}

// @publicAPI
export interface ZWaveProtocolCCStaticRouteRequestOptions
	extends CCCommandOptions
{
	nodeIds: number[];
}

@CCCommand(ZWaveProtocolCommand.StaticRouteRequest)
export class ZWaveProtocolCCStaticRouteRequest extends ZWaveProtocolCC {
	public constructor(
		host: ZWaveHost,
		options:
			| CommandClassDeserializationOptions
			| ZWaveProtocolCCStaticRouteRequestOptions,
	) {
		super(host, options);
		if (gotDeserializationOptions(options)) {
			validatePayload(this.payload.length >= 5);
			this.nodeIds = [...this.payload.subarray(0, 5)].filter(
				(id) => id > 0 && id <= MAX_NODES,
			);
		} else {
			if (options.nodeIds.some((n) => n < 1 || n > MAX_NODES)) {
				throw new ZWaveError(
					`All node IDs must be between 1 and ${MAX_NODES}!`,
					ZWaveErrorCodes.Argument_Invalid,
				);
			}
			this.nodeIds = options.nodeIds;
		}
	}

	public nodeIds: number[];

	public serialize(): Buffer {
		this.payload = Buffer.alloc(5, 0);
		for (let i = 0; i < this.nodeIds.length && i < 5; i++) {
			this.payload[i] = this.nodeIds[i];
		}
		return super.serialize();
	}
}

// @publicAPI
export interface ZWaveProtocolCCLostOptions extends CCCommandOptions {
	lostNodeId: number;
}

@CCCommand(ZWaveProtocolCommand.Lost)
export class ZWaveProtocolCCLost extends ZWaveProtocolCC {
	public constructor(
		host: ZWaveHost,
		options:
			| CommandClassDeserializationOptions
			| ZWaveProtocolCCLostOptions,
	) {
		super(host, options);
		if (gotDeserializationOptions(options)) {
			validatePayload(this.payload.length >= 1);
			this.lostNodeId = this.payload[0];
		} else {
			this.lostNodeId = options.lostNodeId;
		}
	}

	public lostNodeId: number;

	public serialize(): Buffer {
		this.payload = Buffer.from([this.lostNodeId]);
		return super.serialize();
	}
}

// @publicAPI
export interface ZWaveProtocolCCAcceptLostOptions extends CCCommandOptions {
	accepted: boolean;
}

@CCCommand(ZWaveProtocolCommand.AcceptLost)
export class ZWaveProtocolCCAcceptLost extends ZWaveProtocolCC {
	public constructor(
		host: ZWaveHost,
		options:
			| CommandClassDeserializationOptions
			| ZWaveProtocolCCAcceptLostOptions,
	) {
		super(host, options);
		if (gotDeserializationOptions(options)) {
			validatePayload(this.payload.length >= 1);
			validatePayload(
				this.payload[0] === 0x04 || this.payload[0] === 0x05,
			);
			this.accepted = this.payload[0] === 0x05;
		} else {
			this.accepted = options.accepted;
		}
	}

	public accepted: boolean;

	public serialize(): Buffer {
		this.payload = Buffer.from([this.accepted ? 0x05 : 0x04]);
		return super.serialize();
	}
}

// @publicAPI
export interface ZWaveProtocolCCNOPPowerOptions extends CCCommandOptions {
	powerDampening: number;
}

@CCCommand(ZWaveProtocolCommand.NOPPower)
export class ZWaveProtocolCCNOPPower extends ZWaveProtocolCC {
	public constructor(
		host: ZWaveHost,
		options:
			| CommandClassDeserializationOptions
			| ZWaveProtocolCCNOPPowerOptions,
	) {
		super(host, options);
		if (gotDeserializationOptions(options)) {
			if (this.payload.length >= 2) {
				// Ignore byte 0
				this.powerDampening = this.payload[1];
			} else if (this.payload.length === 1) {
				this.powerDampening = [
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
				].indexOf(this.payload[0]);
				if (this.powerDampening === -1) this.powerDampening = 0;
			} else {
				throw validatePayload.fail("Invalid payload length!");
			}
		} else {
			if (options.powerDampening < 0 || options.powerDampening > 14) {
				throw new ZWaveError(
					`${this.constructor.name}: power dampening must be between 0 and 14 dBm!`,
					ZWaveErrorCodes.Argument_Invalid,
				);
			}
			this.powerDampening = options.powerDampening;
		}
	}

	// Power dampening in (negative) dBm. A value of 2 means -2 dBm.
	public powerDampening: number;

	public serialize(): Buffer {
		this.payload = Buffer.from([0, this.powerDampening]);
		return super.serialize();
	}
}

// @publicAPI
export interface ZWaveProtocolCCReservedIDsOptions extends CCCommandOptions {
	reservedNodeIDs: number[];
}

@CCCommand(ZWaveProtocolCommand.ReservedIDs)
export class ZWaveProtocolCCReservedIDs extends ZWaveProtocolCC {
	public constructor(
		host: ZWaveHost,
		options:
			| CommandClassDeserializationOptions
			| ZWaveProtocolCCReservedIDsOptions,
	) {
		super(host, options);
		if (gotDeserializationOptions(options)) {
			validatePayload(this.payload.length >= 1);
			const numNodeIDs = this.payload[0];
			validatePayload(this.payload.length >= 1 + numNodeIDs);
			this.reservedNodeIDs = [
				...this.payload.subarray(1, 1 + numNodeIDs),
			];
		} else {
			this.reservedNodeIDs = options.reservedNodeIDs;
		}
	}

	public reservedNodeIDs: number[];

	public serialize(): Buffer {
		this.payload = Buffer.from([
			this.reservedNodeIDs.length,
			...this.reservedNodeIDs,
		]);
		return super.serialize();
	}
}

// @publicAPI
export interface ZWaveProtocolCCReserveNodeIDsOptions extends CCCommandOptions {
	numNodeIDs: number;
}

@CCCommand(ZWaveProtocolCommand.ReserveNodeIDs)
@expectedCCResponse(ZWaveProtocolCCReservedIDs)
export class ZWaveProtocolCCReserveNodeIDs extends ZWaveProtocolCC {
	public constructor(
		host: ZWaveHost,
		options:
			| CommandClassDeserializationOptions
			| ZWaveProtocolCCReserveNodeIDsOptions,
	) {
		super(host, options);
		if (gotDeserializationOptions(options)) {
			validatePayload(this.payload.length >= 1);
			this.numNodeIDs = this.payload[0];
		} else {
			this.numNodeIDs = options.numNodeIDs;
		}
	}

	public numNodeIDs: number;

	public serialize(): Buffer {
		this.payload = Buffer.from([this.numNodeIDs]);
		return super.serialize();
	}
}

// @publicAPI
export interface ZWaveProtocolCCNodesExistReplyOptions
	extends CCCommandOptions
{
	nodeMaskType: number;
	nodeListUpdated: boolean;
}

@CCCommand(ZWaveProtocolCommand.NodesExistReply)
export class ZWaveProtocolCCNodesExistReply extends ZWaveProtocolCC {
	public constructor(
		host: ZWaveHost,
		options:
			| CommandClassDeserializationOptions
			| ZWaveProtocolCCNodesExistReplyOptions,
	) {
		super(host, options);
		if (gotDeserializationOptions(options)) {
			validatePayload(this.payload.length >= 2);
			this.nodeMaskType = this.payload[0];
			this.nodeListUpdated = this.payload[1] === 0x01;
		} else {
			this.nodeMaskType = options.nodeMaskType;
			this.nodeListUpdated = options.nodeListUpdated;
		}
	}

	public nodeMaskType: number;
	public nodeListUpdated: boolean;

	public serialize(): Buffer {
		this.payload = Buffer.from([
			this.nodeMaskType,
			this.nodeListUpdated ? 0x01 : 0x00,
		]);
		return super.serialize();
	}
}

function testResponseForZWaveProtocolNodesExist(
	sent: ZWaveProtocolCCNodesExist,
	received: ZWaveProtocolCCNodesExistReply,
) {
	return received.nodeMaskType === sent.nodeMaskType;
}

// @publicAPI
export interface ZWaveProtocolCCNodesExistOptions extends CCCommandOptions {
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
		host: ZWaveHost,
		options:
			| CommandClassDeserializationOptions
			| ZWaveProtocolCCNodesExistOptions,
	) {
		super(host, options);
		if (gotDeserializationOptions(options)) {
			validatePayload(this.payload.length >= 2);
			this.nodeMaskType = this.payload[0];
			const numNodeIDs = this.payload[1];
			validatePayload(this.payload.length >= 2 + numNodeIDs);
			this.nodeIDs = [...this.payload.subarray(2, 2 + numNodeIDs)];
		} else {
			this.nodeMaskType = options.nodeMaskType;
			this.nodeIDs = options.nodeIDs;
		}
	}

	public nodeMaskType: number;
	public nodeIDs: number[];

	public serialize(): Buffer {
		this.payload = Buffer.from([
			this.nodeMaskType,
			this.nodeIDs.length,
			...this.nodeIDs,
		]);
		return super.serialize();
	}
}

// @publicAPI
export interface ZWaveProtocolCCSetNWIModeOptions extends CCCommandOptions {
	enabled: boolean;
	timeoutMinutes?: number;
}

@CCCommand(ZWaveProtocolCommand.SetNWIMode)
export class ZWaveProtocolCCSetNWIMode extends ZWaveProtocolCC {
	public constructor(
		host: ZWaveHost,
		options:
			| CommandClassDeserializationOptions
			| ZWaveProtocolCCSetNWIModeOptions,
	) {
		super(host, options);
		if (gotDeserializationOptions(options)) {
			validatePayload(this.payload.length >= 2);
			this.enabled = this.payload[0] === 0x01;
			this.timeoutMinutes = this.payload[1] || undefined;
		} else {
			this.enabled = options.enabled;
			this.timeoutMinutes = options.timeoutMinutes;
		}
	}

	public enabled: boolean;
	public timeoutMinutes?: number;

	public serialize(): Buffer {
		this.payload = Buffer.from([
			this.enabled ? 0x01 : 0x00,
			this.timeoutMinutes ?? 0x00,
		]);
		return super.serialize();
	}
}

@CCCommand(ZWaveProtocolCommand.ExcludeRequest)
export class ZWaveProtocolCCExcludeRequest
	extends ZWaveProtocolCCNodeInformationFrame
{}

// @publicAPI
export interface ZWaveProtocolCCAssignReturnRoutePriorityOptions
	extends CCCommandOptions
{
	targetNodeId: number;
	routeNumber: number;
}

@CCCommand(ZWaveProtocolCommand.AssignReturnRoutePriority)
export class ZWaveProtocolCCAssignReturnRoutePriority extends ZWaveProtocolCC {
	public constructor(
		host: ZWaveHost,
		options:
			| CommandClassDeserializationOptions
			| ZWaveProtocolCCAssignReturnRoutePriorityOptions,
	) {
		super(host, options);
		if (gotDeserializationOptions(options)) {
			validatePayload(this.payload.length >= 2);
			this.targetNodeId = this.payload[0];
			this.routeNumber = this.payload[1];
		} else {
			this.targetNodeId = options.targetNodeId;
			this.routeNumber = options.routeNumber;
		}
	}

	public targetNodeId: number;
	public routeNumber: number;

	public serialize(): Buffer {
		this.payload = Buffer.from([this.targetNodeId, this.routeNumber]);
		return super.serialize();
	}
}

@CCCommand(ZWaveProtocolCommand.AssignSUCReturnRoutePriority)
export class ZWaveProtocolCCAssignSUCReturnRoutePriority
	extends ZWaveProtocolCCAssignReturnRoutePriority
{}

// @publicAPI
export interface ZWaveProtocolCCSmartStartIncludedNodeInformationOptions
	extends CCCommandOptions
{
	nwiHomeId: Buffer;
}

@CCCommand(ZWaveProtocolCommand.SmartStartIncludedNodeInformation)
export class ZWaveProtocolCCSmartStartIncludedNodeInformation
	extends ZWaveProtocolCC
{
	public constructor(
		host: ZWaveHost,
		options:
			| CommandClassDeserializationOptions
			| ZWaveProtocolCCSmartStartIncludedNodeInformationOptions,
	) {
		super(host, options);
		if (gotDeserializationOptions(options)) {
			validatePayload(this.payload.length >= 4);
			this.nwiHomeId = this.payload.subarray(0, 4);
		} else {
			if (options.nwiHomeId.length !== 4) {
				throw new ZWaveError(
					`nwiHomeId must have length 4`,
					ZWaveErrorCodes.Argument_Invalid,
				);
			}
			this.nwiHomeId = options.nwiHomeId;
		}
	}

	public nwiHomeId: Buffer;

	public serialize(): Buffer {
		this.payload = Buffer.from(this.nwiHomeId);
		return super.serialize();
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
