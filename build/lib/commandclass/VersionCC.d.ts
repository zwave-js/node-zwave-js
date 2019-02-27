/// <reference types="node" />
import { SendDataRequest } from "../controller/SendDataMessages";
import { ZWaveLibraryTypes } from "../controller/ZWaveLibraryTypes";
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
    constructor(nodeId?: number);
    constructor(nodeId: number, command: VersionCommand.Get);
    constructor(nodeId: number, command: VersionCommand.CommandClassGet, requestedCC: CommandClasses);
    private _libraryType;
    readonly libraryType: ZWaveLibraryTypes;
    private _protocolVersion;
    readonly protocolVersion: string;
    private _applicationVersion;
    readonly applicationVersion: string;
    private _ccVersion;
    readonly ccVersion: number;
    serialize(): Buffer;
    deserialize(data: Buffer): void;
    /** Requests static or dynamic state for a given from a node */
    static createStateRequest(node: ZWaveNode, kind: StateKind): SendDataRequest | void;
}
