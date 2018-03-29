/// <reference types="node" />
import { Message } from "../message/Message";
export declare enum ControllerTypes {
    "Unknown" = 0,
    "Static Controller" = 1,
    "Controller" = 2,
    "Enhanced Slave" = 3,
    "Slave" = 4,
    "Installer" = 5,
    "Routing Slave" = 6,
    "Bridge Controller" = 7,
    "Device under Test" = 8,
}
export declare class GetControllerVersionRequest extends Message {
}
export declare class GetControllerVersionResponse extends Message {
    private _controllerType;
    readonly controllerType: ControllerTypes;
    private _libraryVersion;
    readonly libraryVersion: string;
    deserialize(data: Buffer): number;
}
