import {
	CommandClasses,
	Maybe,
	MessageOrCCLogEntry,
	MessageRecord,
	validatePayload,
	ZWaveError,
	ZWaveErrorCodes,
} from "@zwave-js/core";
import { buffer2hex, isPrintableASCII, num2hex } from "@zwave-js/shared";
import type { Driver } from "../driver/Driver";
import { MessagePriority } from "../message/Constants";
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

interface DateSegments {
	year: number;
	month: number;
	day: number;
	hour: number;
	minute: number;
	second: number;
}

function segmentsToDate(segments: DateSegments): Date {
	return new Date(
		segments.year,
		segments.month - 1, // JS months are 0-based.
		segments.day,
		segments.hour,
		segments.minute,
		segments.second,
	);
}

// All the supported commands
export enum DoorLockLoggingCommand {
	RecordsSupportedGet = 0x01,
	RecordsSupportedReport = 0x02,
	RecordGet = 0x03,
	RecordReport = 0x04,
}

// @publicAPI
export enum EventType {
	LockCode = 0x01,
	UnlockCode = 0x02,
	LockButton = 0x03,
	UnlockButton = 0x04,
	LockCodeOutOfSchedule = 0x05,
	UnlockCodeOutOfSchedule = 0x06,
	IllegalCode = 0x07,
	LockManual = 0x08,
	UnlockManual = 0x09,
	LockAuto = 0x0a,
	UnlockAuto = 0x0b,
	LockRemoteCode = 0x0c,
	UnlockRemoteCode = 0x0d,
	LockRemote = 0x0e,
	UnlockRemote = 0x0f,
	LockRemoteCodeOutOfSchedule = 0x10,
	UnlockRemoteCodeOutOfSchedule = 0x11,
	RemoteIllegalCode = 0x12,
	LockManual2 = 0x13,
	UnlockManual2 = 0x14,
	LockSecured = 0x15,
	LockUnsecured = 0x16,
	UserCodeAdded = 0x17,
	UserCodeDeleted = 0x18,
	AllUserCodesDeleted = 0x19,
	MasterCodeChanged = 0x1a,
	UserCodeChanged = 0x1b,
	LockReset = 0x1c,
	ConfigurationChanged = 0x1d,
	LowBattery = 0x1e,
	NewBattery = 0x1f,
	Unknown = 0x20,
}

const eventTypeLabel: { [key in keyof typeof EventType]: string } = {
	LockCode: "Locked via Access Code",
	UnlockCode: "Unlocked via Access Code",
	LockButton: "Locked via Lock Button",
	UnlockButton: "Unlocked via Unlock Button",
	LockCodeOutOfSchedule: "Out of Schedule Lock Attempt via Access Code",
	UnlockCodeOutOfSchedule: "Out of Schedule Unlock Attempt via Access Code",
	IllegalCode: "Illegal Access Code Entered",
	LockManual: "Manually Locked",
	UnlockManual: "Manually Unlocked",
	LockAuto: "Auto Locked",
	UnlockAuto: "Auto Unlocked",
	LockRemoteCode: "Locked via Remote Access Code",
	UnlockRemoteCode: "Unlocked via Remote Access Code",
	LockRemote: "Locked via Remote",
	UnlockRemote: "Unlocked via Remote",
	LockRemoteCodeOutOfSchedule:
		"Out of Schedule Lock Attempt via Remote Access Code",
	UnlockRemoteCodeOutOfSchedule:
		"Out of Schedule Unlock Attempt via Remote Access Code",
	RemoteIllegalCode: "Illegal Remote Access Code",
	LockManual2: "Manually Locked (2)",
	UnlockManual2: "Manually Unlocked (2)",
	LockSecured: "Lock Secured",
	LockUnsecured: "Lock Unsecured",
	UserCodeAdded: "User Code Added",
	UserCodeDeleted: "User Code Deleted",
	AllUserCodesDeleted: "All User Codes Deleted",
	MasterCodeChanged: "Master Code Changed",
	UserCodeChanged: "User Code Changed",
	LockReset: "Lock Reset",
	ConfigurationChanged: "Configuration Changed",
	LowBattery: "Low Battery",
	NewBattery: "New Battery Installed",
	Unknown: "Unknown",
};

const LATEST_RECORD_NUMBER_KEY = 0;

export interface DoorLockLoggingRecord {
	timestamp: string;
	eventType: EventType;
	label: string;
	userId?: number;
	userCode?: string | Buffer;
}

// @publicAPI
export enum RecordStatus {
	Empty = 0x00,
	HoldsLegalData = 0x01,
}

@API(CommandClasses["Door Lock Logging"])
export class DoorLockLoggingCCAPI extends PhysicalCCAPI {
	public supportsCommand(cmd: DoorLockLoggingCommand): Maybe<boolean> {
		switch (cmd) {
			case DoorLockLoggingCommand.RecordsSupportedGet:
			case DoorLockLoggingCommand.RecordsSupportedReport:
			case DoorLockLoggingCommand.RecordGet:
			case DoorLockLoggingCommand.RecordReport:
				return true;
		}
		return super.supportsCommand(cmd);
	}

	public async getRecordsCount(): Promise<number | undefined> {
		this.assertSupportsCommand(
			DoorLockLoggingCommand,
			DoorLockLoggingCommand.RecordsSupportedGet,
		);

		const cc = new DoorLockLoggingCCRecordsSupportedGet(this.driver, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
		});
		const response =
			await this.driver.sendCommand<DoorLockLoggingCCRecordsSupportedReport>(
				cc,
				this.commandOptions,
			);
		return response?.recordsCount;
	}

	/** Retrieves the specified audit record. Defaults to the latest one. */
	public async getRecord(
		recordNumber: number = LATEST_RECORD_NUMBER_KEY,
	): Promise<DoorLockLoggingRecord | undefined> {
		this.assertSupportsCommand(
			DoorLockLoggingCommand,
			DoorLockLoggingCommand.RecordGet,
		);

		const cc = new DoorLockLoggingCCRecordGet(this.driver, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			recordNumber,
		});
		const response =
			await this.driver.sendCommand<DoorLockLoggingCCRecordReport>(
				cc,
				this.commandOptions,
			);
		return response?.record;
	}
}

@commandClass(CommandClasses["Door Lock Logging"])
@implementedVersion(1)
export class DoorLockLoggingCC extends CommandClass {
	declare ccCommand: DoorLockLoggingCommand;

	public async interview(): Promise<void> {
		const node = this.getNode()!;

		this.driver.controllerLog.logNode(node.id, {
			endpoint: this.endpointIndex,
			message: `Interviewing ${this.ccName}...`,
			direction: "none",
		});

		await this.refreshValues();

		// Remember that the interview is complete
		this.interviewComplete = true;
	}

	public async refreshValues(): Promise<void> {
		const node = this.getNode()!;
		const endpoint = this.getEndpoint()!;
		const api = endpoint.commandClasses["Door Lock Logging"].withOptions({
			priority: MessagePriority.NodeQuery,
		});

		this.driver.controllerLog.logNode(node.id, {
			endpoint: this.endpointIndex,
			message: "querying supported number of records...",
			direction: "outbound",
		});
		const recordsCount = await api.getRecordsCount();

		if (!recordsCount) {
			this.driver.controllerLog.logNode(node.id, {
				endpoint: this.endpointIndex,
				message:
					"Door Lock Logging records count query timed out, skipping interview...",
				level: "warn",
			});
			return;
		}

		const recordsCountLogMessage = `supports ${recordsCount} record${
			recordsCount === 1 ? "" : "s"
		}`;
		this.driver.controllerLog.logNode(node.id, {
			endpoint: this.endpointIndex,
			message: recordsCountLogMessage,
			direction: "inbound",
		});
	}
}

@CCCommand(DoorLockLoggingCommand.RecordsSupportedReport)
export class DoorLockLoggingCCRecordsSupportedReport extends DoorLockLoggingCC {
	public constructor(
		driver: Driver,
		options: CommandClassDeserializationOptions,
	) {
		super(driver, options);
		validatePayload(this.payload.length >= 1);

		this.recordsCount = this.payload[0];
		this.persistValues();
	}

	@ccValue({ internal: true })
	public readonly recordsCount: number;

	public toLogEntry(): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(),
			message: {
				"supported no. of records": this.recordsCount,
			},
		};
	}
}

function eventTypeToLabel(eventType: EventType): string {
	return (
		eventTypeLabel[EventType[eventType] as keyof typeof EventType] ??
		`Unknown ${num2hex(eventType)}`
	);
}

@CCCommand(DoorLockLoggingCommand.RecordsSupportedGet)
@expectedCCResponse(DoorLockLoggingCCRecordsSupportedReport)
export class DoorLockLoggingCCRecordsSupportedGet extends DoorLockLoggingCC {}

@CCCommand(DoorLockLoggingCommand.RecordReport)
export class DoorLockLoggingCCRecordReport extends DoorLockLoggingCC {
	public constructor(
		driver: Driver,
		options: CommandClassDeserializationOptions,
	) {
		super(driver, options);
		validatePayload(this.payload.length >= 11);

		this.recordNumber = this.payload[0];
		const recordStatus = this.payload[5] >>> 5;
		if (recordStatus === RecordStatus.Empty) {
			return;
		} else {
			const dateSegments = {
				year: this.payload.readUInt16BE(1),
				month: this.payload[3],
				day: this.payload[4],
				hour: this.payload[5] & 0b11111,
				minute: this.payload[6],
				second: this.payload[7],
			};

			const eventType = this.payload[8];
			const recordUserID = this.payload[9];
			const userCodeLength = this.payload[10];
			validatePayload(
				userCodeLength <= 10,
				this.payload.length >= 11 + userCodeLength,
			);

			const userCodeBuffer = this.payload.slice(11, 11 + userCodeLength);
			// See User Code CC for a detailed description. We try to parse the code as ASCII if possible
			// and fall back to a buffer otherwise.
			const userCodeString = userCodeBuffer.toString("utf8");
			const userCode = isPrintableASCII(userCodeString)
				? userCodeString
				: userCodeBuffer;

			this.record = {
				eventType: eventType,
				label: eventTypeToLabel(eventType),
				timestamp: segmentsToDate(dateSegments).toISOString(),
				userId: recordUserID,
				userCode,
			};
		}
	}

	// @noCCValues This CC does not save any values

	public readonly recordNumber: number;
	public readonly record?: DoorLockLoggingRecord;

	public toLogEntry(): MessageOrCCLogEntry {
		let message: MessageRecord;

		if (!this.record) {
			message = {
				"record #": `${this.recordNumber} (empty)`,
			};
		} else {
			message = {
				"record #": `${this.recordNumber}`,
				"event type": this.record.label,
				timestamp: this.record.timestamp,
			};
			if (this.record.userId) {
				message["user ID"] = this.record.userId;
			}
			if (this.record.userCode) {
				message["user code"] =
					typeof this.record.userCode === "string"
						? this.record.userCode
						: buffer2hex(this.record.userCode);
			}
		}
		return {
			...super.toLogEntry(),
			message,
		};
	}
}

interface DoorLockLoggingCCRecordGetOptions extends CCCommandOptions {
	recordNumber: number;
}

function testResponseForDoorLockLoggingRecordGet(
	sent: DoorLockLoggingCCRecordGet,
	received: DoorLockLoggingCCRecordReport,
) {
	return (
		sent.recordNumber === LATEST_RECORD_NUMBER_KEY ||
		sent.recordNumber === received.recordNumber
	);
}

@CCCommand(DoorLockLoggingCommand.RecordGet)
@expectedCCResponse(
	DoorLockLoggingCCRecordReport,
	testResponseForDoorLockLoggingRecordGet,
)
export class DoorLockLoggingCCRecordGet extends DoorLockLoggingCC {
	public constructor(
		driver: Driver,
		options:
			| CommandClassDeserializationOptions
			| DoorLockLoggingCCRecordGetOptions,
	) {
		super(driver, options);
		if (gotDeserializationOptions(options)) {
			throw new ZWaveError(
				`${this.constructor.name}: deserialization not implemented`,
				ZWaveErrorCodes.Deserialization_NotImplemented,
			);
		} else {
			this.recordNumber = options.recordNumber;
		}
	}

	public recordNumber: number;

	public serialize(): Buffer {
		this.payload = Buffer.from([this.recordNumber]);
		return super.serialize();
	}

	public toLogEntry(): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(),
			message: { "record number": this.recordNumber },
		};
	}
}
