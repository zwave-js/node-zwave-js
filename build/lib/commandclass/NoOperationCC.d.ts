/// <reference types="node" />
import { CommandClass } from "./CommandClass";
export declare class NoOperationCC extends CommandClass {
    static readonly maxSupportedVersion: number;
    serialize(): Buffer;
    deserialize(data: Buffer): void;
}
