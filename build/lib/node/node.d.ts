import { Driver } from "../driver/Driver";
export declare enum QueryStage {
    None = 0,
    ProtocolInfo = 1,
    Probe = 2,
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
export declare class Node {
    readonly id: number;
    private readonly driver;
    constructor(id: number, driver: Driver);
    queryStage: QueryStage;
    beginQuery(): void;
}
