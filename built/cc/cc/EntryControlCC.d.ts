/// <reference types="node" />
import { CommandClasses, Maybe, MessageOrCCLogEntry, SupervisionResult } from "@zwave-js/core/safe";
import type { ZWaveApplicationHost, ZWaveHost } from "@zwave-js/host/safe";
import { CCAPI, PollValueImplementation, POLL_VALUE, SetValueImplementation, SET_VALUE } from "../lib/API";
import { CommandClass, type CCCommandOptions, type CommandClassDeserializationOptions } from "../lib/CommandClass";
import { EntryControlCommand, EntryControlDataTypes, EntryControlEventTypes } from "../lib/_Types";
export declare const EntryControlCCValues: Readonly<{
    supportedKeys: {
        readonly id: {
            commandClass: (typeof CommandClasses)["Entry Control"];
            property: "supportedKeys";
        };
        readonly endpoint: (endpoint?: number | undefined) => {
            readonly commandClass: (typeof CommandClasses)["Entry Control"];
            readonly endpoint: number;
            readonly property: "supportedKeys";
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
    supportedEventTypes: {
        readonly id: {
            commandClass: (typeof CommandClasses)["Entry Control"];
            property: "supportedEventTypes";
        };
        readonly endpoint: (endpoint?: number | undefined) => {
            readonly commandClass: (typeof CommandClasses)["Entry Control"];
            readonly endpoint: number;
            readonly property: "supportedEventTypes";
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
    supportedDataTypes: {
        readonly id: {
            commandClass: (typeof CommandClasses)["Entry Control"];
            property: "supportedDataTypes";
        };
        readonly endpoint: (endpoint?: number | undefined) => {
            readonly commandClass: (typeof CommandClasses)["Entry Control"];
            readonly endpoint: number;
            readonly property: "supportedDataTypes";
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
    keyCacheTimeout: {
        readonly id: {
            commandClass: (typeof CommandClasses)["Entry Control"];
            property: "keyCacheTimeout";
        };
        readonly endpoint: (endpoint?: number | undefined) => {
            readonly commandClass: (typeof CommandClasses)["Entry Control"];
            readonly endpoint: number;
            readonly property: "keyCacheTimeout";
        };
        readonly is: (valueId: import("@zwave-js/core/safe").ValueID) => boolean;
        readonly meta: {
            readonly label: "Key cache timeout";
            readonly unit: "seconds";
            readonly description: "How long the key cache must wait for additional characters";
            readonly min: 1;
            readonly max: 10;
            readonly type: "number";
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
    keyCacheSize: {
        readonly id: {
            commandClass: (typeof CommandClasses)["Entry Control"];
            property: "keyCacheSize";
        };
        readonly endpoint: (endpoint?: number | undefined) => {
            readonly commandClass: (typeof CommandClasses)["Entry Control"];
            readonly endpoint: number;
            readonly property: "keyCacheSize";
        };
        readonly is: (valueId: import("@zwave-js/core/safe").ValueID) => boolean;
        readonly meta: {
            readonly label: "Key cache size";
            readonly description: "Number of character that must be stored before sending";
            readonly min: 1;
            readonly max: 32;
            readonly type: "number";
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
export declare class EntryControlCCAPI extends CCAPI {
    supportsCommand(cmd: EntryControlCommand): Maybe<boolean>;
    getSupportedKeys(): Promise<readonly number[] | undefined>;
    getEventCapabilities(): Promise<Pick<EntryControlCCEventSupportedReport, "supportedDataTypes" | "supportedEventTypes" | "minKeyCacheSize" | "maxKeyCacheSize" | "minKeyCacheTimeout" | "maxKeyCacheTimeout"> | undefined>;
    getConfiguration(): Promise<Pick<EntryControlCCConfigurationReport, "keyCacheSize" | "keyCacheTimeout"> | undefined>;
    setConfiguration(keyCacheSize: number, keyCacheTimeout: number): Promise<SupervisionResult | undefined>;
    protected [SET_VALUE]: SetValueImplementation;
    protected [POLL_VALUE]: PollValueImplementation;
}
export declare class EntryControlCC extends CommandClass {
    ccCommand: EntryControlCommand;
    interview(applHost: ZWaveApplicationHost): Promise<void>;
    refreshValues(applHost: ZWaveApplicationHost): Promise<void>;
}
export declare class EntryControlCCNotification extends EntryControlCC {
    constructor(host: ZWaveHost, options: CommandClassDeserializationOptions);
    readonly sequenceNumber: number;
    readonly dataType: EntryControlDataTypes;
    readonly eventType: EntryControlEventTypes;
    readonly eventData?: Buffer | string;
    toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry;
}
export declare class EntryControlCCKeySupportedReport extends EntryControlCC {
    constructor(host: ZWaveHost, options: CommandClassDeserializationOptions);
    readonly supportedKeys: readonly number[];
    toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry;
}
export declare class EntryControlCCKeySupportedGet extends EntryControlCC {
}
export declare class EntryControlCCEventSupportedReport extends EntryControlCC {
    constructor(host: ZWaveHost, options: CommandClassDeserializationOptions);
    persistValues(applHost: ZWaveApplicationHost): boolean;
    readonly supportedDataTypes: readonly EntryControlDataTypes[];
    readonly supportedEventTypes: readonly EntryControlEventTypes[];
    readonly minKeyCacheSize: number;
    readonly maxKeyCacheSize: number;
    readonly minKeyCacheTimeout: number;
    readonly maxKeyCacheTimeout: number;
    toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry;
}
export declare class EntryControlCCEventSupportedGet extends EntryControlCC {
}
export declare class EntryControlCCConfigurationReport extends EntryControlCC {
    constructor(host: ZWaveHost, options: CommandClassDeserializationOptions);
    readonly keyCacheSize: number;
    readonly keyCacheTimeout: number;
    toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry;
}
export declare class EntryControlCCConfigurationGet extends EntryControlCC {
}
interface EntryControlCCConfigurationSetOptions extends CCCommandOptions {
    keyCacheSize: number;
    keyCacheTimeout: number;
}
export declare class EntryControlCCConfigurationSet extends EntryControlCC {
    constructor(host: ZWaveHost, options: CommandClassDeserializationOptions | EntryControlCCConfigurationSetOptions);
    readonly keyCacheSize: number;
    readonly keyCacheTimeout: number;
    serialize(): Buffer;
    toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry;
}
export {};
//# sourceMappingURL=EntryControlCC.d.ts.map