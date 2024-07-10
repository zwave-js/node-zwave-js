import {
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
import { isPrintableASCII, num2hex } from "@zwave-js/shared/safe";
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
	DoorLockLoggingCommand,
	DoorLockLoggingEventType,
	type DoorLockLoggingRecord,
	DoorLockLoggingRecordStatus,
} from "../lib/_Types";
import { userCodeToLogString } from "./UserCodeCC";

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

const eventTypeLabel = {
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
	AdminCodeChanged: "Admin Code Changed",
	UserCodeChanged: "User Code Changed",
	LockReset: "Lock Reset",
	ConfigurationChanged: "Configuration Changed",
	LowBattery: "Low Battery",
	NewBattery: "New Battery Installed",
	Unknown: "Unknown",
} as const;

const LATEST_RECORD_NUMBER_KEY = 0;

export const DoorLockLoggingCCValues = Object.freeze({
	...V.defineStaticCCValues(CommandClasses["Door Lock Logging"], {
		...V.staticProperty("recordsCount", undefined, { internal: true }),
	}),
});

@API(CommandClasses["Door Lock Logging"])
export class DoorLockLoggingCCAPI extends PhysicalCCAPI {
	public supportsCommand(
		cmd: DoorLockLoggingCommand,
	): MaybeNotKnown<boolean> {
		switch (cmd) {
			case DoorLockLoggingCommand.RecordsSupportedGet:
			case DoorLockLoggingCommand.RecordsSupportedReport:
			case DoorLockLoggingCommand.RecordGet:
			case DoorLockLoggingCommand.RecordReport:
				return true;
		}
		return super.supportsCommand(cmd);
	}

	public async getRecordsCount(): Promise<MaybeNotKnown<number>> {
		this.assertSupportsCommand(
			DoorLockLoggingCommand,
			DoorLockLoggingCommand.RecordsSupportedGet,
		);

		const cc = new DoorLockLoggingCCRecordsSupportedGet(this.applHost, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
		});
		const response = await this.applHost.sendCommand<
			DoorLockLoggingCCRecordsSupportedReport
		>(
			cc,
			this.commandOptions,
		);
		return response?.recordsCount;
	}

	/** Retrieves the specified audit record. Defaults to the latest one. */
	@validateArgs()
	public async getRecord(
		recordNumber: number = LATEST_RECORD_NUMBER_KEY,
	): Promise<MaybeNotKnown<DoorLockLoggingRecord>> {
		this.assertSupportsCommand(
			DoorLockLoggingCommand,
			DoorLockLoggingCommand.RecordGet,
		);

		const cc = new DoorLockLoggingCCRecordGet(this.applHost, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			recordNumber,
		});
		const response = await this.applHost.sendCommand<
			DoorLockLoggingCCRecordReport
		>(
			cc,
			this.commandOptions,
		);
		return response?.record;
	}
}

@commandClass(CommandClasses["Door Lock Logging"])
@implementedVersion(1)
@ccValues(DoorLockLoggingCCValues)
export class DoorLockLoggingCC extends CommandClass {
	declare ccCommand: DoorLockLoggingCommand;

	public async interview(applHost: ZWaveApplicationHost): Promise<void> {
		const node = this.getNode(applHost)!;

		applHost.controllerLog.logNode(node.id, {
			endpoint: this.endpointIndex,
			message: `Interviewing ${this.ccName}...`,
			direction: "none",
		});

		await this.refreshValues(applHost);

		// Remember that the interview is complete
		this.setInterviewComplete(applHost, true);
	}

	public async refreshValues(applHost: ZWaveApplicationHost): Promise<void> {
		const node = this.getNode(applHost)!;
		const endpoint = this.getEndpoint(applHost)!;
		const api = CCAPI.create(
			CommandClasses["Door Lock Logging"],
			applHost,
			endpoint,
		).withOptions({
			priority: MessagePriority.NodeQuery,
		});

		applHost.controllerLog.logNode(node.id, {
			endpoint: this.endpointIndex,
			message: "querying supported number of records...",
			direction: "outbound",
		});
		const recordsCount = await api.getRecordsCount();

		if (!recordsCount) {
			applHost.controllerLog.logNode(node.id, {
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
		applHost.controllerLog.logNode(node.id, {
			endpoint: this.endpointIndex,
			message: recordsCountLogMessage,
			direction: "inbound",
		});
	}
}

@CCCommand(DoorLockLoggingCommand.RecordsSupportedReport)
export class DoorLockLoggingCCRecordsSupportedReport extends DoorLockLoggingCC {
	public constructor(
		host: ZWaveHost,
		options: CommandClassDeserializationOptions,
	) {
		super(host, options);
		validatePayload(this.payload.length >= 1);

		this.recordsCount = this.payload[0];
	}

	@ccValue(DoorLockLoggingCCValues.recordsCount)
	public readonly recordsCount: number;

	public toLogEntry(host?: ZWaveValueHost): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(host),
			message: {
				"supported no. of records": this.recordsCount,
			},
		};
	}
}

function eventTypeToLabel(eventType: DoorLockLoggingEventType): string {
	return (
		(eventTypeLabel as any)[DoorLockLoggingEventType[eventType]]
			?? `Unknown ${num2hex(eventType)}`
	);
}

@CCCommand(DoorLockLoggingCommand.RecordsSupportedGet)
@expectedCCResponse(DoorLockLoggingCCRecordsSupportedReport)
export class DoorLockLoggingCCRecordsSupportedGet extends DoorLockLoggingCC {}

@CCCommand(DoorLockLoggingCommand.RecordReport)
export class DoorLockLoggingCCRecordReport extends DoorLockLoggingCC {
	public constructor(
		host: ZWaveHost,
		options: CommandClassDeserializationOptions,
	) {
		super(host, options);
		validatePayload(this.payload.length >= 11);

		this.recordNumber = this.payload[0];
		const recordStatus = this.payload[5] >>> 5;
		if (recordStatus === DoorLockLoggingRecordStatus.Empty) {
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

			const userCodeBuffer = this.payload.subarray(
				11,
				11 + userCodeLength,
			);
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

	public readonly recordNumber: number;
	public readonly record?: DoorLockLoggingRecord;

	public toLogEntry(host?: ZWaveValueHost): MessageOrCCLogEntry {
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
				message["user code"] = userCodeToLogString(
					this.record.userCode,
				);
			}
		}
		return {
			...super.toLogEntry(host),
			message,
		};
	}
}

// @publicAPI
export interface DoorLockLoggingCCRecordGetOptions extends CCCommandOptions {
	recordNumber: number;
}

function testResponseForDoorLockLoggingRecordGet(
	sent: DoorLockLoggingCCRecordGet,
	received: DoorLockLoggingCCRecordReport,
) {
	return (
		sent.recordNumber === LATEST_RECORD_NUMBER_KEY
		|| sent.recordNumber === received.recordNumber
	);
}

@CCCommand(DoorLockLoggingCommand.RecordGet)
@expectedCCResponse(
	DoorLockLoggingCCRecordReport,
	testResponseForDoorLockLoggingRecordGet,
)
export class DoorLockLoggingCCRecordGet extends DoorLockLoggingCC {
	public constructor(
		host: ZWaveHost,
		options:
			| CommandClassDeserializationOptions
			| DoorLockLoggingCCRecordGetOptions,
	) {
		super(host, options);
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

	public toLogEntry(host?: ZWaveValueHost): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(host),
			message: { "record number": this.recordNumber },
		};
	}
}
