import { CommandClasses, validatePayload } from "@zwave-js/core";
import type { ZWaveHost } from "@zwave-js/host";
import { CCAPI } from "../lib/API";
import {
	CCCommandOptions,
	CommandClass,
	CommandClassDeserializationOptions,
	gotDeserializationOptions,
} from "../lib/CommandClass";
import {
	API,
	CCCommand,
	ccValues,
	commandClass,
	expectedCCResponse,
	implementedVersion,
} from "../lib/CommandClassDecorators";
import { V } from "../lib/Values";

export const ScheduleEntryLockCCValues = Object.freeze({
	...V.defineStaticCCValues(CommandClasses["Schedule Entry Lock"], {
		// Static CC values go here
	}),

	...V.defineDynamicCCValues(CommandClasses["Schedule Entry Lock"], {
		// Dynamic CC values go here
	}),
});

@API(CommandClasses["Schedule Entry Lock"])
export class ScheduleEntryLockCCAPI extends CCAPI {
	// TODO: Implementation
}

// TODO: Move this enumeration into the src/lib/_Types.ts file
// All additional type definitions (except CC constructor options) must be defined there too
export enum ScheduleEntryLockCommand {
	EnableSet = 0x01,
	EnableAllSet = 0x02,
	WeekDayScheduleSet = 0x03,
	WeekDayScheduleGet = 0x04,
	WeekDayScheduleReport = 0x05,
	YearDayScheduleSet = 0x06,
	YearDayScheduleGet = 0x07,
	YearDayScheduleReport = 0x08,
	SupportedGet = 0x09,
	SupportedReport = 0x0a,
	TimeOffsetGet = 0x0b,
	TimeOffsetReport = 0x0c,
	TimeOffsetSet = 0x0d,
	DailyRepeatingGet = 0x0e,
	DailyRepeatingReport = 0x0f,
	DailyRepeatingSet = 0x10,
}

@commandClass(CommandClasses["Schedule Entry Lock"])
@implementedVersion(3)
@ccValues(ScheduleEntryLockCCValues)
export class ScheduleEntryLockCC extends CommandClass {
	declare ccCommand: ScheduleEntryLockCommand;
}

interface ScheduleEntryLockCCEnableSetOptions extends CCCommandOptions {
	userId: number;
	enabled: boolean;
}

@CCCommand(ScheduleEntryLockCommand.EnableSet)
export class ScheduleEntryLockCCEnableSet extends ScheduleEntryLockCC {
	public constructor(
		host: ZWaveHost,
		options:
			| CommandClassDeserializationOptions
			| ScheduleEntryLockCCEnableSetOptions,
	) {
		super(host, options);
		if (gotDeserializationOptions(options)) {
			validatePayload(this.payload.length >= 2);
			this.userId = this.payload[0];
			this.enabled = this.payload[1] === 0x01;
		} else {
			this.userId = options.userId;
			this.enabled = options.enabled;
		}
	}

	public userId: number;
	public enabled: boolean;

	public serialize(): Buffer {
		this.payload = Buffer.from([this.userId, this.enabled ? 0x01 : 0x00]);
		return super.serialize();
	}
}

interface ScheduleEntryLockCCEnableAllSetOptions extends CCCommandOptions {
	enabled: boolean;
}

@CCCommand(ScheduleEntryLockCommand.EnableAllSet)
export class ScheduleEntryLockCCEnableAllSet extends ScheduleEntryLockCC {
	public constructor(
		host: ZWaveHost,
		options:
			| CommandClassDeserializationOptions
			| ScheduleEntryLockCCEnableAllSetOptions,
	) {
		super(host, options);
		if (gotDeserializationOptions(options)) {
			validatePayload(this.payload.length >= 1);
			this.enabled = this.payload[0] === 0x01;
		} else {
			this.enabled = options.enabled;
		}
	}

	public enabled: boolean;

	public serialize(): Buffer {
		this.payload = Buffer.from([this.enabled ? 0x01 : 0x00]);
		return super.serialize();
	}
}

interface ScheduleEntryLockCCSupportedReportOptions extends CCCommandOptions {
	numWeekDaySlots: number;
	numYearDaySlots: number;
	numDailyRepeatingSlots?: number;
}

@CCCommand(ScheduleEntryLockCommand.SupportedReport)
export class ScheduleEntryLockCCSupportedReport extends ScheduleEntryLockCC {
	public constructor(
		host: ZWaveHost,
		options:
			| CommandClassDeserializationOptions
			| ScheduleEntryLockCCSupportedReportOptions,
	) {
		super(host, options);
		if (gotDeserializationOptions(options)) {
			validatePayload(this.payload.length >= 2);
			this.numWeekDaySlots = this.payload[0];
			this.numYearDaySlots = this.payload[1];
			if (this.payload.length >= 3) {
				this.numDailyRepeatingSlots = this.payload[2];
			}
		} else {
			this.numWeekDaySlots = options.numWeekDaySlots;
			this.numYearDaySlots = options.numYearDaySlots;
			this.numDailyRepeatingSlots = options.numDailyRepeatingSlots;
		}
	}

	public numWeekDaySlots: number;
	public numYearDaySlots: number;
	public numDailyRepeatingSlots: number | undefined;

	public serialize(): Buffer {
		this.payload = Buffer.from([
			this.numWeekDaySlots,
			this.numYearDaySlots,
		]);
		if (this.version >= 3 && this.numDailyRepeatingSlots != undefined) {
			this.payload = Buffer.concat([
				this.payload,
				Buffer.from([this.numDailyRepeatingSlots]),
			]);
		}
		return super.serialize();
	}
}

@CCCommand(ScheduleEntryLockCommand.SupportedGet)
@expectedCCResponse(ScheduleEntryLockCCSupportedReport)
export class ScheduleEntryLockCCSupportedGet extends ScheduleEntryLockCC {}

// WeekDayScheduleSet = 0x03,
// WeekDayScheduleGet = 0x04,
// WeekDayScheduleReport = 0x05,

// YearDayScheduleSet = 0x06,
// YearDayScheduleGet = 0x07,
// YearDayScheduleReport = 0x08,

// TimeOffsetGet = 0x0b,
// TimeOffsetReport = 0x0c,
// TimeOffsetSet = 0x0d,

// DailyRepeatingGet = 0x0e,
// DailyRepeatingReport = 0x0f,
// DailyRepeatingSet = 0x10,
