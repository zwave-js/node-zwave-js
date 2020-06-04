import type { Driver } from "../driver/Driver";
import { ZWaveError, ZWaveErrorCodes } from "../error/ZWaveError";
import { validatePayload } from "../util/misc";
import {
	CCCommand,
	CCCommandOptions,
	CommandClass,
	commandClass,
	CommandClassDeserializationOptions,
	expectedCCResponse,
	gotDeserializationOptions,
	implementedVersion,
} from "./CommandClass";
import { CommandClasses } from "./CommandClasses";

// All the supported commands
export enum FirmwareUpdateMetaDataCommand {
	MetaDataGet = 0x01,
	MetaDataReport = 0x02,
	RequestGet = 0x03,
	RequestReport = 0x04,
	Get = 0x05,
	Report = 0x06,
	StatusReport = 0x07,
	ActivationSet = 0x08,
	ActivationReport = 0x09,
	PrepareGet = 0x0a,
	PrepareReport = 0x0b,
}

// @publicAPI
export enum FirmwareUpdateMetadataRequestStatus {
	Error_InvalidManufacturerOrFirmwareID = 0,
	Error_AuthenticationExpected = 1,
	Error_FragmentSizeTooLarge = 2,
	Error_NotUpgradable = 3,
	Error_InvalidHardwareVersion = 4,
	Error_FirmwareUpgradeInProgress = 5,
	Error_BatteryLow = 6,
	OK = 0xff,
}

// @publicAPI
export enum FirmwareUpdateStatus {
	Error_Checksum = 0,
	Error_TransmissionFailed = 1,
	Error_InvalidManufacturerID = 2,
	Error_InvalidFirmwareID = 3,
	Error_InvalidFirmwareTarget = 4,
	Error_InvalidHeaderInformation = 5,
	Error_InvalidHeaderFormat = 6,
	Error_InsufficientMemory = 7,
	Error_InvalidHardwareVersion = 8,
	OK_WaitingForActivation = 0xfd,
	OK_NoRestart = 0xfe,
	OK_RestartPending = 0xff,
}

@commandClass(CommandClasses["Firmware Update Meta Data"])
@implementedVersion(1)
export class FirmwareUpdateMetaDataCC extends CommandClass {
	declare ccCommand: FirmwareUpdateMetaDataCommand;
}

@CCCommand(FirmwareUpdateMetaDataCommand.MetaDataReport)
export class FirmwareUpdateMetaDataCCMetaDataReport extends FirmwareUpdateMetaDataCC {
	public constructor(
		driver: Driver,
		options: CommandClassDeserializationOptions,
	) {
		super(driver, options);
		validatePayload(this.payload.length >= 6);
		this.manufacturerId = this.payload.readUInt16BE(0);
		this.firmwareId = this.payload.readUInt16BE(2);
		this.checksum = this.payload.readUInt16BE(4);
	}

	public readonly manufacturerId: number;
	public readonly firmwareId: number;
	public readonly checksum: number;
}

@CCCommand(FirmwareUpdateMetaDataCommand.MetaDataGet)
@expectedCCResponse(FirmwareUpdateMetaDataCCMetaDataReport)
export class FirmwareUpdateMetaDataCCMetaDataGet extends FirmwareUpdateMetaDataCC {}

@CCCommand(FirmwareUpdateMetaDataCommand.RequestReport)
export class FirmwareUpdateMetaDataCCRequestReport extends FirmwareUpdateMetaDataCC {
	public constructor(
		driver: Driver,
		options: CommandClassDeserializationOptions,
	) {
		super(driver, options);
		validatePayload(this.payload.length >= 1);
		this.status = this.payload[0];
	}

	public readonly status: FirmwareUpdateMetadataRequestStatus;
}

interface FirmwareUpdateMetaDataCCRequestGetOptions extends CCCommandOptions {
	manufacturerId: number;
	firmwareId: number;
	checksum: number;
}

@CCCommand(FirmwareUpdateMetaDataCommand.RequestGet)
@expectedCCResponse(FirmwareUpdateMetaDataCCRequestReport)
export class FirmwareUpdateMetaDataCCRequestGet extends FirmwareUpdateMetaDataCC {
	public constructor(
		driver: Driver,
		options:
			| CommandClassDeserializationOptions
			| FirmwareUpdateMetaDataCCRequestGetOptions,
	) {
		super(driver, options);
		if (gotDeserializationOptions(options)) {
			// TODO: Deserialize payload
			throw new ZWaveError(
				`${this.constructor.name}: deserialization not implemented`,
				ZWaveErrorCodes.Deserialization_NotImplemented,
			);
		} else {
			this.manufacturerId = options.manufacturerId;
			this.firmwareId = options.firmwareId;
			this.checksum = options.checksum;
		}
	}

	public manufacturerId: number;
	public firmwareId: number;
	public checksum: number;

	public serialize(): Buffer {
		this.payload = Buffer.allocUnsafe(6);
		this.payload.writeUInt16BE(this.manufacturerId, 0);
		this.payload.writeUInt16BE(this.firmwareId, 2);
		this.payload.writeUInt16BE(this.checksum, 4);
		return super.serialize();
	}
}

@CCCommand(FirmwareUpdateMetaDataCommand.Get)
// This is sent to us from the node, so we expect no response
export class FirmwareUpdateMetaDataCCGet extends FirmwareUpdateMetaDataCC {
	public constructor(
		driver: Driver,
		options: CommandClassDeserializationOptions,
	) {
		super(driver, options);
		validatePayload(this.payload.length >= 3);
		this.numReports = this.payload[0];
		this.reportNumber = this.payload.readUInt16BE(1) & 0x7fff;
	}

	public readonly numReports: number;
	public readonly reportNumber: number;
}

interface FirmwareUpdateMetaDataCCReportOptions extends CCCommandOptions {
	reportNumber: number;
	firmwareData: Buffer;
	isLast: boolean;
}

@CCCommand(FirmwareUpdateMetaDataCommand.Report)
// We send this in reply to the Get command and expect no response
export class FirmwareUpdateMetaDataCCReport extends FirmwareUpdateMetaDataCC {
	public constructor(
		driver: Driver,
		options:
			| CommandClassDeserializationOptions
			| FirmwareUpdateMetaDataCCReportOptions,
	) {
		super(driver, options);
		if (gotDeserializationOptions(options)) {
			// TODO: Deserialize payload
			throw new ZWaveError(
				`${this.constructor.name}: deserialization not implemented`,
				ZWaveErrorCodes.Deserialization_NotImplemented,
			);
		} else {
			this.reportNumber = options.reportNumber;
			this.firmwareData = options.firmwareData;
			this.isLast = options.isLast;
		}
	}

	public reportNumber: number;
	public firmwareData: Buffer;
	public isLast: boolean;

	public serialize(): Buffer {
		this.payload = Buffer.concat([
			Buffer.allocUnsafe(2), // placeholder for report number
			this.firmwareData,
		]);
		this.payload.writeUInt16BE(
			(this.reportNumber & 0x7fff) | (this.isLast ? 0x8000 : 0),
			0,
		);
		return super.serialize();
	}
}

@CCCommand(FirmwareUpdateMetaDataCommand.StatusReport)
export class FirmwareUpdateMetaDataCCStatusReport extends FirmwareUpdateMetaDataCC {
	public constructor(
		driver: Driver,
		options: CommandClassDeserializationOptions,
	) {
		super(driver, options);
		validatePayload(this.payload.length >= 1);
		this.status = this.payload[0];
	}

	public readonly status: FirmwareUpdateStatus;
}
