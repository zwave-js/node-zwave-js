import {
	CommandClasses,
	type DSTInfo,
	type MessageOrCCLogEntry,
	MessagePriority,
	type SupervisionResult,
	ZWaveError,
	ZWaveErrorCodes,
	formatDate,
	getDSTInfo,
	validatePayload,
} from "@zwave-js/core";
import { type MaybeNotKnown } from "@zwave-js/core/safe";
import type {
	ZWaveApplicationHost,
	ZWaveHost,
	ZWaveValueHost,
} from "@zwave-js/host/safe";
import { pick } from "@zwave-js/shared/safe";
import { validateArgs } from "@zwave-js/transformers";
import { padStart } from "alcalzone-shared/strings";
import { CCAPI } from "../lib/API";
import {
	type CCCommandOptions,
	CommandClass,
	type CommandClassDeserializationOptions,
	gotDeserializationOptions,
} from "../lib/CommandClass";
import {
	API,
	CCCommand,
	commandClass,
	expectedCCResponse,
	implementedVersion,
	useSupervision,
} from "../lib/CommandClassDecorators";
import { TimeCommand } from "../lib/_Types";
import { encodeTimezone, parseTimezone } from "../lib/serializers";

// @noSetValueAPI
// Only the timezone information can be set and that accepts a non-primitive value

@API(CommandClasses.Time)
export class TimeCCAPI extends CCAPI {
	public supportsCommand(cmd: TimeCommand): MaybeNotKnown<boolean> {
		switch (cmd) {
			case TimeCommand.TimeGet:
			case TimeCommand.TimeReport:
			case TimeCommand.DateGet:
			case TimeCommand.DateReport:
				return this.isSinglecast(); // "mandatory"
			case TimeCommand.TimeOffsetGet:
			case TimeCommand.TimeOffsetReport:
				return this.version >= 2 && this.isSinglecast();
			case TimeCommand.TimeOffsetSet:
				return this.version >= 2;
		}
		return super.supportsCommand(cmd);
	}

	// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
	public async getTime() {
		this.assertSupportsCommand(TimeCommand, TimeCommand.TimeGet);

		const cc = new TimeCCTimeGet(this.applHost, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
		});
		const response = await this.applHost.sendCommand<TimeCCTimeReport>(
			cc,
			this.commandOptions,
		);
		if (response) {
			return pick(response, ["hour", "minute", "second"]);
		}
	}

	@validateArgs()
	public async reportTime(
		hour: number,
		minute: number,
		second: number,
	): Promise<SupervisionResult | undefined> {
		this.assertSupportsCommand(TimeCommand, TimeCommand.TimeReport);

		const cc = new TimeCCTimeReport(this.applHost, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			hour,
			minute,
			second,
		});
		return this.applHost.sendCommand(cc, this.commandOptions);
	}

	// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
	public async getDate() {
		this.assertSupportsCommand(TimeCommand, TimeCommand.DateGet);

		const cc = new TimeCCDateGet(this.applHost, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
		});
		const response = await this.applHost.sendCommand<TimeCCDateReport>(
			cc,
			this.commandOptions,
		);
		if (response) {
			return pick(response, ["day", "month", "year"]);
		}
	}

	@validateArgs()
	public async reportDate(
		year: number,
		month: number,
		day: number,
	): Promise<SupervisionResult | undefined> {
		this.assertSupportsCommand(TimeCommand, TimeCommand.DateReport);

		const cc = new TimeCCDateReport(this.applHost, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			year,
			month,
			day,
		});
		return this.applHost.sendCommand(cc, this.commandOptions);
	}

	@validateArgs()
	public async setTimezone(
		timezone: DSTInfo,
	): Promise<SupervisionResult | undefined> {
		this.assertSupportsCommand(TimeCommand, TimeCommand.TimeOffsetSet);

		const cc = new TimeCCTimeOffsetSet(this.applHost, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			standardOffset: timezone.standardOffset,
			dstOffset: timezone.dstOffset,
			dstStart: timezone.startDate,
			dstEnd: timezone.endDate,
		});
		return this.applHost.sendCommand(cc, this.commandOptions);
	}

	public async getTimezone(): Promise<MaybeNotKnown<DSTInfo>> {
		this.assertSupportsCommand(TimeCommand, TimeCommand.TimeOffsetGet);

		const cc = new TimeCCTimeOffsetGet(this.applHost, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
		});
		const response = await this.applHost.sendCommand<
			TimeCCTimeOffsetReport
		>(
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

	@validateArgs()
	public async reportTimezone(
		timezone: DSTInfo,
	): Promise<SupervisionResult | undefined> {
		this.assertSupportsCommand(TimeCommand, TimeCommand.TimeOffsetReport);

		const cc = new TimeCCTimeOffsetReport(this.applHost, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			standardOffset: timezone.standardOffset,
			dstOffset: timezone.dstOffset,
			dstStart: timezone.startDate,
			dstEnd: timezone.endDate,
		});
		return this.applHost.sendCommand(cc, this.commandOptions);
	}
}

@commandClass(CommandClasses.Time)
@implementedVersion(2)
export class TimeCC extends CommandClass {
	declare ccCommand: TimeCommand;

	public async interview(applHost: ZWaveApplicationHost): Promise<void> {
		const node = this.getNode(applHost)!;
		const endpoint = this.getEndpoint(applHost)!;
		const api = CCAPI.create(
			CommandClasses.Time,
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

		// Synchronize the slave's time
		if (api.version >= 2) {
			applHost.controllerLog.logNode(node.id, {
				endpoint: this.endpointIndex,
				message: "setting timezone information...",
				direction: "outbound",
			});
			// Set the correct timezone on this node
			const timezone = getDSTInfo();
			await api.setTimezone(timezone);
		}

		// Remember that the interview is complete
		this.setInterviewComplete(applHost, true);
	}
}

// @publicAPI
export interface TimeCCTimeReportOptions extends CCCommandOptions {
	hour: number;
	minute: number;
	second: number;
}

@CCCommand(TimeCommand.TimeReport)
export class TimeCCTimeReport extends TimeCC {
	public constructor(
		host: ZWaveHost,
		options: CommandClassDeserializationOptions | TimeCCTimeReportOptions,
	) {
		super(host, options);
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

	public toLogEntry(host?: ZWaveValueHost): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(host),
			message: {
				time: `${padStart(this.hour.toString(), 2, "0")}:${
					padStart(
						this.minute.toString(),
						2,
						"0",
					)
				}:${padStart(this.second.toString(), 2, "0")}`,
			},
		};
	}
}

@CCCommand(TimeCommand.TimeGet)
@expectedCCResponse(TimeCCTimeReport)
export class TimeCCTimeGet extends TimeCC {}

// @publicAPI
export interface TimeCCDateReportOptions extends CCCommandOptions {
	year: number;
	month: number;
	day: number;
}

@CCCommand(TimeCommand.DateReport)
export class TimeCCDateReport extends TimeCC {
	public constructor(
		host: ZWaveHost,
		options: CommandClassDeserializationOptions | TimeCCDateReportOptions,
	) {
		super(host, options);
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

	public toLogEntry(host?: ZWaveValueHost): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(host),
			message: {
				date: `${padStart(this.year.toString(), 4, "0")}-${
					padStart(
						this.month.toString(),
						2,
						"0",
					)
				}-${padStart(this.day.toString(), 2, "0")}`,
			},
		};
	}
}

@CCCommand(TimeCommand.DateGet)
@expectedCCResponse(TimeCCDateReport)
export class TimeCCDateGet extends TimeCC {}

// @publicAPI
export interface TimeCCTimeOffsetSetOptions extends CCCommandOptions {
	standardOffset: number;
	dstOffset: number;
	dstStart: Date;
	dstEnd: Date;
}

@CCCommand(TimeCommand.TimeOffsetSet)
@useSupervision()
export class TimeCCTimeOffsetSet extends TimeCC {
	public constructor(
		host: ZWaveHost,
		options:
			| CommandClassDeserializationOptions
			| TimeCCTimeOffsetSetOptions,
	) {
		super(host, options);
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
		this.payload = Buffer.concat([
			encodeTimezone({
				standardOffset: this.standardOffset,
				dstOffset: this.dstOffset,
			}),
			Buffer.from([
				this.dstStartDate.getUTCMonth() + 1,
				this.dstStartDate.getUTCDate(),
				this.dstStartDate.getUTCHours(),
				this.dstEndDate.getUTCMonth() + 1,
				this.dstEndDate.getUTCDate(),
				this.dstEndDate.getUTCHours(),
			]),
		]);
		return super.serialize();
	}

	public toLogEntry(host?: ZWaveValueHost): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(host),
			message: {
				"standard time offset": `${this.standardOffset} minutes`,
				"DST offset": `${this.dstOffset} minutes`,
				"DST start date": formatDate(this.dstStartDate, "YYYY-MM-DD"),
				"DST end date": formatDate(this.dstEndDate, "YYYY-MM-DD"),
			},
		};
	}
}

// @publicAPI
export interface TimeCCTimeOffsetReportOptions extends CCCommandOptions {
	standardOffset: number;
	dstOffset: number;
	dstStart: Date;
	dstEnd: Date;
}

@CCCommand(TimeCommand.TimeOffsetReport)
export class TimeCCTimeOffsetReport extends TimeCC {
	public constructor(
		host: ZWaveHost,
		options:
			| CommandClassDeserializationOptions
			| TimeCCTimeOffsetReportOptions,
	) {
		super(host, options);
		if (gotDeserializationOptions(options)) {
			validatePayload(this.payload.length >= 9);
			const { standardOffset, dstOffset } = parseTimezone(this.payload);
			this.standardOffset = standardOffset;
			this.dstOffset = dstOffset;

			const currentYear = new Date().getUTCFullYear();
			this.dstStartDate = new Date(
				Date.UTC(
					currentYear,
					this.payload[3] - 1,
					this.payload[4],
					this.payload[5],
				),
			);
			this.dstEndDate = new Date(
				Date.UTC(
					currentYear,
					this.payload[6] - 1,
					this.payload[7],
					this.payload[8],
				),
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
		this.payload = Buffer.concat([
			encodeTimezone({
				standardOffset: this.standardOffset,
				dstOffset: this.dstOffset,
			}),
			Buffer.from([
				this.dstStartDate.getUTCMonth() + 1,
				this.dstStartDate.getUTCDate(),
				this.dstStartDate.getUTCHours(),
				this.dstEndDate.getUTCMonth() + 1,
				this.dstEndDate.getUTCDate(),
				this.dstEndDate.getUTCHours(),
			]),
		]);
		return super.serialize();
	}

	public toLogEntry(host?: ZWaveValueHost): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(host),
			message: {
				"standard time offset": `${this.standardOffset} minutes`,
				"DST offset": `${this.dstOffset} minutes`,
				"DST start date": formatDate(this.dstStartDate, "YYYY-MM-DD"),
				"DST end date": formatDate(this.dstEndDate, "YYYY-MM-DD"),
			},
		};
	}
}

@CCCommand(TimeCommand.TimeOffsetGet)
@expectedCCResponse(TimeCCTimeOffsetReport)
export class TimeCCTimeOffsetGet extends TimeCC {}
