/// <reference types="node" />
import { CommandClasses, Maybe, MessageOrCCLogEntry, SupervisionResult } from "@zwave-js/core/safe";
import type { ZWaveApplicationHost, ZWaveHost } from "@zwave-js/host/safe";
import { CCAPI, PollValueImplementation, POLL_VALUE, SetValueImplementation, SET_VALUE } from "../lib/API";
import { CommandClass, type CCCommandOptions, type CommandClassDeserializationOptions } from "../lib/CommandClass";
import { SoundSwitchCommand, ToneId } from "../lib/_Types";
export declare const SoundSwitchCCValues: Readonly<{
    defaultToneId: {
        readonly id: {
            commandClass: (typeof CommandClasses)["Sound Switch"];
            property: "defaultToneId";
        };
        readonly endpoint: (endpoint?: number | undefined) => {
            readonly commandClass: (typeof CommandClasses)["Sound Switch"];
            readonly endpoint: number;
            readonly property: "defaultToneId";
        };
        readonly is: (valueId: import("@zwave-js/core/safe").ValueID) => boolean;
        readonly meta: {
            readonly min: 0;
            readonly max: 254;
            readonly label: "Default tone ID";
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
    defaultVolume: {
        readonly id: {
            commandClass: (typeof CommandClasses)["Sound Switch"];
            property: "defaultVolume";
        };
        readonly endpoint: (endpoint?: number | undefined) => {
            readonly commandClass: (typeof CommandClasses)["Sound Switch"];
            readonly endpoint: number;
            readonly property: "defaultVolume";
        };
        readonly is: (valueId: import("@zwave-js/core/safe").ValueID) => boolean;
        readonly meta: {
            readonly min: 0;
            readonly max: 100;
            readonly unit: "%";
            readonly label: "Default volume";
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
    toneId: {
        readonly id: {
            commandClass: (typeof CommandClasses)["Sound Switch"];
            property: "toneId";
        };
        readonly endpoint: (endpoint?: number | undefined) => {
            readonly commandClass: (typeof CommandClasses)["Sound Switch"];
            readonly endpoint: number;
            readonly property: "toneId";
        };
        readonly is: (valueId: import("@zwave-js/core/safe").ValueID) => boolean;
        readonly meta: {
            readonly label: "Play Tone";
            readonly valueChangeOptions: readonly ["volume"];
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
    volume: {
        readonly id: {
            commandClass: (typeof CommandClasses)["Sound Switch"];
            property: "volume";
        };
        readonly endpoint: (endpoint?: number | undefined) => {
            readonly commandClass: (typeof CommandClasses)["Sound Switch"];
            readonly endpoint: number;
            readonly property: "volume";
        };
        readonly is: (valueId: import("@zwave-js/core/safe").ValueID) => boolean;
        readonly meta: {
            readonly min: 0;
            readonly max: 100;
            readonly unit: "%";
            readonly label: "Volume";
            readonly states: {
                readonly 0: "default";
            };
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
export declare class SoundSwitchCCAPI extends CCAPI {
    supportsCommand(cmd: SoundSwitchCommand): Maybe<boolean>;
    getToneCount(): Promise<number | undefined>;
    getToneInfo(toneId: number): Promise<Pick<SoundSwitchCCToneInfoReport, "duration" | "name"> | undefined>;
    setConfiguration(defaultToneId: number, defaultVolume: number): Promise<SupervisionResult | undefined>;
    getConfiguration(): Promise<Pick<SoundSwitchCCConfigurationReport, "defaultVolume" | "defaultToneId"> | undefined>;
    play(toneId: number, volume?: number): Promise<SupervisionResult | undefined>;
    stopPlaying(): Promise<SupervisionResult | undefined>;
    getPlaying(): Promise<Pick<SoundSwitchCCTonePlayReport, "volume" | "toneId"> | undefined>;
    protected [SET_VALUE]: SetValueImplementation;
    protected [POLL_VALUE]: PollValueImplementation;
}
export declare class SoundSwitchCC extends CommandClass {
    ccCommand: SoundSwitchCommand;
    interview(applHost: ZWaveApplicationHost): Promise<void>;
}
interface SoundSwitchCCTonesNumberReportOptions extends CCCommandOptions {
    toneCount: number;
}
export declare class SoundSwitchCCTonesNumberReport extends SoundSwitchCC {
    constructor(host: ZWaveHost, options: CommandClassDeserializationOptions | SoundSwitchCCTonesNumberReportOptions);
    toneCount: number;
    serialize(): Buffer;
    toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry;
}
export declare class SoundSwitchCCTonesNumberGet extends SoundSwitchCC {
}
interface SoundSwitchCCToneInfoReportOptions extends CCCommandOptions {
    toneId: number;
    duration: number;
    name: string;
}
export declare class SoundSwitchCCToneInfoReport extends SoundSwitchCC {
    constructor(host: ZWaveHost, options: CommandClassDeserializationOptions | SoundSwitchCCToneInfoReportOptions);
    readonly toneId: number;
    readonly duration: number;
    readonly name: string;
    serialize(): Buffer;
    toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry;
}
interface SoundSwitchCCToneInfoGetOptions extends CCCommandOptions {
    toneId: number;
}
export declare class SoundSwitchCCToneInfoGet extends SoundSwitchCC {
    constructor(host: ZWaveHost, options: CommandClassDeserializationOptions | SoundSwitchCCToneInfoGetOptions);
    toneId: number;
    serialize(): Buffer;
    toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry;
}
interface SoundSwitchCCConfigurationSetOptions extends CCCommandOptions {
    defaultVolume: number;
    defaultToneId: number;
}
export declare class SoundSwitchCCConfigurationSet extends SoundSwitchCC {
    constructor(host: ZWaveHost, options: CommandClassDeserializationOptions | SoundSwitchCCConfigurationSetOptions);
    defaultVolume: number;
    defaultToneId: number;
    serialize(): Buffer;
    toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry;
}
interface SoundSwitchCCConfigurationReportOptions extends CCCommandOptions {
    defaultVolume: number;
    defaultToneId: number;
}
export declare class SoundSwitchCCConfigurationReport extends SoundSwitchCC {
    constructor(host: ZWaveHost, options: CommandClassDeserializationOptions | SoundSwitchCCConfigurationReportOptions);
    defaultVolume: number;
    defaultToneId: number;
    serialize(): Buffer;
    toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry;
}
export declare class SoundSwitchCCConfigurationGet extends SoundSwitchCC {
}
interface SoundSwitchCCTonePlaySetOptions extends CCCommandOptions {
    toneId: ToneId | number;
    volume?: number;
}
export declare class SoundSwitchCCTonePlaySet extends SoundSwitchCC {
    constructor(host: ZWaveHost, options: CommandClassDeserializationOptions | SoundSwitchCCTonePlaySetOptions);
    toneId: ToneId | number;
    volume?: number;
    serialize(): Buffer;
    toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry;
}
export declare class SoundSwitchCCTonePlayReport extends SoundSwitchCC {
    constructor(host: ZWaveHost, options: CommandClassDeserializationOptions);
    readonly toneId: ToneId | number;
    volume?: number;
    toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry;
}
export declare class SoundSwitchCCTonePlayGet extends SoundSwitchCC {
}
export {};
//# sourceMappingURL=SoundSwitchCC.d.ts.map