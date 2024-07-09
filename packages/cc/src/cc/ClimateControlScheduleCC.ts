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
import type { ZWaveHost, ZWaveValueHost } from "@zwave-js/host/safe";
import { getEnumMemberName } from "@zwave-js/shared/safe";
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

		const cc = new ClimateControlScheduleCCSet(this.applHost, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			weekday,
			switchPoints,
		});
		return this.applHost.sendCommand(cc, this.commandOptions);
	}

	@validateArgs({ strictEnums: true })
	public async get(
		weekday: Weekday,
	): Promise<MaybeNotKnown<readonly Switchpoint[]>> {
		this.assertSupportsCommand(
			ClimateControlScheduleCommand,
			ClimateControlScheduleCommand.Get,
		);

		const cc = new ClimateControlScheduleCCGet(this.applHost, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			weekday,
		});
		const response = await this.applHost.sendCommand<
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

		const cc = new ClimateControlScheduleCCChangedGet(this.applHost, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
		});
		const response = await this.applHost.sendCommand<
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

		const cc = new ClimateControlScheduleCCOverrideGet(this.applHost, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
		});
		const response = await this.applHost.sendCommand<
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

		const cc = new ClimateControlScheduleCCOverrideSet(this.applHost, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			overrideType: type,
			overrideState: state,
		});
		return this.applHost.sendCommand(cc, this.commandOptions);
	}
}

@commandClass(CommandClasses["Climate Control Schedule"])
@implementedVersion(1)
@ccValues(ClimateControlScheduleCCValues)
export class ClimateControlScheduleCC extends CommandClass {
	declare ccCommand: ClimateControlScheduleCommand;
}

// @publicAPI
export interface ClimateControlScheduleCCSetOptions extends CCCommandOptions {
	weekday: Weekday;
	switchPoints: Switchpoint[];
}

@CCCommand(ClimateControlScheduleCommand.Set)
@useSupervision()
export class ClimateControlScheduleCCSet extends ClimateControlScheduleCC {
	public constructor(
		host: ZWaveHost,
		options:
			| CommandClassDeserializationOptions
			| ClimateControlScheduleCCSetOptions,
	) {
		super(host, options);
		if (gotDeserializationOptions(options)) {
			throw new ZWaveError(
				`${this.constructor.name}: deserialization not implemented`,
				ZWaveErrorCodes.Deserialization_NotImplemented,
			);
		} else {
			this.switchPoints = options.switchPoints;
			this.weekday = options.weekday;
		}
	}

	public switchPoints: Switchpoint[];
	public weekday: Weekday;

	public serialize(): Buffer {
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
		return super.serialize();
	}

	public toLogEntry(host?: ZWaveValueHost): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(host),
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

@CCCommand(ClimateControlScheduleCommand.Report)
export class ClimateControlScheduleCCReport extends ClimateControlScheduleCC {
	public constructor(
		host: ZWaveHost,
		options: CommandClassDeserializationOptions,
	) {
		super(host, options);

		validatePayload(this.payload.length >= 28); // 1 + 9 * 3
		this.weekday = this.payload[0] & 0b111;
		const allSwitchpoints: Switchpoint[] = [];
		for (let i = 0; i <= 8; i++) {
			allSwitchpoints.push(
				decodeSwitchpoint(this.payload.subarray(1 + 3 * i)),
			);
		}
		this.schedule = allSwitchpoints.filter((sp) => sp.state !== "Unused");
	}

	public readonly weekday: Weekday;

	@ccValue(
		ClimateControlScheduleCCValues.schedule,
		(self: ClimateControlScheduleCCReport) => [self.weekday] as const,
	)
	public readonly schedule: readonly Switchpoint[];

	public toLogEntry(host?: ZWaveValueHost): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(host),
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
export interface ClimateControlScheduleCCGetOptions extends CCCommandOptions {
	weekday: Weekday;
}

@CCCommand(ClimateControlScheduleCommand.Get)
@expectedCCResponse(ClimateControlScheduleCCReport)
export class ClimateControlScheduleCCGet extends ClimateControlScheduleCC {
	public constructor(
		host: ZWaveHost,
		options:
			| CommandClassDeserializationOptions
			| ClimateControlScheduleCCGetOptions,
	) {
		super(host, options);
		if (gotDeserializationOptions(options)) {
			throw new ZWaveError(
				`${this.constructor.name}: deserialization not implemented`,
				ZWaveErrorCodes.Deserialization_NotImplemented,
			);
		} else {
			this.weekday = options.weekday;
		}
	}

	public weekday: Weekday;

	public serialize(): Buffer {
		this.payload = Buffer.from([this.weekday & 0b111]);
		return super.serialize();
	}

	public toLogEntry(host?: ZWaveValueHost): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(host),
			message: { weekday: getEnumMemberName(Weekday, this.weekday) },
		};
	}
}

@CCCommand(ClimateControlScheduleCommand.ChangedReport)
export class ClimateControlScheduleCCChangedReport
	extends ClimateControlScheduleCC
{
	public constructor(
		host: ZWaveHost,
		options: CommandClassDeserializationOptions,
	) {
		super(host, options);

		validatePayload(this.payload.length >= 1);
		this.changeCounter = this.payload[0];
	}

	public readonly changeCounter: number;

	public toLogEntry(host?: ZWaveValueHost): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(host),
			message: { "change counter": this.changeCounter },
		};
	}
}

@CCCommand(ClimateControlScheduleCommand.ChangedGet)
@expectedCCResponse(ClimateControlScheduleCCChangedReport)
export class ClimateControlScheduleCCChangedGet
	extends ClimateControlScheduleCC
{}

@CCCommand(ClimateControlScheduleCommand.OverrideReport)
export class ClimateControlScheduleCCOverrideReport
	extends ClimateControlScheduleCC
{
	public constructor(
		host: ZWaveHost,
		options: CommandClassDeserializationOptions,
	) {
		super(host, options);

		validatePayload(this.payload.length >= 2);
		this.overrideType = this.payload[0] & 0b11;
		this.overrideState = decodeSetbackState(this.payload[1])
			|| this.payload[1];
	}

	@ccValue(ClimateControlScheduleCCValues.overrideType)
	public readonly overrideType: ScheduleOverrideType;

	@ccValue(ClimateControlScheduleCCValues.overrideState)
	public readonly overrideState: SetbackState;

	public toLogEntry(host?: ZWaveValueHost): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(host),
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
export interface ClimateControlScheduleCCOverrideSetOptions
	extends CCCommandOptions
{
	overrideType: ScheduleOverrideType;
	overrideState: SetbackState;
}

@CCCommand(ClimateControlScheduleCommand.OverrideSet)
@useSupervision()
export class ClimateControlScheduleCCOverrideSet
	extends ClimateControlScheduleCC
{
	public constructor(
		host: ZWaveHost,
		options:
			| CommandClassDeserializationOptions
			| ClimateControlScheduleCCOverrideSetOptions,
	) {
		super(host, options);
		if (gotDeserializationOptions(options)) {
			throw new ZWaveError(
				`${this.constructor.name}: deserialization not implemented`,
				ZWaveErrorCodes.Deserialization_NotImplemented,
			);
		} else {
			this.overrideType = options.overrideType;
			this.overrideState = options.overrideState;
		}
	}

	public overrideType: ScheduleOverrideType;
	public overrideState: SetbackState;

	public serialize(): Buffer {
		this.payload = Buffer.from([
			this.overrideType & 0b11,
			encodeSetbackState(this.overrideState),
		]);
		return super.serialize();
	}

	public toLogEntry(host?: ZWaveValueHost): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(host),
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
