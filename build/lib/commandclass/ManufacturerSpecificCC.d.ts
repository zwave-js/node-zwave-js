/// <reference types="node" />
import { IDriver } from "../driver/IDriver";
import { CommandClass } from "./CommandClass";
export declare enum ManufacturerSpecificCommand {
    Get = 4,
    Report = 5
}
export declare class ManufacturerSpecificCC extends CommandClass {
    nodeId: number;
    ccCommand?: ManufacturerSpecificCommand;
    constructor(driver: IDriver, nodeId?: number);
    constructor(driver: IDriver, nodeId: number, ccCommand: ManufacturerSpecificCommand.Get);
    manufacturerId: number;
    productType: number;
    productId: number;
    serialize(): Buffer;
    deserialize(data: Buffer): void;
}
