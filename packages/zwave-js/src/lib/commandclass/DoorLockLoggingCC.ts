import {
	CommandClasses,
	enumValuesToMetadataStates,
	Maybe,
	MessageOrCCLogEntry,
	validatePayload,
	ValueID,
	ValueMetadata,
	ZWaveError,
	ZWaveErrorCodes,
} from "@zwave-js/core";
import { pick } from "@zwave-js/shared";
import type { Driver } from "../driver/Driver";
import { MessagePriority } from "../message/Constants";
import {
	PhysicalCCAPI,
	PollValueImplementation,
	POLL_VALUE,
	throwUnsupportedProperty,
} from "./API";
import {
	API,
	CCCommand,
	CCCommandOptions,
	ccValue,
	ccValueMetadata,
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
		segments.month,
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
	LockCodeOOSchedule = 0x05,
	UnlockCodeOOSchedule = 0x06,
	IllegalCode = 0x07,
	LockManual = 0x08,
	UnlockManual = 0x09,
	LockAuto = 0x0a,
	UnlockAuto = 0x0b,
	LockRemoteCode = 0x0c,
	UnlockRemoteCode = 0x0d,
	LockRemote = 0x0e,
	UnlockRemote = 0x0f,
	LockRemoteCodeOOSchedule = 0x10,
	UnlockRemoteCodeOOSchedule = 0x11,
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
	LockCodeOOSchedule: "Lock Attempt via Out of Schedule Access Code",
	UnlockCodeOOSchedule: "Unlock Attempt via Out of Schedule Access Code",
	IllegalCode: "Illegal Access Code Entered",
	LockManual: "Manually Locked",
	UnlockManual: "Manually Unlocked",
	LockAuto: "Auto Locked",
	UnlockAuto: "Auto Unlocked",
	LockRemoteCode: "Locked via Remote Out of Schedule Access Code",
	UnlockRemoteCode: "Unlocked via Remote Out of Schedule Access Code",
	LockRemote: "Locked via Remote",
	UnlockRemote: "Unlocked via Remote",
	LockRemoteCodeOOSchedule:
		"Lock Attempt via Remote Out of Schedule Access Code",
	UnlockRemoteCodeOOSchedule:
		"Unlock Attempt via Remote Out of Schedule Access Code",
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

export interface Record {
	recordNumber: number;
	timestamp: string | undefined;
	eventType: EventType | undefined;
	label: string | undefined;
	userId?: number | undefined;
	userCode?: string | Buffer | undefined;
}

// @publicAPI
export enum RecordStatus {
	Empty = 0x00,
	HoldsLegalData = 0xfe,
}

/** Returns the ValueID used to store how many Logging Records are supported */
export function getDoorLockLoggingRecordsSupportedValueID(
	endpoint: number,
): ValueID {
	return {
		commandClass: CommandClasses["Door Lock Logging"],
		endpoint,
		property: "recordsSupported",
	};
}

export function getDoorLockLoggingRecordEventTypeID(endpoint: number): ValueID {
	return {
		commandClass: CommandClasses["Door Lock Logging"],
		endpoint,
		property: "recordEventType",
	};
}

export function getDoorLockLoggingRecordNumberID(endpoint: number): ValueID {
	return {
		commandClass: CommandClasses["Door Lock Logging"],
		endpoint,
		property: "recordNumber",
	};
}

export function getDoorLockLoggingRecordTimestampID(endpoint: number): ValueID {
	return {
		commandClass: CommandClasses["Door Lock Logging"],
		endpoint,
		property: "recordTimestamp",
	};
}

export function getDoorLockLoggingRecordUserIDID(endpoint: number): ValueID {
	return {
		commandClass: CommandClasses["Door Lock Logging"],
		endpoint,
		property: "recordUserID",
	};
}

export function getDoorLockLoggingRecordUserCodeID(endpoint: number): ValueID {
	return {
		commandClass: CommandClasses["Door Lock Logging"],
		endpoint,
		property: "recordUserCode",
	};
}

function setRecordMetadata(
	this: DoorLockLoggingCC,
	supportedRecordsNumber: number | undefined,
	userCode?: string | Buffer,
) {
	const valueDB = this.getValueDB();
	const recordEventTypeID = getDoorLockLoggingRecordEventTypeID(
		this.endpointIndex,
	);
	const recordNumberID = getDoorLockLoggingRecordNumberID(this.endpointIndex);
	const recordTimestampID = getDoorLockLoggingRecordTimestampID(
		this.endpointIndex,
	);
	const recordUserIDID = getDoorLockLoggingRecordUserIDID(this.endpointIndex);
	const recordUserCodeID = getDoorLockLoggingRecordUserCodeID(
		this.endpointIndex,
	);

	// Always create metadata if it does not exist
	if (!valueDB.hasMetadata(recordTimestampID)) {
		valueDB.setMetadata(recordTimestampID, {
			...ValueMetadata.ReadOnlyString,
			label: `record timestamp`,
			description: "Timestamp for latest logging record",
		});
	}

	const supportedEventTypes = [
		EventType.LockCode,
		EventType.UnlockCode,
		EventType.LockButton,
		EventType.UnlockButton,
		EventType.LockCodeOOSchedule,
		EventType.UnlockCodeOOSchedule,
		EventType.IllegalCode,
		EventType.LockManual,
		EventType.UnlockManual,
		EventType.LockAuto,
		EventType.UnlockAuto,
		EventType.LockRemoteCode,
		EventType.UnlockRemoteCode,
		EventType.LockRemote,
		EventType.UnlockRemote,
		EventType.LockRemoteCodeOOSchedule,
		EventType.UnlockRemoteCodeOOSchedule,
		EventType.RemoteIllegalCode,
		EventType.LockManual2,
		EventType.UnlockManual2,
		EventType.LockSecured,
		EventType.LockUnsecured,
		EventType.UserCodeAdded,
		EventType.UserCodeDeleted,
		EventType.AllUserCodesDeleted,
		EventType.MasterCodeChanged,
		EventType.UserCodeChanged,
		EventType.LockReset,
		EventType.ConfigurationChanged,
		EventType.LowBattery,
		EventType.NewBattery,
		EventType.Unknown,
	];

	if (!valueDB.hasMetadata(recordEventTypeID)) {
		valueDB.setMetadata(recordEventTypeID, {
			...ValueMetadata.ReadOnlyString,
			label: `record event type`,
			description: "Event Type for latest logging record",
			states: enumValuesToMetadataStates(EventType, supportedEventTypes),
		});
	}
	if (
		!valueDB.hasMetadata(recordNumberID) &&
		typeof supportedRecordsNumber != "undefined"
	) {
		valueDB.setMetadata(recordNumberID, {
			...ValueMetadata.ReadOnlyNumber,
			min: 1,
			max: supportedRecordsNumber,
			label: `record number`,
			description: "Record Number for latest logging record",
		});
	}
	if (!valueDB.hasMetadata(recordUserIDID)) {
		valueDB.setMetadata(recordUserIDID, {
			...ValueMetadata.ReadOnlyNumber,
			min: 0,
			label: `record user id`,
			description: "User ID for latest logging record",
		});
	}

	const codeMetadata: ValueMetadata = {
		...(Buffer.isBuffer(userCode)
			? ValueMetadata.Buffer
			: ValueMetadata.String),
		minLength: 4,
		maxLength: 10,
		label: `record user code`,
	};
	if (valueDB.getMetadata(recordUserCodeID)?.type !== codeMetadata.type) {
		valueDB.setMetadata(recordUserCodeID, codeMetadata);
	}
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

	protected [POLL_VALUE]: PollValueImplementation = async ({
		property,
	}): Promise<unknown> => {
		switch (property) {
			case "supportedRecordsNumber":
				return (await this.getSupportedRecordsNumber())?.[property];
			case "record":
				// Fetches latest record by default
				return (await this.getRecord(LATEST_RECORD_NUMBER_KEY))?.[
					property
				];
			default:
				throwUnsupportedProperty(this.ccId, property);
		}
	};

	public async getSupportedRecordsNumber(): Promise<number | undefined> {
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
		if (response) {
			return pick(response, ["supportedRecordNumber"]);
		}
	}

	public async getRecord(
		recordNumber: number = LATEST_RECORD_NUMBER_KEY,
	): Promise<Record | undefined> {
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
		if (response) {
			return pick(response, ["record"]);
		}
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
			message: "querying supported records number...",
			direction: "outbound",
		});
		const supportedRecordsNumber = await api.getSupportedRecordsNumber();

		if (!supportedRecordsNumber) {
			this.driver.controllerLog.logNode(node.id, {
				endpoint: this.endpointIndex,
				message:
					"Door Lock Logging supported records number query timed out, skipping interview...",
				level: "warn",
			});
			return;
		}

		const supportedNumberLogMessage = `received response for supported records number: ${supportedRecordsNumber}`;
		this.driver.controllerLog.logNode(node.id, {
			endpoint: this.endpointIndex,
			message: supportedNumberLogMessage,
			direction: "inbound",
		});

		setRecordMetadata.call(this, supportedRecordsNumber);

		// Just retrieve the lastest record
		const record = await api.getRecord(LATEST_RECORD_NUMBER_KEY);

		if (!record) {
			this.driver.controllerLog.logNode(node.id, {
				endpoint: this.endpointIndex,
				message:
					"Door Lock Logging record query timed out, skipping interview...",
				level: "warn",
			});
			return;
		}

		const recordLogMessage = `received response for latest record: ${JSON.stringify(
			record,
		)}`;
		this.driver.controllerLog.logNode(node.id, {
			endpoint: this.endpointIndex,
			message: recordLogMessage,
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

		this.supportedRecordsNumber = this.payload[0];
		this.persistValues();
	}

	@ccValue()
	@ccValueMetadata({
		...ValueMetadata.ReadOnlyUInt8,
		label: "Max logging records stored",
	})
	public readonly supportedRecordsNumber: number;

	public toLogEntry(): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(),
			message: {
				"supported records number": this.supportedRecordsNumber,
			},
		};
	}

	public persistValues(): boolean {
		if (!super.persistValues()) return false;

		this.getValueDB().setValue(
			getDoorLockLoggingRecordsSupportedValueID(this.endpointIndex),
			this.supportedRecordsNumber,
		);

		return true;
	}
}

const convertEventTypeToLabel = (eventType: EventType): string => {
	return eventTypeLabel[EventType[eventType] as keyof typeof EventType];
};

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
		this.recordStatus = this.payload[5] >>> 5;
		if (this.recordStatus === RecordStatus.Empty) {
			this.record = undefined;
			this.recordTimestamp = undefined;
			this.recordEventType = undefined;
			this.recordUserID = undefined;
			this.recordUserCode = undefined;
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
			this.recordUserID = this.payload[9];

			// TODO: Parse User Code. The door lock I used does not provide
			// 	     this data.
			const userCode = undefined;

			this.record = {
				eventType: eventType,
				label: convertEventTypeToLabel(eventType),
				recordNumber: this.recordNumber,
				timestamp: segmentsToDate(dateSegments).toISOString(),
				userId: this.payload[9],
				userCode,
			};
			this.recordTimestamp = segmentsToDate(dateSegments).toISOString();
			this.recordEventType = eventType;
			this.recordUserCode = undefined;
		}

		this.persistValues();
	}

	public readonly record: Record | undefined;
	public readonly recordNumber: number;
	public readonly recordStatus: RecordStatus;
	public readonly recordTimestamp: string | undefined;
	public readonly recordEventType: EventType | undefined;
	public readonly recordUserID: number | undefined;
	public readonly recordUserCode: string | Buffer | undefined;

	public persistValues(): boolean {
		if (!super.persistValues()) return false;

		const valueDB = this.getValueDB();
		const recordEventTypeID = getDoorLockLoggingRecordEventTypeID(
			this.endpointIndex,
		);
		const recordNumberID = getDoorLockLoggingRecordNumberID(
			this.endpointIndex,
		);
		const recordTimestampID = getDoorLockLoggingRecordTimestampID(
			this.endpointIndex,
		);
		const recordUserIDID = getDoorLockLoggingRecordUserIDID(
			this.endpointIndex,
		);
		const recordUserCodeID = getDoorLockLoggingRecordUserCodeID(
			this.endpointIndex,
		);

		// Check if Record is present
		if (this.recordStatus == RecordStatus.Empty) {
			// It is not, remove all values if any exist
			valueDB.removeValue(recordEventTypeID);
			valueDB.removeValue(recordNumberID);
			valueDB.removeValue(recordTimestampID);
			valueDB.removeValue(recordUserIDID);
			valueDB.removeValue(recordUserCodeID);
		} else {
			// Always create metadata in case it does not exist
			if (this.recordUserID && this.recordUserCode) {
				setRecordMetadata.call(this, undefined, this.recordUserCode);
			}
			valueDB.setValue(recordEventTypeID, this.recordEventType);
			valueDB.setValue(recordNumberID, this.recordNumber);
			valueDB.setValue(recordTimestampID, this.recordTimestamp);
			valueDB.setValue(recordUserIDID, this.recordUserID);
			valueDB.setValue(recordUserCodeID, this.recordUserCode);
		}
		return true;
	}

	public toLogEntry(): MessageOrCCLogEntry {
		if (this.recordStatus === RecordStatus.Empty) {
			return {
				...super.toLogEntry(),
				message: {
					record: null,
				},
			};
		}
		return {
			...super.toLogEntry(),
			message: {
				record: JSON.stringify(this.record),
			},
		};
	}
}

interface DoorLockLoggingCCRecordGetOptions extends CCCommandOptions {
	recordNumber: number;
}

@CCCommand(DoorLockLoggingCommand.RecordGet)
@expectedCCResponse(DoorLockLoggingCCRecordReport)
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
