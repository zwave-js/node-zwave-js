import { CommandClasses } from "@zwave-js/core/safe";
import { CommandClass } from "../lib/CommandClass";
import {
	CCCommand,
	commandClass,
	implementedVersion,
} from "../lib/CommandClassDecorators";
import { HailCommand } from "../lib/_Types";

// Decorators are applied in the reverse source order, so for @CCCommand to work,
// it must come before @commandClass
@CCCommand(HailCommand.Hail)
@commandClass(CommandClasses.Hail)
@implementedVersion(1)
export class HailCC extends CommandClass {
	declare ccCommand: HailCommand.Hail;
}
