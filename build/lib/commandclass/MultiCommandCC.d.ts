/// <reference types="node" />
import { IDriver } from "../driver/IDriver";
import { CommandClass } from "./CommandClass";
export declare enum MultiCommandCommand {
    CommandEncapsulation = 1
}
export declare class MultiCommandCC extends CommandClass {
    nodeId: number;
    ccCommand?: MultiCommandCommand;
    commands?: CommandClass[];
    constructor(driver: IDriver, nodeId?: number);
    constructor(driver: IDriver, nodeId: number, ccCommand: MultiCommandCommand.CommandEncapsulation, commands: CommandClass[]);
    serialize(): Buffer;
    deserialize(data: Buffer): void;
}
