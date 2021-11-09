import {
	CommandClasses,
	Maybe,
	MessageOrCCLogEntry,
	validatePayload,
	ValueID,
	ValueMetadata,
} from "@zwave-js/core";
import type { Driver } from "../driver/Driver";
import { MessagePriority } from "../message/Constants";
import { PhysicalCCAPI } from "./API";
import {
	API,
	CCCommand,
	ccValue,
	ccValueMetadata,
	CommandClass,
	commandClass,
	CommandClassDeserializationOptions,
	expectedCCResponse,
	implementedVersion,
} from "./CommandClass";

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
	UnLockCode = 0x02,
	LockButton = 0x03,
	UnLockButton = 0x04,
	LockCodeOOSchedule = 0x05,
	UnLockCodeOOSchedule = 0x06,
	IllegalCode = 0x07,
	LockManual = 0x08,
	UnLockManual = 0x09,
	LockAuto = 0x0a,
	UnLockAuto = 0x0b,
	LockRemoteCode = 0x0c,
	UnLockRemoteCode = 0x0d,
	LockRemote = 0x0e,
	UnLockRemote = 0x0f,
	LockRemoteCodeOOSchedule = 0x10,
	UnLockRemoteCodeOOSchedule = 0x11,
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

	// public async getRecord(recordNumber: number = 0): Promise<void> {
	// 	this.assertSupportsCommand(DoorLockLoggingCommand, DoorLockLoggingCommand.RecordGet);
	// 	// TODO: Check that the recordNumber does not exceed Max number

	// 	const cc = new DoorLockLoggingCCRecordGet(this.driver, {
	// 		nodeId: this.endpoint.nodeId,
	// 		endpoint: this.endpoint.index,
	// 		recordNumber,
	// 	});
	// 	const response = await this.driver.sendCommand<DoorLockLoggingCCRecordReport>(
	// 		cc,
	// 		this.commandOptions,
	// 	);
	// 	if (response) return pick(response, ["userIdStatus", "userCode"]);
	// }
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

		// TODO: Interview Records
		// for (let recordNumber = 0; recordNumber <= supportedRecordsNumber; recordNumber++) {
		// 	setUserCodeMetadata.call(this, userId);
		// }

		// // Synchronize user codes and settings
		// if (this.driver.options.interview.queryAllLoggingRecords) {
		// 	await this.refreshValues();
		// }

		// await this.refreshValues();

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
		if (supportedRecordsNumber) {
			const logMessage = `received response for supported records number: ${supportedRecordsNumber}`;
			this.driver.controllerLog.logNode(node.id, {
				endpoint: this.endpointIndex,
				message: logMessage,
				direction: "inbound",
			});
		} else {
			this.driver.controllerLog.logNode(node.id, {
				endpoint: this.endpointIndex,
				message:
					"Door Lock Logging supported records number query timed out, skipping interview...",
				level: "warn",
			});
			return;
		}
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
		// Create metadata if it does not exist

		this.getValueDB().setValue(
			getDoorLockLoggingRecordsSupportedValueID(this.endpointIndex),
			this.supportedRecordsNumber,
		);

		return true;
	}
}

@CCCommand(DoorLockLoggingCommand.RecordsSupportedGet)
@expectedCCResponse(DoorLockLoggingCCRecordsSupportedReport)
export class DoorLockLoggingCCRecordsSupportedGet extends DoorLockLoggingCC {}

// @CCCommand(DoorLockLoggingCommand.RecordsSupportedGet)
// @expectedCCResponse(DoorLockLoggingCCRecordsSupportedReport)
// export class DoorLockLoggingCCRecordsNumberGet extends DoorLockLoggingCC {
// 	public constructor(
// 		driver: Driver,
// 		options: CommandClassDeserializationOptions,
// 	) {
// 		super(driver, options);
// 		if (gotDeserializationOptions(options)) {
// 			// TODO: Deserialize payload
// 			throw new ZWaveError(
// 				`${this.constructor.name}: deserialization not implemented`,
// 				ZWaveErrorCodes.Deserialization_NotImplemented,
// 			);
// 		} else {
// 			this.supportedRecordsNumber = options.supportedRecordsNumber;
// 		}
// 	}

// 	public serialize(): Buffer {
// 		this.payload = Buffer.from([
// 			/* TODO: serialize */
// 		]);
// 		return super.serialize();
// 	}
// }
