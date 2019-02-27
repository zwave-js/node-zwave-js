/// <reference types="node" />
import { Driver } from "../driver/Driver";
import { CommandClass } from "./CommandClass";
export declare enum ManufacturerSpecificCommand {
    Get = 4,
    Report = 5
}
export declare class ManufacturerSpecificCC extends CommandClass {
    nodeId: number;
    ccCommand?: ManufacturerSpecificCommand;
    constructor(driver: Driver, nodeId?: number);
    constructor(driver: Driver, nodeId: number, ccCommand: ManufacturerSpecificCommand.Get);
    private _manufacturerId;
    readonly manufacturerId: number;
    private _productType;
    readonly productType: number;
    private _productId;
    readonly productId: number;
    serialize(): Buffer;
    deserialize(data: Buffer): void;
}
