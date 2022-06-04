import type { MessageRecord, ValueID } from "@zwave-js/core";
import {
	CommandClasses,
	CRC16_CCITT,
	Maybe,
	MessageOrCCLogEntry,
	unknownBoolean,
	validatePayload,
	ZWaveError,
	ZWaveErrorCodes,
} from "@zwave-js/core";
import type { ZWaveHost } from "@zwave-js/host";
import { AllOrNone, getEnumMemberName, num2hex, pick } from "@zwave-js/shared";
import { validateArgs } from "@zwave-js/transformers";
import { PhysicalCCAPI } from "./API";
import {
	API,
	CCCommand,
	CCCommandOptions,
	ccValue,
	CommandClass,
	commandClass,
	CommandClassDeserializationOptions,
	expectedCCResponse,
	gotDeserializationOptions,
	implementedVersion,
} from "./CommandClass";
import {
	FirmwareDownloadStatus,
	FirmwareUpdateActivationStatus,
	FirmwareUpdateMetaDataCommand,
	FirmwareUpdateRequestStatus,
	FirmwareUpdateStatus,
} from "./_Types";

// @noSetValueAPI There are no values to set here
// @noInterview   The "interview" is part of the update process

function getSupportsActivationValueId(): ValueID {
	return {
		commandClass: CommandClasses["Firmware Update Meta Data"],
		property: "supportsActivation",
	};
}

@API(CommandClasses["Firmware Update Meta Data"])
export class FirmwareUpdateMetaDataCCAPI extends PhysicalCCAPI {
	public supportsCommand(cmd: FirmwareUpdateMetaDataCommand): Maybe<boolean> {
		switch (cmd) {
			case FirmwareUpdateMetaDataCommand.MetaDataGet:
			case FirmwareUpdateMetaDataCommand.RequestGet:
			case FirmwareUpdateMetaDataCommand.Report:
			case FirmwareUpdateMetaDataCommand.StatusReport:
				return true;

			case FirmwareUpdateMetaDataCommand.ActivationSet:
				return (
					this.version >= 4 &&
					(this.version < 7 ||
						this.endpoint
							.getNodeUnsafe()
							?.getValue(getSupportsActivationValueId()) === true)
				);

			case FirmwareUpdateMetaDataCommand.PrepareGet:
				return this.version >= 5;
		}
		return super.supportsCommand(cmd);
	}

	/**
	 * Requests information about the current firmware on the device
	 */
	// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
	public async getMetaData() {
		this.assertSupportsCommand(
			FirmwareUpdateMetaDataCommand,
			FirmwareUpdateMetaDataCommand.MetaDataGet,
		);

		const cc = new FirmwareUpdateMetaDataCCMetaDataGet(this.driver, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
		});
		const response =
			await this.driver.sendCommand<FirmwareUpdateMetaDataCCMetaDataReport>(
				cc,
				this.commandOptions,
			);
		if (response) {
			return pick(response, [
				"manufacturerId",
				"firmwareId",
				"checksum",
				"firmwareUpgradable",
				"maxFragmentSize",
				"additionalFirmwareIDs",
				"hardwareVersion",
				"continuesToFunction",
				"supportsActivation",
			]);
		}
	}

	/**
	 * Requests the device to start the firmware update process.
	 * WARNING: This method may wait up to 60 seconds for a reply.
	 */
	@validateArgs()
	public async requestUpdate(
		options: FirmwareUpdateMetaDataCCRequestGetOptions,
	): Promise<FirmwareUpdateRequestStatus> {
		this.assertSupportsCommand(
			FirmwareUpdateMetaDataCommand,
			FirmwareUpdateMetaDataCommand.RequestGet,
		);

		const cc = new FirmwareUpdateMetaDataCCRequestGet(this.driver, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			...options,
		});
		// Since the response may take longer than with other commands,
		// we do not use the built-in waiting functionality, which would block
		// all other communication
		await this.driver.sendCommand(cc, this.commandOptions);
		const { status } =
			await this.driver.waitForCommand<FirmwareUpdateMetaDataCCRequestReport>(
				(cc) =>
					cc instanceof FirmwareUpdateMetaDataCCRequestReport &&
					cc.nodeId === this.endpoint.nodeId,
				60000,
			);
		return status;
	}

	/**
	 * Sends a fragment of the new firmware to the device
	 */
	@validateArgs()
	public async sendFirmwareFragment(
		fragmentNumber: number,
		isLastFragment: boolean,
		data: Buffer,
	): Promise<void> {
		this.assertSupportsCommand(
			FirmwareUpdateMetaDataCommand,
			FirmwareUpdateMetaDataCommand.Report,
		);

		const cc = new FirmwareUpdateMetaDataCCReport(this.driver, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			reportNumber: fragmentNumber,
			isLast: isLastFragment,
			firmwareData: data,
		});
		await this.driver.sendCommand(cc, this.commandOptions);
	}

	/** Activates a previously transferred firmware image */
	@validateArgs()
	public async activateFirmware(
		options: FirmwareUpdateMetaDataCCActivationSetOptions,
	): Promise<FirmwareUpdateActivationStatus | undefined> {
		this.assertSupportsCommand(
			FirmwareUpdateMetaDataCommand,
			FirmwareUpdateMetaDataCommand.ActivationSet,
		);

		const cc = new FirmwareUpdateMetaDataCCActivationSet(this.driver, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			...options,
		});
		const response =
			await this.driver.sendCommand<FirmwareUpdateMetaDataCCActivationReport>(
				cc,
				this.commandOptions,
			);
		return response?.activationStatus;
	}
}

@commandClass(CommandClasses["Firmware Update Meta Data"])
@implementedVersion(7)
export class FirmwareUpdateMetaDataCC extends CommandClass {
	declare ccCommand: FirmwareUpdateMetaDataCommand;
}

@CCCommand(FirmwareUpdateMetaDataCommand.MetaDataReport)
export class FirmwareUpdateMetaDataCCMetaDataReport extends FirmwareUpdateMetaDataCC {
	public constructor(
		host: ZWaveHost,
		options: CommandClassDeserializationOptions,
	) {
		super(host, options);
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

		this.persistValues();
	}

	public readonly manufacturerId: number;
	public readonly firmwareId: number;
	public readonly checksum: number;
	public readonly firmwareUpgradable: boolean;
	public readonly maxFragmentSize?: number;
	public readonly additionalFirmwareIDs: readonly number[] = [];
	public readonly hardwareVersion?: number;

	@ccValue({ internal: true })
	public readonly continuesToFunction: Maybe<boolean> = unknownBoolean;

	@ccValue({ internal: true })
	public readonly supportsActivation: Maybe<boolean> = unknownBoolean;

	public toLogEntry(): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(),
			message: {
				"manufacturer id": this.manufacturerId,
				"firmware id": this.firmwareId,
				checksum: this.checksum,
				"firmware upgradable": this.firmwareUpgradable,
				"max fragment size": this.maxFragmentSize,
				"additional firmware IDs": JSON.stringify(
					this.additionalFirmwareIDs,
				),
				"hardware version": this.hardwareVersion,
				"continues to function": this.continuesToFunction,
				"supports activation": this.supportsActivation,
			},
		};
	}
}

@CCCommand(FirmwareUpdateMetaDataCommand.MetaDataGet)
@expectedCCResponse(FirmwareUpdateMetaDataCCMetaDataReport)
export class FirmwareUpdateMetaDataCCMetaDataGet extends FirmwareUpdateMetaDataCC {}

@CCCommand(FirmwareUpdateMetaDataCommand.RequestReport)
export class FirmwareUpdateMetaDataCCRequestReport extends FirmwareUpdateMetaDataCC {
	public constructor(
		host: ZWaveHost,
		options: CommandClassDeserializationOptions,
	) {
		super(host, options);
		validatePayload(this.payload.length >= 1);
		this.status = this.payload[0];
	}

	public readonly status: FirmwareUpdateRequestStatus;

	public toLogEntry(): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(),
			message: {
				status: getEnumMemberName(
					FirmwareUpdateRequestStatus,
					this.status,
				),
			},
		};
	}
}

type FirmwareUpdateMetaDataCCRequestGetOptions = {
	manufacturerId: number;
	firmwareId: number;
	checksum: number;
} & AllOrNone<{
	// V3+
	firmwareTarget: number;
	fragmentSize: number;
	// V4+
	activation?: boolean;
	// V5+
	hardwareVersion?: number;
}>;

@CCCommand(FirmwareUpdateMetaDataCommand.RequestGet)
// This would expect a FirmwareUpdateMetaDataCCRequestReport, but the response may take
// a while to come. We don't want to block communication, so we don't expect a response here
export class FirmwareUpdateMetaDataCCRequestGet extends FirmwareUpdateMetaDataCC {
	public constructor(
		host: ZWaveHost,
		options:
			| CommandClassDeserializationOptions
			| (FirmwareUpdateMetaDataCCRequestGetOptions & CCCommandOptions),
	) {
		super(host, options);
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
				this.activation = options.activation ?? false;
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

	public toLogEntry(): MessageOrCCLogEntry {
		const message: MessageRecord = {
			"manufacturer id": num2hex(this.manufacturerId),
			"firmware id": num2hex(this.firmwareId),
			checksum: num2hex(this.checksum),
		};
		if (this.firmwareTarget != undefined) {
			message["firmware target"] = this.firmwareTarget;
		}
		if (this.fragmentSize != undefined) {
			message["fragment size"] = this.fragmentSize;
		}
		if (this.activation != undefined) {
			message.activation = this.activation;
		}
		if (this.hardwareVersion != undefined) {
			message["hardware version"] = this.hardwareVersion;
		}
		return {
			...super.toLogEntry(),
			message,
		};
	}
}

@CCCommand(FirmwareUpdateMetaDataCommand.Get)
// This is sent to us from the node, so we expect no response
export class FirmwareUpdateMetaDataCCGet extends FirmwareUpdateMetaDataCC {
	public constructor(
		host: ZWaveHost,
		options: CommandClassDeserializationOptions,
	) {
		super(host, options);
		validatePayload(this.payload.length >= 3);
		this.numReports = this.payload[0];
		this.reportNumber = this.payload.readUInt16BE(1) & 0x7fff;
	}

	public readonly numReports: number;
	public readonly reportNumber: number;

	public toLogEntry(): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(),
			message: {
				"total # of reports": this.numReports,
				"report number": this.reportNumber,
			},
		};
	}
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
		host: ZWaveHost,
		options:
			| CommandClassDeserializationOptions
			| FirmwareUpdateMetaDataCCReportOptions,
	) {
		super(host, options);
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

	public toLogEntry(): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(),
			message: {
				"report #": this.reportNumber,
				"is last": this.isLast,
			},
		};
	}
}

@CCCommand(FirmwareUpdateMetaDataCommand.StatusReport)
export class FirmwareUpdateMetaDataCCStatusReport extends FirmwareUpdateMetaDataCC {
	public constructor(
		host: ZWaveHost,
		options: CommandClassDeserializationOptions,
	) {
		super(host, options);
		validatePayload(this.payload.length >= 1);
		this.status = this.payload[0];
		if (this.payload.length >= 3) {
			this.waitTime = this.payload.readUInt16BE(1);
		}
	}

	public readonly status: FirmwareUpdateStatus;
	/** The wait time in seconds before the node becomes available for communication after the update */
	public readonly waitTime?: number;

	public toLogEntry(): MessageOrCCLogEntry {
		const message: MessageRecord = {
			status: getEnumMemberName(FirmwareUpdateStatus, this.status),
		};
		if (this.waitTime != undefined) {
			message["wait time"] = `${this.waitTime} seconds`;
		}
		return {
			...super.toLogEntry(),
			message,
		};
	}
}

@CCCommand(FirmwareUpdateMetaDataCommand.ActivationReport)
export class FirmwareUpdateMetaDataCCActivationReport extends FirmwareUpdateMetaDataCC {
	public constructor(
		host: ZWaveHost,
		options: CommandClassDeserializationOptions,
	) {
		super(host, options);
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

	public toLogEntry(): MessageOrCCLogEntry {
		const message: MessageRecord = {
			"manufacturer id": num2hex(this.manufacturerId),
			"firmware id": num2hex(this.firmwareId),
			checksum: num2hex(this.checksum),
			"firmware target": this.firmwareTarget,
			"activation status": getEnumMemberName(
				FirmwareUpdateActivationStatus,
				this.activationStatus,
			),
		};
		if (this.hardwareVersion != undefined) {
			message.hardwareVersion = this.hardwareVersion;
		}
		return {
			...super.toLogEntry(),
			message,
		};
	}
}

interface FirmwareUpdateMetaDataCCActivationSetOptions {
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
		host: ZWaveHost,
		options:
			| CommandClassDeserializationOptions
			| (FirmwareUpdateMetaDataCCActivationSetOptions & CCCommandOptions),
	) {
		super(host, options);
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

	public toLogEntry(): MessageOrCCLogEntry {
		const message: MessageRecord = {
			"manufacturer id": num2hex(this.manufacturerId),
			"firmware id": num2hex(this.firmwareId),
			checksum: num2hex(this.checksum),
			"firmware target": this.firmwareTarget,
		};
		if (this.hardwareVersion != undefined) {
			message["hardware version"] = this.hardwareVersion;
		}
		return {
			...super.toLogEntry(),
			message,
		};
	}
}

@CCCommand(FirmwareUpdateMetaDataCommand.PrepareReport)
export class FirmwareUpdateMetaDataCCPrepareReport extends FirmwareUpdateMetaDataCC {
	public constructor(
		host: ZWaveHost,
		options: CommandClassDeserializationOptions,
	) {
		super(host, options);
		validatePayload(this.payload.length >= 3);
		this.status = this.payload[0];
		this.checksum = this.payload.readUInt16BE(1);
	}

	public readonly status: FirmwareDownloadStatus;
	public readonly checksum: number;

	public toLogEntry(): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(),
			message: {
				status: getEnumMemberName(FirmwareDownloadStatus, this.status),
				checksum: num2hex(this.checksum),
			},
		};
	}
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
		host: ZWaveHost,
		options:
			| CommandClassDeserializationOptions
			| FirmwareUpdateMetaDataCCPrepareGetOptions,
	) {
		super(host, options);
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

	public toLogEntry(): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(),
			message: {
				"manufacturer id": num2hex(this.manufacturerId),
				"firmware id": num2hex(this.firmwareId),
				"firmware target": this.firmwareTarget,
				"fragment size": this.fragmentSize,
				"hardware version": this.hardwareVersion,
			},
		};
	}
}
