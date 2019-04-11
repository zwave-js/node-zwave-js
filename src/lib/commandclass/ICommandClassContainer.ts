import { CommandClass } from "./CommandClass";

export interface ICommandClassContainer {
	command: CommandClass;
}

export function isCommandClassContainer<T>(
	msg: T,
): msg is T & ICommandClassContainer {
	return (msg as any).command instanceof CommandClass;
}
