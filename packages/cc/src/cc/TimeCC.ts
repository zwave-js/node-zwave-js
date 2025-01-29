import { type CCEncodingContext, type CCParsingContext } from "@zwave-js/cc";
import {
	CommandClasses,
	type DSTInfo,
	type GetValueDB,
	type MessageOrCCLogEntry,
	MessagePriority,
	type SupervisionResult,
	type WithAddress,
	ZWaveError,
	ZWaveErrorCodes,
	formatDate,
	getDSTInfo,
	validatePayload,
} from "@zwave-js/core";
import { type MaybeNotKnown } from "@zwave-js/core/safe";
import { Bytes } from "@zwave-js/shared/safe";
import { pick } from "@zwave-js/shared/safe";
import { validateArgs } from "@zwave-js/transformers";
import { CCAPI } from "../lib/API.js";
import {
	type CCRaw,
	CommandClass,
	type InterviewContext,
} from "../lib/CommandClass.js";
import {
	API,
	CCCommand,
	commandClass,
	expectedCCResponse,
	implementedVersion,
	useSupervision,
} from "../lib/CommandClassDecorators.js";
import { TimeCommand } from "../lib/_Types.js";
import { encodeTimezone, parseTimezone } from "../lib/serializers.js";

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

		const cc = new TimeCCTimeGet({
			nodeId: this.endpoint.nodeId,
			endpointIndex: this.endpoint.index,
		});
		const response = await this.host.sendCommand<TimeCCTimeReport>(
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

		const cc = new TimeCCTimeReport({
			nodeId: this.endpoint.nodeId,
			endpointIndex: this.endpoint.index,
			hour,
			minute,
			second,
		});
		return this.host.sendCommand(cc, this.commandOptions);
	}

	// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
	public async getDate() {
		this.assertSupportsCommand(TimeCommand, TimeCommand.DateGet);

		const cc = new TimeCCDateGet({
			nodeId: this.endpoint.nodeId,
			endpointIndex: this.endpoint.index,
		});
		const response = await this.host.sendCommand<TimeCCDateReport>(
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

		const cc = new TimeCCDateReport({
			nodeId: this.endpoint.nodeId,
			endpointIndex: this.endpoint.index,
			year,
			month,
			day,
		});
		return this.host.sendCommand(cc, this.commandOptions);
	}

	@validateArgs()
	public async setTimezone(
		timezone: DSTInfo,
	): Promise<SupervisionResult | undefined> {
		this.assertSupportsCommand(TimeCommand, TimeCommand.TimeOffsetSet);

		const cc = new TimeCCTimeOffsetSet({
			nodeId: this.endpoint.nodeId,
			endpointIndex: this.endpoint.index,
			standardOffset: timezone.standardOffset,
			dstOffset: timezone.dstOffset,
			dstStart: timezone.startDate,
			dstEnd: timezone.endDate,
		});
		return this.host.sendCommand(cc, this.commandOptions);
	}

	public async getTimezone(): Promise<MaybeNotKnown<DSTInfo>> {
		this.assertSupportsCommand(TimeCommand, TimeCommand.TimeOffsetGet);

		const cc = new TimeCCTimeOffsetGet({
			nodeId: this.endpoint.nodeId,
			endpointIndex: this.endpoint.index,
		});
		const response = await this.host.sendCommand<
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

		const cc = new TimeCCTimeOffsetReport({
			nodeId: this.endpoint.nodeId,
			endpointIndex: this.endpoint.index,
			standardOffset: timezone.standardOffset,
			dstOffset: timezone.dstOffset,
			dstStart: timezone.startDate,
			dstEnd: timezone.endDate,
		});
		return this.host.sendCommand(cc, this.commandOptions);
	}
}

@commandClass(CommandClasses.Time)
@implementedVersion(2)
export class TimeCC extends CommandClass {
	declare ccCommand: TimeCommand;

	public async interview(
		ctx: InterviewContext,
	): Promise<void> {
		const node = this.getNode(ctx)!;
		const endpoint = this.getEndpoint(ctx)!;
		const api = CCAPI.create(
			CommandClasses.Time,
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

		// Synchronize the slave's time
		if (api.version >= 2) {
			ctx.logNode(node.id, {
				endpoint: this.endpointIndex,
				message: "setting timezone information...",
				direction: "outbound",
			});
			// Set the correct timezone on this node
			const timezone = getDSTInfo();
			await api.setTimezone(timezone);
		}

		// Remember that the interview is complete
		this.setInterviewComplete(ctx, true);
	}
}

// @publicAPI
export interface TimeCCTimeReportOptions {
	hour: number;
	minute: number;
	second: number;
}

@CCCommand(TimeCommand.TimeReport)
export class TimeCCTimeReport extends TimeCC {
	public constructor(
		options: WithAddress<TimeCCTimeReportOptions>,
	) {
		super(options);
		this.hour = options.hour;
		this.minute = options.minute;
		this.second = options.second;
	}

	public static from(raw: CCRaw, ctx: CCParsingContext): TimeCCTimeReport {
		validatePayload(raw.payload.length >= 3);
		const hour = raw.payload[0] & 0b11111;
		const minute = raw.payload[1];
		const second = raw.payload[2];

		validatePayload(
			hour >= 0,
			hour <= 23,
			minute >= 0,
			minute <= 59,
			second >= 0,
			second <= 59,
		);

		return new this({
			nodeId: ctx.sourceNodeId,
			hour,
			minute,
			second,
		});
	}

	public hour: number;
	public minute: number;
	public second: number;

	public serialize(ctx: CCEncodingContext): Promise<Bytes> {
		this.payload = Bytes.from([
			this.hour & 0b11111,
			this.minute,
			this.second,
		]);
		return super.serialize(ctx);
	}

	public toLogEntry(ctx?: GetValueDB): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(ctx),
			message: {
				time: `${this.hour.toString().padStart(2, "0")}:${
					this.minute.toString().padStart(2, "0")
				}:${this.second.toString().padStart(2, "0")}`,
			},
		};
	}
}

@CCCommand(TimeCommand.TimeGet)
@expectedCCResponse(TimeCCTimeReport)
export class TimeCCTimeGet extends TimeCC {}

// @publicAPI
export interface TimeCCDateReportOptions {
	year: number;
	month: number;
	day: number;
}

@CCCommand(TimeCommand.DateReport)
export class TimeCCDateReport extends TimeCC {
	public constructor(
		options: WithAddress<TimeCCDateReportOptions>,
	) {
		super(options);
		this.year = options.year;
		this.month = options.month;
		this.day = options.day;
	}

	public static from(raw: CCRaw, ctx: CCParsingContext): TimeCCDateReport {
		validatePayload(raw.payload.length >= 4);
		const year = raw.payload.readUInt16BE(0);
		const month = raw.payload[2];
		const day = raw.payload[3];

		return new this({
			nodeId: ctx.sourceNodeId,
			year,
			month,
			day,
		});
	}

	public year: number;
	public month: number;
	public day: number;

	public serialize(ctx: CCEncodingContext): Promise<Bytes> {
		this.payload = Bytes.from([
			// 2 bytes placeholder for year
			0,
			0,
			this.month,
			this.day,
		]);
		this.payload.writeUInt16BE(this.year, 0);
		return super.serialize(ctx);
	}

	public toLogEntry(ctx?: GetValueDB): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(ctx),
			message: {
				date: `${this.year.toString().padStart(4, "0")}-${
					this.month.toString().padStart(2, "0")
				}-${this.day.toString().padStart(2, "0")}`,
			},
		};
	}
}

@CCCommand(TimeCommand.DateGet)
@expectedCCResponse(TimeCCDateReport)
export class TimeCCDateGet extends TimeCC {}

// @publicAPI
export interface TimeCCTimeOffsetSetOptions {
	standardOffset: number;
	dstOffset: number;
	dstStart: Date;
	dstEnd: Date;
}

@CCCommand(TimeCommand.TimeOffsetSet)
@useSupervision()
export class TimeCCTimeOffsetSet extends TimeCC {
	public constructor(
		options: WithAddress<TimeCCTimeOffsetSetOptions>,
	) {
		super(options);
		this.standardOffset = options.standardOffset;
		this.dstOffset = options.dstOffset;
		this.dstStartDate = options.dstStart;
		this.dstEndDate = options.dstEnd;
	}

	public static from(
		_raw: CCRaw,
		_ctx: CCParsingContext,
	): TimeCCTimeOffsetSet {
		// TODO: Deserialize payload
		throw new ZWaveError(
			`${this.name}: deserialization not implemented`,
			ZWaveErrorCodes.Deserialization_NotImplemented,
		);

		// return new TimeCCTimeOffsetSet({
		// 	nodeId: ctx.sourceNodeId,
		// });
	}

	public standardOffset: number;
	public dstOffset: number;
	public dstStartDate: Date;
	public dstEndDate: Date;

	public serialize(ctx: CCEncodingContext): Promise<Bytes> {
		this.payload = Bytes.concat([
			encodeTimezone({
				standardOffset: this.standardOffset,
				dstOffset: this.dstOffset,
			}),
			Bytes.from([
				this.dstStartDate.getUTCMonth() + 1,
				this.dstStartDate.getUTCDate(),
				this.dstStartDate.getUTCHours(),
				this.dstEndDate.getUTCMonth() + 1,
				this.dstEndDate.getUTCDate(),
				this.dstEndDate.getUTCHours(),
			]),
		]);
		return super.serialize(ctx);
	}

	public toLogEntry(ctx?: GetValueDB): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(ctx),
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
export interface TimeCCTimeOffsetReportOptions {
	standardOffset: number;
	dstOffset: number;
	dstStart: Date;
	dstEnd: Date;
}

@CCCommand(TimeCommand.TimeOffsetReport)
export class TimeCCTimeOffsetReport extends TimeCC {
	public constructor(
		options: WithAddress<TimeCCTimeOffsetReportOptions>,
	) {
		super(options);
		this.standardOffset = options.standardOffset;
		this.dstOffset = options.dstOffset;
		this.dstStartDate = options.dstStart;
		this.dstEndDate = options.dstEnd;
	}

	public static from(
		raw: CCRaw,
		ctx: CCParsingContext,
	): TimeCCTimeOffsetReport {
		validatePayload(raw.payload.length >= 9);
		const { standardOffset, dstOffset } = parseTimezone(raw.payload);
		const currentYear = new Date().getUTCFullYear();
		const dstStartDate: Date = new Date(
			Date.UTC(
				currentYear,
				raw.payload[3] - 1,
				raw.payload[4],
				raw.payload[5],
			),
		);
		const dstEndDate: Date = new Date(
			Date.UTC(
				currentYear,
				raw.payload[6] - 1,
				raw.payload[7],
				raw.payload[8],
			),
		);

		return new this({
			nodeId: ctx.sourceNodeId,
			standardOffset,
			dstOffset,
			dstStart: dstStartDate,
			dstEnd: dstEndDate,
		});
	}

	public standardOffset: number;
	public dstOffset: number;
	public dstStartDate: Date;
	public dstEndDate: Date;

	public serialize(ctx: CCEncodingContext): Promise<Bytes> {
		this.payload = Bytes.concat([
			encodeTimezone({
				standardOffset: this.standardOffset,
				dstOffset: this.dstOffset,
			}),
			Bytes.from([
				this.dstStartDate.getUTCMonth() + 1,
				this.dstStartDate.getUTCDate(),
				this.dstStartDate.getUTCHours(),
				this.dstEndDate.getUTCMonth() + 1,
				this.dstEndDate.getUTCDate(),
				this.dstEndDate.getUTCHours(),
			]),
		]);
		return super.serialize(ctx);
	}

	public toLogEntry(ctx?: GetValueDB): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(ctx),
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
