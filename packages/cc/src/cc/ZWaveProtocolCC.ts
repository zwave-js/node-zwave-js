import {
	CommandClasses,
	DataRate,
	encodeBitMask,
	encodeNodeInformationFrame,
	encodeNodeProtocolInfoAndDeviceClass,
	FLiRS,
	MAX_NODES,
	NodeInformationFrame,
	NodeProtocolInfoAndDeviceClass,
	NodeType,
	parseBitMask,
	parseNodeInformationFrame,
	parseNodeProtocolInfoAndDeviceClass,
	ProtocolVersion,
	validatePayload,
	ZWaveDataRate,
	ZWaveError,
	ZWaveErrorCodes,
} from "@zwave-js/core";
import type { ZWaveHost } from "@zwave-js/host";
import {
	CCCommand,
	CommandClass,
	commandClass,
	expectedCCResponse,
	gotDeserializationOptions,
	implementedVersion,
	type CCCommandOptions,
	type CommandClassDeserializationOptions,
} from "../lib/CommandClass";
import {
	NetworkTransferStatus,
	parseWakeUpTime,
	WakeUpTime,
	ZWaveProtocolCommand,
} from "../lib/_Types";

// TODO: Move this enumeration into the _Types.ts file
// All additional type definitions (except CC constructor options) must be defined there too

@commandClass(CommandClasses["Z-Wave Protocol"])
@implementedVersion(1)
export class ZWaveProtocolCC extends CommandClass {
	declare ccCommand: ZWaveProtocolCommand;
}

interface ZWaveProtocolCCNodeInformationFrameOptions
	extends CCCommandOptions,
		NodeInformationFrame {}

@CCCommand(ZWaveProtocolCommand.NodeInformationFrame)
export class ZWaveProtocolCCNodeInformationFrame
	extends ZWaveProtocolCC
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

	public basicDeviceClass: number;
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
export class ZWaveProtocolCCRequestNodeInformationFrame extends ZWaveProtocolCC {}

interface ZWaveProtocolCCAssignIDsOptions extends CCCommandOptions {
	nodeId: number;
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
			this.nodeId = this.payload[0];
			this.homeId = this.payload.readUInt32BE(1);
		} else {
			this.nodeId = options.nodeId;
			this.homeId = options.homeId;
		}
	}

	public nodeId: number;
	public homeId: number;

	public serialize(): Buffer {
		this.payload = Buffer.allocUnsafe(5);
		this.payload[0] = this.nodeId;
		this.payload.writeUInt32BE(this.homeId, 1);
		return super.serialize();
	}
}

interface ZWaveProtocolCCFindNodesInRangeOptions extends CCCommandOptions {
	nodeIds: number[];
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
			this.nodeIds = parseBitMask(
				this.payload.slice(1, 1 + bitmaskLength),
			);

			const rest = this.payload.slice(1 + bitmaskLength);
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
			this.nodeIds = options.nodeIds;
			this.wakeUpTime = options.wakeUpTime;
			this.dataRate = options.dataRate ?? ZWaveDataRate["9k6"];
		}
	}

	public nodeIds: number[];
	public wakeUpTime: WakeUpTime;
	public dataRate: ZWaveDataRate;

	public serialize(): Buffer {
		const nodesBitmask = encodeBitMask(this.nodeIds, MAX_NODES);
		const speedAndLength = 0b1000_0000 | nodesBitmask.length;
		this.payload = Buffer.concat([
			Buffer.from([speedAndLength]),
			nodesBitmask,
			Buffer.from([this.wakeUpTime, this.dataRate]),
		]);
		return super.serialize();
	}
}

interface ZWaveProtocolCCRangeInfoOptions extends CCCommandOptions {
	nodeIds: number[];
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
			this.nodeIds = parseBitMask(
				this.payload.slice(1, 1 + bitmaskLength),
			);
			if (this.payload.length >= 2 + bitmaskLength) {
				this.wakeUpTime = parseWakeUpTime(
					this.payload[1 + bitmaskLength],
				);
			}
		} else {
			this.nodeIds = options.nodeIds;
			this.wakeUpTime = options.wakeUpTime;
		}
	}

	public nodeIds: number[];
	public wakeUpTime?: WakeUpTime;

	public serialize(): Buffer {
		const nodesBitmask = encodeBitMask(this.nodeIds, MAX_NODES);
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

interface ZWaveProtocolCCCommandCompleteOptions extends CCCommandOptions {
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

interface ZWaveProtocolCCTransferPresentationOptions extends CCCommandOptions {
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
			(this.supportsNWI ? 0b0001 : 0) |
				(this.excludeNode ? 0b0010 : 0) |
				(this.includeNode ? 0b0100 : 0),
		]);
		return super.serialize();
	}
}

interface ZWaveProtocolCCTransferNodeInformationOptions
	extends CCCommandOptions,
		NodeProtocolInfoAndDeviceClass {
	sequenceNumber: number;
	nodeId: number;
}

@CCCommand(ZWaveProtocolCommand.TransferNodeInformation)
export class ZWaveProtocolCCTransferNodeInformation
	extends ZWaveProtocolCC
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
			this.nodeId = this.payload[1];
			info = parseNodeProtocolInfoAndDeviceClass(
				this.payload.slice(2),
			).info;
		} else {
			this.sequenceNumber = options.sequenceNumber;
			this.nodeId = options.nodeId;
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
	public nodeId: number;
	public basicDeviceClass: number;
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
			Buffer.from([this.sequenceNumber, this.nodeId]),
			encodeNodeProtocolInfoAndDeviceClass(this),
		]);
		return super.serialize();
	}
}

interface ZWaveProtocolCCTransferRangeInformationOptions
	extends CCCommandOptions {
	sequenceNumber: number;
	nodeId: number;
	nodeIds: number[];
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
			this.nodeId = this.payload[1];
			const bitmaskLength = this.payload[2];
			validatePayload(this.payload.length >= 3 + bitmaskLength);
			this.nodeIds = parseBitMask(
				this.payload.slice(3, 3 + bitmaskLength),
			);
		} else {
			this.sequenceNumber = options.sequenceNumber;
			this.nodeId = options.nodeId;
			this.nodeIds = options.nodeIds;
		}
	}

	public sequenceNumber: number;
	public nodeId: number;
	public nodeIds: number[];

	public serialize(): Buffer {
		const nodesBitmask = encodeBitMask(this.nodeIds, MAX_NODES);
		this.payload = Buffer.concat([
			Buffer.from([
				this.sequenceNumber,
				this.nodeId,
				nodesBitmask.length,
			]),
			nodesBitmask,
		]);
		return super.serialize();
	}
}

interface ZWaveProtocolCCTransferEndOptions extends CCCommandOptions {
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
