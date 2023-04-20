/// <reference types="node" />
import type { Maybe, MessageOrCCLogEntry, SupervisionResult } from "@zwave-js/core/safe";
import { CommandClasses } from "@zwave-js/core/safe";
import type { ZWaveApplicationHost, ZWaveHost } from "@zwave-js/host/safe";
import { CCAPI } from "../lib/API";
import { CommandClass, type CCCommandOptions, type CommandClassDeserializationOptions } from "../lib/CommandClass";
import { LanguageCommand } from "../lib/_Types";
export declare const LanguageCCValues: Readonly<{
    country: {
        readonly id: {
            commandClass: CommandClasses.Language;
            property: "country";
        };
        readonly endpoint: (endpoint?: number | undefined) => {
            readonly commandClass: CommandClasses.Language;
            readonly endpoint: number;
            readonly property: "country";
        };
        readonly is: (valueId: import("@zwave-js/core/safe").ValueID) => boolean;
        readonly meta: {
            readonly label: "Country code";
            readonly writeable: false;
            readonly type: "string";
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
    language: {
        readonly id: {
            commandClass: CommandClasses.Language;
            property: "language";
        };
        readonly endpoint: (endpoint?: number | undefined) => {
            readonly commandClass: CommandClasses.Language;
            readonly endpoint: number;
            readonly property: "language";
        };
        readonly is: (valueId: import("@zwave-js/core/safe").ValueID) => boolean;
        readonly meta: {
            readonly label: "Language code";
            readonly writeable: false;
            readonly type: "string";
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
}>;
export declare class LanguageCCAPI extends CCAPI {
    supportsCommand(cmd: LanguageCommand): Maybe<boolean>;
    get(): Promise<Pick<LanguageCCReport, "language" | "country"> | undefined>;
    set(language: string, country?: string): Promise<SupervisionResult | undefined>;
}
export declare class LanguageCC extends CommandClass {
    ccCommand: LanguageCommand;
    interview(applHost: ZWaveApplicationHost): Promise<void>;
    refreshValues(applHost: ZWaveApplicationHost): Promise<void>;
}
interface LanguageCCSetOptions extends CCCommandOptions {
    language: string;
    country?: string;
}
export declare class LanguageCCSet extends LanguageCC {
    constructor(host: ZWaveHost, options: CommandClassDeserializationOptions | LanguageCCSetOptions);
    private _language;
    get language(): string;
    set language(value: string);
    private _country;
    get country(): string | undefined;
    set country(value: string | undefined);
    serialize(): Buffer;
    toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry;
}
export declare class LanguageCCReport extends LanguageCC {
    constructor(host: ZWaveHost, options: CommandClassDeserializationOptions);
    readonly language: string;
    readonly country: string | undefined;
    toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry;
}
export declare class LanguageCCGet extends LanguageCC {
}
export {};
//# sourceMappingURL=LanguageCC.d.ts.map