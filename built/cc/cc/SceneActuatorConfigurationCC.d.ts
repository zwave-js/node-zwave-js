/// <reference types="node" />
import { CommandClasses, Duration, Maybe, MessageOrCCLogEntry, SupervisionResult } from "@zwave-js/core/safe";
import type { ZWaveApplicationHost, ZWaveHost } from "@zwave-js/host/safe";
import { CCAPI, PollValueImplementation, POLL_VALUE, SetValueImplementation, SET_VALUE } from "../lib/API";
import { CommandClass, type CCCommandOptions, type CommandClassDeserializationOptions } from "../lib/CommandClass";
import { SceneActuatorConfigurationCommand } from "../lib/_Types";
export declare const SceneActuatorConfigurationCCValues: Readonly<{
    dimmingDuration: ((sceneId: number) => {
        readonly endpoint: (endpoint?: number | undefined) => {
            readonly commandClass: (typeof CommandClasses)["Scene Actuator Configuration"];
            readonly endpoint: number;
            readonly property: "dimmingDuration";
            readonly propertyKey: number;
        };
        readonly id: {
            commandClass: (typeof CommandClasses)["Scene Actuator Configuration"];
            property: "dimmingDuration";
            propertyKey: number;
        };
        readonly meta: {
            readonly label: `Dimming duration (${number})`;
            readonly type: "duration";
            readonly readable: true;
            readonly writeable: true;
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
    level: ((sceneId: number) => {
        readonly endpoint: (endpoint?: number | undefined) => {
            readonly commandClass: (typeof CommandClasses)["Scene Actuator Configuration"];
            readonly endpoint: number;
            readonly property: "level";
            readonly propertyKey: number;
        };
        readonly id: {
            commandClass: (typeof CommandClasses)["Scene Actuator Configuration"];
            property: "level";
            propertyKey: number;
        };
        readonly meta: {
            readonly label: `Level (${number})`;
            readonly valueChangeOptions: readonly ["transitionDuration"];
            readonly min: 0;
            readonly max: 255;
            readonly type: "number";
            readonly readable: true;
            readonly writeable: true;
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
}>;
export declare class SceneActuatorConfigurationCCAPI extends CCAPI {
    supportsCommand(cmd: SceneActuatorConfigurationCommand): Maybe<boolean>;
    protected [SET_VALUE]: SetValueImplementation;
    protected [POLL_VALUE]: PollValueImplementation;
    set(sceneId: number, dimmingDuration?: Duration | string, level?: number): Promise<SupervisionResult | undefined>;
    getActive(): Promise<Pick<SceneActuatorConfigurationCCReport, "sceneId" | "level" | "dimmingDuration"> | undefined>;
    get(sceneId: number): Promise<Pick<SceneActuatorConfigurationCCReport, "level" | "dimmingDuration"> | undefined>;
}
export declare class SceneActuatorConfigurationCC extends CommandClass {
    ccCommand: SceneActuatorConfigurationCommand;
    interview(applHost: ZWaveApplicationHost): Promise<void>;
}
interface SceneActuatorConfigurationCCSetOptions extends CCCommandOptions {
    sceneId: number;
    dimmingDuration: Duration;
    level?: number;
}
export declare class SceneActuatorConfigurationCCSet extends SceneActuatorConfigurationCC {
    constructor(host: ZWaveHost, options: CommandClassDeserializationOptions | SceneActuatorConfigurationCCSetOptions);
    sceneId: number;
    dimmingDuration: Duration;
    level?: number;
    serialize(): Buffer;
    toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry;
}
export declare class SceneActuatorConfigurationCCReport extends SceneActuatorConfigurationCC {
    constructor(host: ZWaveHost, options: CommandClassDeserializationOptions);
    readonly sceneId: number;
    readonly level?: number;
    readonly dimmingDuration?: Duration;
    persistValues(applHost: ZWaveApplicationHost): boolean;
    toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry;
}
interface SceneActuatorConfigurationCCGetOptions extends CCCommandOptions {
    sceneId: number;
}
export declare class SceneActuatorConfigurationCCGet extends SceneActuatorConfigurationCC {
    constructor(host: ZWaveHost, options: CommandClassDeserializationOptions | SceneActuatorConfigurationCCGetOptions);
    sceneId: number;
    serialize(): Buffer;
    toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry;
}
export {};
//# sourceMappingURL=SceneActuatorConfigurationCC.d.ts.map