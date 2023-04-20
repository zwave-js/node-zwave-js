/// <reference types="node" />
import { CommandClasses, Maybe, MessageOrCCLogEntry, SupervisionResult } from "@zwave-js/core/safe";
import type { ZWaveApplicationHost, ZWaveHost } from "@zwave-js/host/safe";
import { PhysicalCCAPI, PollValueImplementation, POLL_VALUE, SetValueImplementation, SET_VALUE } from "../lib/API";
import { CommandClass, type CCCommandOptions, type CommandClassDeserializationOptions } from "../lib/CommandClass";
import { LockCommand } from "../lib/_Types";
export declare const LockCCValues: Readonly<{
    locked: {
        readonly id: {
            commandClass: CommandClasses.Lock;
            property: "locked";
        };
        readonly endpoint: (endpoint?: number | undefined) => {
            readonly commandClass: CommandClasses.Lock;
            readonly endpoint: number;
            readonly property: "locked";
        };
        readonly is: (valueId: import("@zwave-js/core/safe").ValueID) => boolean;
        readonly meta: {
            readonly label: "Locked";
            readonly description: "Whether the lock is locked";
            readonly type: "boolean";
            readonly readable: true;
            readonly writeable: true;
        };
        readonly options: {
            readonly internal: false;
            readonly minVersion: 1;
            readonly secret: false;
            readonly stateful: true;
            readonly supportsEndpoints: true;
            readonly autoCreate: true;
        };
    };
}>;
export declare class LockCCAPI extends PhysicalCCAPI {
    supportsCommand(cmd: LockCommand): Maybe<boolean>;
    get(): Promise<boolean | undefined>;
    /**
     * Locks or unlocks the lock
     * @param locked Whether the lock should be locked
     */
    set(locked: boolean): Promise<SupervisionResult | undefined>;
    protected [SET_VALUE]: SetValueImplementation;
    protected [POLL_VALUE]: PollValueImplementation;
}
export declare class LockCC extends CommandClass {
    ccCommand: LockCommand;
    interview(applHost: ZWaveApplicationHost): Promise<void>;
    refreshValues(applHost: ZWaveApplicationHost): Promise<void>;
}
interface LockCCSetOptions extends CCCommandOptions {
    locked: boolean;
}
export declare class LockCCSet extends LockCC {
    constructor(host: ZWaveHost, options: CommandClassDeserializationOptions | LockCCSetOptions);
    locked: boolean;
    serialize(): Buffer;
    toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry;
}
export declare class LockCCReport extends LockCC {
    constructor(host: ZWaveHost, options: CommandClassDeserializationOptions);
    readonly locked: boolean;
    toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry;
}
export declare class LockCCGet extends LockCC {
}
export {};
//# sourceMappingURL=LockCC.d.ts.map