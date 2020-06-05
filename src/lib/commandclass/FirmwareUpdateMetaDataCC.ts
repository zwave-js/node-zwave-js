import type { Driver } from "../driver/Driver";
import { ZWaveError, ZWaveErrorCodes } from "../error/ZWaveError";
import { CRC16_CCITT } from "../util/crc";
import { validatePayload } from "../util/misc";
import { Maybe, unknownBoolean } from "../values/Primitive";
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

// @publicAPI
export enum FirmwareUpdateActivationStatus {
	Error_InvalidFirmware = 0,
	Error_ActivationFailed = 1,
	OK = 0xff,
}

// @publicAPI
export enum FirmwareDownloadStatus {
	Error_InvalidManufacturerOrFirmwareID = 0,
	Error_AuthenticationExpected = 1,
	Error_FragmentSizeTooLarge = 2,
	Error_NotDownloadable = 3,
	Error_InvalidHardwareVersion = 4,
	OK = 0xff,
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
		// V1/V2 only have a single firmware which must be upgradable
		this.firmwareUpgradable =
			this.payload[6] === 0xff || this.payload[6] == undefined;

		if (this.version >= 3 && this.payload.length >= 10) {
			this.maxFragmentSize = this.payload.readUInt16BE(8);
			// Read variable length list of additional firmwares
			const numAdditionalFirmwares = this.payload[7];
			const additionalFirmwareIDs = [];
			validatePayload(
				this.payload.length >= 10 + 2 * numAdditionalFirmwares,
			);
			for (let i = 0; i < numAdditionalFirmwares; i++) {
				additionalFirmwareIDs.push(
					this.payload.readUInt16BE(10 + 2 * i),
				);
			}
			this.additionalFirmwareIDs = additionalFirmwareIDs;
			// Read hardware version (if it exists)
			let offset = 10 + 2 * numAdditionalFirmwares;
			if (this.version >= 5 && this.payload.length >= offset + 1) {
				this.hardwareVersion = this.payload[offset];
				offset++;
				if (this.version >= 6 && this.payload.length >= offset + 1) {
					const capabilities = this.payload[offset];
					offset++;

					this.continuesToFunction = !!(capabilities & 0b1);
					if (this.version >= 7)
						this.supportsActivation = !!(capabilities & 0b10);
				}
			}
		}
	}

	public readonly manufacturerId: number;
	public readonly firmwareId: number;
	public readonly checksum: number;
	public readonly firmwareUpgradable: boolean;
	public readonly maxFragmentSize?: number;
	public readonly additionalFirmwareIDs: readonly number[] = [];
	public readonly hardwareVersion?: number;
	public readonly continuesToFunction: Maybe<boolean> = unknownBoolean;
	public readonly supportsActivation: Maybe<boolean> = unknownBoolean;
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

type FirmwareUpdateMetaDataCCRequestGetOptions = {
	manufacturerId: number;
	firmwareId: number;
	checksum: number;
} & (
	| {
			// V3+
			firmwareTarget: number;
			fragmentSize: number;
			// V4+
			activation?: boolean;
			// V5+
			hardwareVersion?: number;
	  }
	// eslint-disable-next-line @typescript-eslint/ban-types
	| {}
);

@CCCommand(FirmwareUpdateMetaDataCommand.RequestGet)
@expectedCCResponse(FirmwareUpdateMetaDataCCRequestReport)
export class FirmwareUpdateMetaDataCCRequestGet extends FirmwareUpdateMetaDataCC {
	public constructor(
		driver: Driver,
		options:
			| CommandClassDeserializationOptions
			| (FirmwareUpdateMetaDataCCRequestGetOptions & CCCommandOptions),
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
			if ("firmwareTarget" in options) {
				this.firmwareTarget = options.firmwareTarget;
				this.fragmentSize = options.fragmentSize;
				this.activation = options.activation;
				this.hardwareVersion = options.hardwareVersion;
			}
		}
	}

	public manufacturerId: number;
	public firmwareId: number;
	public checksum: number;
	public firmwareTarget?: number;
	public fragmentSize?: number;
	public activation?: boolean;
	public hardwareVersion?: number;

	public serialize(): Buffer {
		const isV3 =
			this.version >= 3 &&
			this.firmwareTarget != undefined &&
			this.fragmentSize != undefined;
		const isV4 = isV3 && this.version >= 4 && this.activation != undefined;
		const isV5 =
			isV4 && this.version >= 5 && this.hardwareVersion != undefined;
		this.payload = Buffer.allocUnsafe(
			6 + (isV3 ? 3 : 0) + (isV4 ? 1 : 0) + (isV5 ? 1 : 0),
		);
		this.payload.writeUInt16BE(this.manufacturerId, 0);
		this.payload.writeUInt16BE(this.firmwareId, 2);
		this.payload.writeUInt16BE(this.checksum, 4);
		if (isV3) {
			this.payload[6] = this.firmwareTarget!;
			this.payload.writeUInt16BE(this.fragmentSize!, 7);
		}
		if (isV4) {
			this.payload[9] = this.activation ? 1 : 0;
		}
		if (isV5) {
			this.payload[10] = this.hardwareVersion!;
		}
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
	isLast: boolean;
	reportNumber: number;
	firmwareData: Buffer;
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

	public isLast: boolean;
	public reportNumber: number;
	public firmwareData: Buffer;

	public serialize(): Buffer {
		const commandBuffer = Buffer.concat([
			Buffer.allocUnsafe(2), // placeholder for report number
			this.firmwareData,
		]);
		commandBuffer.writeUInt16BE(
			(this.reportNumber & 0x7fff) | (this.isLast ? 0x8000 : 0),
			0,
		);

		if (this.version >= 2) {
			// Compute and save the CRC16 in the payload
			// The CC header is included in the CRC computation
			let crc = CRC16_CCITT(Buffer.from([this.ccId, this.ccCommand]));
			crc = CRC16_CCITT(commandBuffer, crc);
			this.payload = Buffer.concat([
				commandBuffer,
				Buffer.allocUnsafe(2),
			]);
			this.payload.writeUInt16BE(crc, this.payload.length - 2);
		} else {
			this.payload = commandBuffer;
		}

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
		if (this.payload.length >= 3) {
			this.waitTime = this.payload.readUInt16BE(1);
		}
	}

	public readonly status: FirmwareUpdateStatus;
	/** The wait time in seconds before the node becomes available for communication after the update */
	public readonly waitTime?: number;
}

@CCCommand(FirmwareUpdateMetaDataCommand.ActivationReport)
export class FirmwareUpdateMetaDataCCActivationReport extends FirmwareUpdateMetaDataCC {
	public constructor(
		driver: Driver,
		options: CommandClassDeserializationOptions,
	) {
		super(driver, options);
		validatePayload(this.payload.length >= 8);
		this.manufacturerId = this.payload.readUInt16BE(0);
		this.firmwareId = this.payload.readUInt16BE(2);
		this.checksum = this.payload.readUInt16BE(4);
		this.firmwareTarget = this.payload[6];
		this.activationStatus = this.payload[7];
		if (this.version >= 5 && this.payload.length >= 9) {
			this.hardwareVersion = this.payload[8];
		}
	}

	public readonly manufacturerId: number;
	public readonly firmwareId: number;
	public readonly checksum: number;
	public readonly firmwareTarget: number;
	public readonly activationStatus: FirmwareUpdateActivationStatus;
	public readonly hardwareVersion?: number;
}

interface FirmwareUpdateMetaDataCCActivationSetOptions
	extends CCCommandOptions {
	manufacturerId: number;
	firmwareId: number;
	checksum: number;
	firmwareTarget: number;
	// V5+
	hardwareVersion?: number;
}

@CCCommand(FirmwareUpdateMetaDataCommand.ActivationSet)
@expectedCCResponse(FirmwareUpdateMetaDataCCActivationReport)
export class FirmwareUpdateMetaDataCCActivationSet extends FirmwareUpdateMetaDataCC {
	public constructor(
		driver: Driver,
		options:
			| CommandClassDeserializationOptions
			| FirmwareUpdateMetaDataCCActivationSetOptions,
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
			this.firmwareTarget = options.firmwareTarget;
			this.hardwareVersion = options.hardwareVersion;
		}
	}

	public manufacturerId: number;
	public firmwareId: number;
	public checksum: number;
	public firmwareTarget: number;
	public hardwareVersion?: number;

	public serialize(): Buffer {
		const isV5 = this.version >= 5 && this.hardwareVersion != undefined;
		this.payload = Buffer.allocUnsafe(7 + (isV5 ? 1 : 0));
		this.payload.writeUInt16BE(this.manufacturerId, 0);
		this.payload.writeUInt16BE(this.firmwareId, 2);
		this.payload.writeUInt16BE(this.checksum, 4);
		this.payload[6] = this.firmwareTarget;
		if (isV5) {
			this.payload[7] = this.hardwareVersion!;
		}
		return super.serialize();
	}
}

@CCCommand(FirmwareUpdateMetaDataCommand.PrepareReport)
export class FirmwareUpdateMetaDataCCPrepareReport extends FirmwareUpdateMetaDataCC {
	public constructor(
		driver: Driver,
		options: CommandClassDeserializationOptions,
	) {
		super(driver, options);
		validatePayload(this.payload.length >= 3);
		this.status = this.payload[0];
		this.checksum = this.payload.readUInt16BE(1);
	}

	public readonly status: FirmwareDownloadStatus;
	public readonly checksum: number;
}

interface FirmwareUpdateMetaDataCCPrepareGetOptions extends CCCommandOptions {
	manufacturerId: number;
	firmwareId: number;
	firmwareTarget: number;
	fragmentSize: number;
	hardwareVersion: number;
}

@CCCommand(FirmwareUpdateMetaDataCommand.PrepareGet)
@expectedCCResponse(FirmwareUpdateMetaDataCCReport)
export class FirmwareUpdateMetaDataCCPrepareGet extends FirmwareUpdateMetaDataCC {
	public constructor(
		driver: Driver,
		options:
			| CommandClassDeserializationOptions
			| FirmwareUpdateMetaDataCCPrepareGetOptions,
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
			this.firmwareTarget = options.firmwareTarget;
			this.fragmentSize = options.fragmentSize;
			this.hardwareVersion = options.hardwareVersion;
		}
	}

	public manufacturerId: number;
	public firmwareId: number;
	public firmwareTarget: number;
	public fragmentSize: number;
	public hardwareVersion: number;

	public serialize(): Buffer {
		this.payload = Buffer.allocUnsafe(8);
		this.payload.writeUInt16BE(this.manufacturerId, 0);
		this.payload.writeUInt16BE(this.firmwareId, 2);
		this.payload[4] = this.firmwareTarget;
		this.payload.writeUInt16BE(this.fragmentSize, 5);
		this.payload[7] = this.hardwareVersion;
		return super.serialize();
	}
}
