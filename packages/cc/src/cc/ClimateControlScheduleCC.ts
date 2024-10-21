import {
	CommandClasses,
	type MaybeNotKnown,
	type MessageOrCCLogEntry,
	type SupervisionResult,
	ValueMetadata,
	ZWaveError,
	ZWaveErrorCodes,
	enumValuesToMetadataStates,
	validatePayload,
} from "@zwave-js/core/safe";
import type {
	CCEncodingContext,
	CCParsingContext,
	GetValueDB,
} from "@zwave-js/host/safe";
import { getEnumMemberName } from "@zwave-js/shared/safe";
import { validateArgs } from "@zwave-js/transformers";
import { padStart } from "alcalzone-shared/strings";
import { CCAPI } from "../lib/API";
import {
	type CCCommandOptions,
	type CCRaw,
	CommandClass,
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
import {
	ClimateControlScheduleCommand,
	ScheduleOverrideType,
	type SetbackState,
	type Switchpoint,
	Weekday,
} from "../lib/_Types";
import {
	decodeSetbackState,
	decodeSwitchpoint,
	encodeSetbackState,
	encodeSwitchpoint,
} from "../lib/serializers";

export const ClimateControlScheduleCCValues = Object.freeze({
	...V.defineStaticCCValues(CommandClasses["Climate Control Schedule"], {
		...V.staticProperty(
			"overrideType",
			{
				...ValueMetadata.Number,
				label: "Override type",
				states: enumValuesToMetadataStates(ScheduleOverrideType),
			} as const,
		),
		...V.staticProperty(
			"overrideState",
			{
				...ValueMetadata.Number,
				label: "Override state",
				min: -12.8,
			} as const,
		),
	}),

	...V.defineDynamicCCValues(CommandClasses["Climate Control Schedule"], {
		...V.dynamicPropertyAndKeyWithName(
			"schedule",
			"schedule",
			(weekday: Weekday) => weekday,
			({ property, propertyKey }) =>
				property === "switchPoints"
				&& typeof propertyKey === "number"
				&& propertyKey >= Weekday.Monday
				&& propertyKey <= Weekday.Sunday,
			(weekday: Weekday) => ({
				...ValueMetadata.Any,
				label: `Schedule (${getEnumMemberName(Weekday, weekday)})`,
			} as const),
		),
	}),
});

@API(CommandClasses["Climate Control Schedule"])
export class ClimateControlScheduleCCAPI extends CCAPI {
	public supportsCommand(
		cmd: ClimateControlScheduleCommand,
	): MaybeNotKnown<boolean> {
		switch (cmd) {
			case ClimateControlScheduleCommand.Set:
			case ClimateControlScheduleCommand.OverrideSet:
				return true; // mandatory
			case ClimateControlScheduleCommand.Get:
			case ClimateControlScheduleCommand.ChangedGet:
			case ClimateControlScheduleCommand.OverrideGet:
				return this.isSinglecast();
		}
		return super.supportsCommand(cmd);
	}

	@validateArgs({ strictEnums: true })
	public async set(
		weekday: Weekday,
		switchPoints: Switchpoint[],
	): Promise<SupervisionResult | undefined> {
		this.assertSupportsCommand(
			ClimateControlScheduleCommand,
			ClimateControlScheduleCommand.Set,
		);

		const cc = new ClimateControlScheduleCCSet({
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			weekday,
			switchPoints,
		});
		return this.host.sendCommand(cc, this.commandOptions);
	}

	@validateArgs({ strictEnums: true })
	public async get(
		weekday: Weekday,
	): Promise<MaybeNotKnown<readonly Switchpoint[]>> {
		this.assertSupportsCommand(
			ClimateControlScheduleCommand,
			ClimateControlScheduleCommand.Get,
		);

		const cc = new ClimateControlScheduleCCGet({
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			weekday,
		});
		const response = await this.host.sendCommand<
			ClimateControlScheduleCCReport
		>(
			cc,
			this.commandOptions,
		);
		return response?.schedule;
	}

	public async getChangeCounter(): Promise<MaybeNotKnown<number>> {
		this.assertSupportsCommand(
			ClimateControlScheduleCommand,
			ClimateControlScheduleCommand.ChangedGet,
		);

		const cc = new ClimateControlScheduleCCChangedGet({
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
		});
		const response = await this.host.sendCommand<
			ClimateControlScheduleCCChangedReport
		>(
			cc,
			this.commandOptions,
		);
		return response?.changeCounter;
	}

	// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
	public async getOverride() {
		this.assertSupportsCommand(
			ClimateControlScheduleCommand,
			ClimateControlScheduleCommand.OverrideGet,
		);

		const cc = new ClimateControlScheduleCCOverrideGet({
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
		});
		const response = await this.host.sendCommand<
			ClimateControlScheduleCCOverrideReport
		>(
			cc,
			this.commandOptions,
		);
		if (response) {
			return {
				type: response.overrideType,
				state: response.overrideState,
			};
		}
	}

	@validateArgs({ strictEnums: true })
	public async setOverride(
		type: ScheduleOverrideType,
		state: SetbackState,
	): Promise<SupervisionResult | undefined> {
		this.assertSupportsCommand(
			ClimateControlScheduleCommand,
			ClimateControlScheduleCommand.OverrideSet,
		);

		const cc = new ClimateControlScheduleCCOverrideSet({
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			overrideType: type,
			overrideState: state,
		});
		return this.host.sendCommand(cc, this.commandOptions);
	}
}

@commandClass(CommandClasses["Climate Control Schedule"])
@implementedVersion(1)
@ccValues(ClimateControlScheduleCCValues)
export class ClimateControlScheduleCC extends CommandClass {
	declare ccCommand: ClimateControlScheduleCommand;
}

// @publicAPI
export interface ClimateControlScheduleCCSetOptions {
	weekday: Weekday;
	switchPoints: Switchpoint[];
}

@CCCommand(ClimateControlScheduleCommand.Set)
@useSupervision()
export class ClimateControlScheduleCCSet extends ClimateControlScheduleCC {
	public constructor(
		options: ClimateControlScheduleCCSetOptions & CCCommandOptions,
	) {
		super(options);
		this.switchPoints = options.switchPoints;
		this.weekday = options.weekday;
	}

	public static from(
		raw: CCRaw,
		ctx: CCParsingContext,
	): ClimateControlScheduleCCSet {
		throw new ZWaveError(
			`${this.constructor.name}: deserialization not implemented`,
			ZWaveErrorCodes.Deserialization_NotImplemented,
		);

		// return new ClimateControlScheduleCCSet({
		// 	nodeId: ctx.sourceNodeId,
		// });
	}

	public switchPoints: Switchpoint[];
	public weekday: Weekday;

	public serialize(ctx: CCEncodingContext): Buffer {
		// Make sure we have exactly 9 entries
		const allSwitchPoints = this.switchPoints.slice(0, 9); // maximum 9
		while (allSwitchPoints.length < 9) {
			allSwitchPoints.push({
				hour: 0,
				minute: 0,
				state: "Unused",
			});
		}
		this.payload = Buffer.concat([
			Buffer.from([this.weekday & 0b111]),
			...allSwitchPoints.map((sp) => encodeSwitchpoint(sp)),
		]);
		return super.serialize(ctx);
	}

	public toLogEntry(ctx?: GetValueDB): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(ctx),
			message: {
				weekday: getEnumMemberName(Weekday, this.weekday),
				switchpoints: `${
					this.switchPoints
						.map(
							(sp) => `
· ${padStart(sp.hour.toString(), 2, "0")}:${
								padStart(
									sp.minute.toString(),
									2,
									"0",
								)
							} --> ${sp.state}`,
						)
						.join("")
				}`,
			},
		};
	}
}

// @publicAPI
export interface ClimateControlScheduleCCReportOptions {
	weekday: Weekday;
	schedule: Switchpoint[];
}

@CCCommand(ClimateControlScheduleCommand.Report)
export class ClimateControlScheduleCCReport extends ClimateControlScheduleCC {
	public constructor(
		options: ClimateControlScheduleCCReportOptions & CCCommandOptions,
	) {
		super(options);

		// TODO: Check implementation:
		this.weekday = options.weekday;
		this.schedule = options.schedule;
	}

	public static from(
		raw: CCRaw,
		ctx: CCParsingContext,
	): ClimateControlScheduleCCReport {
		validatePayload(raw.payload.length >= 28);
		const weekday: Weekday = raw.payload[0] & 0b111;
		const allSwitchpoints: Switchpoint[] = [];
		for (let i = 0; i <= 8; i++) {
			allSwitchpoints.push(
				decodeSwitchpoint(raw.payload.subarray(1 + 3 * i)),
			);
		}

		const schedule: Switchpoint[] = allSwitchpoints.filter((sp) =>
			sp.state !== "Unused"
		);

		return new ClimateControlScheduleCCReport({
			nodeId: ctx.sourceNodeId,
			weekday,
			schedule,
		});
	}

	public readonly weekday: Weekday;

	@ccValue(
		ClimateControlScheduleCCValues.schedule,
		(self: ClimateControlScheduleCCReport) => [self.weekday] as const,
	)
	public readonly schedule: readonly Switchpoint[];

	public toLogEntry(ctx?: GetValueDB): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(ctx),
			message: {
				weekday: getEnumMemberName(Weekday, this.weekday),
				schedule: `${
					this.schedule
						.map(
							(sp) => `
· ${padStart(sp.hour.toString(), 2, "0")}:${
								padStart(
									sp.minute.toString(),
									2,
									"0",
								)
							} --> ${sp.state}`,
						)
						.join("")
				}`,
			},
		};
	}
}

// @publicAPI
export interface ClimateControlScheduleCCGetOptions {
	weekday: Weekday;
}

@CCCommand(ClimateControlScheduleCommand.Get)
@expectedCCResponse(ClimateControlScheduleCCReport)
export class ClimateControlScheduleCCGet extends ClimateControlScheduleCC {
	public constructor(
		options: ClimateControlScheduleCCGetOptions & CCCommandOptions,
	) {
		super(options);
		this.weekday = options.weekday;
	}

	public static from(
		raw: CCRaw,
		ctx: CCParsingContext,
	): ClimateControlScheduleCCGet {
		throw new ZWaveError(
			`${this.constructor.name}: deserialization not implemented`,
			ZWaveErrorCodes.Deserialization_NotImplemented,
		);

		// return new ClimateControlScheduleCCGet({
		// 	nodeId: ctx.sourceNodeId,
		// });
	}

	public weekday: Weekday;

	public serialize(ctx: CCEncodingContext): Buffer {
		this.payload = Buffer.from([this.weekday & 0b111]);
		return super.serialize(ctx);
	}

	public toLogEntry(ctx?: GetValueDB): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(ctx),
			message: { weekday: getEnumMemberName(Weekday, this.weekday) },
		};
	}
}

// @publicAPI
export interface ClimateControlScheduleCCChangedReportOptions {
	changeCounter: number;
}

@CCCommand(ClimateControlScheduleCommand.ChangedReport)
export class ClimateControlScheduleCCChangedReport
	extends ClimateControlScheduleCC
{
	public constructor(
		options:
			& ClimateControlScheduleCCChangedReportOptions
			& CCCommandOptions,
	) {
		super(options);

		// TODO: Check implementation:
		this.changeCounter = options.changeCounter;
	}

	public static from(
		raw: CCRaw,
		ctx: CCParsingContext,
	): ClimateControlScheduleCCChangedReport {
		validatePayload(raw.payload.length >= 1);
		const changeCounter = raw.payload[0];

		return new ClimateControlScheduleCCChangedReport({
			nodeId: ctx.sourceNodeId,
			changeCounter,
		});
	}

	public readonly changeCounter: number;

	public toLogEntry(ctx?: GetValueDB): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(ctx),
			message: { "change counter": this.changeCounter },
		};
	}
}

@CCCommand(ClimateControlScheduleCommand.ChangedGet)
@expectedCCResponse(ClimateControlScheduleCCChangedReport)
export class ClimateControlScheduleCCChangedGet
	extends ClimateControlScheduleCC
{}

// @publicAPI
export interface ClimateControlScheduleCCOverrideReportOptions {
	overrideType: ScheduleOverrideType;
	overrideState: SetbackState;
}

@CCCommand(ClimateControlScheduleCommand.OverrideReport)
export class ClimateControlScheduleCCOverrideReport
	extends ClimateControlScheduleCC
{
	public constructor(
		options:
			& ClimateControlScheduleCCOverrideReportOptions
			& CCCommandOptions,
	) {
		super(options);

		// TODO: Check implementation:
		this.overrideType = options.overrideType;
		this.overrideState = options.overrideState;
	}

	public static from(
		raw: CCRaw,
		ctx: CCParsingContext,
	): ClimateControlScheduleCCOverrideReport {
		validatePayload(raw.payload.length >= 2);
		const overrideType: ScheduleOverrideType = raw.payload[0] & 0b11;
		const overrideState: SetbackState = decodeSetbackState(raw.payload[1])
			|| raw.payload[1];

		return new ClimateControlScheduleCCOverrideReport({
			nodeId: ctx.sourceNodeId,
			overrideType,
			overrideState,
		});
	}

	@ccValue(ClimateControlScheduleCCValues.overrideType)
	public readonly overrideType: ScheduleOverrideType;

	@ccValue(ClimateControlScheduleCCValues.overrideState)
	public readonly overrideState: SetbackState;

	public toLogEntry(ctx?: GetValueDB): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(ctx),
			message: {
				"override type": getEnumMemberName(
					ScheduleOverrideType,
					this.overrideType,
				),
				"override state": this.overrideState,
			},
		};
	}
}

@CCCommand(ClimateControlScheduleCommand.OverrideGet)
@expectedCCResponse(ClimateControlScheduleCCOverrideReport)
export class ClimateControlScheduleCCOverrideGet
	extends ClimateControlScheduleCC
{}

// @publicAPI
export interface ClimateControlScheduleCCOverrideSetOptions {
	overrideType: ScheduleOverrideType;
	overrideState: SetbackState;
}

@CCCommand(ClimateControlScheduleCommand.OverrideSet)
@useSupervision()
export class ClimateControlScheduleCCOverrideSet
	extends ClimateControlScheduleCC
{
	public constructor(
		options: ClimateControlScheduleCCOverrideSetOptions & CCCommandOptions,
	) {
		super(options);
		this.overrideType = options.overrideType;
		this.overrideState = options.overrideState;
	}

	public static from(
		raw: CCRaw,
		ctx: CCParsingContext,
	): ClimateControlScheduleCCOverrideSet {
		throw new ZWaveError(
			`${this.constructor.name}: deserialization not implemented`,
			ZWaveErrorCodes.Deserialization_NotImplemented,
		);

		// return new ClimateControlScheduleCCOverrideSet({
		// 	nodeId: ctx.sourceNodeId,
		// });
	}

	public overrideType: ScheduleOverrideType;
	public overrideState: SetbackState;

	public serialize(ctx: CCEncodingContext): Buffer {
		this.payload = Buffer.from([
			this.overrideType & 0b11,
			encodeSetbackState(this.overrideState),
		]);
		return super.serialize(ctx);
	}

	public toLogEntry(ctx?: GetValueDB): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(ctx),
			message: {
				"override type": getEnumMemberName(
					ScheduleOverrideType,
					this.overrideType,
				),
				"override state": this.overrideState,
			},
		};
	}
}
