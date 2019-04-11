/// <reference types="node" />
import { SetbackState } from "./SetbackState";
export interface Switchpoint {
    hour: number;
    minute: number;
    state: SetbackState;
}
export declare function decodeSwitchpoint(data: Buffer): Switchpoint;
export declare function encodeSwitchpoint(point: Switchpoint): Buffer;
