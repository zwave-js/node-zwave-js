import {
	CommandClasses,
	type MessageOrCCLogEntry,
	MessagePriority,
	type SupervisionResult,
	ValueMetadata,
	formatDate,
	validatePayload,
} from "@zwave-js/core";
import {
	type ControlsCC,
	type EndpointId,
	type MaybeNotKnown,
	type SupportsCC,
} from "@zwave-js/core/safe";
import type {
	CCEncodingContext,
	CCParsingContext,
	GetDeviceConfig,
	GetValueDB,
} from "@zwave-js/host/safe";
import { validateArgs } from "@zwave-js/transformers";
import {
	CCAPI,
	POLL_VALUE,
	type PollValueImplementation,
	SET_VALUE,
	type SetValueImplementation,
	throwUnsupportedProperty,
	throwWrongValueType,
} from "../lib/API";
import {
	type CCCommandOptions,
	type CCRaw,
	CommandClass,
	type CommandClassDeserializationOptions,
	type InterviewContext,
	type PersistValuesContext,
} from "../lib/CommandClass";
import {
	API,
	CCCommand,
	ccValue,
	ccValues,
	commandClass,
	expectedCCResponse,
	implementedVersion,
	useSupervision,
} from "../lib/CommandClassDecorators";
import { V } from "../lib/Values";
import { TimeParametersCommand } from "../lib/_Types";

export const TimeParametersCCValues = Object.freeze({
	...V.defineStaticCCValues(CommandClasses["Time Parameters"], {
		...V.staticProperty(
			"dateAndTime",
			{
				...ValueMetadata.Any,
				label: "Date and Time",
			} as const,
		),
	}),
});

/**
 * Determines if the node expects local time instead of UTC.
 */
function shouldUseLocalTime(
	ctx: GetDeviceConfig,
	endpoint: EndpointId & SupportsCC & ControlsCC,
): boolean {
	// GH#311 Some nodes have no way to determine the time zone offset,
	// so they need to interpret the set time as local time instead of UTC.
	//
	// This is the case when they both
	// 1. DON'T control TimeCC V1, so they cannot request the local time
	// 2. DON'T support TimeCC V2, so the controller cannot specify the timezone offset
	// Incidentally, this is also true when they don't support TimeCC at all

	// Use UTC though when the device config file explicitly requests it
	const forceUTC = !!ctx.getDeviceConfig?.(endpoint.nodeId)?.compat
		?.useUTCInTimeParametersCC;
	if (forceUTC) return false;

	const ccVersion = endpoint.getCCVersion(CommandClasses.Time);
	if (ccVersion >= 1 && endpoint.controlsCC(CommandClasses.Time)) {
		return false;
	}
	if (ccVersion >= 2 && endpoint.supportsCC(CommandClasses.Time)) {
		return false;
	}

	return true;
}

interface DateSegments {
	year: number;
	month: number;
	day: number;
	hour: number;
	minute: number;
	second: number;
}

function segmentsToDate(segments: DateSegments, local: boolean): Date {
	if (local) {
		return new Date(
			segments.year,
			segments.month - 1,
			segments.day,
			segments.hour,
			segments.minute,
			segments.second,
		);
	} else {
		return new Date(
			Date.UTC(
				segments.year,
				segments.month - 1,
				segments.day,
				segments.hour,
				segments.minute,
				segments.second,
			),
		);
	}
}

function dateToSegments(date: Date, local: boolean): DateSegments {
	return {
		year: (date as any)[`get${local ? "" : "UTC"}FullYear`]() as number,
		month: ((date as any)[`get${local ? "" : "UTC"}Month`]() as number) + 1,
		day: (date as any)[`get${local ? "" : "UTC"}Date`]() as number,
		hour: (date as any)[`get${local ? "" : "UTC"}Hours`]() as number,
		minute: (date as any)[`get${local ? "" : "UTC"}Minutes`]() as number,
		second: (date as any)[`get${local ? "" : "UTC"}Seconds`]() as number,
	};
}

@API(CommandClasses["Time Parameters"])
export class TimeParametersCCAPI extends CCAPI {
	public supportsCommand(cmd: TimeParametersCommand): MaybeNotKnown<boolean> {
		switch (cmd) {
			case TimeParametersCommand.Get:
				return this.isSinglecast();
			case TimeParametersCommand.Set:
				return true; // This is mandatory
		}
		return super.supportsCommand(cmd);
	}

	protected override get [SET_VALUE](): SetValueImplementation {
		return async function(this: TimeParametersCCAPI, { property }, value) {
			if (property !== "dateAndTime") {
				throwUnsupportedProperty(this.ccId, property);
			}
			if (!(value instanceof Date)) {
				throwWrongValueType(this.ccId, property, "date", typeof value);
			}
			return this.set(value);
		};
	}

	protected get [POLL_VALUE](): PollValueImplementation {
		return async function(this: TimeParametersCCAPI, { property }) {
			switch (property) {
				case "dateAndTime":
					return this.get();
				default:
					throwUnsupportedProperty(this.ccId, property);
			}
		};
	}

	public async get(): Promise<MaybeNotKnown<Date>> {
		this.assertSupportsCommand(
			TimeParametersCommand,
			TimeParametersCommand.Get,
		);

		const cc = new TimeParametersCCGet({
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
		});
		const response = await this.host.sendCommand<
			TimeParametersCCReport
		>(
			cc,
			this.commandOptions,
		);
		return response?.dateAndTime;
	}

	@validateArgs()
	public async set(
		dateAndTime: Date,
	): Promise<SupervisionResult | undefined> {
		this.assertSupportsCommand(
			TimeParametersCommand,
			TimeParametersCommand.Set,
		);

		const endpointToCheck = this.endpoint.virtual
			? this.endpoint.node.physicalNodes[0].getEndpoint(
				this.endpoint.index,
			)!
			: this.endpoint;

		const useLocalTime = shouldUseLocalTime(this.host, endpointToCheck);

		const cc = new TimeParametersCCSet({
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			dateAndTime,
			useLocalTime,
		});
		return this.host.sendCommand(cc, this.commandOptions);
	}
}

@commandClass(CommandClasses["Time Parameters"])
@implementedVersion(1)
@ccValues(TimeParametersCCValues)
export class TimeParametersCC extends CommandClass {
	declare ccCommand: TimeParametersCommand;

	public async interview(
		ctx: InterviewContext,
	): Promise<void> {
		const node = this.getNode(ctx)!;
		const endpoint = this.getEndpoint(ctx)!;
		const api = CCAPI.create(
			CommandClasses["Time Parameters"],
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

		// Synchronize the node's time
		ctx.logNode(node.id, {
			endpoint: this.endpointIndex,
			message: "setting current time...",
			direction: "outbound",
		});
		await api.set(new Date());

		// Remember that the interview is complete
		this.setInterviewComplete(ctx, true);
	}
}

// @publicAPI
export interface TimeParametersCCReportOptions {
	dateAndTime: Date;
}

@CCCommand(TimeParametersCommand.Report)
export class TimeParametersCCReport extends TimeParametersCC {
	public constructor(
		options: TimeParametersCCReportOptions & CCCommandOptions,
	) {
		super(options);

		// TODO: Check implementation:
		this.dateAndTime = options.dateAndTime;
	}

	public static from(
		raw: CCRaw,
		ctx: CCParsingContext,
	): TimeParametersCCReport {
		validatePayload(raw.payload.length >= 7);
		const dateSegments = {
			year: raw.payload.readUInt16BE(0),
			month: raw.payload[2],
			day: raw.payload[3],
			hour: raw.payload[4],
			minute: raw.payload[5],
			second: raw.payload[6],
		};
		const dateAndTime: Date = segmentsToDate(
			dateSegments,
			// Assume we can use UTC and correct this assumption in persistValues
			false,
		);

		return new TimeParametersCCReport({
			nodeId: ctx.sourceNodeId,
			dateAndTime,
		});
	}

	public persistValues(ctx: PersistValuesContext): boolean {
		// If necessary, fix the date and time before persisting it
		const local = shouldUseLocalTime(ctx, this.getEndpoint(ctx)!);
		if (local) {
			// The initial assumption was incorrect, re-interpret the time
			const segments = dateToSegments(this.dateAndTime, false);
			this.dateAndTime = segmentsToDate(segments, local);
		}

		return super.persistValues(ctx);
	}

	@ccValue(TimeParametersCCValues.dateAndTime)
	public dateAndTime: Date;

	public toLogEntry(ctx?: GetValueDB): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(ctx),
			message: {
				"date and time": formatDate(
					this.dateAndTime,
					"YYYY-MM-DD HH:mm:ss",
				),
			},
		};
	}
}

@CCCommand(TimeParametersCommand.Get)
@expectedCCResponse(TimeParametersCCReport)
export class TimeParametersCCGet extends TimeParametersCC {}

// @publicAPI
export interface TimeParametersCCSetOptions {
	dateAndTime: Date;
	useLocalTime?: boolean;
}

@CCCommand(TimeParametersCommand.Set)
@useSupervision()
export class TimeParametersCCSet extends TimeParametersCC {
	public constructor(
		options: TimeParametersCCSetOptions & CCCommandOptions,
	) {
		super(options);
		this.dateAndTime = options.dateAndTime;
		this.useLocalTime = options.useLocalTime;
	}

	public static from(raw: CCRaw, ctx: CCParsingContext): TimeParametersCCSet {
		validatePayload(raw.payload.length >= 7);
		const dateSegments = {
			year: raw.payload.readUInt16BE(0),
			month: raw.payload[2],
			day: raw.payload[3],
			hour: raw.payload[4],
			minute: raw.payload[5],
			second: raw.payload[6],
		};
		validatePayload(
			dateSegments.month >= 1 && dateSegments.month <= 12,
			dateSegments.day >= 1 && dateSegments.day <= 31,
			dateSegments.hour >= 0 && dateSegments.hour <= 23,
			dateSegments.minute >= 0 && dateSegments.minute <= 59,
			dateSegments.second >= 0 && dateSegments.second <= 59,
		);
		const dateAndTime = segmentsToDate(
			dateSegments,
			// Assume we can use UTC and correct this assumption in persistValues
			false,
		);

		return new TimeParametersCCSet({
			nodeId: ctx.sourceNodeId,
			dateAndTime,
		});
	}

	public persistValues(ctx: PersistValuesContext): boolean {
		// We do not actually persist anything here, but we need access to the node
		// in order to interpret the date segments correctly

		const local = shouldUseLocalTime(ctx, this.getEndpoint(ctx)!);
		if (local) {
			// The initial assumption was incorrect, re-interpret the time
			const segments = dateToSegments(this.dateAndTime, false);
			this.dateAndTime = segmentsToDate(segments, local);
		}

		return super.persistValues(ctx);
	}

	public dateAndTime: Date;
	private useLocalTime?: boolean;

	public serialize(ctx: CCEncodingContext): Buffer {
		const dateSegments = dateToSegments(
			this.dateAndTime,
			!!this.useLocalTime,
		);
		this.payload = Buffer.from([
			// 2 bytes placeholder for year
			0,
			0,
			dateSegments.month,
			dateSegments.day,
			dateSegments.hour,
			dateSegments.minute,
			dateSegments.second,
		]);
		this.payload.writeUInt16BE(dateSegments.year, 0);
		return super.serialize(ctx);
	}

	public toLogEntry(ctx?: GetValueDB): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(ctx),
			message: {
				"date and time": formatDate(
					this.dateAndTime,
					"YYYY-MM-DD HH:mm:ss",
				),
			},
		};
	}
}
