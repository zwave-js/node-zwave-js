/// <reference types="node" />
import { SendDataRequest } from "../controller/SendDataMessages";
import { ZWaveLibraryTypes } from "../controller/ZWaveLibraryTypes";
import { IDriver } from "../driver/IDriver";
import { ZWaveNode } from "../node/Node";
import { CommandClass, CommandClasses, StateKind } from "./CommandClass";
export declare enum VersionCommand {
    Get = 17,
    Report = 18,
    CommandClassGet = 19,
    CommandClassReport = 20
}
export declare class VersionCC extends CommandClass {
    nodeId: number;
    versionCommand?: VersionCommand;
    requestedCC?: CommandClasses;
    constructor(driver: IDriver, nodeId?: number);
    constructor(driver: IDriver, nodeId: number, command: VersionCommand.Get);
    constructor(driver: IDriver, nodeId: number, command: VersionCommand.CommandClassGet, requestedCC: CommandClasses);
    libraryType: ZWaveLibraryTypes;
    protocolVersion: string;
    applicationVersion: string;
    private _ccVersion;
    readonly ccVersion: number;
    serialize(): Buffer;
    deserialize(data: Buffer): void;
    /** Requests static or dynamic state for a given from a node */
    static createStateRequest(driver: IDriver, node: ZWaveNode, kind: StateKind): SendDataRequest | void;
}
