import { CommandClass } from "./CommandClass";

export interface ICommandClassContainer {
	command: CommandClass;
}

export function isCommandClassContainer(msg: any): msg is ICommandClassContainer {
	return typeof msg.command !== "undefined" && msg.command instanceof CommandClass;
}
