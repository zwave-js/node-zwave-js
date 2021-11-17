import {
	CommandClasses,
	Maybe,
	MessageOrCCLogEntry,
	validatePayload,
	ValueID,
	ValueMetadata,
} from "@zwave-js/core";
import {
	isPrintableASCII,
	isPrintableASCIIWithNewlines,
} from "@zwave-js/shared";
import { ZWaveError, ZWaveErrorCodes } from "../..";
import type { Driver } from "../driver/Driver";
import { MessagePriority } from "../message/Constants";
import { PhysicalCCAPI } from "./API";
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
		segments.month - 1,
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

export enum EventTypeLabel {
	LockCode = "Locked via Access Code",
	UnlockCode = "Unlocked via Access Code",
	LockButton = "Locked via Lock Button",
	UnlockButton = "Unlocked via Unlock Button",
	LockCodeOOSchedule = "Lock Attempt via Out of Schedule Access Code",
	UnlockCodeOOSchedule = "Unlock Attempt via Out of Schedule Access Code",
	IllegalCode = "Illegal Access Code Entered",
	LockManual = "Manually Locked",
	UnlockManual = "Manually Unlocked",
	LockAuto = "Auto Locked",
	UnlockAuto = "Auto Unlocked",
	LockRemoteCode = "Locked via Remote Out of Schedule Access Code",
	UnlockRemoteCode = "Unlocked via Remote Out of Schedule Access Code",
	LockRemote = "Locked via Remote",
	UnlockRemote = "Unlocked via Remote",
	LockRemoteCodeOOSchedule = "Lock Attempt via Remote Out of Schedule Access Code",
	UnlockRemoteCodeOOSchedule = "Unlock Attempt via Remote Out of Schedule Access Code",
	RemoteIllegalCode = "Illegal Remote Access Code",
	LockManual2 = "Manually Locked (2)",
	UnlockManual2 = "Manually Unlocked (2)",
	LockSecured = "Lock Secured",
	LockUnsecured = "Lock Unsecured",
	UserCodeAdded = "User Code Added",
	UserCodeDeleted = "User Code Deleted",
	AllUserCodesDeleted = "All User Codes Deleted",
	MasterCodeChanged = "Master Code Changed",
	UserCodeChanged = "User Code Changed",
	LockReset = "Lock Reset",
	ConfigurationChanged = "Configuration Changed",
	LowBattery = "Low Battery",
	NewBattery = "New Battery Installed",
	Unknown = "Unknown",
};

export interface Record {
	recordNumber: number
	dateTime: Date | null
	eventType: EventType | null
	label: EventTypeLabel | null
	userId?: number | null
	userCode?: string | Buffer | null
}

// @publicAPI
export enum RecordStatus {
	Empty = 0x00,
	HoldsLegalData = 0xfe,
}

// function setRecordMetadata(
// 	this: DoorLockLoggingCC,
// 	recordNumber: number,
// 	userCode?: string | Buffer,
// ) {
// 	const valueDB = this.getValueDB();
// 	const recordId = getDoorLockLoggingRecordID(this.endpointIndex, recordNumber);



// 	// const statusValueId = getUserIdStatusValueID(this.endpointIndex, userId);
// 	// const codeValueId = getUserCodeValueID(this.endpointIndex, userId);
// 	// const supportedUserIDStatuses =
// 	// 	valueDB.getValue<UserIDStatus[]>(
// 	// 		getSupportedUserIDStatusesValueID(this.endpointIndex),
// 	// 	) ??
// 	// 	(this.version === 1
// 	// 		? [
// 	// 				UserIDStatus.Available,
// 	// 				UserIDStatus.Enabled,
// 	// 				UserIDStatus.Disabled,
// 	// 		  ]
// 	// 		: [
// 	// 				UserIDStatus.Available,
// 	// 				UserIDStatus.Enabled,
// 	// 				UserIDStatus.Disabled,
// 	// 				UserIDStatus.Messaging,
// 	// 				UserIDStatus.PassageMode,
// 	// 		  ]);
// 	if (!valueDB.hasMetadata(statusValueId)) {
// 		valueDB.setMetadata(statusValueId, {
// 			...ValueMetadata.Number,
// 			label: `User ID status (${userId})`,
// 			states: enumValuesToMetadataStates(
// 				UserIDStatus,
// 				supportedUserIDStatuses,
// 			),
// 		});
// 	}
// 	const codeMetadata: ValueMetadata = {
// 		...(Buffer.isBuffer(userCode)
// 			? ValueMetadata.Buffer
// 			: ValueMetadata.String),
// 		minLength: 4,
// 		maxLength: 10,
// 		label: `User Code (${userId})`,
// 	};
// 	if (valueDB.getMetadata(codeValueId)?.type !== codeMetadata.type) {
// 		valueDB.setMetadata(codeValueId, codeMetadata);
// 	}
// }

// function persistRecord(
// 	this: DoorLockLoggingCC,
// 	recordNumber: number,
// 	recordStatus: RecordStatus,
// 	dateTime: Date,
// 	eventType: EventType,
// 	userId: number,
// 	userCode: string | Buffer,
// ) {
// 	const recordId = getDoorLockLoggingRecordID(this.endpointIndex, recordNumber);
// 	const valueDB = this.getValueDB();

// 	// Check if this record is populated
// 	if (recordStatus === RecordStatus.Empty) {
// 		// It is not, remove all values if any exist
// 		valueDB.removeValue(recordId);
// 		valueDB.setMetadata(recordId, undefined);
// 	} else {
// 		// Always create metadata in case it does not exist
// 		setRecordMetadata.call(this, recordId, {
// 			recordNumber,
// 			dateTime,
// 			eventType,
// 			userId,
// 			userCode,
// 		});
// 	}

// 	return true;
// }

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
		return response?.supportedRecordsNumber;
	}

	public async getRecord(recordNumber: number = 0): Promise<Record | undefined> {
		this.assertSupportsCommand(DoorLockLoggingCommand, DoorLockLoggingCommand.RecordGet);

		// TODO: Check that the recordNumber does not exceed Max number
		// 		 Is it good practice to verify attributes for a Get Command?
		//
		// if (recordNumber < 0 || recordNumber > 255) {
		// 	throw new ZWaveError(
		// 		`Record Number ${recordNumber as number} is out of range`,
		// 		ZWaveErrorCodes.Argument_Invalid,
		// 	)
		// }

		const cc = new DoorLockLoggingCCRecordGet(this.driver, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			recordNumber,
		});
		const response = await this.driver.sendCommand<DoorLockLoggingCCRecordReport>(
			cc,
			this.commandOptions,
		);
		return response?.record;
	}
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

export function getDoorLockLoggingRecordID(
	endpoint: number,
	recordNumber: number,
): ValueID {
	return {
		commandClass: CommandClasses["Door Lock Logging"],
		endpoint,
		property: "record",
		propertyKey: recordNumber,
	};
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

		// Just retrieve the lastest record
		const record = api.getRecord(0);

		if (!record) {
			this.driver.controllerLog.logNode(node.id, {
				endpoint: this.endpointIndex,
				message:
					"Door Lock Logging record query timed out, skipping interview...",
				level: "warn",
			});
			return;
		}

		const recordLogMessage = `received response for latest record: ${record}`;
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

const convertEventTypeToLabel = (eventType: EventType): EventTypeLabel => {
	return EventTypeLabel[EventType[eventType]];
}

const parseUserCodeFromPayload = (userCodeLength: number, userCodeBuffer: any): string | Buffer | null => {
	// Function is adapted from User Code parsing in the User Code Command Class

	if (userCodeLength == 0) return null;

	// Specs say infer user code from payload length, manufacturers send zero-padded strings
	while (userCodeBuffer[userCodeBuffer.length - 1] === 0) {
		userCodeBuffer = userCodeBuffer.slice(0, -1);
	}
	// Specs say ASCII 0-9, manufacturers don't care :)
	// Thus we check if the code is printable using ASCII, if not keep it as a Buffer
	const userCodeString = userCodeBuffer.toString("utf8");
	if (isPrintableASCII(userCodeString)) {
		return userCodeString;
	}
	if (isPrintableASCIIWithNewlines(userCodeString)) {
		// Ignore leading and trailing newlines if the rest is ASCII
		return userCodeString.replace(/^[\r\n]*/, "")
			.replace(/[\r\n]*$/, "");
	}
	return userCodeBuffer;
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
		
		// TODO: REMOVE THIS
		console.log(this.payload);

		this.recordNumber = this.payload[0];
		this.recordStatus = this.payload[5] >>> 5;
		if (this.recordStatus === RecordStatus.Empty) {
			this.record = undefined
		} else {
			const dateSegments = {
				year: this.payload.readUInt16BE(1),
				month: this.payload[3],
				day: this.payload[4],
				hour: this.payload[5] & 0b11111,
				minute: this.payload[6],
				second: this.payload[7],
			}

			const eventType = this.payload[8];
			const userCodeLength = this.payload[10];
			const userCodeBuffer = this.payload[11];

			this.record = {
				dateTime: segmentsToDate(dateSegments),
				eventType: eventType,
				label: convertEventTypeToLabel(eventType),
				recordNumber: this.recordNumber,
				userId: this.payload[9],
				userCode: parseUserCodeFromPayload(userCodeLength, userCodeBuffer),
			}
		}

		this.persistValues();
	}

	@ccValue()
	@ccValueMetadata({
		...ValueMetadata.ReadOnlyLoggingRecord,
		label: "Record",
	})
	public readonly record: Record | undefined;
	public readonly recordNumber: number;
	public readonly recordStatus: RecordStatus;
	// public readonly dateTime: Date;
	// public readonly eventType: EventType;
	// public readonly userId: number;
	// public readonly userCodeLength: number;
	// public readonly userCode: string | Buffer;

	public persistValues(): boolean {
		if (!super.persistValues()) return false;

		const valueDB = this.getValueDB();
		const recordId = getDoorLockLoggingRecordID(this.endpointIndex, this.recordNumber);
		if (this.record == null) {
			valueDB.removeValue(recordId);
		} else {
			this.getValueDB().setValue(
				recordId,
				this.record,
			);
		}

		return true;
	}

	public toLogEntry(): MessageOrCCLogEntry {
		if (this.recordStatus === RecordStatus.Empty) {
			return {
				...super.toLogEntry(),
				message: {
					record: null,
				}
			}
		}
		return {
			...super.toLogEntry(),
			message: {
				record: this.record,
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
		options: CommandClassDeserializationOptions | DoorLockLoggingCCRecordGetOptions,
	) {
		super(driver, options);
		if (gotDeserializationOptions(options)) {
			// TODO: Deserialize payload
			throw new ZWaveError(
				`${this.constructor.name}: deserialization not implemented`,
				ZWaveErrorCodes.Deserialization_NotImplemented,
			);
		} else {
			this.recordNumber = options.recordNumber
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
