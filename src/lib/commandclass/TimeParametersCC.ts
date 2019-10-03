import { IDriver } from "../driver/IDriver";
import log from "../log";
import { Endpoint } from "../node/Endpoint";
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
export enum TimeParametersCommand {
	Set = 0x01,
	Get = 0x02,
	Report = 0x03,
}

/**
 * Determines if the node expects local time instead of UTC.
 */
function shouldUseLocalTime(endpoint: Endpoint): boolean {
	// GH#311 Some nodes have no way to determine the time zone offset,
	// so they need to interpret the set time as local time instead of UTC.
	//
	// This is the case when they both
	// 1. DON'T control TimeCC V1, so they cannot request the local time
	// 2. DON'T support TimeCC V2, so the controller cannot specify the timezone offset
	// Incidentally, this is also true when they don't support TimeCC at all
	const ccVersion = endpoint.getCCVersion(CommandClasses.Time);
	if (ccVersion >= 1 && endpoint.controlsCC(CommandClasses.Time))
		return false;
	if (ccVersion >= 2 && endpoint.supportsCC(CommandClasses.Time))
		return false;

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

function timeSegmentsToDate(segments: DateSegments, local: boolean): Date {
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

function dateToTimeSegments(date: Date, local: boolean): DateSegments {
	return {
		year: (date as any)[`get${local ? "" : "UTC"}FullYear`](),
		month: (date as any)[`get${local ? "" : "UTC"}Month`]() + 1,
		day: (date as any)[`get${local ? "" : "UTC"}Date`](),
		hour: (date as any)[`get${local ? "" : "UTC"}Hours`](),
		minute: (date as any)[`get${local ? "" : "UTC"}Minutes`](),
		second: (date as any)[`get${local ? "" : "UTC"}Seconds`](),
	};
}

@API(CommandClasses["Time Parameters"])
export class TimeParametersCCAPI extends CCAPI {
	public async get(): Promise<Date> {
		const cc = new TimeParametersCCGet(this.driver, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
		});
		const response = (await this.driver.sendCommand<TimeParametersCCReport>(
			cc,
		))!;

		return timeSegmentsToDate(response, shouldUseLocalTime(this.endpoint));
	}

	public async set(date: Date): Promise<void> {
		const cc = new TimeParametersCCSet(this.driver, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			...dateToTimeSegments(date, shouldUseLocalTime(this.endpoint)),
		});
		await this.driver.sendCommand(cc);
	}
}

export interface TimeParametersCC {
	ccCommand: TimeParametersCommand;
}

@commandClass(CommandClasses["Time Parameters"])
@implementedVersion(1)
export class TimeParametersCC extends CommandClass {
	public async interview(complete: boolean = true): Promise<void> {
		const node = this.getNode()!;
		const api = node.commandClasses["Time Parameters"];

		log.controller.logNode(node.id, {
			message: `${this.constructor.name}: doing a ${
				complete ? "complete" : "partial"
			} interview...`,
			direction: "none",
		});

		// Always keep the node's time in sync
		log.controller.logNode(node.id, {
			message: "setting current time...",
			direction: "outbound",
		});
		await api.set(new Date());

		// Remember that the interview is complete
		this.interviewComplete = true;
	}
}

@CCCommand(TimeParametersCommand.Report)
export class TimeParametersCCReport extends TimeParametersCC {
	public constructor(
		driver: IDriver,
		options: CommandClassDeserializationOptions,
	) {
		super(driver, options);
		validatePayload(this.payload.length >= 7);
		this.year = this.payload.readUInt16BE(0);
		this.month = this.payload[2];
		this.day = this.payload[3];
		this.hour = this.payload[4];
		this.minute = this.payload[5];
		this.second = this.payload[6];
	}

	public readonly year: number;
	public readonly month: number;
	public readonly day: number;
	public readonly hour: number;
	public readonly minute: number;
	public readonly second: number;
}

@CCCommand(TimeParametersCommand.Get)
@expectedCCResponse(TimeParametersCCReport)
export class TimeParametersCCGet extends TimeParametersCC {}

interface TimeParametersCCSetOptions extends CCCommandOptions {
	year: number;
	month: number;
	day: number;
	hour: number;
	minute: number;
	second: number;
}

@CCCommand(TimeParametersCommand.Set)
export class TimeParametersCCSet extends TimeParametersCC {
	public constructor(
		driver: IDriver,
		options:
			| CommandClassDeserializationOptions
			| TimeParametersCCSetOptions,
	) {
		super(driver, options);
		if (gotDeserializationOptions(options)) {
			validatePayload(this.payload.length >= 7);
			this.year = this.payload.readUInt16BE(0);
			this.month = this.payload[2];
			this.day = this.payload[3];
			this.hour = this.payload[4];
			this.minute = this.payload[5];
			this.second = this.payload[6];
		} else {
			// TODO: enforce limits
			this.year = options.year;
			this.month = options.month;
			this.day = options.day;
			this.hour = options.hour;
			this.minute = options.minute;
			this.second = options.second;
		}
	}

	public year: number;
	public month: number;
	public day: number;
	public hour: number;
	public minute: number;
	public second: number;

	public serialize(): Buffer {
		this.payload = Buffer.from([
			// 2 bytes placeholder for year
			0,
			0,
			this.month,
			this.day,
			this.hour,
			this.minute,
			this.second,
		]);
		this.payload.writeUInt16BE(this.year, 0);
		return super.serialize();
	}
}
