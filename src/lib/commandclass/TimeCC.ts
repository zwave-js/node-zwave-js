import { IDriver } from "../driver/IDriver";
import { ZWaveError, ZWaveErrorCodes } from "../error/ZWaveError";
import log from "../log";
import { DSTInfo, getDefaultDSTInfo, getDSTInfo } from "../util/date";
import { validatePayload } from "../util/misc";
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
import { CommandClasses } from "./CommandClasses";

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

@API(CommandClasses.Time)
export class TimeCCAPI extends CCAPI {
	// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
	public async getTime() {
		const cc = new TimeCCTimeGet(this.driver, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
		});
		const response = (await this.driver.sendCommand<TimeCCTimeReport>(cc))!;
		return {
			hour: response.hour,
			minute: response.minute,
			second: response.second,
		};
	}

	// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
	public async getDate() {
		const cc = new TimeCCDateGet(this.driver, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
		});
		const response = (await this.driver.sendCommand<TimeCCDateReport>(cc))!;
		return {
			day: response.day,
			month: response.month,
			year: response.year,
		};
	}

	public async setTimezone(timezone: DSTInfo): Promise<void> {
		const cc = new TimeCCTimeOffsetSet(this.driver, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			standardOffset: timezone.standardOffset,
			dstOffset: timezone.dstOffset,
			dstStart: timezone.startDate,
			dstEnd: timezone.endDate,
		});
		await this.driver.sendCommand(cc);
	}

	public async getTimezone(): Promise<DSTInfo> {
		const cc = new TimeCCTimeOffsetGet(this.driver, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
		});
		const response = (await this.driver.sendCommand<TimeCCTimeOffsetReport>(
			cc,
		))!;
		return {
			standardOffset: response.standardOffset,
			dstOffset: response.dstOffset,
			startDate: response.dstStartDate,
			endDate: response.dstEndDate,
		};
	}
}

export interface TimeCC {
	ccCommand: TimeCommand;
}

@commandClass(CommandClasses.Time)
@implementedVersion(2)
export class TimeCC extends CommandClass {
	public async interview(): Promise<void> {
		const node = this.getNode()!;
		const api = node.commandClasses.Time;

		if (api.version >= 2) {
			log.controller.logNode(node.id, {
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
	public constructor(
		driver: IDriver,
		options: CommandClassDeserializationOptions | TimeCCTimeReportOptions,
	) {
		super(driver, options);
		if (gotDeserializationOptions(options)) {
			validatePayload(this.payload.length >= 3);
			// TODO: Verify ranges
			this.hour = this.payload[0] & 0b11111; // Range 0..23
			this.minute = this.payload[1]; // Range 0..59
			this.second = this.payload[2]; // Range 0..59
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
	public constructor(
		driver: IDriver,
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
		driver: IDriver,
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
}

@CCCommand(TimeCommand.TimeOffsetReport)
export class TimeCCTimeOffsetReport extends TimeCC {
	public constructor(
		driver: IDriver,
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
}

@CCCommand(TimeCommand.TimeOffsetGet)
@expectedCCResponse(TimeCCTimeOffsetReport)
export class TimeCCTimeOffsetGet extends TimeCC {}
