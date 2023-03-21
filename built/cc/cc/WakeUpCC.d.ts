/// <reference types="node" />
import { CommandClasses, Maybe, MessageOrCCLogEntry, SupervisionResult } from "@zwave-js/core/safe";
import type { ZWaveApplicationHost, ZWaveHost } from "@zwave-js/host/safe";
import { CCAPI, POLL_VALUE, SET_VALUE, type PollValueImplementation, type SetValueImplementation } from "../lib/API";
import { CommandClass, type CCCommandOptions, type CommandClassDeserializationOptions } from "../lib/CommandClass";
import { WakeUpCommand } from "../lib/_Types";
export declare const WakeUpCCValues: Readonly<{
    wakeUpOnDemandSupported: {
        readonly id: {
            commandClass: (typeof CommandClasses)["Wake Up"];
            property: "wakeUpOnDemandSupported";
        };
        readonly endpoint: (endpoint?: number | undefined) => {
            readonly commandClass: (typeof CommandClasses)["Wake Up"];
            readonly endpoint: number;
            readonly property: "wakeUpOnDemandSupported";
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
            readonly autoCreate: true;
            readonly internal: true;
            readonly supportsEndpoints: false;
            readonly minVersion: number;
        };
    };
    wakeUpInterval: {
        readonly id: {
            commandClass: (typeof CommandClasses)["Wake Up"];
            property: "wakeUpInterval";
        };
        readonly endpoint: (endpoint?: number | undefined) => {
            readonly commandClass: (typeof CommandClasses)["Wake Up"];
            readonly endpoint: number;
            readonly property: "wakeUpInterval";
        };
        readonly is: (valueId: import("@zwave-js/core/safe").ValueID) => boolean;
        readonly meta: {
            readonly label: "Wake Up interval";
            readonly min: 0;
            readonly max: 16777215;
            readonly type: "number";
            readonly readable: true;
            readonly writeable: true;
        };
        readonly options: {
            readonly internal: false;
            readonly stateful: true;
            readonly secret: false;
            readonly minVersion: 1;
            readonly autoCreate: true;
            readonly supportsEndpoints: false;
        };
    };
    controllerNodeId: {
        readonly id: {
            commandClass: (typeof CommandClasses)["Wake Up"];
            property: "controllerNodeId";
        };
        readonly endpoint: (endpoint?: number | undefined) => {
            readonly commandClass: (typeof CommandClasses)["Wake Up"];
            readonly endpoint: number;
            readonly property: "controllerNodeId";
        };
        readonly is: (valueId: import("@zwave-js/core/safe").ValueID) => boolean;
        readonly meta: {
            readonly label: "Node ID of the controller";
            readonly writeable: false;
            readonly type: "any";
            readonly readable: true;
        };
        readonly options: {
            readonly internal: false;
            readonly stateful: true;
            readonly secret: false;
            readonly minVersion: 1;
            readonly autoCreate: true;
            readonly supportsEndpoints: false;
        };
    };
}>;
export declare class WakeUpCCAPI extends CCAPI {
    supportsCommand(cmd: WakeUpCommand): Maybe<boolean>;
    protected [SET_VALUE]: SetValueImplementation;
    protected [POLL_VALUE]: PollValueImplementation;
    getInterval(): Promise<Pick<WakeUpCCIntervalReport, "controllerNodeId" | "wakeUpInterval"> | undefined>;
    getIntervalCapabilities(): Promise<Pick<WakeUpCCIntervalCapabilitiesReport, "wakeUpOnDemandSupported" | "defaultWakeUpInterval" | "minWakeUpInterval" | "maxWakeUpInterval" | "wakeUpIntervalSteps"> | undefined>;
    setInterval(wakeUpInterval: number, controllerNodeId: number): Promise<SupervisionResult | undefined>;
    sendNoMoreInformation(): Promise<void>;
}
export declare class WakeUpCC extends CommandClass {
    ccCommand: WakeUpCommand;
    interview(applHost: ZWaveApplicationHost): Promise<void>;
}
interface WakeUpCCIntervalSetOptions extends CCCommandOptions {
    wakeUpInterval: number;
    controllerNodeId: number;
}
export declare class WakeUpCCIntervalSet extends WakeUpCC {
    constructor(host: ZWaveHost, options: CommandClassDeserializationOptions | WakeUpCCIntervalSetOptions);
    wakeUpInterval: number;
    controllerNodeId: number;
    serialize(): Buffer;
    toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry;
}
export declare class WakeUpCCIntervalReport extends WakeUpCC {
    constructor(host: ZWaveHost, options: CommandClassDeserializationOptions);
    readonly wakeUpInterval: number;
    readonly controllerNodeId: number;
    toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry;
}
export declare class WakeUpCCIntervalGet extends WakeUpCC {
}
export declare class WakeUpCCWakeUpNotification extends WakeUpCC {
}
export declare class WakeUpCCNoMoreInformation extends WakeUpCC {
}
export declare class WakeUpCCIntervalCapabilitiesReport extends WakeUpCC {
    constructor(host: ZWaveHost, options: CommandClassDeserializationOptions);
    persistValues(applHost: ZWaveApplicationHost): boolean;
    readonly minWakeUpInterval: number;
    readonly maxWakeUpInterval: number;
    readonly defaultWakeUpInterval: number;
    readonly wakeUpIntervalSteps: number;
    readonly wakeUpOnDemandSupported: boolean;
    toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry;
}
export declare class WakeUpCCIntervalCapabilitiesGet extends WakeUpCC {
}
export {};
//# sourceMappingURL=WakeUpCC.d.ts.map