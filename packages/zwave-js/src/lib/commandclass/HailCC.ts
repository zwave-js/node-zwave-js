import { CommandClasses } from "@zwave-js/core";
import {
	CCCommand,
	CommandClass,
	commandClass,
	implementedVersion,
} from "./CommandClass";

export enum HailCommand {
	Hail = 0x01,
}

// Decorators are applied in the reverse source order, so for @CCCommand to work,
// it must come before @commandClass
@CCCommand(HailCommand.Hail)
@commandClass(CommandClasses.Hail)
@implementedVersion(1)
export class HailCC extends CommandClass {
	declare ccCommand: HailCommand.Hail;
}
