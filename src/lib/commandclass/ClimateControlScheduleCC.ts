import { IDriver } from "../driver/IDriver";
import { ZWaveError, ZWaveErrorCodes } from "../error/ZWaveError";
import { decodeSwitchpoint, encodeSwitchpoint, Switchpoint } from "../values/Switchpoint";
import { ccValue, CommandClass, commandClass, CommandClasses, expectedCCResponse, implementedVersion } from "./CommandClass";

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

@commandClass(CommandClasses["Climate Control Schedule"])
@implementedVersion(1)
@expectedCCResponse(CommandClasses["Climate Control Schedule"])
export class ClimateControlScheduleCC extends CommandClass {

	// tslint:disable:unified-signatures
	constructor(
		driver: IDriver,
		nodeId?: number,
	);

	constructor(
		driver: IDriver,
		public nodeId: number,
		public ccCommand?: ClimateControlScheduleCommand,
	) {
		super(driver, nodeId);
	}
	// tslint:enable:unified-signatures

	@ccValue() public weekday: Weekday;
	@ccValue() public switchPoints: Switchpoint[];

	public serialize(): Buffer {
		switch (this.ccCommand) {

			case ClimateControlScheduleCommand.Set: {
				// Make sure we have exactly 9 entries
				const allSwitchPoints = this.switchPoints ?
					this.switchPoints.slice(0, 9) // maximum 9
					: [];
				while (allSwitchPoints.length < 9) {
					allSwitchPoints.push({
						hour: 0, minute: 0,
						state: "Unused",
					});
				}
				this.payload = Buffer.concat([
					Buffer.from([
						this.ccCommand,
						this.weekday & 0b111,
					]),
					...allSwitchPoints.map(sp => encodeSwitchpoint(sp)),
				]);
				break;
			}

			case ClimateControlScheduleCommand.Get:
				this.payload = Buffer.from([
					this.ccCommand,
					this.weekday & 0b111,
				]);
				break;

			default:
				throw new ZWaveError(
					"Cannot serialize a ClimateControlSchedule CC with a command other than Get or Set",
					ZWaveErrorCodes.CC_Invalid,
				);
		}

		return super.serialize();
	}

	public deserialize(data: Buffer): void {
		super.deserialize(data);

		this.ccCommand = this.payload[0];
		switch (this.ccCommand) {
			case ClimateControlScheduleCommand.Report: {
				this.weekday = this.payload[1] & 0b111;
				const allSwitchpoints: Switchpoint[] = [];
				for (let i = 0; i <= 8; i++) {
					allSwitchpoints.push(
						decodeSwitchpoint(this.payload.slice(2 + 3 * i)),
					);
				}
				this.switchPoints = allSwitchpoints.filter(sp => sp.state !== "Unused");
				break;
			}

			default:
				throw new ZWaveError(
					"Cannot deserialize a ClimateControlSchedule CC with a command other than Report",
					ZWaveErrorCodes.CC_Invalid,
				);
		}
	}

}
