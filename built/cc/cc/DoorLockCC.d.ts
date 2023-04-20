/// <reference types="node" />
import { CommandClasses, Duration, IZWaveEndpoint, Maybe, MessageOrCCLogEntry, SupervisionResult } from "@zwave-js/core/safe";
import type { ZWaveApplicationHost, ZWaveHost } from "@zwave-js/host/safe";
import { PhysicalCCAPI, PollValueImplementation, POLL_VALUE, SetValueImplementation, SET_VALUE } from "../lib/API";
import { CommandClass, type CCCommandOptions, type CommandClassDeserializationOptions } from "../lib/CommandClass";
import { DoorHandleStatus, DoorLockCommand, DoorLockMode, DoorLockOperationType } from "../lib/_Types";
export declare const DoorLockCCValues: Readonly<{
    doorStatus: {
        readonly id: {
            commandClass: (typeof CommandClasses)["Door Lock"];
            property: "doorStatus";
        };
        readonly endpoint: (endpoint?: number | undefined) => {
            readonly commandClass: (typeof CommandClasses)["Door Lock"];
            readonly endpoint: number;
            readonly property: "doorStatus";
        };
        readonly is: (valueId: import("@zwave-js/core/safe").ValueID) => boolean;
        readonly meta: {
            readonly label: "Current status of the door";
            readonly writeable: false;
            readonly type: "any";
            readonly readable: true;
        };
        readonly options: {
            readonly internal: false;
            readonly stateful: true;
            readonly secret: false;
            readonly minVersion: 1;
            readonly supportsEndpoints: true;
            readonly autoCreate: (applHost: ZWaveApplicationHost, endpoint: IZWaveEndpoint) => boolean;
        };
    };
    doorSupported: {
        readonly id: {
            commandClass: (typeof CommandClasses)["Door Lock"];
            property: "doorSupported";
        };
        readonly endpoint: (endpoint?: number | undefined) => {
            readonly commandClass: (typeof CommandClasses)["Door Lock"];
            readonly endpoint: number;
            readonly property: "doorSupported";
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
    boltStatus: {
        readonly id: {
            commandClass: (typeof CommandClasses)["Door Lock"];
            property: "boltStatus";
        };
        readonly endpoint: (endpoint?: number | undefined) => {
            readonly commandClass: (typeof CommandClasses)["Door Lock"];
            readonly endpoint: number;
            readonly property: "boltStatus";
        };
        readonly is: (valueId: import("@zwave-js/core/safe").ValueID) => boolean;
        readonly meta: {
            readonly label: "Current status of the bolt";
            readonly writeable: false;
            readonly type: "any";
            readonly readable: true;
        };
        readonly options: {
            readonly internal: false;
            readonly stateful: true;
            readonly secret: false;
            readonly minVersion: 1;
            readonly supportsEndpoints: true;
            readonly autoCreate: (applHost: ZWaveApplicationHost, endpoint: IZWaveEndpoint) => boolean;
        };
    };
    boltSupported: {
        readonly id: {
            commandClass: (typeof CommandClasses)["Door Lock"];
            property: "boltSupported";
        };
        readonly endpoint: (endpoint?: number | undefined) => {
            readonly commandClass: (typeof CommandClasses)["Door Lock"];
            readonly endpoint: number;
            readonly property: "boltSupported";
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
    latchStatus: {
        readonly id: {
            commandClass: (typeof CommandClasses)["Door Lock"];
            property: "latchStatus";
        };
        readonly endpoint: (endpoint?: number | undefined) => {
            readonly commandClass: (typeof CommandClasses)["Door Lock"];
            readonly endpoint: number;
            readonly property: "latchStatus";
        };
        readonly is: (valueId: import("@zwave-js/core/safe").ValueID) => boolean;
        readonly meta: {
            readonly label: "Current status of the latch";
            readonly writeable: false;
            readonly type: "any";
            readonly readable: true;
        };
        readonly options: {
            readonly internal: false;
            readonly stateful: true;
            readonly secret: false;
            readonly minVersion: 1;
            readonly supportsEndpoints: true;
            readonly autoCreate: (applHost: ZWaveApplicationHost, endpoint: IZWaveEndpoint) => boolean;
        };
    };
    latchSupported: {
        readonly id: {
            commandClass: (typeof CommandClasses)["Door Lock"];
            property: "latchSupported";
        };
        readonly endpoint: (endpoint?: number | undefined) => {
            readonly commandClass: (typeof CommandClasses)["Door Lock"];
            readonly endpoint: number;
            readonly property: "latchSupported";
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
    blockToBlock: {
        readonly id: {
            commandClass: (typeof CommandClasses)["Door Lock"];
            property: "blockToBlock";
        };
        readonly endpoint: (endpoint?: number | undefined) => {
            readonly commandClass: (typeof CommandClasses)["Door Lock"];
            readonly endpoint: number;
            readonly property: "blockToBlock";
        };
        readonly is: (valueId: import("@zwave-js/core/safe").ValueID) => boolean;
        readonly meta: {
            readonly label: "Block-to-block functionality enabled";
            readonly type: "boolean";
            readonly readable: true;
            readonly writeable: true;
        };
        readonly options: {
            readonly internal: false;
            readonly stateful: true;
            readonly secret: false;
            readonly supportsEndpoints: true;
            readonly autoCreate: true;
            readonly minVersion: 4;
        };
    };
    blockToBlockSupported: {
        readonly id: {
            commandClass: (typeof CommandClasses)["Door Lock"];
            property: "blockToBlockSupported";
        };
        readonly endpoint: (endpoint?: number | undefined) => {
            readonly commandClass: (typeof CommandClasses)["Door Lock"];
            readonly endpoint: number;
            readonly property: "blockToBlockSupported";
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
            readonly supportsEndpoints: true;
            readonly autoCreate: true;
            readonly internal: true;
            readonly minVersion: number;
        };
    };
    twistAssist: {
        readonly id: {
            commandClass: (typeof CommandClasses)["Door Lock"];
            property: "twistAssist";
        };
        readonly endpoint: (endpoint?: number | undefined) => {
            readonly commandClass: (typeof CommandClasses)["Door Lock"];
            readonly endpoint: number;
            readonly property: "twistAssist";
        };
        readonly is: (valueId: import("@zwave-js/core/safe").ValueID) => boolean;
        readonly meta: {
            readonly label: "Twist Assist enabled";
            readonly type: "boolean";
            readonly readable: true;
            readonly writeable: true;
        };
        readonly options: {
            readonly internal: false;
            readonly stateful: true;
            readonly secret: false;
            readonly supportsEndpoints: true;
            readonly autoCreate: true;
            readonly minVersion: 4;
        };
    };
    twistAssistSupported: {
        readonly id: {
            commandClass: (typeof CommandClasses)["Door Lock"];
            property: "twistAssistSupported";
        };
        readonly endpoint: (endpoint?: number | undefined) => {
            readonly commandClass: (typeof CommandClasses)["Door Lock"];
            readonly endpoint: number;
            readonly property: "twistAssistSupported";
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
            readonly supportsEndpoints: true;
            readonly autoCreate: true;
            readonly internal: true;
            readonly minVersion: number;
        };
    };
    holdAndReleaseTime: {
        readonly id: {
            commandClass: (typeof CommandClasses)["Door Lock"];
            property: "holdAndReleaseTime";
        };
        readonly endpoint: (endpoint?: number | undefined) => {
            readonly commandClass: (typeof CommandClasses)["Door Lock"];
            readonly endpoint: number;
            readonly property: "holdAndReleaseTime";
        };
        readonly is: (valueId: import("@zwave-js/core/safe").ValueID) => boolean;
        readonly meta: {
            readonly label: "Duration in seconds the latch stays retracted";
            readonly min: 0;
            readonly max: 65535;
            readonly type: "number";
            readonly readable: true;
            readonly writeable: true;
        };
        readonly options: {
            readonly internal: false;
            readonly stateful: true;
            readonly secret: false;
            readonly supportsEndpoints: true;
            readonly autoCreate: true;
            readonly minVersion: 4;
        };
    };
    holdAndReleaseSupported: {
        readonly id: {
            commandClass: (typeof CommandClasses)["Door Lock"];
            property: "holdAndReleaseSupported";
        };
        readonly endpoint: (endpoint?: number | undefined) => {
            readonly commandClass: (typeof CommandClasses)["Door Lock"];
            readonly endpoint: number;
            readonly property: "holdAndReleaseSupported";
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
            readonly supportsEndpoints: true;
            readonly autoCreate: true;
            readonly internal: true;
            readonly minVersion: number;
        };
    };
    autoRelockTime: {
        readonly id: {
            commandClass: (typeof CommandClasses)["Door Lock"];
            property: "autoRelockTime";
        };
        readonly endpoint: (endpoint?: number | undefined) => {
            readonly commandClass: (typeof CommandClasses)["Door Lock"];
            readonly endpoint: number;
            readonly property: "autoRelockTime";
        };
        readonly is: (valueId: import("@zwave-js/core/safe").ValueID) => boolean;
        readonly meta: {
            readonly label: "Duration in seconds until lock returns to secure state";
            readonly min: 0;
            readonly max: 65535;
            readonly type: "number";
            readonly readable: true;
            readonly writeable: true;
        };
        readonly options: {
            readonly internal: false;
            readonly stateful: true;
            readonly secret: false;
            readonly supportsEndpoints: true;
            readonly autoCreate: true;
            readonly minVersion: 4;
        };
    };
    autoRelockSupported: {
        readonly id: {
            commandClass: (typeof CommandClasses)["Door Lock"];
            property: "autoRelockSupported";
        };
        readonly endpoint: (endpoint?: number | undefined) => {
            readonly commandClass: (typeof CommandClasses)["Door Lock"];
            readonly endpoint: number;
            readonly property: "autoRelockSupported";
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
            readonly supportsEndpoints: true;
            readonly autoCreate: true;
            readonly internal: true;
            readonly minVersion: number;
        };
    };
    lockTimeout: {
        readonly id: {
            commandClass: (typeof CommandClasses)["Door Lock"];
            property: "lockTimeout";
        };
        readonly endpoint: (endpoint?: number | undefined) => {
            readonly commandClass: (typeof CommandClasses)["Door Lock"];
            readonly endpoint: number;
            readonly property: "lockTimeout";
        };
        readonly is: (valueId: import("@zwave-js/core/safe").ValueID) => boolean;
        readonly meta: {
            readonly label: "Seconds until lock mode times out";
            readonly writeable: false;
            readonly min: 0;
            readonly max: 65535;
            readonly type: "number";
            readonly readable: true;
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
    lockTimeoutConfiguration: {
        readonly id: {
            commandClass: (typeof CommandClasses)["Door Lock"];
            property: "lockTimeoutConfiguration";
        };
        readonly endpoint: (endpoint?: number | undefined) => {
            readonly commandClass: (typeof CommandClasses)["Door Lock"];
            readonly endpoint: number;
            readonly property: "lockTimeoutConfiguration";
        };
        readonly is: (valueId: import("@zwave-js/core/safe").ValueID) => boolean;
        readonly meta: {
            readonly label: "Duration of timed mode in seconds";
            readonly min: 0;
            readonly max: 65535;
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
    operationType: {
        readonly id: {
            commandClass: (typeof CommandClasses)["Door Lock"];
            property: "operationType";
        };
        readonly endpoint: (endpoint?: number | undefined) => {
            readonly commandClass: (typeof CommandClasses)["Door Lock"];
            readonly endpoint: number;
            readonly property: "operationType";
        };
        readonly is: (valueId: import("@zwave-js/core/safe").ValueID) => boolean;
        readonly meta: {
            readonly label: "Lock operation type";
            readonly states: {
                [x: number]: string;
            };
            readonly min: 0;
            readonly max: 255;
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
    insideHandlesCanOpenDoor: {
        readonly id: {
            commandClass: (typeof CommandClasses)["Door Lock"];
            property: "insideHandlesCanOpenDoor";
        };
        readonly endpoint: (endpoint?: number | undefined) => {
            readonly commandClass: (typeof CommandClasses)["Door Lock"];
            readonly endpoint: number;
            readonly property: "insideHandlesCanOpenDoor";
        };
        readonly is: (valueId: import("@zwave-js/core/safe").ValueID) => boolean;
        readonly meta: {
            readonly label: "Which inside handles can open the door (actual status)";
            readonly writeable: false;
            readonly type: "any";
            readonly readable: true;
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
    insideHandlesCanOpenDoorConfiguration: {
        readonly id: {
            commandClass: (typeof CommandClasses)["Door Lock"];
            property: "insideHandlesCanOpenDoorConfiguration";
        };
        readonly endpoint: (endpoint?: number | undefined) => {
            readonly commandClass: (typeof CommandClasses)["Door Lock"];
            readonly endpoint: number;
            readonly property: "insideHandlesCanOpenDoorConfiguration";
        };
        readonly is: (valueId: import("@zwave-js/core/safe").ValueID) => boolean;
        readonly meta: {
            readonly label: "Which inside handles can open the door (configuration)";
            readonly type: "any";
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
    supportedInsideHandles: {
        readonly id: {
            commandClass: (typeof CommandClasses)["Door Lock"];
            property: "supportedInsideHandles";
        };
        readonly endpoint: (endpoint?: number | undefined) => {
            readonly commandClass: (typeof CommandClasses)["Door Lock"];
            readonly endpoint: number;
            readonly property: "supportedInsideHandles";
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
            readonly supportsEndpoints: true;
            readonly autoCreate: true;
            readonly internal: true;
            readonly minVersion: number;
        };
    };
    outsideHandlesCanOpenDoor: {
        readonly id: {
            commandClass: (typeof CommandClasses)["Door Lock"];
            property: "outsideHandlesCanOpenDoor";
        };
        readonly endpoint: (endpoint?: number | undefined) => {
            readonly commandClass: (typeof CommandClasses)["Door Lock"];
            readonly endpoint: number;
            readonly property: "outsideHandlesCanOpenDoor";
        };
        readonly is: (valueId: import("@zwave-js/core/safe").ValueID) => boolean;
        readonly meta: {
            readonly label: "Which outside handles can open the door (actual status)";
            readonly writeable: false;
            readonly type: "any";
            readonly readable: true;
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
    outsideHandlesCanOpenDoorConfiguration: {
        readonly id: {
            commandClass: (typeof CommandClasses)["Door Lock"];
            property: "outsideHandlesCanOpenDoorConfiguration";
        };
        readonly endpoint: (endpoint?: number | undefined) => {
            readonly commandClass: (typeof CommandClasses)["Door Lock"];
            readonly endpoint: number;
            readonly property: "outsideHandlesCanOpenDoorConfiguration";
        };
        readonly is: (valueId: import("@zwave-js/core/safe").ValueID) => boolean;
        readonly meta: {
            readonly label: "Which outside handles can open the door (configuration)";
            readonly type: "any";
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
    supportedOutsideHandles: {
        readonly id: {
            commandClass: (typeof CommandClasses)["Door Lock"];
            property: "supportedOutsideHandles";
        };
        readonly endpoint: (endpoint?: number | undefined) => {
            readonly commandClass: (typeof CommandClasses)["Door Lock"];
            readonly endpoint: number;
            readonly property: "supportedOutsideHandles";
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
            readonly supportsEndpoints: true;
            readonly autoCreate: true;
            readonly internal: true;
            readonly minVersion: number;
        };
    };
    duration: {
        readonly id: {
            commandClass: (typeof CommandClasses)["Door Lock"];
            property: "duration";
        };
        readonly endpoint: (endpoint?: number | undefined) => {
            readonly commandClass: (typeof CommandClasses)["Door Lock"];
            readonly endpoint: number;
            readonly property: "duration";
        };
        readonly is: (valueId: import("@zwave-js/core/safe").ValueID) => boolean;
        readonly meta: {
            readonly label: "Remaining duration until target lock mode";
            readonly writeable: false;
            readonly type: "duration";
            readonly readable: true;
        };
        readonly options: {
            readonly internal: false;
            readonly stateful: true;
            readonly secret: false;
            readonly supportsEndpoints: true;
            readonly autoCreate: true;
            readonly minVersion: 3;
        };
    };
    currentMode: {
        readonly id: {
            commandClass: (typeof CommandClasses)["Door Lock"];
            property: "currentMode";
        };
        readonly endpoint: (endpoint?: number | undefined) => {
            readonly commandClass: (typeof CommandClasses)["Door Lock"];
            readonly endpoint: number;
            readonly property: "currentMode";
        };
        readonly is: (valueId: import("@zwave-js/core/safe").ValueID) => boolean;
        readonly meta: {
            readonly label: "Current lock mode";
            readonly states: {
                [x: number]: string;
            };
            readonly writeable: false;
            readonly min: 0;
            readonly max: 255;
            readonly type: "number";
            readonly readable: true;
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
    targetMode: {
        readonly id: {
            commandClass: (typeof CommandClasses)["Door Lock"];
            property: "targetMode";
        };
        readonly endpoint: (endpoint?: number | undefined) => {
            readonly commandClass: (typeof CommandClasses)["Door Lock"];
            readonly endpoint: number;
            readonly property: "targetMode";
        };
        readonly is: (valueId: import("@zwave-js/core/safe").ValueID) => boolean;
        readonly meta: {
            readonly label: "Target lock mode";
            readonly states: {
                [x: number]: string;
            };
            readonly min: 0;
            readonly max: 255;
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
export declare class DoorLockCCAPI extends PhysicalCCAPI {
    supportsCommand(cmd: DoorLockCommand): Maybe<boolean>;
    protected [SET_VALUE]: SetValueImplementation;
    protected [POLL_VALUE]: PollValueImplementation;
    getCapabilities(): Promise<Pick<DoorLockCCCapabilitiesReport, "supportedOutsideHandles" | "supportedInsideHandles" | "autoRelockSupported" | "holdAndReleaseSupported" | "twistAssistSupported" | "blockToBlockSupported" | "latchSupported" | "boltSupported" | "doorSupported" | "supportedDoorLockModes" | "supportedOperationTypes"> | undefined>;
    get(): Promise<Pick<DoorLockCCOperationReport, "duration" | "targetMode" | "currentMode" | "outsideHandlesCanOpenDoor" | "insideHandlesCanOpenDoor" | "lockTimeout" | "latchStatus" | "boltStatus" | "doorStatus"> | undefined>;
    set(mode: DoorLockMode): Promise<SupervisionResult | undefined>;
    setConfiguration(configuration: DoorLockCCConfigurationSetOptions): Promise<SupervisionResult | undefined>;
    getConfiguration(): Promise<Pick<DoorLockCCConfigurationReport, "outsideHandlesCanOpenDoorConfiguration" | "insideHandlesCanOpenDoorConfiguration" | "operationType" | "lockTimeoutConfiguration" | "autoRelockTime" | "holdAndReleaseTime" | "twistAssist" | "blockToBlock"> | undefined>;
}
export declare class DoorLockCC extends CommandClass {
    ccCommand: DoorLockCommand;
    interview(applHost: ZWaveApplicationHost): Promise<void>;
    refreshValues(applHost: ZWaveApplicationHost): Promise<void>;
}
interface DoorLockCCOperationSetOptions extends CCCommandOptions {
    mode: DoorLockMode;
}
export declare class DoorLockCCOperationSet extends DoorLockCC {
    constructor(host: ZWaveHost, options: CommandClassDeserializationOptions | DoorLockCCOperationSetOptions);
    mode: DoorLockMode;
    serialize(): Buffer;
    toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry;
}
export declare class DoorLockCCOperationReport extends DoorLockCC {
    constructor(host: ZWaveHost, options: CommandClassDeserializationOptions);
    persistValues(applHost: ZWaveApplicationHost): boolean;
    readonly currentMode: DoorLockMode;
    readonly targetMode?: DoorLockMode;
    readonly duration?: Duration;
    readonly outsideHandlesCanOpenDoor: DoorHandleStatus;
    readonly insideHandlesCanOpenDoor: DoorHandleStatus;
    readonly latchStatus?: "open" | "closed";
    readonly boltStatus?: "locked" | "unlocked";
    readonly doorStatus?: "open" | "closed";
    readonly lockTimeout?: number;
    toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry;
}
export declare class DoorLockCCOperationGet extends DoorLockCC {
}
export declare class DoorLockCCConfigurationReport extends DoorLockCC {
    constructor(host: ZWaveHost, options: CommandClassDeserializationOptions);
    readonly operationType: DoorLockOperationType;
    readonly outsideHandlesCanOpenDoorConfiguration: DoorHandleStatus;
    readonly insideHandlesCanOpenDoorConfiguration: DoorHandleStatus;
    readonly lockTimeoutConfiguration?: number;
    readonly autoRelockTime?: number;
    readonly holdAndReleaseTime?: number;
    readonly twistAssist?: boolean;
    readonly blockToBlock?: boolean;
    toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry;
}
export declare class DoorLockCCConfigurationGet extends DoorLockCC {
}
type DoorLockCCConfigurationSetOptions = ({
    operationType: DoorLockOperationType.Timed;
    lockTimeoutConfiguration: number;
} | {
    operationType: DoorLockOperationType.Constant;
    lockTimeoutConfiguration?: undefined;
}) & {
    outsideHandlesCanOpenDoorConfiguration: DoorHandleStatus;
    insideHandlesCanOpenDoorConfiguration: DoorHandleStatus;
    autoRelockTime?: number;
    holdAndReleaseTime?: number;
    twistAssist?: boolean;
    blockToBlock?: boolean;
};
export declare class DoorLockCCConfigurationSet extends DoorLockCC {
    constructor(host: ZWaveHost, options: CommandClassDeserializationOptions | (CCCommandOptions & DoorLockCCConfigurationSetOptions));
    operationType: DoorLockOperationType;
    outsideHandlesCanOpenDoorConfiguration: DoorHandleStatus;
    insideHandlesCanOpenDoorConfiguration: DoorHandleStatus;
    lockTimeoutConfiguration?: number;
    autoRelockTime?: number;
    holdAndReleaseTime?: number;
    twistAssist?: boolean;
    blockToBlock?: boolean;
    serialize(): Buffer;
    toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry;
}
export declare class DoorLockCCCapabilitiesReport extends DoorLockCC {
    constructor(host: ZWaveHost, options: CommandClassDeserializationOptions);
    readonly supportedOperationTypes: readonly DoorLockOperationType[];
    readonly supportedDoorLockModes: readonly DoorLockMode[];
    readonly supportedOutsideHandles: DoorHandleStatus;
    readonly supportedInsideHandles: DoorHandleStatus;
    readonly latchSupported: boolean;
    readonly boltSupported: boolean;
    readonly doorSupported: boolean;
    readonly autoRelockSupported: boolean;
    readonly holdAndReleaseSupported: boolean;
    readonly twistAssistSupported: boolean;
    readonly blockToBlockSupported: boolean;
    toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry;
}
export declare class DoorLockCCCapabilitiesGet extends DoorLockCC {
}
export {};
//# sourceMappingURL=DoorLockCC.d.ts.map