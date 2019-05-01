import { CommandClass } from "./CommandClass";

export interface ICommandClassContainer {
	command: CommandClass;
}

export function isCommandClassContainer<T>(
	msg: T | undefined,
): msg is T & ICommandClassContainer {
	return msg != undefined && (msg as any).command instanceof CommandClass;
}
