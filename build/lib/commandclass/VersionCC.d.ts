/// <reference types="node" />
import { CommandClass, CommandClasses } from "./CommandClass";
export declare enum VersionCommand {
    Get = 17,
    Report = 18,
    CommandClassGet = 19,
    CommandClassReport = 20,
}
export declare enum ZWaveLibraryTypes {
    "Unknown" = 0,
    "Static Controller" = 1,
    "Controller" = 2,
    "Enhanced Slave" = 3,
    "Slave" = 4,
    "Installer" = 5,
    "Routing Slave" = 6,
    "Bridge Controller" = 7,
    "Device under Test" = 8,
    "N/A" = 9,
    "AV Remote" = 10,
    "AV Device" = 11,
}
export declare class VersionCC extends CommandClass {
    nodeId: number;
    versionCommand: VersionCommand;
    requestedCC: CommandClasses;
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
}
