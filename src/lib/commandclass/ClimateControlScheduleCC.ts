import { IDriver } from "../driver/IDriver";
import { ZWaveError, ZWaveErrorCodes } from "../error/ZWaveError";
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
import {
	ccValue,
	CommandClass,
	commandClass,
	expectedCCResponse,
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

@commandClass(CommandClasses["Climate Control Schedule"])
@implementedVersion(1)
@expectedCCResponse(CommandClasses["Climate Control Schedule"])
export class ClimateControlScheduleCC extends CommandClass {
	public constructor(driver: IDriver, nodeId?: number);

	public constructor(
		driver: IDriver,
		nodeId: number,
		ccCommand: ClimateControlScheduleCommand.Set,
		weekday: Weekday,
		switchPoints: Switchpoint[],
	);
	public constructor(
		driver: IDriver,
		nodeId: number,
		ccCommand: ClimateControlScheduleCommand.Get,
		weekday: Weekday,
	);
	public constructor(
		driver: IDriver,
		nodeId: number,
		ccCommand:
			| ClimateControlScheduleCommand.ChangedGet
			| ClimateControlScheduleCommand.OverrideGet,
	);
	public constructor(
		driver: IDriver,
		nodeId: number,
		ccCommand: ClimateControlScheduleCommand.OverrideSet,
		overrideType: ScheduleOverrideType,
		overrideState: SetbackState,
	);

	public constructor(
		driver: IDriver,
		public nodeId: number,
		public ccCommand?: ClimateControlScheduleCommand,
		...args: any[]
	) {
		super(driver, nodeId, ccCommand);
		if (this.ccCommand === ClimateControlScheduleCommand.Set) {
			[this.weekday, this.switchPoints] = args;
		} else if (this.ccCommand === ClimateControlScheduleCommand.Get) {
			this.weekday = args[0];
		} else if (
			this.ccCommand === ClimateControlScheduleCommand.OverrideSet
		) {
			[this.overrideType, this.overrideState] = args;
		}
	}

	@ccValue() public weekday: Weekday;
	@ccValue() public switchPoints: Switchpoint[];
	@ccValue() public overrideType: ScheduleOverrideType;
	@ccValue() public overrideState: SetbackState;
	@ccValue() public changeCounter: number;

	public serialize(): Buffer {
		switch (this.ccCommand) {
			case ClimateControlScheduleCommand.ChangedGet:
			case ClimateControlScheduleCommand.OverrideGet:
				// no real payload
				break;

			case ClimateControlScheduleCommand.Set: {
				// Make sure we have exactly 9 entries
				const allSwitchPoints = this.switchPoints
					? this.switchPoints.slice(0, 9) // maximum 9
					: [];
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
				break;
			}

			case ClimateControlScheduleCommand.Get:
				this.payload = Buffer.from([this.weekday & 0b111]);
				break;

			case ClimateControlScheduleCommand.OverrideSet:
				this.payload = Buffer.from([
					this.overrideType & 0b11,
					encodeSetbackState(this.overrideState),
				]);
				break;

			default:
				throw new ZWaveError(
					"Cannot serialize a ClimateControlSchedule CC with a command other than Get, Set, ChangedGet, OverrideGet or OverrideSet",
					ZWaveErrorCodes.CC_Invalid,
				);
		}

		return super.serialize();
	}

	public deserialize(data: Buffer): void {
		super.deserialize(data);

		switch (this.ccCommand) {
			case ClimateControlScheduleCommand.Report: {
				this.weekday = this.payload[0] & 0b111;
				const allSwitchpoints: Switchpoint[] = [];
				for (let i = 0; i <= 8; i++) {
					allSwitchpoints.push(
						decodeSwitchpoint(this.payload.slice(1 + 3 * i)),
					);
				}
				this.switchPoints = allSwitchpoints.filter(
					sp => sp.state !== "Unused",
				);
				break;
			}

			case ClimateControlScheduleCommand.ChangedReport:
				this.changeCounter = this.payload[0];
				break;

			case ClimateControlScheduleCommand.OverrideReport:
				this.overrideType = this.payload[0] & 0b11;
				this.overrideState = decodeSetbackState(this.payload[1]);
				break;

			default:
				throw new ZWaveError(
					"Cannot deserialize a ClimateControlSchedule CC with a command other than Report, ChangedReport or OverrideReport",
					ZWaveErrorCodes.CC_Invalid,
				);
		}
	}
}
