import { CommandClass } from "./CommandClass";

export interface ICommandClassContainer {
	command: CommandClass;
}

/**
 * Tests if the given message contains a CC
 */
export function isCommandClassContainer<T>(
	msg: T | undefined,
): msg is T & ICommandClassContainer {
	return (msg as any)?.command instanceof CommandClass;
}
