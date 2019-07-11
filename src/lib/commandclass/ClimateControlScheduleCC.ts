import { IDriver } from "../driver/IDriver";
import { ZWaveError, ZWaveErrorCodes } from "../error/ZWaveError";
import { validatePayload } from "../util/misc";
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
import { CommandClasses } from "./CommandClasses";

export enum ClimateControlScheduleCommand {
	Set = 0x01,
	Get = 0x02,
	Report = 0x03,
	ChangedGet = 0x04,
	ChangedReport = 0x05,
	OverrideSet = 0x06,
	OverrideGet = 0x07,
	OverrideReport = 0x08,
}

export enum Weekday {
	Monday = 0x01,
	Tuesday,
	Wednesday,
	Thursday,
	Friday,
	Saturday,
	Sunday,
}

export enum ScheduleOverrideType {
	None = 0x00,
	Temporary = 0x01,
	Permanent = 0x02,
}

@API(CommandClasses["Climate Control Schedule"])
export class ClimateControlScheduleCCAPI extends CCAPI {
	public async set(
		weekday: Weekday,
		switchPoints: Switchpoint[],
	): Promise<void> {
		const cc = new ClimateControlScheduleCCSet(this.driver, {
			nodeId: this.node.id,
			weekday,
			switchPoints,
		});
		await this.driver.sendCommand(cc);
	}

	public async get(weekday: Weekday): Promise<readonly Switchpoint[]> {
		const cc = new ClimateControlScheduleCCGet(this.driver, {
			nodeId: this.node.id,
			weekday,
		});
		const response = (await this.driver.sendCommand<
			ClimateControlScheduleCCReport
		>(cc))!;
		return response.switchPoints;
	}

	public async getChangeCounter(): Promise<number> {
		const cc = new ClimateControlScheduleCCChangedGet(this.driver, {
			nodeId: this.node.id,
		});
		const response = (await this.driver.sendCommand<
			ClimateControlScheduleCCChangedReport
		>(cc))!;
		return response.changeCounter;
	}

	// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
	public async getOverride() {
		const cc = new ClimateControlScheduleCCOverrideGet(this.driver, {
			nodeId: this.node.id,
		});
		const response = (await this.driver.sendCommand<
			ClimateControlScheduleCCOverrideReport
		>(cc))!;
		return {
			type: response.overrideType,
			state: response.overrideState,
		};
	}

	public async setOverride(
		type: ScheduleOverrideType,
		state: SetbackState,
	): Promise<void> {
		const cc = new ClimateControlScheduleCCOverrideSet(this.driver, {
			nodeId: this.node.id,
			overrideType: type,
			overrideState: state,
		});
		await this.driver.sendCommand(cc);
	}
}

@commandClass(CommandClasses["Climate Control Schedule"])
@implementedVersion(1)
export class ClimateControlScheduleCC extends CommandClass {
	public ccCommand!: ClimateControlScheduleCommand;
}

interface ClimateControlScheduleCCSetOptions extends CCCommandOptions {
	weekday: Weekday;
	switchPoints: Switchpoint[];
}

@CCCommand(ClimateControlScheduleCommand.Set)
export class ClimateControlScheduleCCSet extends ClimateControlScheduleCC {
	public constructor(
		driver: IDriver,
		options:
			| CommandClassDeserializationOptions
			| ClimateControlScheduleCCSetOptions,
	) {
		super(driver, options);
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
			...allSwitchPoints.map(sp => encodeSwitchpoint(sp)),
		]);
		return super.serialize();
	}
}

@CCCommand(ClimateControlScheduleCommand.Report)
export class ClimateControlScheduleCCReport extends ClimateControlScheduleCC {
	public constructor(
		driver: IDriver,
		options: CommandClassDeserializationOptions,
	) {
		super(driver, options);

		validatePayload(this.payload.length >= 28); // 1 + 9 * 3
		const weekday = this.payload[0] & 0b111;
		const allSwitchpoints: Switchpoint[] = [];
		for (let i = 0; i <= 8; i++) {
			allSwitchpoints.push(
				decodeSwitchpoint(this.payload.slice(1 + 3 * i)),
			);
		}
		const switchPoints = allSwitchpoints.filter(
			sp => sp.state !== "Unused",
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
}

interface ClimateControlScheduleCCGetOptions extends CCCommandOptions {
	weekday: Weekday;
}

@CCCommand(ClimateControlScheduleCommand.Get)
@expectedCCResponse(ClimateControlScheduleCCReport)
export class ClimateControlScheduleCCGet extends ClimateControlScheduleCC {
	public constructor(
		driver: IDriver,
		options:
			| CommandClassDeserializationOptions
			| ClimateControlScheduleCCGetOptions,
	) {
		super(driver, options);
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
}

@CCCommand(ClimateControlScheduleCommand.ChangedReport)
export class ClimateControlScheduleCCChangedReport extends ClimateControlScheduleCC {
	public constructor(
		driver: IDriver,
		options: CommandClassDeserializationOptions,
	) {
		super(driver, options);

		validatePayload(this.payload.length >= 1);
		this._changeCounter = this.payload[0];
		this.persistValues();
	}

	private _changeCounter: number;
	@ccValue() public get changeCounter(): number {
		return this._changeCounter;
	}
}

@CCCommand(ClimateControlScheduleCommand.ChangedGet)
@expectedCCResponse(ClimateControlScheduleCCChangedReport)
export class ClimateControlScheduleCCChangedGet extends ClimateControlScheduleCC {
	public constructor(
		driver: IDriver,
		options: CommandClassDeserializationOptions | CCCommandOptions,
	) {
		super(driver, options);
	}
}

@CCCommand(ClimateControlScheduleCommand.OverrideReport)
export class ClimateControlScheduleCCOverrideReport extends ClimateControlScheduleCC {
	public constructor(
		driver: IDriver,
		options: CommandClassDeserializationOptions,
	) {
		super(driver, options);

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
}

@CCCommand(ClimateControlScheduleCommand.OverrideGet)
@expectedCCResponse(ClimateControlScheduleCCOverrideReport)
export class ClimateControlScheduleCCOverrideGet extends ClimateControlScheduleCC {
	public constructor(
		driver: IDriver,
		options: CommandClassDeserializationOptions | CCCommandOptions,
	) {
		super(driver, options);
	}
}

interface ClimateControlScheduleCCOverrideSetOptions extends CCCommandOptions {
	overrideType: ScheduleOverrideType;
	overrideState: SetbackState;
}

@CCCommand(ClimateControlScheduleCommand.OverrideSet)
export class ClimateControlScheduleCCOverrideSet extends ClimateControlScheduleCC {
	public constructor(
		driver: IDriver,
		options:
			| CommandClassDeserializationOptions
			| ClimateControlScheduleCCOverrideSetOptions,
	) {
		super(driver, options);
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
}
