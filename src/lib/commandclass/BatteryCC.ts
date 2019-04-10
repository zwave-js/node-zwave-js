import { IDriver } from "../driver/IDriver";
import { ZWaveError, ZWaveErrorCodes } from "../error/ZWaveError";
import { ccValue, CommandClass, commandClass, expectedCCResponse, implementedVersion } from "./CommandClass";
import { CommandClasses } from "./CommandClasses";

export enum BatteryCommand {
	Get = 0x02,
	Report = 0x03,
}

@commandClass(CommandClasses.Battery)
@implementedVersion(1)
@expectedCCResponse(CommandClasses.Battery)
export class BatteryCC extends CommandClass {

	// tslint:disable:unified-signatures
	public constructor(
		driver: IDriver,
		nodeId?: number,
	);

	public constructor(
		driver: IDriver,
		nodeId: number,
		ccCommand: BatteryCommand.Get,
	)

	public constructor(
		driver: IDriver,
		public nodeId: number,
		public ccCommand?: BatteryCommand,
	) {
		super(driver, nodeId, ccCommand);
	}
	// tslint:enable:unified-signatures

	@ccValue() public level: number;
	@ccValue() public isLow: boolean;

	public serialize(): Buffer {
		switch (this.ccCommand) {
			case BatteryCommand.Get:
				// no real payload
				break;
			default:
				throw new ZWaveError(
					"Cannot serialize a Battery CC with a command other than Get",
					ZWaveErrorCodes.CC_Invalid,
				);
		}

		return super.serialize();
	}

	public deserialize(data: Buffer): void {
		super.deserialize(data);

		switch (this.ccCommand) {
			case BatteryCommand.Report:
				this.level = this.payload[0];
				if (this.level === 0xFF) {
					this.level = 0;
					this.isLow = true;
				} else {
					this.isLow = false;
				}
				break;

			default:
				throw new ZWaveError(
					"Cannot deserialize a Battery CC with a command other than Report",
					ZWaveErrorCodes.CC_Invalid,
				);
		}
	}

}
