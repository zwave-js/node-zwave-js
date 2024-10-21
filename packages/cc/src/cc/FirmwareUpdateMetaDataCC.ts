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
	CCEncodingContext,
	CCParsingContext,
	GetValueDB,
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
	type CCRaw,
	CommandClass,
	type CommandClassDeserializationOptions,
	type InterviewContext,
	getEffectiveCCVersion,
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
		...V.staticProperty("supportsResuming", undefined, {
			internal: true,
		}),
		...V.staticProperty("supportsNonSecureTransfer", undefined, {
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

		const cc = new FirmwareUpdateMetaDataCCMetaDataGet({
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
		});
		const response = await this.host.sendCommand<
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
				"supportsResuming",
				"supportsNonSecureTransfer",
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

		const cc = new FirmwareUpdateMetaDataCCMetaDataReport({
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			...options,
		});
		await this.host.sendCommand(cc, this.commandOptions);
	}

	/**
	 * Requests the device to start the firmware update process.
	 * This does not wait for the reply - that is up to the caller of this method.
	 */
	@validateArgs()
	public async requestUpdate(
		options: FirmwareUpdateMetaDataCCRequestGetOptions,
	): Promise<void> {
		this.assertSupportsCommand(
			FirmwareUpdateMetaDataCommand,
			FirmwareUpdateMetaDataCommand.RequestGet,
		);

		const cc = new FirmwareUpdateMetaDataCCRequestGet({
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			...options,
		});

		await this.host.sendCommand(cc, {
			...this.commandOptions,
			// Do not wait for Nonce Reports
			s2VerifyDelivery: false,
		});
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

		const cc = new FirmwareUpdateMetaDataCCReport({
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			reportNumber: fragmentNumber,
			isLast: isLastFragment,
			firmwareData: data,
		});
		await this.host.sendCommand(cc, {
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

		const cc = new FirmwareUpdateMetaDataCCActivationSet({
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			...options,
		});
		const response = await this.host.sendCommand<
			FirmwareUpdateMetaDataCCActivationReport
		>(
			cc,
			this.commandOptions,
		);
		return response?.activationStatus;
	}
}

@commandClass(CommandClasses["Firmware Update Meta Data"])
@implementedVersion(8)
@ccValues(FirmwareUpdateMetaDataCCValues)
export class FirmwareUpdateMetaDataCC extends CommandClass {
	declare ccCommand: FirmwareUpdateMetaDataCommand;

	public skipEndpointInterview(): boolean {
		return true;
	}

	public async interview(
		ctx: InterviewContext,
	): Promise<void> {
		const node = this.getNode(ctx)!;
		const endpoint = this.getEndpoint(ctx)!;
		const api = CCAPI.create(
			CommandClasses["Firmware Update Meta Data"],
			ctx,
			endpoint,
		).withOptions({
			priority: MessagePriority.NodeQuery,
		});

		ctx.logNode(node.id, {
			endpoint: this.endpointIndex,
			message: `Interviewing ${this.ccName}...`,
			direction: "none",
		});

		ctx.logNode(node.id, {
			endpoint: this.endpointIndex,
			message: "Querying firmware update capabilities...",
			direction: "outbound",
		});

		const caps = await api.getMetaData();
		if (caps) {
			let logMessage = `Received firmware update capabilities:`;
			if (caps.firmwareUpgradable) {
				logMessage += `
  firmware targets:             ${[0, ...caps.additionalFirmwareIDs].join(", ")}
  continues to function:        ${caps.continuesToFunction}
  supports activation:          ${caps.supportsActivation}`;
				if (caps.supportsResuming != undefined) {
					logMessage += `
  supports resuming:            ${caps.supportsResuming}`;
				}
				if (caps.supportsNonSecureTransfer != undefined) {
					logMessage += `
  supports non-secure transfer: ${caps.supportsNonSecureTransfer}`;
				}
			} else {
				logMessage += `\nfirmware upgradeable: false`;
			}
			ctx.logNode(node.id, {
				endpoint: this.endpointIndex,
				message: logMessage,
				direction: "inbound",
			});
		} else {
			ctx.logNode(node.id, {
				endpoint: this.endpointIndex,
				message: "Firmware update capability query timed out",
				direction: "inbound",
			});
		}

		// Remember that the interview is complete
		this.setInterviewComplete(ctx, true);
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
	supportsResuming?: MaybeNotKnown<boolean>;
	supportsNonSecureTransfer?: MaybeNotKnown<boolean>;
}

@CCCommand(FirmwareUpdateMetaDataCommand.MetaDataReport)
export class FirmwareUpdateMetaDataCCMetaDataReport
	extends FirmwareUpdateMetaDataCC
	implements FirmwareUpdateMetaData
{
	public constructor(
		options:
			& FirmwareUpdateMetaDataCCMetaDataReportOptions
			& CCCommandOptions,
	) {
		super(options);

		this.manufacturerId = options.manufacturerId;
		this.firmwareId = options.firmwareId ?? 0;
		this.checksum = options.checksum ?? 0;
		this.firmwareUpgradable = options.firmwareUpgradable;
		this.maxFragmentSize = options.maxFragmentSize;
		this.additionalFirmwareIDs = options.additionalFirmwareIDs ?? [];
		this.hardwareVersion = options.hardwareVersion;
		this.continuesToFunction = options.continuesToFunction;
		this.supportsActivation = options.supportsActivation;
		this.supportsResuming = options.supportsResuming;
		this.supportsNonSecureTransfer = options.supportsNonSecureTransfer;
	}

	public static from(
		raw: CCRaw,
		ctx: CCParsingContext,
	): FirmwareUpdateMetaDataCCMetaDataReport {
		validatePayload(raw.payload.length >= 6);
		const manufacturerId = raw.payload.readUInt16BE(0);
		const firmwareId = raw.payload.readUInt16BE(2);
		const checksum = raw.payload.readUInt16BE(4);

		// V1/V2 only have a single firmware which must be upgradable
		const firmwareUpgradable = raw.payload[6] === 0xff
			|| raw.payload[6] == undefined;

		let maxFragmentSize: number | undefined;
		let additionalFirmwareIDs: number[] | undefined;
		let hardwareVersion: number | undefined;
		let continuesToFunction: MaybeNotKnown<boolean>;
		let supportsActivation: MaybeNotKnown<boolean>;
		let supportsResuming: MaybeNotKnown<boolean>;
		let supportsNonSecureTransfer: MaybeNotKnown<boolean>;

		if (raw.payload.length >= 10) {
			// V3+
			maxFragmentSize = raw.payload.readUInt16BE(8);
			// Read variable length list of additional firmwares
			const numAdditionalFirmwares = raw.payload[7];
			additionalFirmwareIDs = [];
			validatePayload(
				raw.payload.length >= 10 + 2 * numAdditionalFirmwares,
			);
			for (let i = 0; i < numAdditionalFirmwares; i++) {
				additionalFirmwareIDs.push(
					raw.payload.readUInt16BE(10 + 2 * i),
				);
			}
			// Read hardware version (if it exists)
			let offset = 10 + 2 * numAdditionalFirmwares;
			if (raw.payload.length >= offset + 1) {
				// V5+
				hardwareVersion = raw.payload[offset];
				offset++;
				if (raw.payload.length >= offset + 1) {
					// V6+
					const capabilities = raw.payload[offset];
					offset++;

					continuesToFunction = !!(capabilities & 0b1);
					// V7+
					supportsActivation = !!(capabilities & 0b10);
					// V8+
					supportsResuming = !!(capabilities & 0b1000);
					supportsNonSecureTransfer = !!(capabilities & 0b100);
				}
			}
		}

		return new FirmwareUpdateMetaDataCCMetaDataReport({
			nodeId: ctx.sourceNodeId,
			manufacturerId,
			firmwareId,
			checksum,
			firmwareUpgradable,
			maxFragmentSize,
			additionalFirmwareIDs,
			hardwareVersion,
			continuesToFunction,
			supportsActivation,
			supportsResuming,
			supportsNonSecureTransfer,
		});
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
	@ccValue(FirmwareUpdateMetaDataCCValues.supportsResuming)
	public readonly supportsResuming?: MaybeNotKnown<boolean>;
	@ccValue(FirmwareUpdateMetaDataCCValues.supportsNonSecureTransfer)
	public readonly supportsNonSecureTransfer?: MaybeNotKnown<boolean>;

	public serialize(ctx: CCEncodingContext): Buffer {
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
		this.payload[offset++] = (this.continuesToFunction ? 0b1 : 0)
			| (this.supportsActivation ? 0b10 : 0)
			| (this.supportsNonSecureTransfer ? 0b100 : 0)
			| (this.supportsResuming ? 0b1000 : 0);

		return super.serialize(ctx);
	}

	public toLogEntry(ctx?: GetValueDB): MessageOrCCLogEntry {
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
		if (this.supportsResuming != undefined) {
			message["supports resuming"] = this.supportsResuming;
		}
		if (this.supportsNonSecureTransfer != undefined) {
			message["supports non-secure transfer"] =
				this.supportsNonSecureTransfer;
		}

		return {
			...super.toLogEntry(ctx),
			message,
		};
	}
}

@CCCommand(FirmwareUpdateMetaDataCommand.MetaDataGet)
@expectedCCResponse(FirmwareUpdateMetaDataCCMetaDataReport)
export class FirmwareUpdateMetaDataCCMetaDataGet
	extends FirmwareUpdateMetaDataCC
{}

// @publicAPI
export interface FirmwareUpdateMetaDataCCRequestReportOptions {
	status: FirmwareUpdateRequestStatus;
	resume?: boolean;
	nonSecureTransfer?: boolean;
}

@CCCommand(FirmwareUpdateMetaDataCommand.RequestReport)
export class FirmwareUpdateMetaDataCCRequestReport
	extends FirmwareUpdateMetaDataCC
{
	public constructor(
		options:
			& FirmwareUpdateMetaDataCCRequestReportOptions
			& CCCommandOptions,
	) {
		super(options);

		// TODO: Check implementation:
		this.status = options.status;
		this.resume = options.resume;
		this.nonSecureTransfer = options.nonSecureTransfer;
	}

	public static from(
		raw: CCRaw,
		ctx: CCParsingContext,
	): FirmwareUpdateMetaDataCCRequestReport {
		validatePayload(raw.payload.length >= 1);
		const status: FirmwareUpdateRequestStatus = raw.payload[0];
		let resume: boolean | undefined;
		let nonSecureTransfer: boolean | undefined;
		if (raw.payload.length >= 2) {
			resume = !!(raw.payload[1] & 0b100);
			nonSecureTransfer = !!(raw.payload[1] & 0b10);
		}

		return new FirmwareUpdateMetaDataCCRequestReport({
			nodeId: ctx.sourceNodeId,
			status,
			resume,
			nonSecureTransfer,
		});
	}

	public readonly status: FirmwareUpdateRequestStatus;
	public resume?: boolean;
	public nonSecureTransfer?: boolean;

	public toLogEntry(ctx?: GetValueDB): MessageOrCCLogEntry {
		const message: MessageRecord = {
			status: getEnumMemberName(
				FirmwareUpdateRequestStatus,
				this.status,
			),
		};
		if (this.resume != undefined) {
			message.resume = this.resume;
		}
		if (this.nonSecureTransfer != undefined) {
			message["non-secure transfer"] = this.nonSecureTransfer;
		}
		return {
			...super.toLogEntry(ctx),
			message,
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
		// V8+
		resume?: boolean;
		nonSecureTransfer?: boolean;
	}>;

@CCCommand(FirmwareUpdateMetaDataCommand.RequestGet)
// This would expect a FirmwareUpdateMetaDataCCRequestReport, but the response may take
// a while to come. We don't want to block communication, so we don't expect a response here
export class FirmwareUpdateMetaDataCCRequestGet
	extends FirmwareUpdateMetaDataCC
{
	public constructor(
		options: FirmwareUpdateMetaDataCCRequestGetOptions & CCCommandOptions,
	) {
		super(options);
		this.manufacturerId = options.manufacturerId;
		this.firmwareId = options.firmwareId;
		this.checksum = options.checksum;
		if ("firmwareTarget" in options) {
			this.firmwareTarget = options.firmwareTarget;
			this.fragmentSize = options.fragmentSize;
			this.activation = options.activation ?? false;
			this.hardwareVersion = options.hardwareVersion;
			this.resume = options.resume;
			this.nonSecureTransfer = options.nonSecureTransfer;
		}
	}

	public static from(
		raw: CCRaw,
		ctx: CCParsingContext,
	): FirmwareUpdateMetaDataCCRequestGet {
		// TODO: Deserialize payload
		throw new ZWaveError(
			`${this.constructor.name}: deserialization not implemented`,
			ZWaveErrorCodes.Deserialization_NotImplemented,
		);

		return new FirmwareUpdateMetaDataCCRequestGet({
			nodeId: ctx.sourceNodeId,
		});
	}

	public manufacturerId: number;
	public firmwareId: number;
	public checksum: number;
	public firmwareTarget?: number;
	public fragmentSize?: number;
	public activation?: boolean;
	public hardwareVersion?: number;
	public resume?: boolean;
	public nonSecureTransfer?: boolean;

	public serialize(ctx: CCEncodingContext): Buffer {
		this.payload = Buffer.alloc(11, 0);
		this.payload.writeUInt16BE(this.manufacturerId, 0);
		this.payload.writeUInt16BE(this.firmwareId, 2);
		this.payload.writeUInt16BE(this.checksum, 4);
		this.payload[6] = this.firmwareTarget ?? 0;
		// 32 seems like a reasonable default fragment size,
		// but it should be specified anyways
		this.payload.writeUInt16BE(this.fragmentSize ?? 32, 7);
		this.payload[9] = (this.activation ? 0b1 : 0)
			| (this.nonSecureTransfer ? 0b10 : 0)
			| (this.resume ? 0b100 : 0);
		this.payload[10] = this.hardwareVersion ?? 0x00;

		return super.serialize(ctx);
	}

	public toLogEntry(ctx?: GetValueDB): MessageOrCCLogEntry {
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
		if (this.resume != undefined) {
			message.resume = this.resume;
		}
		if (this.nonSecureTransfer != undefined) {
			message["non-secure transfer"] = this.nonSecureTransfer;
		}
		if (this.hardwareVersion != undefined) {
			message["hardware version"] = this.hardwareVersion;
		}
		return {
			...super.toLogEntry(ctx),
			message,
		};
	}
}

// @publicAPI
export interface FirmwareUpdateMetaDataCCGetOptions {
	numReports: number;
	reportNumber: number;
}

@CCCommand(FirmwareUpdateMetaDataCommand.Get)
// This is sent to us from the node, so we expect no response
export class FirmwareUpdateMetaDataCCGet extends FirmwareUpdateMetaDataCC {
	public constructor(
		options: FirmwareUpdateMetaDataCCGetOptions & CCCommandOptions,
	) {
		super(options);

		// TODO: Check implementation:
		this.numReports = options.numReports;
		this.reportNumber = options.reportNumber;
	}

	public static from(
		raw: CCRaw,
		ctx: CCParsingContext,
	): FirmwareUpdateMetaDataCCGet {
		validatePayload(raw.payload.length >= 3);
		const numReports = raw.payload[0];
		const reportNumber = raw.payload.readUInt16BE(1) & 0x7fff;

		return new FirmwareUpdateMetaDataCCGet({
			nodeId: ctx.sourceNodeId,
			numReports,
			reportNumber,
		});
	}

	public readonly numReports: number;
	public readonly reportNumber: number;

	public toLogEntry(ctx?: GetValueDB): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(ctx),
			message: {
				"total # of reports": this.numReports,
				"report number": this.reportNumber,
			},
		};
	}
}

// @publicAPI
export interface FirmwareUpdateMetaDataCCReportOptions {
	isLast: boolean;
	reportNumber: number;
	firmwareData: Buffer;
}

@CCCommand(FirmwareUpdateMetaDataCommand.Report)
// We send this in reply to the Get command and expect no response
export class FirmwareUpdateMetaDataCCReport extends FirmwareUpdateMetaDataCC {
	public constructor(
		options: FirmwareUpdateMetaDataCCReportOptions & CCCommandOptions,
	) {
		super(options);
		this.reportNumber = options.reportNumber;
		this.firmwareData = options.firmwareData;
		this.isLast = options.isLast;
	}

	public static from(
		raw: CCRaw,
		ctx: CCParsingContext,
	): FirmwareUpdateMetaDataCCReport {
		// TODO: Deserialize payload
		throw new ZWaveError(
			`${this.constructor.name}: deserialization not implemented`,
			ZWaveErrorCodes.Deserialization_NotImplemented,
		);

		return new FirmwareUpdateMetaDataCCReport({
			nodeId: ctx.sourceNodeId,
		});
	}

	public isLast: boolean;
	public reportNumber: number;
	public firmwareData: Buffer;

	public serialize(ctx: CCEncodingContext): Buffer {
		const commandBuffer = Buffer.concat([
			Buffer.allocUnsafe(2), // placeholder for report number
			this.firmwareData,
		]);
		commandBuffer.writeUInt16BE(
			(this.reportNumber & 0x7fff) | (this.isLast ? 0x8000 : 0),
			0,
		);

		// V1 devices would consider the checksum to be part of the firmware data
		// so it must not be included for those
		const ccVersion = getEffectiveCCVersion(ctx, this);
		if (ccVersion >= 2) {
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

		return super.serialize(ctx);
	}

	public toLogEntry(ctx?: GetValueDB): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(ctx),
			message: {
				"report #": this.reportNumber,
				"is last": this.isLast,
			},
		};
	}
}

// @publicAPI
export interface FirmwareUpdateMetaDataCCStatusReportOptions {
	status: FirmwareUpdateStatus;
	waitTime?: number;
}

@CCCommand(FirmwareUpdateMetaDataCommand.StatusReport)
export class FirmwareUpdateMetaDataCCStatusReport
	extends FirmwareUpdateMetaDataCC
{
	public constructor(
		options: FirmwareUpdateMetaDataCCStatusReportOptions & CCCommandOptions,
	) {
		super(options);

		// TODO: Check implementation:
		this.status = options.status;
		this.waitTime = options.waitTime;
	}

	public static from(
		raw: CCRaw,
		ctx: CCParsingContext,
	): FirmwareUpdateMetaDataCCStatusReport {
		validatePayload(raw.payload.length >= 1);
		const status: FirmwareUpdateStatus = raw.payload[0];
		let waitTime: number | undefined;
		if (raw.payload.length >= 3) {
			waitTime = raw.payload.readUInt16BE(1);
		}

		return new FirmwareUpdateMetaDataCCStatusReport({
			nodeId: ctx.sourceNodeId,
			status,
			waitTime,
		});
	}

	public readonly status: FirmwareUpdateStatus;
	/** The wait time in seconds before the node becomes available for communication after the update */
	public readonly waitTime?: number;

	public toLogEntry(ctx?: GetValueDB): MessageOrCCLogEntry {
		const message: MessageRecord = {
			status: getEnumMemberName(FirmwareUpdateStatus, this.status),
		};
		if (this.waitTime != undefined) {
			message["wait time"] = `${this.waitTime} seconds`;
		}
		return {
			...super.toLogEntry(ctx),
			message,
		};
	}
}

// @publicAPI
export interface FirmwareUpdateMetaDataCCActivationReportOptions {
	manufacturerId: number;
	firmwareId: number;
	checksum: number;
	firmwareTarget: number;
	activationStatus: FirmwareUpdateActivationStatus;
	hardwareVersion?: number;
}

@CCCommand(FirmwareUpdateMetaDataCommand.ActivationReport)
export class FirmwareUpdateMetaDataCCActivationReport
	extends FirmwareUpdateMetaDataCC
{
	public constructor(
		options:
			& FirmwareUpdateMetaDataCCActivationReportOptions
			& CCCommandOptions,
	) {
		super(options);

		// TODO: Check implementation:
		this.manufacturerId = options.manufacturerId;
		this.firmwareId = options.firmwareId;
		this.checksum = options.checksum;
		this.firmwareTarget = options.firmwareTarget;
		this.activationStatus = options.activationStatus;
		this.hardwareVersion = options.hardwareVersion;
	}

	public static from(
		raw: CCRaw,
		ctx: CCParsingContext,
	): FirmwareUpdateMetaDataCCActivationReport {
		validatePayload(raw.payload.length >= 8);
		const manufacturerId = raw.payload.readUInt16BE(0);
		const firmwareId = raw.payload.readUInt16BE(2);
		const checksum = raw.payload.readUInt16BE(4);
		const firmwareTarget = raw.payload[6];
		const activationStatus: FirmwareUpdateActivationStatus = raw.payload[7];
		let hardwareVersion: number | undefined;
		if (raw.payload.length >= 9) {
			// V5+
			hardwareVersion = raw.payload[8];
		}

		return new FirmwareUpdateMetaDataCCActivationReport({
			nodeId: ctx.sourceNodeId,
			manufacturerId,
			firmwareId,
			checksum,
			firmwareTarget,
			activationStatus,
			hardwareVersion,
		});
	}

	public readonly manufacturerId: number;
	public readonly firmwareId: number;
	public readonly checksum: number;
	public readonly firmwareTarget: number;
	public readonly activationStatus: FirmwareUpdateActivationStatus;
	public readonly hardwareVersion?: number;

	public toLogEntry(ctx?: GetValueDB): MessageOrCCLogEntry {
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
			...super.toLogEntry(ctx),
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
		options:
			& FirmwareUpdateMetaDataCCActivationSetOptions
			& CCCommandOptions,
	) {
		super(options);
		this.manufacturerId = options.manufacturerId;
		this.firmwareId = options.firmwareId;
		this.checksum = options.checksum;
		this.firmwareTarget = options.firmwareTarget;
		this.hardwareVersion = options.hardwareVersion;
	}

	public static from(
		raw: CCRaw,
		ctx: CCParsingContext,
	): FirmwareUpdateMetaDataCCActivationSet {
		// TODO: Deserialize payload
		throw new ZWaveError(
			`${this.constructor.name}: deserialization not implemented`,
			ZWaveErrorCodes.Deserialization_NotImplemented,
		);

		return new FirmwareUpdateMetaDataCCActivationSet({
			nodeId: ctx.sourceNodeId,
		});
	}

	public manufacturerId: number;
	public firmwareId: number;
	public checksum: number;
	public firmwareTarget: number;
	public hardwareVersion?: number;

	public serialize(ctx: CCEncodingContext): Buffer {
		this.payload = Buffer.allocUnsafe(8);
		this.payload.writeUInt16BE(this.manufacturerId, 0);
		this.payload.writeUInt16BE(this.firmwareId, 2);
		this.payload.writeUInt16BE(this.checksum, 4);
		this.payload[6] = this.firmwareTarget;
		this.payload[7] = this.hardwareVersion ?? 0x00;
		return super.serialize(ctx);
	}

	public toLogEntry(ctx?: GetValueDB): MessageOrCCLogEntry {
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
			...super.toLogEntry(ctx),
			message,
		};
	}
}

// @publicAPI
export interface FirmwareUpdateMetaDataCCPrepareReportOptions {
	status: FirmwareDownloadStatus;
	checksum: number;
}

@CCCommand(FirmwareUpdateMetaDataCommand.PrepareReport)
export class FirmwareUpdateMetaDataCCPrepareReport
	extends FirmwareUpdateMetaDataCC
{
	public constructor(
		options:
			& FirmwareUpdateMetaDataCCPrepareReportOptions
			& CCCommandOptions,
	) {
		super(options);

		// TODO: Check implementation:
		this.status = options.status;
		this.checksum = options.checksum;
	}

	public static from(
		raw: CCRaw,
		ctx: CCParsingContext,
	): FirmwareUpdateMetaDataCCPrepareReport {
		validatePayload(raw.payload.length >= 3);
		const status: FirmwareDownloadStatus = raw.payload[0];
		const checksum = raw.payload.readUInt16BE(1);

		return new FirmwareUpdateMetaDataCCPrepareReport({
			nodeId: ctx.sourceNodeId,
			status,
			checksum,
		});
	}

	public readonly status: FirmwareDownloadStatus;
	public readonly checksum: number;

	public toLogEntry(ctx?: GetValueDB): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(ctx),
			message: {
				status: getEnumMemberName(FirmwareDownloadStatus, this.status),
				checksum: num2hex(this.checksum),
			},
		};
	}
}

// @publicAPI
export interface FirmwareUpdateMetaDataCCPrepareGetOptions {
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
		options: FirmwareUpdateMetaDataCCPrepareGetOptions & CCCommandOptions,
	) {
		super(options);
		this.manufacturerId = options.manufacturerId;
		this.firmwareId = options.firmwareId;
		this.firmwareTarget = options.firmwareTarget;
		this.fragmentSize = options.fragmentSize;
		this.hardwareVersion = options.hardwareVersion;
	}

	public static from(
		raw: CCRaw,
		ctx: CCParsingContext,
	): FirmwareUpdateMetaDataCCPrepareGet {
		// TODO: Deserialize payload
		throw new ZWaveError(
			`${this.constructor.name}: deserialization not implemented`,
			ZWaveErrorCodes.Deserialization_NotImplemented,
		);

		return new FirmwareUpdateMetaDataCCPrepareGet({
			nodeId: ctx.sourceNodeId,
		});
	}

	public manufacturerId: number;
	public firmwareId: number;
	public firmwareTarget: number;
	public fragmentSize: number;
	public hardwareVersion: number;

	public serialize(ctx: CCEncodingContext): Buffer {
		this.payload = Buffer.allocUnsafe(8);
		this.payload.writeUInt16BE(this.manufacturerId, 0);
		this.payload.writeUInt16BE(this.firmwareId, 2);
		this.payload[4] = this.firmwareTarget;
		this.payload.writeUInt16BE(this.fragmentSize, 5);
		this.payload[7] = this.hardwareVersion;
		return super.serialize(ctx);
	}

	public toLogEntry(ctx?: GetValueDB): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(ctx),
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
