/// <reference types="node" />
import { IDriver } from "../driver/IDriver";
import { Maybe } from "../values/Primitive";
import { CommandClass } from "./CommandClass";
export declare enum ManufacturerSpecificCommand {
    Get = 4,
    Report = 5,
    DeviceSpecificGet = 6,
    DeviceSpecificReport = 7
}
export declare enum DeviceIdType {
    FactoryDefault = 0,
    SerialNumber = 1,
    PseudoRandom = 2
}
export declare class ManufacturerSpecificCC extends CommandClass {
    nodeId: number;
    ccCommand?: ManufacturerSpecificCommand;
    constructor(driver: IDriver, nodeId?: number);
    constructor(driver: IDriver, nodeId: number, ccCommand: ManufacturerSpecificCommand.Get);
    constructor(driver: IDriver, nodeId: number, ccCommand: ManufacturerSpecificCommand.DeviceSpecificGet, deviceIdType: DeviceIdType);
    manufacturerId: number;
    productType: number;
    productId: number;
    deviceIdType: DeviceIdType;
    deviceId: string;
    supportsCommand(cmd: ManufacturerSpecificCommand): Maybe<boolean>;
    serialize(): Buffer;
    deserialize(data: Buffer): void;
}
