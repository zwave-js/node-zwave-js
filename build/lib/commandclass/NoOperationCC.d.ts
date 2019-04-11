import { IDriver } from "../driver/IDriver";
import { CommandClass } from "./CommandClass";
export declare class NoOperationCC extends CommandClass {
    constructor(driver: IDriver, nodeId: number);
}
