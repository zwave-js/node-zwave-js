import {
	CommandClasses,
	DSTInfo,
	formatDate,
	getDefaultDSTInfo,
	getDSTInfo,
	Maybe,
	MessageOrCCLogEntry,
	validatePayload,
	ZWaveError,
	ZWaveErrorCodes,
} from "@zwave-js/core";
import { pick } from "@zwave-js/shared";
import { padStart } from "alcalzone-shared/strings";
import type { Driver } from "../driver/Driver";
import { MessagePriority } from "../message/Constants";
import { CCAPI } from "./API";
import {
	API,
	CCCommand,
	CCCommandOptions,
	CommandClass,
	commandClass,
	CommandClassDeserializationOptions,
	expectedCCResponse,
	gotDeserializationOptions,
	implementedVersion,
} from "./CommandClass";

// All the supported commands
export enum TimeCommand {
	TimeGet = 0x01,
	TimeReport = 0x02,
	DateGet = 0x03,
	DateReport = 0x04,
	TimeOffsetSet = 0x05,
	TimeOffsetGet = 0x06,
	TimeOffsetReport = 0x07,
}

// @noSetValueAPI
// Only the timezone information can be set and that accepts a non-primitive value

@API(CommandClasses.Time)
export class TimeCCAPI extends CCAPI {
	public supportsCommand(cmd: TimeCommand): Maybe<boolean> {
		switch (cmd) {
			case TimeCommand.TimeGet:
			case TimeCommand.DateGet:
				return this.isSinglecast(); // "mandatory"
			case TimeCommand.TimeOffsetGet:
				return this.version >= 2 && this.isSinglecast();
			case TimeCommand.TimeOffsetSet:
				return this.version >= 2;
		}
		return super.supportsCommand(cmd);
	}

	// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
	public async getTime() {
		this.assertSupportsCommand(TimeCommand, TimeCommand.TimeGet);

		const cc = new TimeCCTimeGet(this.driver, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
		});
		const response = await this.driver.sendCommand<TimeCCTimeReport>(
			cc,
			this.commandOptions,
		);
		if (response) {
			return pick(response, ["hour", "minute", "second"]);
		}
	}

	// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
	public async getDate() {
		this.assertSupportsCommand(TimeCommand, TimeCommand.DateGet);

		const cc = new TimeCCDateGet(this.driver, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
		});
		const response = await this.driver.sendCommand<TimeCCDateReport>(
			cc,
			this.commandOptions,
		);
		if (response) {
			return pick(response, ["day", "month", "year"]);
		}
	}

	public async setTimezone(timezone: DSTInfo): Promise<void> {
		this.assertSupportsCommand(TimeCommand, TimeCommand.TimeOffsetSet);

		const cc = new TimeCCTimeOffsetSet(this.driver, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			standardOffset: timezone.standardOffset,
			dstOffset: timezone.dstOffset,
			dstStart: timezone.startDate,
			dstEnd: timezone.endDate,
		});
		await this.driver.sendCommand(cc, this.commandOptions);
	}

	public async getTimezone(): Promise<DSTInfo | undefined> {
		this.assertSupportsCommand(TimeCommand, TimeCommand.TimeOffsetGet);

		const cc = new TimeCCTimeOffsetGet(this.driver, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
		});
		const response = await this.driver.sendCommand<TimeCCTimeOffsetReport>(
			cc,
			this.commandOptions,
		);
		if (response) {
			return {
				standardOffset: response.standardOffset,
				dstOffset: response.dstOffset,
				startDate: response.dstStartDate,
				endDate: response.dstEndDate,
			};
		}
	}
}

@commandClass(CommandClasses.Time)
@implementedVersion(2)
export class TimeCC extends CommandClass {
	declare ccCommand: TimeCommand;

	public async interview(): Promise<void> {
		const node = this.getNode()!;
		const endpoint = this.getEndpoint()!;
		const api = endpoint.commandClasses.Time.withOptions({
			priority: MessagePriority.NodeQuery,
		});

		this.driver.controllerLog.logNode(node.id, {
			endpoint: this.endpointIndex,
			message: `Interviewing ${this.ccName}...`,
			direction: "none",
		});

		// Synchronize the slave's time
		if (api.version >= 2) {
			this.driver.controllerLog.logNode(node.id, {
				endpoint: this.endpointIndex,
				message: "setting timezone information...",
				direction: "outbound",
			});
			// Set the correct timezone on this node
			const timezone = getDSTInfo() || getDefaultDSTInfo();
			await api.setTimezone(timezone);
		}

		// Remember that the interview is complete
		this.interviewComplete = true;
	}
}

interface TimeCCTimeReportOptions extends CCCommandOptions {
	hour: number;
	minute: number;
	second: number;
}

@CCCommand(TimeCommand.TimeReport)
export class TimeCCTimeReport extends TimeCC {
	// @noCCValues Time is temporary :), we don't want to store that in a DB

	public constructor(
		driver: Driver,
		options: CommandClassDeserializationOptions | TimeCCTimeReportOptions,
	) {
		super(driver, options);
		if (gotDeserializationOptions(options)) {
			validatePayload(this.payload.length >= 3);
			this.hour = this.payload[0] & 0b11111;
			validatePayload(this.hour >= 0, this.hour <= 23);
			this.minute = this.payload[1];
			validatePayload(this.minute >= 0, this.minute <= 59);
			this.second = this.payload[2];
			validatePayload(this.second >= 0, this.second <= 59);
		} else {
			this.hour = options.hour;
			this.minute = options.minute;
			this.second = options.second;
		}
	}

	public hour: number;
	public minute: number;
	public second: number;

	public serialize(): Buffer {
		this.payload = Buffer.from([
			this.hour & 0b11111,
			this.minute,
			this.second,
		]);
		return super.serialize();
	}

	public toLogEntry(): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(),
			message: {
				time: `${padStart(this.hour.toString(), 2, "0")}:${padStart(
					this.minute.toString(),
					2,
					"0",
				)}:${padStart(this.second.toString(), 2, "0")}`,
			},
		};
	}
}

@CCCommand(TimeCommand.TimeGet)
@expectedCCResponse(TimeCCTimeReport)
export class TimeCCTimeGet extends TimeCC {}

interface TimeCCDateReportOptions extends CCCommandOptions {
	year: number;
	month: number;
	day: number;
}

@CCCommand(TimeCommand.DateReport)
export class TimeCCDateReport extends TimeCC {
	// @noCCValues Time is temporary :), we don't want to store that in a DB

	public constructor(
		driver: Driver,
		options: CommandClassDeserializationOptions | TimeCCDateReportOptions,
	) {
		super(driver, options);
		if (gotDeserializationOptions(options)) {
			validatePayload(this.payload.length >= 4);
			this.year = this.payload.readUInt16BE(0);
			this.month = this.payload[2];
			this.day = this.payload[3];
		} else {
			this.year = options.year;
			this.month = options.month;
			this.day = options.day;
		}
	}

	public year: number;
	public month: number;
	public day: number;

	public serialize(): Buffer {
		this.payload = Buffer.from([
			// 2 bytes placeholder for year
			0,
			0,
			this.month,
			this.day,
		]);
		this.payload.writeUInt16BE(this.year, 0);
		return super.serialize();
	}

	public toLogEntry(): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(),
			message: {
				date: `${padStart(this.year.toString(), 4, "0")}-${padStart(
					this.month.toString(),
					2,
					"0",
				)}-${padStart(this.day.toString(), 2, "0")}`,
			},
		};
	}
}

@CCCommand(TimeCommand.DateGet)
@expectedCCResponse(TimeCCDateReport)
export class TimeCCDateGet extends TimeCC {}

interface TimeCCTimeOffsetSetOptions extends CCCommandOptions {
	standardOffset: number;
	dstOffset: number;
	dstStart: Date;
	dstEnd: Date;
}

@CCCommand(TimeCommand.TimeOffsetSet)
export class TimeCCTimeOffsetSet extends TimeCC {
	public constructor(
		driver: Driver,
		options:
			| CommandClassDeserializationOptions
			| TimeCCTimeOffsetSetOptions,
	) {
		super(driver, options);
		if (gotDeserializationOptions(options)) {
			// TODO: Deserialize payload
			throw new ZWaveError(
				`${this.constructor.name}: deserialization not implemented`,
				ZWaveErrorCodes.Deserialization_NotImplemented,
			);
		} else {
			this.standardOffset = options.standardOffset;
			this.dstOffset = options.dstOffset;
			this.dstStartDate = options.dstStart;
			this.dstEndDate = options.dstEnd;
		}
	}

	public standardOffset: number;
	public dstOffset: number;
	public dstStartDate: Date;
	public dstEndDate: Date;

	public serialize(): Buffer {
		const signTZO = Math.sign(this.standardOffset);
		const hourTZO = Math.floor(Math.abs(this.standardOffset) / 60);
		const hourByte =
			(signTZO < 0 ? 0b1000_0000 : 0) | (hourTZO & 0b0111_1111);
		const minuteTZO = Math.abs(this.standardOffset) % 60;
		const delta = this.dstOffset - this.standardOffset;
		const signDelta = Math.sign(delta);
		const minuteDelta = Math.abs(delta);
		const deltaByte =
			(signDelta < 0 ? 0b1000_0000 : 0) | (minuteDelta & 0b0111_1111);
		this.payload = Buffer.from([
			hourByte,
			minuteTZO,
			deltaByte,
			this.dstStartDate.getUTCMonth() + 1,
			this.dstStartDate.getUTCDate(),
			this.dstStartDate.getUTCHours(),
			this.dstEndDate.getUTCMonth() + 1,
			this.dstEndDate.getUTCDate(),
			this.dstEndDate.getUTCHours(),
		]);
		return super.serialize();
	}

	public toLogEntry(): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(),
			message: {
				"standard time offset": `${this.standardOffset} minutes`,
				"DST offset": `${this.dstOffset} minutes`,
				"DST start date": formatDate(this.dstStartDate, "YYYY-MM-DD"),
				"DST end date": formatDate(this.dstEndDate, "YYYY-MM-DD"),
			},
		};
	}
}

@CCCommand(TimeCommand.TimeOffsetReport)
export class TimeCCTimeOffsetReport extends TimeCC {
	// @noCCValues Time is temporary :), we don't want to store that in a DB

	public constructor(
		driver: Driver,
		options: CommandClassDeserializationOptions,
	) {
		super(driver, options);
		validatePayload(this.payload.length >= 9);
		// TODO: Refactor this into its own method
		const hourSign = !!(this.payload[0] & 0b1000_0000);
		const hour = this.payload[0] & 0b0111_1111;
		const minute = this.payload[1];
		this._standardOffset = (hourSign ? -1 : 1) * (hour * 60 + minute);
		const deltaSign = !!(this.payload[2] & 0b1000_0000);
		const deltaMinutes = this.payload[2] & 0b0111_1111;
		this._dstOffset =
			this._standardOffset + (deltaSign ? -1 : 1) * deltaMinutes;

		const currentYear = new Date().getUTCFullYear();
		this._dstStartDate = new Date(
			Date.UTC(
				currentYear,
				this.payload[3] - 1,
				this.payload[4],
				this.payload[5],
			),
		);
		this._dstEndDate = new Date(
			Date.UTC(
				currentYear,
				this.payload[6] - 1,
				this.payload[7],
				this.payload[8],
			),
		);
	}

	private _standardOffset: number;
	public get standardOffset(): number {
		return this._standardOffset;
	}
	private _dstOffset: number;
	public get dstOffset(): number {
		return this._dstOffset;
	}
	private _dstStartDate: Date;
	public get dstStartDate(): Date {
		return this._dstStartDate;
	}
	private _dstEndDate: Date;
	public get dstEndDate(): Date {
		return this._dstEndDate;
	}

	public toLogEntry(): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(),
			message: {
				"standard time offset": `${this._standardOffset} minutes`,
				"DST offset": `${this._dstOffset} minutes`,
				"DST start date": formatDate(this._dstStartDate, "YYYY-MM-DD"),
				"DST end date": formatDate(this._dstEndDate, "YYYY-MM-DD"),
			},
		};
	}
}

@CCCommand(TimeCommand.TimeOffsetGet)
@expectedCCResponse(TimeCCTimeOffsetReport)
export class TimeCCTimeOffsetGet extends TimeCC {}
