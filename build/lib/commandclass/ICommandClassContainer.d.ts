import { CommandClass } from "./CommandClass";
export interface ICommandClassContainer {
    command: CommandClass;
}
export declare function isCommandClassContainer<T>(msg: T): msg is T & ICommandClassContainer;
