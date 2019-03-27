/// <reference types="node" />
import { IDriver } from "../driver/IDriver";
import { CommandClass } from "./CommandClass";
export declare enum CentralSceneCommand {
    SupportedGet = 1,
    SupportedReport = 2,
    Notification = 3,
    ConfigurationSet = 4,
    ConfigurationGet = 5,
    ConfigurationReport = 6
}
export declare enum CentralSceneKeys {
    KeyPressed = 0,
    KeyReleased = 1,
    KeyHeldDown = 2,
    KeyPressed2x = 3,
    KeyPressed3x = 4,
    KeyPressed4x = 5,
    KeyPressed5x = 6
}
export declare class CentralSceneCC extends CommandClass {
    nodeId: number;
    ccCommand?: CentralSceneCommand;
    constructor(driver: IDriver, nodeId?: number);
    constructor(driver: IDriver, nodeId: number, command: CentralSceneCommand.SupportedGet | CentralSceneCommand.ConfigurationGet);
    constructor(driver: IDriver, nodeId: number, command: CentralSceneCommand.ConfigurationSet, slowRefresh: boolean);
    slowRefresh: boolean;
    supportsSlowRefresh: boolean;
    private _sequenceNumber;
    readonly sequenceNumber: number;
    private _keyAttribute;
    readonly keyAttribute: CentralSceneKeys;
    sceneCount: number;
    private _supportedKeyAttributes;
    private _keyAttributesIdenticalSupport;
    supportsKeyAttribute(sceneNumber: number, keyAttribute: CentralSceneKeys): boolean;
    private _sceneNumber;
    readonly sceneNumber: number;
    serialize(): Buffer;
    deserialize(data: Buffer): void;
    toJSON(): Record<string, any>;
}
