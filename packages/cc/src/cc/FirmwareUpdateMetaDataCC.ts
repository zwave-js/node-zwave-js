import {
	CRC16_CCITT,
	CommandClasses,
	type MaybeNotKnown,
	type MessageOrCCLogEntry,
	MessagePriority,
	type MessageRecord,
	ZWaveError,
	ZWaveErrorCodes,
	validatePayload,
} from "@zwave-js/core/safe";
import type {
	ZWaveApplicationHost,
	ZWaveHost,
	ZWaveValueHost,
} from "@zwave-js/host/safe";
import {
	type AllOrNone,
	getEnumMemberName,
	num2hex,
	pick,
} from "@zwave-js/shared/safe";
import { validateArgs } from "@zwave-js/transformers";
import { CCAPI, PhysicalCCAPI } from "../lib/API";
import {
	type CCCommandOptions,
	CommandClass,
	type CommandClassDeserializationOptions,
	gotDeserializationOptions,
} from "../lib/CommandClass";
import {
	API,
	CCCommand,
	ccValue,
	ccValues,
	commandClass,
	expectedCCResponse,
	implementedVersion,
} from "../lib/CommandClassDecorators";
import { V } from "../lib/Values";
import {
	FirmwareDownloadStatus,
	FirmwareUpdateActivationStatus,
	type FirmwareUpdateMetaData,
	FirmwareUpdateMetaDataCommand,
	FirmwareUpdateRequestStatus,
	FirmwareUpdateStatus,
} from "../lib/_Types";

// @noSetValueAPI There are no values to set here

export const FirmwareUpdateMetaDataCCValues = Object.freeze({
	...V.defineStaticCCValues(CommandClasses["Firmware Update Meta Data"], {
		...V.staticProperty("supportsActivation", undefined, {
			internal: true,
		}),
		...V.staticProperty("firmwareUpgradable", undefined, {
			internal: true,
		}),
		...V.staticProperty("additionalFirmwareIDs", undefined, {
			internal: true,
		}),
		...V.staticProperty("continuesToFunction", undefined, {
			internal: true,
		}),
	}),
});

@API(CommandClasses["Firmware Update Meta Data"])
export class FirmwareUpdateMetaDataCCAPI extends PhysicalCCAPI {
	public supportsCommand(
		cmd: FirmwareUpdateMetaDataCommand,
	): MaybeNotKnown<boolean> {
		switch (cmd) {
			case FirmwareUpdateMetaDataCommand.MetaDataGet:
			case FirmwareUpdateMetaDataCommand.MetaDataReport:
			case FirmwareUpdateMetaDataCommand.RequestGet:
			case FirmwareUpdateMetaDataCommand.Report:
			case FirmwareUpdateMetaDataCommand.StatusReport:
				return true;

			case FirmwareUpdateMetaDataCommand.ActivationSet:
				return (
					this.version >= 4
					&& (this.version < 7
						|| this.tryGetValueDB()?.getValue(
								FirmwareUpdateMetaDataCCValues
									.supportsActivation.endpoint(
										this.endpoint.index,
									),
							) === true)
				);

			case FirmwareUpdateMetaDataCommand.PrepareGet:
				return this.version >= 5;
		}
		return super.supportsCommand(cmd);
	}

	/**
	 * Requests information about the current firmware on the device
	 */
	public async getMetaData(): Promise<MaybeNotKnown<FirmwareUpdateMetaData>> {
		this.assertSupportsCommand(
			FirmwareUpdateMetaDataCommand,
			FirmwareUpdateMetaDataCommand.MetaDataGet,
		);

		const cc = new FirmwareUpdateMetaDataCCMetaDataGet(this.applHost, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
		});
		const response = await this.applHost.sendCommand<
			FirmwareUpdateMetaDataCCMetaDataReport
		>(
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

	@validateArgs()
	public async reportMetaData(
		options: FirmwareUpdateMetaDataCCMetaDataReportOptions,
	): Promise<void> {
		this.assertSupportsCommand(
			FirmwareUpdateMetaDataCommand,
			FirmwareUpdateMetaDataCommand.Report,
		);

		const cc = new FirmwareUpdateMetaDataCCMetaDataReport(this.applHost, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			...options,
		});
		await this.applHost.sendCommand(cc, this.commandOptions);
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

		const cc = new FirmwareUpdateMetaDataCCRequestGet(this.applHost, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			...options,
		});
		// Since the response may take longer than with other commands,
		// we do not use the built-in waiting functionality, which would block
		// all other communication.

		await this.applHost.sendCommand(cc, {
			...this.commandOptions,
			// Do not wait for Nonce Reports
			s2VerifyDelivery: false,
		});
		const { status } = await this.applHost.waitForCommand<
			FirmwareUpdateMetaDataCCRequestReport
		>(
			(cc) =>
				cc instanceof FirmwareUpdateMetaDataCCRequestReport
				&& cc.nodeId === this.endpoint.nodeId,
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

		const cc = new FirmwareUpdateMetaDataCCReport(this.applHost, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			reportNumber: fragmentNumber,
			isLast: isLastFragment,
			firmwareData: data,
		});
		await this.applHost.sendCommand(cc, {
			...this.commandOptions,
			// Do not wait for Nonce Reports
			s2VerifyDelivery: false,
		});
	}

	/** Activates a previously transferred firmware image */
	@validateArgs()
	public async activateFirmware(
		options: FirmwareUpdateMetaDataCCActivationSetOptions,
	): Promise<MaybeNotKnown<FirmwareUpdateActivationStatus>> {
		this.assertSupportsCommand(
			FirmwareUpdateMetaDataCommand,
			FirmwareUpdateMetaDataCommand.ActivationSet,
		);

		const cc = new FirmwareUpdateMetaDataCCActivationSet(this.applHost, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			...options,
		});
		const response = await this.applHost.sendCommand<
			FirmwareUpdateMetaDataCCActivationReport
		>(
			cc,
			this.commandOptions,
		);
		return response?.activationStatus;
	}
}

@commandClass(CommandClasses["Firmware Update Meta Data"])
@implementedVersion(7)
@ccValues(FirmwareUpdateMetaDataCCValues)
export class FirmwareUpdateMetaDataCC extends CommandClass {
	declare ccCommand: FirmwareUpdateMetaDataCommand;

	public skipEndpointInterview(): boolean {
		return true;
	}

	public async interview(applHost: ZWaveApplicationHost): Promise<void> {
		const node = this.getNode(applHost)!;
		const endpoint = this.getEndpoint(applHost)!;
		const api = CCAPI.create(
			CommandClasses["Firmware Update Meta Data"],
			applHost,
			endpoint,
		).withOptions({
			priority: MessagePriority.NodeQuery,
		});

		applHost.controllerLog.logNode(node.id, {
			endpoint: this.endpointIndex,
			message: `Interviewing ${this.ccName}...`,
			direction: "none",
		});

		applHost.controllerLog.logNode(node.id, {
			endpoint: this.endpointIndex,
			message: "Querying firmware update capabilities...",
			direction: "outbound",
		});

		const caps = await api.getMetaData();
		if (caps) {
			let logMessage = `Received firmware update capabilities:`;
			if (caps.firmwareUpgradable) {
				logMessage += `
  firmware targets:      ${[0, ...caps.additionalFirmwareIDs].join(", ")}
  continues to function: ${caps.continuesToFunction}
  supports activation:   ${caps.supportsActivation}`;
			} else {
				logMessage += `\nfirmware upgradeable: false`;
			}
			applHost.controllerLog.logNode(node.id, {
				endpoint: this.endpointIndex,
				message: logMessage,
				direction: "inbound",
			});
		} else {
			applHost.controllerLog.logNode(node.id, {
				endpoint: this.endpointIndex,
				message: "Firmware update capability query timed out",
				direction: "inbound",
			});
		}

		// Remember that the interview is complete
		this.setInterviewComplete(applHost, true);
	}
}

// @publicAPI
export interface FirmwareUpdateMetaDataCCMetaDataReportOptions {
	manufacturerId: number;
	firmwareId?: number;
	checksum?: number;
	firmwareUpgradable: boolean;
	maxFragmentSize?: number;
	additionalFirmwareIDs?: readonly number[];
	hardwareVersion?: number;
	continuesToFunction?: MaybeNotKnown<boolean>;
	supportsActivation?: MaybeNotKnown<boolean>;
}

@CCCommand(FirmwareUpdateMetaDataCommand.MetaDataReport)
export class FirmwareUpdateMetaDataCCMetaDataReport
	extends FirmwareUpdateMetaDataCC
	implements FirmwareUpdateMetaData
{
	public constructor(
		host: ZWaveHost,
		options:
			| CommandClassDeserializationOptions
			| (
				& FirmwareUpdateMetaDataCCMetaDataReportOptions
				& CCCommandOptions
			),
	) {
		super(host, options);

		if (gotDeserializationOptions(options)) {
			validatePayload(this.payload.length >= 6);
			this.manufacturerId = this.payload.readUInt16BE(0);
			this.firmwareId = this.payload.readUInt16BE(2);
			this.checksum = this.payload.readUInt16BE(4);
			// V1/V2 only have a single firmware which must be upgradable
			this.firmwareUpgradable = this.payload[6] === 0xff
				|| this.payload[6] == undefined;

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
					if (
						this.version >= 6 && this.payload.length >= offset + 1
					) {
						const capabilities = this.payload[offset];
						offset++;

						this.continuesToFunction = !!(capabilities & 0b1);
						if (this.version >= 7) {
							this.supportsActivation = !!(capabilities & 0b10);
						}
					}
				}
			}
		} else {
			this.manufacturerId = options.manufacturerId;
			this.firmwareId = options.firmwareId ?? 0;
			this.checksum = options.checksum ?? 0;
			this.firmwareUpgradable = options.firmwareUpgradable;
			this.maxFragmentSize = options.maxFragmentSize;
			this.additionalFirmwareIDs = options.additionalFirmwareIDs ?? [];
			this.hardwareVersion = options.hardwareVersion;
			this.continuesToFunction = options.continuesToFunction;
			this.supportsActivation = options.supportsActivation;
		}
	}

	public readonly manufacturerId: number;
	public readonly firmwareId: number;
	public readonly checksum: number;
	@ccValue(FirmwareUpdateMetaDataCCValues.firmwareUpgradable)
	public readonly firmwareUpgradable: boolean;
	public readonly maxFragmentSize?: number;
	@ccValue(FirmwareUpdateMetaDataCCValues.additionalFirmwareIDs)
	public readonly additionalFirmwareIDs: readonly number[] = [];
	public readonly hardwareVersion?: number;
	@ccValue(FirmwareUpdateMetaDataCCValues.continuesToFunction)
	public readonly continuesToFunction: MaybeNotKnown<boolean>;

	@ccValue(FirmwareUpdateMetaDataCCValues.supportsActivation)
	public readonly supportsActivation: MaybeNotKnown<boolean>;

	public serialize(): Buffer {
		this.payload = Buffer.alloc(
			12 + 2 * this.additionalFirmwareIDs.length,
		);
		this.payload.writeUInt16BE(this.manufacturerId, 0);
		this.payload.writeUInt16BE(this.firmwareId, 2);
		this.payload.writeUInt16BE(this.checksum, 4);
		this.payload[6] = this.firmwareUpgradable ? 0xff : 0;
		this.payload[7] = this.additionalFirmwareIDs.length;
		this.payload.writeUInt16BE(this.maxFragmentSize ?? 0xff, 8);
		let offset = 10;
		for (const id of this.additionalFirmwareIDs) {
			this.payload.writeUInt16BE(id, offset);
			offset += 2;
		}
		this.payload[offset++] = this.hardwareVersion ?? 0xff;
		this.payload[offset++] = (this.continuesToFunction ? 0b1 : 0) | (
			this.supportsActivation ? 0b10 : 0
		);

		return super.serialize();
	}

	public toLogEntry(host?: ZWaveValueHost): MessageOrCCLogEntry {
		const message: MessageRecord = {
			"manufacturer id": this.manufacturerId,
			"firmware id": this.firmwareId,
			checksum: this.checksum,
			"firmware upgradable": this.firmwareUpgradable,
		};
		if (this.maxFragmentSize != undefined) {
			message["max fragment size"] = this.maxFragmentSize;
		}
		if (this.additionalFirmwareIDs.length) {
			message["additional firmware IDs"] = JSON.stringify(
				this.additionalFirmwareIDs,
			);
		}
		if (this.hardwareVersion != undefined) {
			message["hardware version"] = this.hardwareVersion;
		}
		if (this.continuesToFunction != undefined) {
			message["continues to function"] = this.continuesToFunction;
		}
		if (this.supportsActivation != undefined) {
			message["supports activation"] = this.supportsActivation;
		}

		return {
			...super.toLogEntry(host),
			message,
		};
	}
}

@CCCommand(FirmwareUpdateMetaDataCommand.MetaDataGet)
@expectedCCResponse(FirmwareUpdateMetaDataCCMetaDataReport)
export class FirmwareUpdateMetaDataCCMetaDataGet
	extends FirmwareUpdateMetaDataCC
{}

@CCCommand(FirmwareUpdateMetaDataCommand.RequestReport)
export class FirmwareUpdateMetaDataCCRequestReport
	extends FirmwareUpdateMetaDataCC
{
	public constructor(
		host: ZWaveHost,
		options: CommandClassDeserializationOptions,
	) {
		super(host, options);
		validatePayload(this.payload.length >= 1);
		this.status = this.payload[0];
	}

	public readonly status: FirmwareUpdateRequestStatus;

	public toLogEntry(host?: ZWaveValueHost): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(host),
			message: {
				status: getEnumMemberName(
					FirmwareUpdateRequestStatus,
					this.status,
				),
			},
		};
	}
}

// @publicAPI
export type FirmwareUpdateMetaDataCCRequestGetOptions =
	& {
		manufacturerId: number;
		firmwareId: number;
		checksum: number;
	}
	& AllOrNone<{
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
export class FirmwareUpdateMetaDataCCRequestGet
	extends FirmwareUpdateMetaDataCC
{
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
		const isV3 = this.version >= 3
			&& this.firmwareTarget != undefined
			&& this.fragmentSize != undefined;
		const isV4 = isV3 && this.version >= 4 && this.activation != undefined;
		const isV5 = isV4
			&& this.version >= 5
			&& this.hardwareVersion != undefined;
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

	public toLogEntry(host?: ZWaveValueHost): MessageOrCCLogEntry {
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
			...super.toLogEntry(host),
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

	public toLogEntry(host?: ZWaveValueHost): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(host),
			message: {
				"total # of reports": this.numReports,
				"report number": this.reportNumber,
			},
		};
	}
}

// @publicAPI
export interface FirmwareUpdateMetaDataCCReportOptions
	extends CCCommandOptions
{
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

	public toLogEntry(host?: ZWaveValueHost): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(host),
			message: {
				"report #": this.reportNumber,
				"is last": this.isLast,
			},
		};
	}
}

@CCCommand(FirmwareUpdateMetaDataCommand.StatusReport)
export class FirmwareUpdateMetaDataCCStatusReport
	extends FirmwareUpdateMetaDataCC
{
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

	public toLogEntry(host?: ZWaveValueHost): MessageOrCCLogEntry {
		const message: MessageRecord = {
			status: getEnumMemberName(FirmwareUpdateStatus, this.status),
		};
		if (this.waitTime != undefined) {
			message["wait time"] = `${this.waitTime} seconds`;
		}
		return {
			...super.toLogEntry(host),
			message,
		};
	}
}

@CCCommand(FirmwareUpdateMetaDataCommand.ActivationReport)
export class FirmwareUpdateMetaDataCCActivationReport
	extends FirmwareUpdateMetaDataCC
{
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

	public toLogEntry(host?: ZWaveValueHost): MessageOrCCLogEntry {
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
			...super.toLogEntry(host),
			message,
		};
	}
}

// @publicAPI
export interface FirmwareUpdateMetaDataCCActivationSetOptions {
	manufacturerId: number;
	firmwareId: number;
	checksum: number;
	firmwareTarget: number;
	// V5+
	hardwareVersion?: number;
}

@CCCommand(FirmwareUpdateMetaDataCommand.ActivationSet)
@expectedCCResponse(FirmwareUpdateMetaDataCCActivationReport)
export class FirmwareUpdateMetaDataCCActivationSet
	extends FirmwareUpdateMetaDataCC
{
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

	public toLogEntry(host?: ZWaveValueHost): MessageOrCCLogEntry {
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
			...super.toLogEntry(host),
			message,
		};
	}
}

@CCCommand(FirmwareUpdateMetaDataCommand.PrepareReport)
export class FirmwareUpdateMetaDataCCPrepareReport
	extends FirmwareUpdateMetaDataCC
{
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

	public toLogEntry(host?: ZWaveValueHost): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(host),
			message: {
				status: getEnumMemberName(FirmwareDownloadStatus, this.status),
				checksum: num2hex(this.checksum),
			},
		};
	}
}

// @publicAPI
export interface FirmwareUpdateMetaDataCCPrepareGetOptions
	extends CCCommandOptions
{
	manufacturerId: number;
	firmwareId: number;
	firmwareTarget: number;
	fragmentSize: number;
	hardwareVersion: number;
}

@CCCommand(FirmwareUpdateMetaDataCommand.PrepareGet)
@expectedCCResponse(FirmwareUpdateMetaDataCCReport)
export class FirmwareUpdateMetaDataCCPrepareGet
	extends FirmwareUpdateMetaDataCC
{
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

	public toLogEntry(host?: ZWaveValueHost): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(host),
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
