/// <reference types="node" />
import { CommandClasses, Duration, Maybe, MessageOrCCLogEntry, SupervisionResult, ValueID } from "@zwave-js/core";
import type { ZWaveApplicationHost, ZWaveHost } from "@zwave-js/host/safe";
import { CCAPI, PollValueImplementation, POLL_VALUE, SetValueImplementation, SET_VALUE } from "../lib/API";
import { CommandClass, type CCCommandOptions, type CommandClassDeserializationOptions } from "../lib/CommandClass";
import { ColorComponent, ColorSwitchCommand, ColorTable, LevelChangeDirection } from "../lib/_Types";
export declare const ColorSwitchCCValues: Readonly<{
    targetColorChannel: ((component: ColorComponent) => {
        readonly endpoint: (endpoint?: number | undefined) => {
            readonly commandClass: (typeof CommandClasses)["Color Switch"];
            readonly endpoint: number;
            readonly property: "targetColor";
            readonly propertyKey: ColorComponent;
        };
        readonly id: {
            commandClass: (typeof CommandClasses)["Color Switch"];
            property: "targetColor";
            propertyKey: ColorComponent;
        };
        readonly meta: {
            readonly label: `Target value (${string})`;
            readonly description: `The target value of the ${string} channel.`;
            readonly valueChangeOptions: readonly ["transitionDuration"];
            readonly min: 0;
            readonly max: 255;
            readonly type: "number";
            readonly readable: true;
            readonly writeable: true;
        };
    }) & {
        is: (valueId: ValueID) => boolean;
        readonly options: {
            readonly internal: false;
            readonly minVersion: 1;
            readonly secret: false;
            readonly stateful: true;
            readonly supportsEndpoints: true;
            readonly autoCreate: true;
        };
    };
    currentColorChannel: ((component: ColorComponent) => {
        readonly endpoint: (endpoint?: number | undefined) => {
            readonly commandClass: (typeof CommandClasses)["Color Switch"];
            readonly endpoint: number;
            readonly property: "currentColor";
            readonly propertyKey: ColorComponent;
        };
        readonly id: {
            commandClass: (typeof CommandClasses)["Color Switch"];
            property: "currentColor";
            propertyKey: ColorComponent;
        };
        readonly meta: {
            readonly label: `Current value (${string})`;
            readonly description: `The current value of the ${string} channel.`;
            readonly writeable: false;
            readonly min: 0;
            readonly max: 255;
            readonly type: "number";
            readonly readable: true;
        };
    }) & {
        is: (valueId: ValueID) => boolean;
        readonly options: {
            readonly internal: false;
            readonly minVersion: 1;
            readonly secret: false;
            readonly stateful: true;
            readonly supportsEndpoints: true;
            readonly autoCreate: true;
        };
    };
    hexColor: {
        readonly id: {
            commandClass: (typeof CommandClasses)["Color Switch"];
            property: "hexColor";
        };
        readonly endpoint: (endpoint?: number | undefined) => {
            readonly commandClass: (typeof CommandClasses)["Color Switch"];
            readonly endpoint: number;
            readonly property: "hexColor";
        };
        readonly is: (valueId: ValueID) => boolean;
        readonly meta: {
            readonly minLength: 6;
            readonly maxLength: 7;
            readonly label: "RGB Color";
            readonly valueChangeOptions: readonly ["transitionDuration"];
            readonly type: "color";
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
    duration: {
        readonly id: {
            commandClass: (typeof CommandClasses)["Color Switch"];
            property: "duration";
        };
        readonly endpoint: (endpoint?: number | undefined) => {
            readonly commandClass: (typeof CommandClasses)["Color Switch"];
            readonly endpoint: number;
            readonly property: "duration";
        };
        readonly is: (valueId: ValueID) => boolean;
        readonly meta: {
            readonly label: "Remaining duration";
            readonly writeable: false;
            readonly type: "duration";
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
    targetColor: {
        readonly id: {
            commandClass: (typeof CommandClasses)["Color Switch"];
            property: "targetColor";
        };
        readonly endpoint: (endpoint?: number | undefined) => {
            readonly commandClass: (typeof CommandClasses)["Color Switch"];
            readonly endpoint: number;
            readonly property: "targetColor";
        };
        readonly is: (valueId: ValueID) => boolean;
        readonly meta: {
            readonly label: "Target color";
            readonly valueChangeOptions: readonly ["transitionDuration"];
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
    currentColor: {
        readonly id: {
            commandClass: (typeof CommandClasses)["Color Switch"];
            property: "currentColor";
        };
        readonly endpoint: (endpoint?: number | undefined) => {
            readonly commandClass: (typeof CommandClasses)["Color Switch"];
            readonly endpoint: number;
            readonly property: "currentColor";
        };
        readonly is: (valueId: ValueID) => boolean;
        readonly meta: {
            readonly label: "Current color";
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
    supportsHexColor: {
        readonly id: {
            commandClass: (typeof CommandClasses)["Color Switch"];
            property: "supportsHexColor";
        };
        readonly endpoint: (endpoint?: number | undefined) => {
            readonly commandClass: (typeof CommandClasses)["Color Switch"];
            readonly endpoint: number;
            readonly property: "supportsHexColor";
        };
        readonly is: (valueId: ValueID) => boolean;
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
    supportedColorComponents: {
        readonly id: {
            commandClass: (typeof CommandClasses)["Color Switch"];
            property: "supportedColorComponents";
        };
        readonly endpoint: (endpoint?: number | undefined) => {
            readonly commandClass: (typeof CommandClasses)["Color Switch"];
            readonly endpoint: number;
            readonly property: "supportedColorComponents";
        };
        readonly is: (valueId: ValueID) => boolean;
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
export declare class ColorSwitchCCAPI extends CCAPI {
    supportsCommand(cmd: ColorSwitchCommand): Maybe<boolean>;
    getSupported(): Promise<readonly ColorComponent[] | undefined>;
    get(component: ColorComponent): Promise<Pick<ColorSwitchCCReport, "duration" | "currentValue" | "targetValue"> | undefined>;
    set(options: ColorSwitchCCSetOptions): Promise<SupervisionResult | undefined>;
    /** Updates the current color for a given node by merging in the given changes */
    private updateCurrentColor;
    startLevelChange(options: ColorSwitchCCStartLevelChangeOptions): Promise<SupervisionResult | undefined>;
    stopLevelChange(colorComponent: ColorComponent): Promise<SupervisionResult | undefined>;
    protected [SET_VALUE]: SetValueImplementation;
    isSetValueOptimistic(_valueId: ValueID): boolean;
    protected [POLL_VALUE]: PollValueImplementation;
}
export declare class ColorSwitchCC extends CommandClass {
    ccCommand: ColorSwitchCommand;
    interview(applHost: ZWaveApplicationHost): Promise<void>;
    refreshValues(applHost: ZWaveApplicationHost): Promise<void>;
    translatePropertyKey(applHost: ZWaveApplicationHost, property: string | number, propertyKey: string | number): string | undefined;
}
export declare class ColorSwitchCCSupportedReport extends ColorSwitchCC {
    constructor(host: ZWaveHost, options: CommandClassDeserializationOptions);
    readonly supportedColorComponents: readonly ColorComponent[];
    toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry;
}
export declare class ColorSwitchCCSupportedGet extends ColorSwitchCC {
}
export declare class ColorSwitchCCReport extends ColorSwitchCC {
    constructor(host: ZWaveHost, options: CommandClassDeserializationOptions);
    persistValues(applHost: ZWaveApplicationHost): boolean;
    readonly colorComponent: ColorComponent;
    readonly currentValue: number;
    readonly targetValue: number | undefined;
    readonly duration: Duration | undefined;
    toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry;
}
interface ColorSwitchCCGetOptions extends CCCommandOptions {
    colorComponent: ColorComponent;
}
export declare class ColorSwitchCCGet extends ColorSwitchCC {
    constructor(host: ZWaveHost, options: CommandClassDeserializationOptions | ColorSwitchCCGetOptions);
    private _colorComponent;
    get colorComponent(): ColorComponent;
    set colorComponent(value: ColorComponent);
    serialize(): Buffer;
    toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry;
}
export type ColorSwitchCCSetOptions = (ColorTable | {
    hexColor: string;
}) & {
    duration?: Duration | string;
};
export declare class ColorSwitchCCSet extends ColorSwitchCC {
    constructor(host: ZWaveHost, options: CommandClassDeserializationOptions | (CCCommandOptions & ColorSwitchCCSetOptions));
    colorTable: ColorTable;
    duration: Duration | undefined;
    serialize(): Buffer;
    toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry;
}
type ColorSwitchCCStartLevelChangeOptions = {
    colorComponent: ColorComponent;
    direction: keyof typeof LevelChangeDirection;
} & ({
    ignoreStartLevel: true;
    startLevel?: number;
} | {
    ignoreStartLevel: false;
    startLevel: number;
}) & {
    duration?: Duration | string;
};
export declare class ColorSwitchCCStartLevelChange extends ColorSwitchCC {
    constructor(host: ZWaveHost, options: CommandClassDeserializationOptions | (CCCommandOptions & ColorSwitchCCStartLevelChangeOptions));
    duration: Duration | undefined;
    startLevel: number;
    ignoreStartLevel: boolean;
    direction: keyof typeof LevelChangeDirection;
    colorComponent: ColorComponent;
    serialize(): Buffer;
    toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry;
}
export interface ColorSwitchCCStopLevelChangeOptions extends CCCommandOptions {
    colorComponent: ColorComponent;
}
export declare class ColorSwitchCCStopLevelChange extends ColorSwitchCC {
    constructor(host: ZWaveHost, options: CommandClassDeserializationOptions | ColorSwitchCCStopLevelChangeOptions);
    readonly colorComponent: ColorComponent;
    serialize(): Buffer;
    toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry;
}
export {};
//# sourceMappingURL=ColorSwitchCC.d.ts.map