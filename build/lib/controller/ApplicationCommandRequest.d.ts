/// <reference types="node" />
import { CommandClass } from "../commandclass/CommandClass";
import { ICommandClassContainer } from "../commandclass/ICommandClassContainer";
import { Message } from "../message/Message";
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
