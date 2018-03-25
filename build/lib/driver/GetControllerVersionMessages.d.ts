/// <reference types="node" />
import { Frame } from "../frame/Frame";
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
export declare class GetControllerVersionRequest extends Frame {
}
export declare class GetControllerVersionResponse extends Frame {
    controllerType: ControllerTypes;
    controllerVersion: string;
    deserialize(data: Buffer): number;
}
