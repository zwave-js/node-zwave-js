import {
	CCCommand,
	CommandClass,
	commandClass,
	implementedVersion,
} from "./CommandClass";
import { CommandClasses } from "./CommandClasses";

export enum DeviceResetLocallyCommand {
	Notification = 0x01,
}

// @noAPI: We can only receive this command
// @noInterview: We can only receive this command

@commandClass(CommandClasses["Device Reset Locally"])
@implementedVersion(1)
export class DeviceResetLocallyCC extends CommandClass {
	declare ccCommand: DeviceResetLocallyCommand;
}

@CCCommand(DeviceResetLocallyCommand.Notification)
export class DeviceResetLocallyCCNotification extends DeviceResetLocallyCC {}
