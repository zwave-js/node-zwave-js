import { IDriver } from "../driver/IDriver";
import { ZWaveError, ZWaveErrorCodes } from "../error/ZWaveError";
import { CommandClass, commandClass, CommandClasses, expectedCCResponse, implementedVersion } from "./CommandClass";

export enum DeviceResetLocallyCommand {
	Notification = 0x01,
}

@commandClass(CommandClasses["Device Reset Locally"])
@implementedVersion(1)
@expectedCCResponse(CommandClasses["Device Reset Locally"])
export class DeviceResetLocallyCC extends CommandClass {

	// tslint:disable:unified-signatures
	constructor(
		driver: IDriver,
		nodeId?: number,
	);

	constructor(
		driver: IDriver,
		public nodeId: number,
		public ccCommand?: DeviceResetLocallyCommand,
	) {
		super(driver, nodeId, ccCommand);
	}
	// tslint:enable:unified-signatures

}
