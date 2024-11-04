import { CommandClasses } from "@zwave-js/core/safe";
import { CommandClass } from "../lib/CommandClass.js";
import {
	CCCommand,
	commandClass,
	implementedVersion,
} from "../lib/CommandClassDecorators.js";
import { HailCommand } from "../lib/_Types.js";

// Decorators are applied in the reverse source order, so for @CCCommand to work,
// it must come before @commandClass
@CCCommand(HailCommand.Hail)
@commandClass(CommandClasses.Hail)
@implementedVersion(1)
export class HailCC extends CommandClass {
	declare ccCommand: HailCommand.Hail;
}
