import {
	CommandClasses,
	type DataRate,
	type FLiRS,
	type NodeInformationFrame,
	type NodeType,
	type ProtocolVersion,
	ZWaveError,
	ZWaveErrorCodes,
	// parseBitMask,
	encodeNodeInformationFrame,
	parseNodeInformationFrame,
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
	// type NetworkTransferStatus,
	// WakeUpTime,
	ZWaveLRProtocolCommand,
	// parseWakeUpTime,
} from "../lib/_Types";

@commandClass(CommandClasses["Z-Wave Long Range Protocol"])
@implementedVersion(1)
export class ZWaveLRProtocolCC extends CommandClass {
	declare ccCommand: ZWaveLRProtocolCommand;
}

@CCCommand(ZWaveLRProtocolCommand.NOP)
export class ZWaveLRProtocolCCNOP extends ZWaveLRProtocolCC {}

interface ZWaveLRProtocolCCNodeInformationFrameOptions
	extends CCCommandOptions, NodeInformationFrame
{}

// BUGBUG: how much of this can we share with existing stuff? Can we use a ZWaveProtocolCCNodeInformationFrameOptions field to do the `isLongRange` stuff?
// BUGBUG: how much can we share also with the Smart Start things below that are VERY close to this stuff?
@CCCommand(ZWaveLRProtocolCommand.NodeInformationFrame)
export class ZWaveLRProtocolCCNodeInformationFrame extends ZWaveLRProtocolCC
	implements NodeInformationFrame
{
	public constructor(
		host: ZWaveHost,
		options:
			| CommandClassDeserializationOptions
			| ZWaveLRProtocolCCNodeInformationFrameOptions,
	) {
		super(host, options);

		let nif: NodeInformationFrame;
		if (gotDeserializationOptions(options)) {
			nif = parseNodeInformationFrame(this.payload, true);
		} else {
			nif = options;
		}

		this.basicDeviceClass = 0x100; // BUGBUG: what fake value can we safely use here?
		this.genericDeviceClass = nif.genericDeviceClass;
		this.specificDeviceClass = nif.specificDeviceClass;
		this.isListening = nif.isListening;
		this.isFrequentListening = nif.isFrequentListening;
		this.isRouting = false;
		this.supportedDataRates = nif.supportedDataRates;
		this.protocolVersion = 0; // "unknown";
		this.optionalFunctionality = false;
		this.nodeType = nif.nodeType;
		this.supportsSecurity = nif.supportsSecurity;
		this.supportsBeaming = false;
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
		this.payload = encodeNodeInformationFrame(this, true);
		return super.serialize();
	}
}

@CCCommand(ZWaveLRProtocolCommand.RequestNodeInformationFrame)
@expectedCCResponse(ZWaveLRProtocolCCNodeInformationFrame)
export class ZWaveLRProtocolCCRequestNodeInformationFrame
	extends ZWaveLRProtocolCC
{}

interface ZWaveLRProtocolCCAssignIDsOptions extends CCCommandOptions {
	assignedNodeId: number;
	homeId: number;
}

@CCCommand(ZWaveLRProtocolCommand.AssignIDs)
export class ZWaveLRProtocolCCAssignIDs extends ZWaveLRProtocolCC {
	public constructor(
		host: ZWaveHost,
		options:
			| CommandClassDeserializationOptions
			| ZWaveLRProtocolCCAssignIDsOptions,
	) {
		super(host, options);
		if (gotDeserializationOptions(options)) {
			validatePayload(this.payload.length >= 6);
			this.assignedNodeId = this.payload.readUInt16BE(0) & 0xFFF;
			this.homeId = this.payload.readUInt32BE(2);
		} else {
			this.assignedNodeId = options.assignedNodeId;
			this.homeId = options.homeId;
		}
	}

	public assignedNodeId: number;
	public homeId: number;

	public serialize(): Buffer {
		this.payload = Buffer.allocUnsafe(6);
		this.payload.writeUInt16BE(this.assignedNodeId, 0);
		this.payload.writeUInt32BE(this.homeId, 2);
		return super.serialize();
	}
}

@CCCommand(ZWaveLRProtocolCommand.ExcludeRequest)
export class ZWaveLRProtocolCCExcludeRequest
	extends ZWaveLRProtocolCCNodeInformationFrame
{}

interface ZWaveLRProtocolCCSmartStartIncludedNodeInformationOptions
	extends CCCommandOptions
{
	nwiHomeId: Buffer;
}

// BUGBUG: this is exactly equal to the ZWaveProtocolCommand.SmartStartIncludedNodeInformation, can we reuse/inherit that somehow?
@CCCommand(ZWaveLRProtocolCommand.SmartStartIncludedNodeInformation)
export class ZWaveLRProtocolCCSmartStartIncludedNodeInformation
	extends ZWaveLRProtocolCC
{
	public constructor(
		host: ZWaveHost,
		options:
			| CommandClassDeserializationOptions
			| ZWaveLRProtocolCCSmartStartIncludedNodeInformationOptions,
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

// BUGBUG this needs to include support for Sensor256ms and BeamCapability fields, yet the GetNodeInfo reserves those
@CCCommand(ZWaveLRProtocolCommand.SmartStartPrime)
export class ZWaveLRProtocolCCSmartStartPrime
	extends ZWaveLRProtocolCCNodeInformationFrame
{}

// BUGBUG this needs to include support for Sensor256ms and BeamCapability fields, yet the GetNodeInfo reserves those
@CCCommand(ZWaveLRProtocolCommand.SmartStartInclusionRequest)
export class ZWaveLRProtocolCCSmartStartInclusionRequest
	extends ZWaveLRProtocolCCNodeInformationFrame
{}

// BUGBUG: this is identical to the AssignNodeID message, except for the field names
@CCCommand(ZWaveLRProtocolCommand.ExcludeRequestConfirimation)
export class ZWaveLRProtocolCCExcludeRequestConfirimation
	extends ZWaveLRProtocolCC
{
	public constructor(
		host: ZWaveHost,
		options:
			| CommandClassDeserializationOptions
			| ZWaveLRProtocolCCAssignIDsOptions,
	) {
		super(host, options);
		if (gotDeserializationOptions(options)) {
			validatePayload(this.payload.length >= 6);
			this.requestingNodeId = this.payload.readUInt16BE(0) & 0xFFF;
			this.homeId = this.payload.readUInt32BE(2);
		} else {
			this.requestingNodeId = options.assignedNodeId;
			this.homeId = options.homeId;
		}
	}

	public requestingNodeId: number;
	public homeId: number;

	public serialize(): Buffer {
		this.payload = Buffer.allocUnsafe(6);
		this.payload.writeUInt16BE(this.requestingNodeId, 0);
		this.payload.writeUInt32BE(this.homeId, 2);
		return super.serialize();
	}
}

@CCCommand(ZWaveLRProtocolCommand.NonSecureIncusionStepComplete)
export class ZWaveLRProtocolCCNonSecureIncusionStepComplete
	extends ZWaveLRProtocolCC
{}
