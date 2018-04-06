/// <reference types="node" />
import { Message } from "../message/Message";
import { CommandClass } from "./CommandClass";
import { ICommandClassContainer } from "./ICommandClassContainer";
export declare class ApplicationCommandRequest extends Message implements ICommandClassContainer {
    private _routedBusy;
    readonly routedBusy: boolean;
    private _isBroadcast;
    readonly isBroadcast: boolean;
    private _command;
    readonly command: CommandClass;
    serialize(): Buffer;
    deserialize(data: Buffer): number;
}
