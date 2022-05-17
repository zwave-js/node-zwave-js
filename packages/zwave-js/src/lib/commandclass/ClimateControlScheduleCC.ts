import type { Maybe, MessageOrCCLogEntry } from "@zwave-js/core";
import {
	CommandClasses,
	validatePayload,
	ZWaveError,
	ZWaveErrorCodes,
} from "@zwave-js/core";
import type { ZWaveHost } from "@zwave-js/host";
import { getEnumMemberName } from "@zwave-js/shared";
import { validateArgs } from "@zwave-js/transformers";
import { padStart } from "alcalzone-shared/strings";
import {
	decodeSetbackState,
	encodeSetbackState,
	SetbackState,
} from "../values/SetbackState";
import {
	decodeSwitchpoint,
	encodeSwitchpoint,
	Switchpoint,
} from "../values/Switchpoint";
import { CCAPI } from "./API";
import {
	API,
	CCCommand,
	CCCommandOptions,
	ccKeyValuePair,
	ccValue,
	CommandClass,
	commandClass,
	CommandClassDeserializationOptions,
	expectedCCResponse,
	gotDeserializationOptions,
	implementedVersion,
} from "./CommandClass";
import {
	ClimateControlScheduleCommand,
	ScheduleOverrideType,
	Weekday,
} from "./_Types";

@API(CommandClasses["Climate Control Schedule"])
export class ClimateControlScheduleCCAPI extends CCAPI {
	public supportsCommand(cmd: ClimateControlScheduleCommand): Maybe<boolean> {
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
	): Promise<void> {
		this.assertSupportsCommand(
			ClimateControlScheduleCommand,
			ClimateControlScheduleCommand.Set,
		);

		const cc = new ClimateControlScheduleCCSet(this.driver, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			weekday,
			switchPoints,
		});
		await this.driver.sendCommand(cc, this.commandOptions);
	}

	@validateArgs({ strictEnums: true })
	public async get(
		weekday: Weekday,
	): Promise<readonly Switchpoint[] | undefined> {
		this.assertSupportsCommand(
			ClimateControlScheduleCommand,
			ClimateControlScheduleCommand.Get,
		);

		const cc = new ClimateControlScheduleCCGet(this.driver, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			weekday,
		});
		const response =
			await this.driver.sendCommand<ClimateControlScheduleCCReport>(
				cc,
				this.commandOptions,
			);
		return response?.switchPoints;
	}

	public async getChangeCounter(): Promise<number | undefined> {
		this.assertSupportsCommand(
			ClimateControlScheduleCommand,
			ClimateControlScheduleCommand.ChangedGet,
		);

		const cc = new ClimateControlScheduleCCChangedGet(this.driver, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
		});
		const response =
			await this.driver.sendCommand<ClimateControlScheduleCCChangedReport>(
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

		const cc = new ClimateControlScheduleCCOverrideGet(this.driver, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
		});
		const response =
			await this.driver.sendCommand<ClimateControlScheduleCCOverrideReport>(
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
	): Promise<void> {
		this.assertSupportsCommand(
			ClimateControlScheduleCommand,
			ClimateControlScheduleCommand.OverrideSet,
		);

		const cc = new ClimateControlScheduleCCOverrideSet(this.driver, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			overrideType: type,
			overrideState: state,
		});
		await this.driver.sendCommand(cc, this.commandOptions);
	}
}

@commandClass(CommandClasses["Climate Control Schedule"])
@implementedVersion(1)
export class ClimateControlScheduleCC extends CommandClass {
	declare ccCommand: ClimateControlScheduleCommand;
}

interface ClimateControlScheduleCCSetOptions extends CCCommandOptions {
	weekday: Weekday;
	switchPoints: Switchpoint[];
}

@CCCommand(ClimateControlScheduleCommand.Set)
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

	public toLogEntry(): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(),
			message: {
				weekday: getEnumMemberName(Weekday, this.weekday),
				switchpoints: `${this.switchPoints
					.map(
						(sp) => `
· ${padStart(sp.hour.toString(), 2, "0")}:${padStart(
							sp.minute.toString(),
							2,
							"0",
						)} --> ${sp.state}`,
					)
					.join("")}`,
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
		const weekday = this.payload[0] & 0b111;
		const allSwitchpoints: Switchpoint[] = [];
		for (let i = 0; i <= 8; i++) {
			allSwitchpoints.push(
				decodeSwitchpoint(this.payload.slice(1 + 3 * i)),
			);
		}
		const switchPoints = allSwitchpoints.filter(
			(sp) => sp.state !== "Unused",
		);

		this.schedule = [weekday, switchPoints];
		this.persistValues();
	}

	@ccKeyValuePair()
	private schedule: [Weekday, Switchpoint[]];

	public get switchPoints(): readonly Switchpoint[] {
		return this.schedule[1];
	}

	public get weekday(): Weekday {
		return this.schedule[0];
	}

	public toLogEntry(): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(),
			message: {
				weekday: getEnumMemberName(Weekday, this.weekday),
				switchpoints: `${this.switchPoints
					.map(
						(sp) => `
· ${padStart(sp.hour.toString(), 2, "0")}:${padStart(
							sp.minute.toString(),
							2,
							"0",
						)} --> ${sp.state}`,
					)
					.join("")}`,
			},
		};
	}
}

interface ClimateControlScheduleCCGetOptions extends CCCommandOptions {
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

	public toLogEntry(): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(),
			message: { weekday: getEnumMemberName(Weekday, this.weekday) },
		};
	}
}

@CCCommand(ClimateControlScheduleCommand.ChangedReport)
export class ClimateControlScheduleCCChangedReport extends ClimateControlScheduleCC {
	public constructor(
		host: ZWaveHost,
		options: CommandClassDeserializationOptions,
	) {
		super(host, options);

		validatePayload(this.payload.length >= 1);
		this._changeCounter = this.payload[0];
		this.persistValues();
	}

	private _changeCounter: number;
	@ccValue() public get changeCounter(): number {
		return this._changeCounter;
	}

	public toLogEntry(): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(),
			message: { "change counter": this.changeCounter },
		};
	}
}

@CCCommand(ClimateControlScheduleCommand.ChangedGet)
@expectedCCResponse(ClimateControlScheduleCCChangedReport)
export class ClimateControlScheduleCCChangedGet extends ClimateControlScheduleCC {}

@CCCommand(ClimateControlScheduleCommand.OverrideReport)
export class ClimateControlScheduleCCOverrideReport extends ClimateControlScheduleCC {
	public constructor(
		host: ZWaveHost,
		options: CommandClassDeserializationOptions,
	) {
		super(host, options);

		validatePayload(this.payload.length >= 2);
		this._overrideType = this.payload[0] & 0b11;
		this._overrideState =
			decodeSetbackState(this.payload[1]) || this.payload[1];
		this.persistValues();
	}

	private _overrideType: ScheduleOverrideType;
	@ccValue() public get overrideType(): ScheduleOverrideType {
		return this._overrideType;
	}

	private _overrideState: SetbackState;
	@ccValue() public get overrideState(): SetbackState {
		return this._overrideState;
	}

	public toLogEntry(): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(),
			message: {
				"override type": getEnumMemberName(
					ScheduleOverrideType,
					this._overrideType,
				),
				"override state": this._overrideState,
			},
		};
	}
}

@CCCommand(ClimateControlScheduleCommand.OverrideGet)
@expectedCCResponse(ClimateControlScheduleCCOverrideReport)
export class ClimateControlScheduleCCOverrideGet extends ClimateControlScheduleCC {}

interface ClimateControlScheduleCCOverrideSetOptions extends CCCommandOptions {
	overrideType: ScheduleOverrideType;
	overrideState: SetbackState;
}

@CCCommand(ClimateControlScheduleCommand.OverrideSet)
export class ClimateControlScheduleCCOverrideSet extends ClimateControlScheduleCC {
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

	public toLogEntry(): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(),
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
