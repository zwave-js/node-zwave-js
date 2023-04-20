/// <reference types="node" />
import type { ParamInfoMap } from "@zwave-js/config";
import { CommandClasses, ConfigurationMetadata, ConfigValueFormat, Maybe, MessageOrCCLogEntry, SupervisionResult, ValueID, ZWaveError, ZWaveErrorCodes } from "@zwave-js/core/safe";
import type { ZWaveApplicationHost, ZWaveHost } from "@zwave-js/host/safe";
import { CCAPI, PollValueImplementation, POLL_VALUE, SetValueImplementation, SET_VALUE } from "../lib/API";
import { CommandClass, type CCCommandOptions, type CommandClassDeserializationOptions } from "../lib/CommandClass";
import { ConfigurationCommand, ConfigValue } from "../lib/_Types";
export declare class ConfigurationCCError extends ZWaveError {
    readonly message: string;
    readonly code: ZWaveErrorCodes;
    readonly argument: number;
    constructor(message: string, code: ZWaveErrorCodes, argument: number);
}
export declare const ConfigurationCCValues: Readonly<{
    paramInformation: ((parameter: number, bitMask?: number | undefined) => {
        readonly endpoint: (endpoint?: number | undefined) => {
            readonly commandClass: CommandClasses.Configuration;
            readonly endpoint: number;
            readonly property: number;
            readonly propertyKey: number | undefined;
        };
        readonly id: {
            commandClass: CommandClasses.Configuration;
            property: number;
            propertyKey: number | undefined;
        };
        readonly meta: {
            readonly type: "any";
            readonly readable: true;
            readonly writeable: true;
        };
    }) & {
        is: (valueId: ValueID) => boolean;
        readonly options: {
            readonly internal: false;
            readonly stateful: true;
            readonly secret: false;
            readonly minVersion: 1;
            readonly autoCreate: true;
            readonly supportsEndpoints: false;
        };
    };
    isParamInformationFromConfig: {
        readonly id: {
            commandClass: CommandClasses.Configuration;
            property: "isParamInformationFromConfig";
        };
        readonly endpoint: (endpoint?: number | undefined) => {
            readonly commandClass: CommandClasses.Configuration;
            readonly endpoint: number;
            readonly property: "isParamInformationFromConfig";
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
            readonly autoCreate: true;
            readonly internal: true;
            readonly supportsEndpoints: false;
        };
    };
}>;
export type ConfigurationCCAPISetOptions = {
    parameter: number;
} & ({
    bitMask?: undefined;
    value: ConfigValue;
} | {
    bitMask?: undefined;
    value: ConfigValue;
    valueSize: 1 | 2 | 4;
    valueFormat: ConfigValueFormat;
} | {
    bitMask: number;
    value: number;
});
export declare class ConfigurationCCAPI extends CCAPI {
    supportsCommand(cmd: ConfigurationCommand): Maybe<boolean>;
    protected [SET_VALUE]: SetValueImplementation;
    protected [POLL_VALUE]: PollValueImplementation;
    /**
     * Requests the current value of a given config parameter from the device.
     * This may timeout and return `undefined` if the node does not respond.
     * If the node replied with a different parameter number, a `ConfigurationCCError`
     * is thrown with the `argument` property set to the reported parameter number.
     */
    get(parameter: number, options?: {
        valueBitMask?: number;
        allowUnexpectedResponse?: boolean;
    }): Promise<ConfigValue | undefined>;
    /**
     * Requests the current value of the config parameters from the device.
     * When the node does not respond due to a timeout, the `value` in the returned array will be `undefined`.
     */
    getBulk(options: {
        parameter: number;
        bitMask?: number;
    }[]): Promise<{
        parameter: number;
        bitMask?: number;
        value: ConfigValue | undefined;
    }[]>;
    /**
     * Sets a new value for a given config parameter of the device.
     */
    set(options: ConfigurationCCAPISetOptions): Promise<SupervisionResult | undefined>;
    /**
     * Sets new values for multiple config parameters of the device. Uses the `BulkSet` command if supported, otherwise falls back to individual `Set` commands.
     */
    setBulk(values: ConfigurationCCAPISetOptions[]): Promise<SupervisionResult | undefined>;
    /**
     * Resets a configuration parameter to its default value.
     *
     * WARNING: This will throw on legacy devices (ConfigurationCC v3 and below)
     */
    reset(parameter: number): Promise<SupervisionResult | undefined>;
    /**
     * Resets multiple configuration parameters to their default value. Uses BulkSet if supported, otherwise falls back to individual Set commands.
     *
     * WARNING: This will throw on legacy devices (ConfigurationCC v3 and below)
     */
    resetBulk(parameters: number[]): Promise<void>;
    /** Resets all configuration parameters to their default value */
    resetAll(): Promise<void>;
    getProperties(parameter: number): Promise<Pick<ConfigurationCCPropertiesReport, "minValue" | "maxValue" | "valueSize" | "defaultValue" | "noBulkSupport" | "isAdvanced" | "valueFormat" | "nextParameter" | "altersCapabilities" | "isReadonly"> | undefined>;
    /** Requests the name of a configuration parameter from the node */
    getName(parameter: number): Promise<string | undefined>;
    /** Requests usage info for a configuration parameter from the node */
    getInfo(parameter: number): Promise<string | undefined>;
    /**
     * This scans the node for the existing parameters. Found parameters will be reported
     * through the `value added` and `value updated` events.
     *
     * WARNING: This method throws for newer devices.
     *
     * WARNING: On nodes implementing V1 and V2, this process may take
     * **up to an hour**, depending on the configured timeout.
     *
     * WARNING: On nodes implementing V2, all parameters after 255 will be ignored.
     */
    scanParametersLegacy(): Promise<void>;
}
export declare class ConfigurationCC extends CommandClass {
    ccCommand: ConfigurationCommand;
    interview(applHost: ZWaveApplicationHost): Promise<void>;
    refreshValues(applHost: ZWaveApplicationHost): Promise<void>;
    /**
     * Whether this node's param information was loaded from a config file.
     * If this is true, we don't trust what the node reports
     */
    protected isParamInformationFromConfig(applHost: ZWaveApplicationHost): boolean;
    /**
     * **INTERNAL:** Returns the param info that was queried for this node. This returns the information that was returned by the node
     * and does not include partial parameters.
     */
    getQueriedParamInfos(applHost: ZWaveApplicationHost): Record<number, ConfigurationMetadata>;
    /**
     * Returns stored config parameter metadata for all partial config params addressed with the given parameter number
     */
    getPartialParamInfos(applHost: ZWaveApplicationHost, parameter: number): (ValueID & {
        metadata: ConfigurationMetadata;
    })[];
    /**
     * Computes the full value of a parameter after applying a partial param value
     */
    composePartialParamValue(applHost: ZWaveApplicationHost, parameter: number, bitMask: number, partialValue: number): number;
    /**
     * Computes the full value of a parameter after applying multiple partial param values
     */
    composePartialParamValues(applHost: ZWaveApplicationHost, parameter: number, partials: {
        bitMask: number;
        partialValue: number;
    }[]): number;
    /** Deserializes the config parameter info from a config file */
    deserializeParamInformationFromConfig(applHost: ZWaveApplicationHost, config: ParamInfoMap): void;
    translatePropertyKey(applHost: ZWaveApplicationHost, property: string | number, propertyKey?: string | number): string | undefined;
    translateProperty(applHost: ZWaveApplicationHost, property: string | number, propertyKey?: string | number): string;
}
export declare class ConfigurationCCReport extends ConfigurationCC {
    constructor(host: ZWaveHost, options: CommandClassDeserializationOptions);
    persistValues(applHost: ZWaveApplicationHost): boolean;
    private _parameter;
    get parameter(): number;
    private _value;
    get value(): ConfigValue;
    private _valueSize;
    get valueSize(): number;
    toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry;
}
interface ConfigurationCCGetOptions extends CCCommandOptions {
    parameter: number;
    /**
     * If this is `true`, responses with different parameters than expected are accepted
     * and treated as hints for the first parameter number.
     */
    allowUnexpectedResponse?: boolean;
}
export declare class ConfigurationCCGet extends ConfigurationCC {
    constructor(host: ZWaveHost, options: CommandClassDeserializationOptions | ConfigurationCCGetOptions);
    parameter: number;
    allowUnexpectedResponse: boolean;
    serialize(): Buffer;
    toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry;
}
type ConfigurationCCSetOptions = CCCommandOptions & ({
    parameter: number;
    resetToDefault: true;
} | {
    parameter: number;
    resetToDefault?: false;
    valueSize: number;
    /** How the value is encoded. Defaults to SignedInteger */
    valueFormat?: ConfigValueFormat;
    value: ConfigValue;
});
export declare class ConfigurationCCSet extends ConfigurationCC {
    constructor(host: ZWaveHost, options: CommandClassDeserializationOptions | ConfigurationCCSetOptions);
    resetToDefault: boolean;
    parameter: number;
    valueSize: number | undefined;
    valueFormat: ConfigValueFormat | undefined;
    value: ConfigValue | undefined;
    serialize(): Buffer;
    toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry;
}
type ConfigurationCCBulkSetOptions = CCCommandOptions & {
    parameters: number[];
    handshake?: boolean;
} & ({
    resetToDefault: true;
} | {
    resetToDefault?: false;
    valueSize: number;
    valueFormat?: ConfigValueFormat;
    values: number[];
});
export declare class ConfigurationCCBulkSet extends ConfigurationCC {
    constructor(host: ZWaveHost, options: CommandClassDeserializationOptions | ConfigurationCCBulkSetOptions);
    private _parameters;
    get parameters(): number[];
    private _resetToDefault;
    get resetToDefault(): boolean;
    private _valueSize;
    get valueSize(): number;
    private _valueFormat;
    get valueFormat(): ConfigValueFormat;
    private _values;
    get values(): number[];
    private _handshake;
    get handshake(): boolean;
    serialize(): Buffer;
    toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry;
}
export declare class ConfigurationCCBulkReport extends ConfigurationCC {
    constructor(host: ZWaveHost, options: CommandClassDeserializationOptions);
    persistValues(applHost: ZWaveApplicationHost): boolean;
    private _reportsToFollow;
    get reportsToFollow(): number;
    getPartialCCSessionId(): Record<string, any> | undefined;
    expectMoreMessages(): boolean;
    private _defaultValues;
    get defaultValues(): boolean;
    private _isHandshakeResponse;
    get isHandshakeResponse(): boolean;
    private _valueSize;
    get valueSize(): number;
    private _values;
    get values(): ReadonlyMap<number, ConfigValue>;
    toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry;
}
interface ConfigurationCCBulkGetOptions extends CCCommandOptions {
    parameters: number[];
}
export declare class ConfigurationCCBulkGet extends ConfigurationCC {
    constructor(host: ZWaveHost, options: CommandClassDeserializationOptions | ConfigurationCCBulkGetOptions);
    private _parameters;
    get parameters(): number[];
    serialize(): Buffer;
    toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry;
}
export declare class ConfigurationCCNameReport extends ConfigurationCC {
    constructor(host: ZWaveHost, options: CommandClassDeserializationOptions);
    persistValues(applHost: ZWaveApplicationHost): boolean;
    private _parameter;
    get parameter(): number;
    private _name;
    get name(): string;
    private _reportsToFollow;
    get reportsToFollow(): number;
    getPartialCCSessionId(): Record<string, any> | undefined;
    expectMoreMessages(): boolean;
    mergePartialCCs(applHost: ZWaveApplicationHost, partials: ConfigurationCCNameReport[]): void;
    toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry;
}
export declare class ConfigurationCCNameGet extends ConfigurationCC {
    constructor(host: ZWaveHost, options: CommandClassDeserializationOptions | ConfigurationCCGetOptions);
    parameter: number;
    serialize(): Buffer;
    toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry;
}
export declare class ConfigurationCCInfoReport extends ConfigurationCC {
    constructor(host: ZWaveHost, options: CommandClassDeserializationOptions);
    persistValues(applHost: ZWaveApplicationHost): boolean;
    private _parameter;
    get parameter(): number;
    private _info;
    get info(): string;
    private _reportsToFollow;
    get reportsToFollow(): number;
    getPartialCCSessionId(): Record<string, any> | undefined;
    expectMoreMessages(): boolean;
    mergePartialCCs(applHost: ZWaveApplicationHost, partials: ConfigurationCCInfoReport[]): void;
    toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry;
}
export declare class ConfigurationCCInfoGet extends ConfigurationCC {
    constructor(host: ZWaveHost, options: CommandClassDeserializationOptions | ConfigurationCCGetOptions);
    parameter: number;
    serialize(): Buffer;
    toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry;
}
export declare class ConfigurationCCPropertiesReport extends ConfigurationCC {
    constructor(host: ZWaveHost, options: CommandClassDeserializationOptions);
    persistValues(applHost: ZWaveApplicationHost): boolean;
    private _parameter;
    get parameter(): number;
    private _valueSize;
    get valueSize(): number;
    private _valueFormat;
    get valueFormat(): ConfigValueFormat;
    private _minValue;
    get minValue(): ConfigValue | undefined;
    private _maxValue;
    get maxValue(): ConfigValue | undefined;
    private _defaultValue;
    get defaultValue(): ConfigValue | undefined;
    private _nextParameter;
    get nextParameter(): number;
    private _altersCapabilities;
    get altersCapabilities(): boolean | undefined;
    private _isReadonly;
    get isReadonly(): boolean | undefined;
    private _isAdvanced;
    get isAdvanced(): boolean | undefined;
    private _noBulkSupport;
    get noBulkSupport(): boolean | undefined;
    toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry;
}
export declare class ConfigurationCCPropertiesGet extends ConfigurationCC {
    constructor(host: ZWaveHost, options: CommandClassDeserializationOptions | ConfigurationCCGetOptions);
    parameter: number;
    serialize(): Buffer;
    toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry;
}
export declare class ConfigurationCCDefaultReset extends ConfigurationCC {
}
export {};
//# sourceMappingURL=ConfigurationCC.d.ts.map