/// <reference types="node" />
import { CommandClasses, Duration, IZWaveEndpoint, Maybe, MessageOrCCLogEntry, SupervisionResult } from "@zwave-js/core/safe";
import type { ZWaveApplicationHost, ZWaveHost } from "@zwave-js/host/safe";
import { CCAPI, PollValueImplementation, POLL_VALUE, SetValueImplementation, SET_VALUE } from "../lib/API";
import { CommandClass, type CCCommandOptions, type CommandClassDeserializationOptions } from "../lib/CommandClass";
import { SceneControllerConfigurationCommand } from "../lib/_Types";
export declare const SceneControllerConfigurationCCValues: Readonly<{
    dimmingDuration: ((groupId: number) => {
        readonly endpoint: (endpoint?: number | undefined) => {
            readonly commandClass: (typeof CommandClasses)["Scene Controller Configuration"];
            readonly endpoint: number;
            readonly property: "dimmingDuration";
            readonly propertyKey: number;
        };
        readonly id: {
            commandClass: (typeof CommandClasses)["Scene Controller Configuration"];
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
    sceneId: ((groupId: number) => {
        readonly endpoint: (endpoint?: number | undefined) => {
            readonly commandClass: (typeof CommandClasses)["Scene Controller Configuration"];
            readonly endpoint: number;
            readonly property: "sceneId";
            readonly propertyKey: number;
        };
        readonly id: {
            commandClass: (typeof CommandClasses)["Scene Controller Configuration"];
            property: "sceneId";
            propertyKey: number;
        };
        readonly meta: {
            readonly label: `Associated Scene ID (${number})`;
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
export declare class SceneControllerConfigurationCCAPI extends CCAPI {
    supportsCommand(cmd: SceneControllerConfigurationCommand): Maybe<boolean>;
    protected [SET_VALUE]: SetValueImplementation;
    protected [POLL_VALUE]: PollValueImplementation;
    disable(groupId: number): Promise<SupervisionResult | undefined>;
    set(groupId: number, sceneId: number, dimmingDuration?: Duration | string): Promise<SupervisionResult | undefined>;
    getLastActivated(): Promise<Pick<SceneControllerConfigurationCCReport, "groupId" | "sceneId" | "dimmingDuration"> | undefined>;
    get(groupId: number): Promise<Pick<SceneControllerConfigurationCCReport, "sceneId" | "dimmingDuration"> | undefined>;
}
export declare class SceneControllerConfigurationCC extends CommandClass {
    ccCommand: SceneControllerConfigurationCommand;
    determineRequiredCCInterviews(): readonly CommandClasses[];
    interview(applHost: ZWaveApplicationHost): Promise<void>;
    refreshValues(applHost: ZWaveApplicationHost): Promise<void>;
    /**
     * Returns the number of association groups reported by the node.
     * This only works AFTER the node has been interviewed by this CC
     * or the AssociationCC.
     */
    static getGroupCountCached(applHost: ZWaveApplicationHost, endpoint: IZWaveEndpoint): number;
}
interface SceneControllerConfigurationCCSetOptions extends CCCommandOptions {
    groupId: number;
    sceneId: number;
    dimmingDuration?: Duration | string;
}
export declare class SceneControllerConfigurationCCSet extends SceneControllerConfigurationCC {
    constructor(host: ZWaveHost, options: CommandClassDeserializationOptions | SceneControllerConfigurationCCSetOptions);
    groupId: number;
    sceneId: number;
    dimmingDuration: Duration;
    serialize(): Buffer;
    toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry;
}
export declare class SceneControllerConfigurationCCReport extends SceneControllerConfigurationCC {
    constructor(host: ZWaveHost, options: CommandClassDeserializationOptions);
    readonly groupId: number;
    readonly sceneId: number;
    readonly dimmingDuration: Duration;
    persistValues(applHost: ZWaveApplicationHost): boolean;
    toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry;
}
interface SceneControllerConfigurationCCGetOptions extends CCCommandOptions {
    groupId: number;
}
export declare class SceneControllerConfigurationCCGet extends SceneControllerConfigurationCC {
    constructor(host: ZWaveHost, options: CommandClassDeserializationOptions | SceneControllerConfigurationCCGetOptions);
    groupId: number;
    serialize(): Buffer;
    toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry;
}
export {};
//# sourceMappingURL=SceneControllerConfigurationCC.d.ts.map