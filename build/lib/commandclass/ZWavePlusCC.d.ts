/// <reference types="node" />
import { IDriver } from "../driver/IDriver";
import { CommandClass } from "./CommandClass";
export declare enum ZWavePlusCommand {
    Get = 1,
    Report = 2
}
export declare enum ZWavePlusRoleType {
    CentralStaticController = 0,
    SubStaticController = 1,
    PortableController = 2,
    PortableReportingController = 3,
    PortableSlave = 4,
    AlwaysOnSlave = 5,
    SleepingReportingSlave = 6,
    SleepingListeningSlave = 7
}
export declare enum ZWavePlusNodeType {
    Node = 0,
    IPGateway = 2
}
export declare class ZWavePlusCC extends CommandClass {
    nodeId: number;
    ccCommand?: ZWavePlusCommand;
    constructor(driver: IDriver, nodeId?: number);
    constructor(driver: IDriver, nodeId: number, command: ZWavePlusCommand.Get);
    private _version;
    readonly version: number;
    private _nodeType;
    readonly nodeType: ZWavePlusNodeType;
    private _roleType;
    readonly roleType: ZWavePlusRoleType;
    private _installerIcon;
    readonly installerIcon: number;
    private _userIcon;
    readonly userIcon: number;
    serialize(): Buffer;
    deserialize(data: Buffer): void;
}
