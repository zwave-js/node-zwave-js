import { IDriver } from "../driver/IDriver";
import { CommandClass } from "./CommandClass";
export declare enum DeviceResetLocallyCommand {
    Notification = 1
}
export declare class DeviceResetLocallyCC extends CommandClass {
    nodeId: number;
    ccCommand?: DeviceResetLocallyCommand;
    constructor(driver: IDriver, nodeId?: number);
}
