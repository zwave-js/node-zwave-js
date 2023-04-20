/// <reference types="node" />
import type { Maybe, MessageOrCCLogEntry, SupervisionResult } from "@zwave-js/core/safe";
import { CommandClasses, Duration } from "@zwave-js/core/safe";
import type { ZWaveApplicationHost, ZWaveHost } from "@zwave-js/host/safe";
import { CCAPI, SetValueImplementation, SET_VALUE } from "../lib/API";
import { CommandClass, type CCCommandOptions, type CommandClassDeserializationOptions } from "../lib/CommandClass";
import { SceneActivationCommand } from "../lib/_Types";
export declare const SceneActivationCCValues: Readonly<{
    dimmingDuration: {
        readonly id: {
            commandClass: (typeof CommandClasses)["Scene Activation"];
            property: "dimmingDuration";
        };
        readonly endpoint: (endpoint?: number | undefined) => {
            readonly commandClass: (typeof CommandClasses)["Scene Activation"];
            readonly endpoint: number;
            readonly property: "dimmingDuration";
        };
        readonly is: (valueId: import("@zwave-js/core/safe").ValueID) => boolean;
        readonly meta: {
            readonly label: "Dimming duration";
            readonly type: "duration";
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
    sceneId: {
        readonly id: {
            commandClass: (typeof CommandClasses)["Scene Activation"];
            property: "sceneId";
        };
        readonly endpoint: (endpoint?: number | undefined) => {
            readonly commandClass: (typeof CommandClasses)["Scene Activation"];
            readonly endpoint: number;
            readonly property: "sceneId";
        };
        readonly is: (valueId: import("@zwave-js/core/safe").ValueID) => boolean;
        readonly meta: {
            readonly min: 1;
            readonly label: "Scene ID";
            readonly valueChangeOptions: readonly ["transitionDuration"];
            readonly max: 255;
            readonly type: "number";
            readonly readable: true;
            readonly writeable: true;
        };
        readonly options: {
            readonly internal: false;
            readonly secret: false;
            readonly minVersion: 1;
            readonly supportsEndpoints: true;
            readonly autoCreate: true;
            readonly stateful: false;
        };
    };
}>;
export declare class SceneActivationCCAPI extends CCAPI {
    supportsCommand(_cmd: SceneActivationCommand): Maybe<boolean>;
    protected [SET_VALUE]: SetValueImplementation;
    /**
     * Activates the Scene with the given ID
     * @param duration The duration specifying how long the transition should take. Can be a Duration instance or a user-friendly duration string like `"1m17s"`.
     */
    set(sceneId: number, dimmingDuration?: Duration | string): Promise<SupervisionResult | undefined>;
}
export declare class SceneActivationCC extends CommandClass {
    ccCommand: SceneActivationCommand;
}
interface SceneActivationCCSetOptions extends CCCommandOptions {
    sceneId: number;
    dimmingDuration?: Duration | string;
}
export declare class SceneActivationCCSet extends SceneActivationCC {
    constructor(host: ZWaveHost, options: CommandClassDeserializationOptions | SceneActivationCCSetOptions);
    sceneId: number;
    dimmingDuration: Duration | undefined;
    serialize(): Buffer;
    toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry;
}
export {};
//# sourceMappingURL=SceneActivationCC.d.ts.map