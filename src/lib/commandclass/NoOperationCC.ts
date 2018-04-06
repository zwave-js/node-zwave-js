import { CommandClass, commandClass, CommandClasses } from "./CommandClass";

@commandClass(CommandClasses["No Operation"])
export class NoOperationCC extends CommandClass {

	public static readonly maxSupportedVersion: number = 1;

	public serialize(): Buffer {
		// define this.payload
		return super.serialize();
	}

	public deserialize(data: Buffer): void {
		super.deserialize(data);
		// parse this.payload
	}

}
