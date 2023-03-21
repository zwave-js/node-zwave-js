/// <reference types="node" />
import { CommandClasses, Maybe, MessageOrCCLogEntry } from "@zwave-js/core/safe";
import type { ZWaveApplicationHost, ZWaveHost } from "@zwave-js/host/safe";
import { PhysicalCCAPI } from "../lib/API";
import { CommandClass, type CCCommandOptions, type CommandClassDeserializationOptions } from "../lib/CommandClass";
import { DoorLockLoggingCommand, DoorLockLoggingRecord } from "../lib/_Types";
export declare const DoorLockLoggingCCValues: Readonly<{
    recordsCount: {
        readonly id: {
            commandClass: (typeof CommandClasses)["Door Lock Logging"];
            property: "recordsCount";
        };
        readonly endpoint: (endpoint?: number | undefined) => {
            readonly commandClass: (typeof CommandClasses)["Door Lock Logging"];
            readonly endpoint: number;
            readonly property: "recordsCount";
        };
        readonly is: (valueId: import("@zwave-js/core/safe").ValueID) => boolean;
        readonly meta: {
            readonly type: "any";
            readonly readable: true;
            readonly writeable: true;
        };
        readonly options: {
            readonly stateful: true;
            readonly secret: false;
            readonly minVersion: 1;
            readonly supportsEndpoints: true;
            readonly autoCreate: true;
            readonly internal: true;
        };
    };
}>;
export declare class DoorLockLoggingCCAPI extends PhysicalCCAPI {
    supportsCommand(cmd: DoorLockLoggingCommand): Maybe<boolean>;
    getRecordsCount(): Promise<number | undefined>;
    /** Retrieves the specified audit record. Defaults to the latest one. */
    getRecord(recordNumber?: number): Promise<DoorLockLoggingRecord | undefined>;
}
export declare class DoorLockLoggingCC extends CommandClass {
    ccCommand: DoorLockLoggingCommand;
    interview(applHost: ZWaveApplicationHost): Promise<void>;
    refreshValues(applHost: ZWaveApplicationHost): Promise<void>;
}
export declare class DoorLockLoggingCCRecordsSupportedReport extends DoorLockLoggingCC {
    constructor(host: ZWaveHost, options: CommandClassDeserializationOptions);
    readonly recordsCount: number;
    toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry;
}
export declare class DoorLockLoggingCCRecordsSupportedGet extends DoorLockLoggingCC {
}
export declare class DoorLockLoggingCCRecordReport extends DoorLockLoggingCC {
    constructor(host: ZWaveHost, options: CommandClassDeserializationOptions);
    readonly recordNumber: number;
    readonly record?: DoorLockLoggingRecord;
    toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry;
}
interface DoorLockLoggingCCRecordGetOptions extends CCCommandOptions {
    recordNumber: number;
}
export declare class DoorLockLoggingCCRecordGet extends DoorLockLoggingCC {
    constructor(host: ZWaveHost, options: CommandClassDeserializationOptions | DoorLockLoggingCCRecordGetOptions);
    recordNumber: number;
    serialize(): Buffer;
    toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry;
}
export {};
//# sourceMappingURL=DoorLockLoggingCC.d.ts.map