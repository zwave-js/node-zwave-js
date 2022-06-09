import {
	CommandClasses,
	formatDate,
	IZWaveEndpoint,
	Maybe,
	MessageOrCCLogEntry,
	MessagePriority,
	validatePayload,
} from "@zwave-js/core";
import type { ZWaveApplicationHost, ZWaveHost } from "@zwave-js/host/safe";
import { validateArgs } from "@zwave-js/transformers";
import {
	CCAPI,
	PollValueImplementation,
	POLL_VALUE,
	SetValueImplementation,
	SET_VALUE,
	throwUnsupportedProperty,
	throwWrongValueType,
} from "../lib/API";
import {
	ccValue,
	CommandClass,
	gotDeserializationOptions,
	type CCCommandOptions,
	type CommandClassDeserializationOptions,
} from "../lib/CommandClass";
import {
	API,
	CCCommand,
	commandClass,
	expectedCCResponse,
	implementedVersion,
} from "../lib/CommandClassDecorators";
import { TimeParametersCommand } from "../lib/_Types";

/**
 * Determines if the node expects local time instead of UTC.
 */
function shouldUseLocalTime(endpoint: IZWaveEndpoint): boolean {
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
	public supportsCommand(cmd: TimeParametersCommand): Maybe<boolean> {
		switch (cmd) {
			case TimeParametersCommand.Get:
				return this.isSinglecast();
			case TimeParametersCommand.Set:
				return true; // This is mandatory
		}
		return super.supportsCommand(cmd);
	}

	protected [SET_VALUE]: SetValueImplementation = async (
		{ property },
		value,
	): Promise<void> => {
		if (property !== "dateAndTime") {
			throwUnsupportedProperty(this.ccId, property);
		}
		if (!(value instanceof Date)) {
			throwWrongValueType(this.ccId, property, "date", typeof value);
		}
		await this.set(value);
	};

	protected [POLL_VALUE]: PollValueImplementation = async ({
		property,
	}): Promise<unknown> => {
		switch (property) {
			case "dateAndTime":
				return this.get();
			default:
				throwUnsupportedProperty(this.ccId, property);
		}
	};

	public async get(): Promise<Date | undefined> {
		this.assertSupportsCommand(
			TimeParametersCommand,
			TimeParametersCommand.Get,
		);

		const cc = new TimeParametersCCGet(this.applHost, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
		});
		const response =
			await this.applHost.sendCommand<TimeParametersCCReport>(
				cc,
				this.commandOptions,
			);
		return response?.dateAndTime;
	}

	@validateArgs()
	public async set(dateAndTime: Date): Promise<void> {
		this.assertSupportsCommand(
			TimeParametersCommand,
			TimeParametersCommand.Set,
		);

		const useLocalTime = this.endpoint.virtual
			? shouldUseLocalTime(
					this.endpoint.node.physicalNodes[0].getEndpoint(
						this.endpoint.index,
					)!,
			  )
			: shouldUseLocalTime(this.endpoint);

		const cc = new TimeParametersCCSet(this.applHost, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			dateAndTime,
			useLocalTime,
		});
		await this.applHost.sendCommand(cc, this.commandOptions);
	}
}

@commandClass(CommandClasses["Time Parameters"])
@implementedVersion(1)
export class TimeParametersCC extends CommandClass {
	declare ccCommand: TimeParametersCommand;

	public async interview(applHost: ZWaveApplicationHost): Promise<void> {
		const node = this.getNode(applHost)!;
		const endpoint = this.getEndpoint(applHost)!;
		const api = CCAPI.create(
			CommandClasses["Time Parameters"],
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

		// Synchronize the node's time
		applHost.controllerLog.logNode(node.id, {
			endpoint: this.endpointIndex,
			message: "setting current time...",
			direction: "outbound",
		});
		await api.set(new Date());

		// Remember that the interview is complete
		this.setInterviewComplete(applHost, true);
	}
}

@CCCommand(TimeParametersCommand.Report)
export class TimeParametersCCReport extends TimeParametersCC {
	public constructor(
		host: ZWaveHost,
		options: CommandClassDeserializationOptions,
	) {
		super(host, options);
		validatePayload(this.payload.length >= 7);
		const dateSegments = {
			year: this.payload.readUInt16BE(0),
			month: this.payload[2],
			day: this.payload[3],
			hour: this.payload[4],
			minute: this.payload[5],
			second: this.payload[6],
		};
		this._dateAndTime = segmentsToDate(
			dateSegments,
			// Assume we can use UTC and correct this assumption in persistValues
			false,
		);
	}

	public persistValues(applHost: ZWaveApplicationHost): boolean {
		// If necessary, fix the date and time before persisting it
		const local = shouldUseLocalTime(
			applHost.nodes
				.get(this.nodeId as number)!
				.getEndpoint(this.endpointIndex)!,
		);
		if (local) {
			// The initial assumption was incorrect, re-interpret the time
			const segments = dateToSegments(this._dateAndTime, false);
			this._dateAndTime = segmentsToDate(segments, local);
		}

		return super.persistValues(applHost);
	}

	private _dateAndTime: Date;
	@ccValue()
	public get dateAndTime(): Date {
		return this._dateAndTime;
	}

	public toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(applHost),
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

interface TimeParametersCCSetOptions extends CCCommandOptions {
	dateAndTime: Date;
	useLocalTime?: boolean;
}

@CCCommand(TimeParametersCommand.Set)
export class TimeParametersCCSet extends TimeParametersCC {
	public constructor(
		host: ZWaveHost,
		options:
			| CommandClassDeserializationOptions
			| TimeParametersCCSetOptions,
	) {
		super(host, options);
		if (gotDeserializationOptions(options)) {
			validatePayload(this.payload.length >= 7);
			const dateSegments = {
				year: this.payload.readUInt16BE(0),
				month: this.payload[2],
				day: this.payload[3],
				hour: this.payload[4],
				minute: this.payload[5],
				second: this.payload[6],
			};
			validatePayload(
				dateSegments.month >= 1 && dateSegments.month <= 12,
				dateSegments.day >= 1 && dateSegments.day <= 31,
				dateSegments.hour >= 0 && dateSegments.hour <= 23,
				dateSegments.minute >= 0 && dateSegments.minute <= 59,
				dateSegments.second >= 0 && dateSegments.second <= 59,
			);
			this.dateAndTime = segmentsToDate(
				dateSegments,
				// Assume we can use UTC and correct this assumption in persistValues
				false,
			);
		} else {
			this.dateAndTime = options.dateAndTime;
		}
	}

	public persistValues(applHost: ZWaveApplicationHost): boolean {
		// We do not actually persist anything here, but we need access to the node
		// in order to interpret the date segments correctly

		const local = shouldUseLocalTime(
			applHost.nodes
				.get(this.nodeId as number)!
				.getEndpoint(this.endpointIndex)!,
		);
		if (local) {
			// The initial assumption was incorrect, re-interpret the time
			const segments = dateToSegments(this.dateAndTime, false);
			this.dateAndTime = segmentsToDate(segments, local);
		}

		return super.persistValues(applHost);
	}

	public dateAndTime: Date;
	private useLocalTime?: boolean;

	public serialize(): Buffer {
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
		return super.serialize();
	}

	public toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(applHost),
			message: {
				"date and time": formatDate(
					this.dateAndTime,
					"YYYY-MM-DD HH:mm:ss",
				),
			},
		};
	}
}
