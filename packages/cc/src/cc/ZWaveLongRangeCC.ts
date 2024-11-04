import { CommandClasses } from "@zwave-js/core";
import { CommandClass } from "../lib/CommandClass.js";
import {
	commandClass,
	implementedVersion,
} from "../lib/CommandClassDecorators.js";

@commandClass(CommandClasses["Z-Wave Long Range"])
@implementedVersion(1)
export class ZWaveLongRangeCC extends CommandClass {
	// declare ccCommand: ZWaveLongRangeCommand;
}
