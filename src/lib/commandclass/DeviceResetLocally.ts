import { IDriver } from "../driver/IDriver";
import { CommandClass, commandClass, expectedCCResponse, implementedVersion } from "./CommandClass";
import { CommandClasses } from "./CommandClasses";

export enum DeviceResetLocallyCommand {
	Notification = 0x01,
}

@commandClass(CommandClasses["Device Reset Locally"])
@implementedVersion(1)
@expectedCCResponse(CommandClasses["Device Reset Locally"])
export class DeviceResetLocallyCC extends CommandClass {

	// tslint:disable:unified-signatures
	public constructor(
		driver: IDriver,
		nodeId?: number,
	);

	public constructor(
		driver: IDriver,
		public nodeId: number,
		public ccCommand?: DeviceResetLocallyCommand,
	) {
		super(driver, nodeId, ccCommand);
	}
	// tslint:enable:unified-signatures

}
