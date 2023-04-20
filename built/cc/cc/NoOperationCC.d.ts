import type { Message } from "@zwave-js/serial";
import { PhysicalCCAPI } from "../lib/API";
import { CommandClass } from "../lib/CommandClass";
export declare class NoOperationCCAPI extends PhysicalCCAPI {
    send(): Promise<void>;
}
export declare class NoOperationCC extends CommandClass {
    ccCommand: undefined;
}
/**
 * @publicAPI
 * Tests if a given message is a ping
 */
export declare function messageIsPing<T extends Message>(msg: T): msg is T & {
    command: NoOperationCC;
};
//# sourceMappingURL=NoOperationCC.d.ts.map