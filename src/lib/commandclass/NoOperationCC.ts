import { IDriver } from "../driver/IDriver";
import { CommandClass, commandClass, implementedVersion } from "./CommandClass";
import { CommandClasses } from "./CommandClasses";

@commandClass(CommandClasses["No Operation"])
@implementedVersion(1)
export class NoOperationCC extends CommandClass {
	public constructor(driver: IDriver, nodeId: number) {
		super(driver, nodeId);
	}
}
