/// <reference types="node" />
import type { MessageOrCCLogEntry, SupervisionResult } from "@zwave-js/core/safe";
import { CommandClasses, Maybe } from "@zwave-js/core/safe";
import type { ZWaveApplicationHost, ZWaveHost } from "@zwave-js/host/safe";
import { CCAPI, PollValueImplementation, POLL_VALUE, SetValueImplementation, SET_VALUE } from "../lib/API";
import { CommandClass, type CCCommandOptions, type CommandClassDeserializationOptions } from "../lib/CommandClass";
import { CentralSceneCommand, CentralSceneKeys } from "../lib/_Types";
export declare const CentralSceneCCValues: Readonly<{
    scene: ((sceneNumber: number) => {
        readonly endpoint: (endpoint?: number | undefined) => {
            readonly commandClass: (typeof CommandClasses)["Central Scene"];
            readonly endpoint: number;
            readonly property: "scene";
            readonly propertyKey: string;
        };
        readonly id: {
            commandClass: (typeof CommandClasses)["Central Scene"];
            property: "scene";
            propertyKey: string;
        };
        readonly meta: {
            readonly label: `Scene ${string}`;
            readonly writeable: false;
            readonly min: 0;
            readonly max: 255;
            readonly type: "number";
            readonly readable: true;
        };
    }) & {
        is: (valueId: import("@zwave-js/core/safe").ValueID) => boolean;
        readonly options: {
            readonly internal: false;
            readonly minVersion: 1;
            readonly secret: false;
            readonly stateful: true;
            readonly supportsEndpoints: true;
            readonly autoCreate: true;
        };
    };
    slowRefresh: {
        readonly id: {
            commandClass: (typeof CommandClasses)["Central Scene"];
            property: "slowRefresh";
        };
        readonly endpoint: (endpoint?: number | undefined) => {
            readonly commandClass: (typeof CommandClasses)["Central Scene"];
            readonly endpoint: number;
            readonly property: "slowRefresh";
        };
        readonly is: (valueId: import("@zwave-js/core/safe").ValueID) => boolean;
        readonly meta: {
            readonly label: "Send held down notifications at a slow rate";
            readonly description: "When this is true, KeyHeldDown notifications are sent every 55s. When this is false, the notifications are sent every 200ms.";
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
    supportedKeyAttributes: {
        readonly id: {
            commandClass: (typeof CommandClasses)["Central Scene"];
            property: "supportedKeyAttributes";
        };
        readonly endpoint: (endpoint?: number | undefined) => {
            readonly commandClass: (typeof CommandClasses)["Central Scene"];
            readonly endpoint: number;
            readonly property: "supportedKeyAttributes";
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
    supportsSlowRefresh: {
        readonly id: {
            commandClass: (typeof CommandClasses)["Central Scene"];
            property: "supportsSlowRefresh";
        };
        readonly endpoint: (endpoint?: number | undefined) => {
            readonly commandClass: (typeof CommandClasses)["Central Scene"];
            readonly endpoint: number;
            readonly property: "supportsSlowRefresh";
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
    sceneCount: {
        readonly id: {
            commandClass: (typeof CommandClasses)["Central Scene"];
            property: "sceneCount";
        };
        readonly endpoint: (endpoint?: number | undefined) => {
            readonly commandClass: (typeof CommandClasses)["Central Scene"];
            readonly endpoint: number;
            readonly property: "sceneCount";
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
export declare class CentralSceneCCAPI extends CCAPI {
    supportsCommand(cmd: CentralSceneCommand): Maybe<boolean>;
    getSupported(): Promise<Pick<CentralSceneCCSupportedReport, "sceneCount" | "supportsSlowRefresh" | "supportedKeyAttributes"> | undefined>;
    getConfiguration(): Promise<Pick<CentralSceneCCConfigurationReport, "slowRefresh"> | undefined>;
    setConfiguration(slowRefresh: boolean): Promise<SupervisionResult | undefined>;
    protected [SET_VALUE]: SetValueImplementation;
    protected [POLL_VALUE]: PollValueImplementation;
}
export declare class CentralSceneCC extends CommandClass {
    ccCommand: CentralSceneCommand;
    determineRequiredCCInterviews(): readonly CommandClasses[];
    skipEndpointInterview(): boolean;
    interview(applHost: ZWaveApplicationHost): Promise<void>;
}
export declare class CentralSceneCCNotification extends CentralSceneCC {
    constructor(host: ZWaveHost, options: CommandClassDeserializationOptions);
    persistValues(applHost: ZWaveApplicationHost): boolean;
    readonly sequenceNumber: number;
    readonly keyAttribute: CentralSceneKeys;
    readonly sceneNumber: number;
    readonly slowRefresh: boolean | undefined;
    toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry;
}
export declare class CentralSceneCCSupportedReport extends CentralSceneCC {
    constructor(host: ZWaveHost, options: CommandClassDeserializationOptions);
    persistValues(applHost: ZWaveApplicationHost): boolean;
    readonly sceneCount: number;
    readonly supportsSlowRefresh: boolean | undefined;
    private _supportedKeyAttributes;
    get supportedKeyAttributes(): ReadonlyMap<number, readonly CentralSceneKeys[]>;
    toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry;
}
export declare class CentralSceneCCSupportedGet extends CentralSceneCC {
}
export declare class CentralSceneCCConfigurationReport extends CentralSceneCC {
    constructor(host: ZWaveHost, options: CommandClassDeserializationOptions);
    readonly slowRefresh: boolean;
    toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry;
}
export declare class CentralSceneCCConfigurationGet extends CentralSceneCC {
}
interface CentralSceneCCConfigurationSetOptions extends CCCommandOptions {
    slowRefresh: boolean;
}
export declare class CentralSceneCCConfigurationSet extends CentralSceneCC {
    constructor(host: ZWaveHost, options: CommandClassDeserializationOptions | CentralSceneCCConfigurationSetOptions);
    slowRefresh: boolean;
    serialize(): Buffer;
    toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry;
}
export {};
//# sourceMappingURL=CentralSceneCC.d.ts.map