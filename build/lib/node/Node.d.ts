/// <reference types="node" />
import { Overwrite } from "alcalzone-shared/types";
import { EventEmitter } from "events";
import { CommandClass, CommandClasses, CommandClassInfo, StateKind } from "../commandclass/CommandClass";
import { Baudrate } from "../controller/GetNodeProtocolInfoMessages";
import { Driver } from "../driver/Driver";
import { BasicDeviceClasses, DeviceClass } from "./DeviceClass";
import { NodeUpdatePayload } from "./NodeInfo";
import { ValueUpdatedArgs } from "./ValueDB";
export declare type ValueUpdatedCallback = (args: ValueUpdatedArgs) => void;
export declare type ZWaveNodeEventCallbacks = Overwrite<{
    [K in "wake up" | "sleep" | "interview completed"]: (node: ZWaveNode) => void;
}, {
    "value updated": ValueUpdatedCallback;
}>;
export declare type ZWaveNodeEvents = Extract<keyof ZWaveNodeEventCallbacks, string>;
export interface ZWaveNode {
    on<TEvent extends ZWaveNodeEvents>(event: TEvent, callback: ZWaveNodeEventCallbacks[TEvent]): this;
    removeListener<TEvent extends ZWaveNodeEvents>(event: TEvent, callback: ZWaveNodeEventCallbacks[TEvent]): this;
    removeAllListeners(event?: ZWaveNodeEvents): this;
}
export declare class ZWaveNode extends EventEmitter {
    readonly id: number;
    private readonly driver;
    constructor(id: number, driver: Driver, deviceClass?: DeviceClass, supportedCCs?: CommandClasses[], controlledCCs?: CommandClasses[]);
    private _deviceClass;
    readonly deviceClass: DeviceClass;
    private _isListening;
    readonly isListening: boolean;
    private _isFrequentListening;
    readonly isFrequentListening: boolean;
    private _isRouting;
    readonly isRouting: boolean;
    private _maxBaudRate;
    readonly maxBaudRate: Baudrate;
    private _isSecure;
    readonly isSecure: boolean;
    private _version;
    readonly version: number;
    private _isBeaming;
    readonly isBeaming: boolean;
    private _implementedCommandClasses;
    readonly implementedCommandClasses: Map<CommandClasses, CommandClassInfo>;
    private nodeInfoReceived;
    private _valueDB;
    /** This tells us which interview stage was last completed */
    interviewStage: InterviewStage;
    isControllerNode(): boolean;
    addCC(cc: CommandClasses, info: Partial<CommandClassInfo>): void;
    /** Tests if this node supports the given CommandClass */
    supportsCC(cc: CommandClasses): boolean;
    /** Tests if this node controls the given CommandClass */
    controlsCC(cc: CommandClasses): boolean;
    /** Checks the supported version of a given CommandClass */
    getCCVersion(cc: CommandClasses): number;
    /** Creates an instance of the given CC linked to this node */
    createCCInstance<T extends CommandClass>(cc: CommandClasses): T;
    interview(): Promise<void>;
    /** Updates this node's interview stage and saves to cache when appropriate */
    private setInterviewStage;
    /** Step #1 of the node interview */
    protected queryProtocolInfo(): Promise<void>;
    /** Step #3 of the node interview */
    protected ping(targetInterviewStage?: InterviewStage): Promise<void>;
    /** Step #5 of the node interview */
    protected queryNodeInfo(): Promise<void>;
    /** Step #6 of the node interview */
    protected queryNodePlusInfo(): Promise<void>;
    protected queryManufacturerSpecific(): Promise<void>;
    /** Step #9 of the node interview */
    protected queryCCVersions(): Promise<void>;
    /** Step #10 of the node interview */
    protected queryEndpoints(): Promise<void>;
    /** Step #2 of the node interview */
    protected configureWakeup(): Promise<void>;
    protected requestStaticValues(): Promise<void>;
    /** Handles an ApplicationCommandRequest sent from a node */
    handleCommand(command: CommandClass): Promise<void>;
    /**
     * Requests the state for the CCs of this node
     * @param kind The kind of state to be requested
     * @param commandClasses The command classes to request the state for. Defaults to all
     */
    requestState(kind: StateKind, commandClasses?: CommandClasses[]): Promise<void>;
    /** Serializes this node in order to store static data in a cache */
    serialize(): {
        id: number;
        interviewStage: string;
        deviceClass: {
            basic: BasicDeviceClasses;
            generic: import("./DeviceClass").GenericDeviceClasses;
            specific: number;
        };
        isListening: boolean;
        isFrequentListening: boolean;
        isRouting: boolean;
        maxBaudRate: Baudrate;
        isSecure: boolean;
        isBeaming: boolean;
        version: number;
        commandClasses: {};
    };
    updateNodeInfo(nodeInfo: NodeUpdatePayload): void;
    deserialize(obj: any): void;
    setAwake(awake: boolean, emitEvent?: boolean): void;
    isAwake(): boolean;
    sendNoMoreInformation(): Promise<boolean>;
}
export declare enum InterviewStage {
    None = 0,
    ProtocolInfo = 1,
    Ping = 2,
    ManufacturerSpecific1 = 3,
    NodeInfo = 4,
    NodePlusInfo = 5,
    SecurityReport = 6,
    ManufacturerSpecific2 = 7,
    Versions = 8,
    Endpoints = 9,
    Static = 10,
    RestartFromCache = 11,
    WakeUp = 12,
    Associations = 13,
    Neighbors = 14,
    Session = 15,
    Dynamic = 16,
    Configuration = 17,
    Complete = 18
}
