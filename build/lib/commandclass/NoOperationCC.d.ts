/// <reference types="node" />
import { CommandClass } from "./CommandClass";
export declare class NoOperationCC extends CommandClass {
    serialize(): Buffer;
    deserialize(data: Buffer): void;
}
