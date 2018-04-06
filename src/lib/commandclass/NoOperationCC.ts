import { CommandClass, commandClass, CommandClasses, implementedVersion } from "./CommandClass";

@commandClass(CommandClasses["No Operation"])
@implementedVersion(1)
export class NoOperationCC extends CommandClass {

	public serialize(): Buffer {
		// define this.payload
		return super.serialize();
	}

	public deserialize(data: Buffer): void {
		super.deserialize(data);
		// parse this.payload
	}

}
