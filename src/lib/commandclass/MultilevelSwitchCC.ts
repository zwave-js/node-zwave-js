import { IDriver } from "../driver/IDriver";
import { Duration } from "../values/Duration";
import { Maybe, parseMaybeNumber, parseNumber } from "../values/Primitive";
import {
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

export enum MultilevelSwitchCommand {
	Set = 0x01,
	Get = 0x02,
	Report = 0x03,
	StartLevelChange = 0x04,
	StopLevelChange = 0x05,
	SupportedGet = 0x06,
	SupportedReport = 0x07,
}

export enum LevelChangeDirection {
	"up" = 0b0,
	"down" = 0b1,
	"none" = 0b11,
}

export enum SwitchType {
	"not supported" = 0x00,
	"Off/On" = 0x01,
	"Down/Up" = 0x02,
	"Close/Open" = 0x03,
	"CCW/CW" = 0x04,
	"Left/Right" = 0x05,
	"Reverse/Forward" = 0x06,
	"Pull/Push" = 0x07,
}

@commandClass(CommandClasses["Multilevel Switch"])
@implementedVersion(4)
@expectedCCResponse(CommandClasses["Multilevel Switch"])
export class MultilevelSwitchCC extends CommandClass {
	public ccCommand!: MultilevelSwitchCommand;
}

interface MultilevelSwitchCCSetOptions extends CCCommandOptions {
	targetValue: number;
	// Version >= 2:
	duration?: Duration;
}

@CCCommand(MultilevelSwitchCommand.Set)
export class MultilevelSwitchCCSet extends MultilevelSwitchCC {
	public constructor(
		driver: IDriver,
		options:
			| CommandClassDeserializationOptions
			| MultilevelSwitchCCSetOptions,
	) {
		super(driver, options);
		if (gotDeserializationOptions(options)) {
			// TODO: Deserialize payload
			throw new Error("not implemented");
		} else {
			this.targetValue = options.targetValue;
			this.duration = options.duration;
		}
	}

	public targetValue: number;
	public duration: Duration | undefined;

	public serialize(): Buffer {
		const payload = [this.targetValue];
		if (this.version >= 2 && this.duration) {
			payload.push(this.duration.serializeSet());
		}
		this.payload = Buffer.from(payload);
		return super.serialize();
	}
}

@CCCommand(MultilevelSwitchCommand.Get)
export class MultilevelSwitchCCGet extends MultilevelSwitchCC {
	public constructor(
		driver: IDriver,
		options: CommandClassDeserializationOptions | CCCommandOptions,
	) {
		super(driver, options);
	}
}

@CCCommand(MultilevelSwitchCommand.Report)
export class MultilevelSwitchCCReport extends MultilevelSwitchCC {
	public constructor(
		driver: IDriver,
		options: CommandClassDeserializationOptions,
	) {
		super(driver, options);
		this._currentValue =
			parseMaybeNumber(this.payload[0]) || this.payload[0];
		// Starting with V4:
		this._targetValue = parseNumber(this.payload[1]);
		this._duration = Duration.parseReport(this.payload[2]);
	}

	private _targetValue: number | undefined;
	public get targetValue(): number | undefined {
		return this._targetValue;
	}

	private _duration: Duration | undefined;
	public get duration(): Duration | undefined {
		return this._duration;
	}

	private _currentValue: Maybe<number>;
	public get currentValue(): Maybe<number> {
		return this._currentValue;
	}
}

interface MultilevelSwitchCCStartLevelChangeOptions extends CCCommandOptions {
	primarySwitchDirection: keyof typeof LevelChangeDirection;
	ignoreStartLevel: boolean;
	primarySwitchStartLevel: number;
	// Version >= 2:
	duration?: Duration;
	// Version >= 3:
	secondarySwitchDirection?: keyof typeof LevelChangeDirection;
	secondarySwitchStepSize?: number;
}

@CCCommand(MultilevelSwitchCommand.StartLevelChange)
export class MultilevelSwitchCCStartLevelChange extends MultilevelSwitchCC {
	public constructor(
		driver: IDriver,
		options:
			| CommandClassDeserializationOptions
			| MultilevelSwitchCCStartLevelChangeOptions,
	) {
		super(driver, options);
		if (gotDeserializationOptions(options)) {
			// TODO: Deserialize payload
			throw new Error("not implemented");
		} else {
			this.duration = options.duration;
			this.primarySwitchStartLevel = options.primarySwitchStartLevel;
			this.ignoreStartLevel = options.ignoreStartLevel;
			this.primarySwitchDirection = options.primarySwitchDirection;
			this.secondarySwitchDirection = options.secondarySwitchDirection;
			this.secondarySwitchStepSize = options.secondarySwitchStepSize;
		}
	}

	public duration: Duration | undefined;
	public primarySwitchStartLevel: number;
	public ignoreStartLevel: boolean;
	public primarySwitchDirection: keyof typeof LevelChangeDirection;
	public secondarySwitchDirection:
		| keyof typeof LevelChangeDirection
		| undefined;
	public secondarySwitchStepSize: number | undefined;

	public serialize(): Buffer {
		let controlByte =
			(LevelChangeDirection[this.primarySwitchDirection] << 6) |
			(this.ignoreStartLevel ? 0b0010_0000 : 0);
		if (this.version >= 3) {
			if (this.secondarySwitchDirection != null) {
				controlByte |=
					LevelChangeDirection[this.secondarySwitchDirection] << 3;
			}
		}
		const payload = [controlByte, this.primarySwitchStartLevel];
		if (this.version >= 2 && this.duration) {
			payload.push(this.duration.serializeSet());
		}
		if (this.version >= 3 && this.secondarySwitchDirection != undefined) {
			payload.push(this.secondarySwitchStepSize || 0);
		}
		this.payload = Buffer.from(payload);
		return super.serialize();
	}
}

@CCCommand(MultilevelSwitchCommand.StopLevelChange)
export class MultilevelSwitchCCStopLevelChange extends MultilevelSwitchCC {
	public constructor(
		driver: IDriver,
		options: CommandClassDeserializationOptions | CCCommandOptions,
	) {
		super(driver, options);
	}
}

@CCCommand(MultilevelSwitchCommand.SupportedGet)
export class MultilevelSwitchCCSupportedGet extends MultilevelSwitchCC {
	public constructor(
		driver: IDriver,
		options: CommandClassDeserializationOptions | CCCommandOptions,
	) {
		super(driver, options);
	}
}

@CCCommand(MultilevelSwitchCommand.SupportedReport)
export class MultilevelSwitchCCSupportedReport extends MultilevelSwitchCC {
	public constructor(
		driver: IDriver,
		options: CommandClassDeserializationOptions,
	) {
		super(driver, options);
		this._primarySwitchType = this.payload[0] & 0b11111;
		this._secondarySwitchType = this.payload[1] & 0b11111;
	}

	private _primarySwitchType: SwitchType;
	public get primarySwitchType(): SwitchType {
		return this._primarySwitchType;
	}

	private _secondarySwitchType: SwitchType;
	public get secondarySwitchType(): SwitchType {
		return this._secondarySwitchType;
	}
}
