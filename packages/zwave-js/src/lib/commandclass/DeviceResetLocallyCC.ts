import { CommandClasses } from "@zwave-js/core";
import {
	CCCommand,
	CommandClass,
	commandClass,
	implementedVersion,
} from "./CommandClass";
import { DeviceResetLocallyCommand } from "./_Types";

// @noAPI: We can only receive this command
// @noInterview: We can only receive this command

@commandClass(CommandClasses["Device Reset Locally"])
@implementedVersion(1)
export class DeviceResetLocallyCC extends CommandClass {
	declare ccCommand: DeviceResetLocallyCommand;
	// Force singlecast
	declare nodeId: number;
}

@CCCommand(DeviceResetLocallyCommand.Notification)
export class DeviceResetLocallyCCNotification extends DeviceResetLocallyCC {}
