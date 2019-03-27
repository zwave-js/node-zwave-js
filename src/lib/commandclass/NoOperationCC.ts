import { IDriver } from "../driver/IDriver";
import { CommandClass, commandClass, CommandClasses, implementedVersion } from "./CommandClass";

@commandClass(CommandClasses["No Operation"])
@implementedVersion(1)
export class NoOperationCC extends CommandClass {

	public constructor(
		driver: IDriver,
		nodeId: number,
	) {
		super(driver, nodeId);
	}

}
