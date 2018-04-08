import { CommandClass, CommandClasses, CommandClassInfo } from "../commandclass/CommandClass";
import { Baudrate } from "../controller/GetNodeProtocolInfoMessages";
import { Driver } from "../driver/Driver";
import { Message } from "../message/Message";
import { DeviceClass } from "./DeviceClass";
/** Finds the ID of the target or source node in a message, if it contains that information */
export declare function getNodeId(msg: Message): number;
export declare class ZWaveNode {
    readonly id: number;
    private readonly driver;
    constructor(id: number, driver: Driver, deviceClass?: DeviceClass, supportedCCs?: CommandClasses[], controlledCCs?: CommandClasses[]);
    private readonly logPrefix;
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
    private _commandClasses;
    readonly commandClasses: Map<CommandClasses, CommandClassInfo>;
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
    interview(): Promise<void>;
    /** Step #1 of the node interview */
    private queryProtocolInfo();
    /** Step #2 of the node interview */
    private ping();
    /** Step #5 of the node interview */
    private getNodeInfo();
    /** Step #9 of the node interview */
    private queryCCVersions();
    /** Handles an ApplicationCommandRequest sent from a node */
    handleCommand(command: CommandClass): Promise<void>;
}
export declare enum InterviewStage {
    None = 0,
    ProtocolInfo = 1,
    Ping = 2,
    WakeUp = 3,
    ManufacturerSpecific1 = 4,
    NodeInfo = 5,
    NodePlusInfo = 6,
    SecurityReport = 7,
    ManufacturerSpecific2 = 8,
    Versions = 9,
    Instances = 10,
    Static = 11,
    CacheLoad = 12,
    Associations = 13,
    Neighbors = 14,
    Session = 15,
    Dynamic = 16,
    Configuration = 17,
    Complete = 18,
}
