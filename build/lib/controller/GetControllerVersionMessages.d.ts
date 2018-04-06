/// <reference types="node" />
import { ZWaveLibraryTypes } from "../commandclass/VersionCC";
import { Message } from "../message/Message";
export declare class GetControllerVersionRequest extends Message {
}
export declare class GetControllerVersionResponse extends Message {
    private _controllerType;
    readonly controllerType: ZWaveLibraryTypes;
    private _libraryVersion;
    readonly libraryVersion: string;
    deserialize(data: Buffer): number;
    toJSON(): Record<string, any>;
}
