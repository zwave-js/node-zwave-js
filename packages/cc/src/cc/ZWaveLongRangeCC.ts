import { CommandClasses } from "@zwave-js/core";
import { Bytes } from "@zwave-js/shared/safe";
import { CommandClass } from "../lib/CommandClass";
import {
	commandClass,
	implementedVersion,
} from "../lib/CommandClassDecorators";

@commandClass(CommandClasses["Z-Wave Long Range"])
@implementedVersion(1)
export class ZWaveLongRangeCC extends CommandClass {
	// declare ccCommand: ZWaveLongRangeCommand;
}
