import {
	CCCommand,
	CommandClass,
	commandClass,
	expectedCCResponse,
	implementedVersion,
} from "./CommandClass";
import { CommandClasses } from "./CommandClasses";

export enum DeviceResetLocallyCommand {
	Notification = 0x01,
}

@commandClass(CommandClasses["Device Reset Locally"])
@implementedVersion(1)
@expectedCCResponse(CommandClasses["Device Reset Locally"])
export class DeviceResetLocallyCC extends CommandClass {
	public ccCommand: DeviceResetLocallyCommand;
}

@CCCommand(DeviceResetLocallyCommand.Notification)
export class DeviceResetLocallyCCNotification extends DeviceResetLocallyCC {}
