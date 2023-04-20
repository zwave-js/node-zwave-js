import { CommandClass } from "./CommandClass";
export interface ICommandClassContainer {
    command: CommandClass;
}
/**
 * Tests if the given message contains a CC
 */
export declare function isCommandClassContainer<T>(msg: T | undefined): msg is T & ICommandClassContainer;
//# sourceMappingURL=ICommandClassContainer.d.ts.map