import { IDriver } from "../driver/IDriver";
import { ZWaveError, ZWaveErrorCodes } from "../error/ZWaveError";
import { Duration } from "../values/Duration";
import { Maybe, parseMaybeNumber, parseNumber } from "../values/Primitive";
import { ccValue, CommandClass, commandClass, expectedCCResponse, implementedVersion } from "./CommandClass";
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

	// tslint:disable:unified-signatures
	public constructor(driver: IDriver, nodeId?: number);
	public constructor(driver: IDriver, nodeId: number, ccCommand:
		MultilevelSwitchCommand.Get
		| MultilevelSwitchCommand.StopLevelChange
		| MultilevelSwitchCommand.SupportedGet,
	);
	public constructor(
		driver: IDriver,
		nodeId: number,
		ccCommand: MultilevelSwitchCommand.Set,
		targetValue: number,
		// Version >= 2:
		duration?: Duration,
	);
	public constructor(
		driver: IDriver,
		nodeId: number,
		ccCommand: MultilevelSwitchCommand.StartLevelChange,
		direction: keyof typeof LevelChangeDirection,
		ignoreStartLevel: boolean,
		startLevel: number,
		// Version >= 2:
		duration?: Duration,
		// Version >= 3:
		secondarySwitchDirection?: keyof typeof LevelChangeDirection,
	);

	public constructor(
		driver: IDriver,
		public nodeId: number,
		public ccCommand?: MultilevelSwitchCommand,
		...args: any[]
	) {
		super(driver, nodeId, ccCommand);
		if (ccCommand === MultilevelSwitchCommand.Set) {
			[this.targetValue, this.duration] = args;
		} else if (ccCommand === MultilevelSwitchCommand.StartLevelChange) {
			[
				this.direction,
				this.ignoreStartLevel,
				this.startLevel,
				this.duration,
				this.secondarySwitchDirection,
			] = args;
		}
	}
	// tslint:enable:unified-signatures

	@ccValue() public targetValue: number;
	@ccValue() public duration: Duration;
	@ccValue() public currentValue: Maybe<number>;
	@ccValue() public ignoreStartLevel: boolean;
	@ccValue() public startLevel: number;
	@ccValue() public secondarySwitchStepSize: number;

	// TODO: Which of these are CC values?

	public direction: keyof typeof LevelChangeDirection;
	public secondarySwitchDirection: keyof typeof LevelChangeDirection;

	private _primarySwitchType: SwitchType;
	public get primarySwitchType(): SwitchType {
		return this._primarySwitchType;
	}

	private _secondarySwitchType: SwitchType;
	public get secondarySwitchType(): SwitchType {
		return this._secondarySwitchType;
	}

	public serialize(): Buffer {
		switch (this.ccCommand) {
			case MultilevelSwitchCommand.Set: {
				const payload = [this.targetValue];
				if (this.version >= 2) {
					payload.push(this.duration.serializeSet());
				}
				this.payload = Buffer.from(payload);
				break;
			}

			case MultilevelSwitchCommand.StartLevelChange: {
				let controlByte =
					(LevelChangeDirection[this.direction] << 6)
					| (this.ignoreStartLevel ? 0b0010_0000 : 0)
					;
				if (this.version >= 3) {
					if (this.secondarySwitchDirection != null) {
						controlByte |= LevelChangeDirection[this.secondarySwitchDirection] << 3;
					}
				}
				const payload = [
					controlByte,
					this.startLevel,
				];
				if (this.version >= 2) {
					payload.push(this.duration.serializeSet());
				}
				if (this.version >= 3) {
					payload.push(this.secondarySwitchStepSize);
				}
				this.payload = Buffer.from(payload);
				break;
			}

			case MultilevelSwitchCommand.Get:
			case MultilevelSwitchCommand.StopLevelChange:
			case MultilevelSwitchCommand.SupportedGet:
				// no actual payload
				break;

			default:
				throw new ZWaveError(
					"Cannot serialize a MultilevelSwitch CC with a command other than Set, Get, StartLevelChange, StopLevelChange, SupportedGet",
					ZWaveErrorCodes.CC_Invalid,
				);
		}

		return super.serialize();
	}

	public deserialize(data: Buffer): void {
		super.deserialize(data);

		switch (this.ccCommand) {
			case MultilevelSwitchCommand.Report: {
				this.currentValue = parseMaybeNumber(this.payload[0]);
				this.targetValue = parseNumber(this.payload[1]);
				this.duration = Duration.parseReport(this.payload[2]);
				break;
			}

			case MultilevelSwitchCommand.SupportedReport:
				this._primarySwitchType = this.payload[0] & 0b11111;
				this._secondarySwitchType = this.payload[1] & 0b11111;
				break;

			default:
				throw new ZWaveError(
					"Cannot deserialize a MultilevelSwitch CC with a command other than Report",
					ZWaveErrorCodes.CC_Invalid,
				);
		}
	}

}
