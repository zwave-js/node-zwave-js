/// <reference types="node" />
import { SendDataRequest } from "../controller/SendDataMessages";
import { ZWaveLibraryTypes } from "../controller/ZWaveLibraryTypes";
import { IDriver } from "../driver/IDriver";
import { ZWaveNode } from "../node/Node";
import { CommandClass, CommandClasses, StateKind } from "./CommandClass";
import { FeatureSupport } from "./FeatureSupport";
export declare enum VersionCommand {
    Get = 17,
    Report = 18,
    CommandClassGet = 19,
    CommandClassReport = 20,
    CapabilitiesGet = 21,
    CapabilitiesReport = 22,
    ZWaveSoftwareGet = 23,
    ZWaveSoftwareReport = 24
}
export declare class VersionCC extends CommandClass {
    nodeId: number;
    versionCommand?: VersionCommand;
    requestedCC?: CommandClasses;
    constructor(driver: IDriver, nodeId?: number);
    constructor(driver: IDriver, nodeId: number, command: VersionCommand.Get | VersionCommand.CapabilitiesGet | VersionCommand.ZWaveSoftwareGet);
    constructor(driver: IDriver, nodeId: number, command: VersionCommand.CommandClassGet, requestedCC: CommandClasses);
    libraryType: ZWaveLibraryTypes;
    protocolVersion: string;
    firmwareVersions: string[];
    hardwareVersion: number;
    sdkVersion: string;
    applicationFrameworkAPIVersion: string;
    applicationFrameworkBuildNumber: number;
    hostInterfaceVersion: string;
    hostInterfaceBuildNumber: number;
    zWaveProtocolVersion: string;
    zWaveProtocolBuildNumber: number;
    applicationVersion: string;
    applicationBuildNumber: number;
    supportsCommand(cmd: VersionCommand): FeatureSupport;
    private _supportsZWaveSoftwareGet;
    private _ccVersion;
    readonly ccVersion: number;
    serialize(): Buffer;
    deserialize(data: Buffer): void;
    /** Requests static or dynamic state for a given from a node */
    static createStateRequest(driver: IDriver, node: ZWaveNode, kind: StateKind): SendDataRequest | void;
}
