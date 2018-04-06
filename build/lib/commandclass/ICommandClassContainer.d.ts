import { CommandClass } from "./CommandClass";
export interface ICommandClassContainer {
    command: CommandClass;
}
export declare function isCommandClassContainer(msg: any): msg is ICommandClassContainer;
