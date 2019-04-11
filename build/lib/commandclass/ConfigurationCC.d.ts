/// <reference types="node" />
import { IDriver } from "../driver/IDriver";
import { Maybe } from "../values/Primitive";
import { CommandClass } from "./CommandClass";
export declare enum ConfigurationCommand {
    Set = 4,
    Get = 5,
    Report = 6,
    BulkSet = 7,
    BulkGet = 8,
    BulkReport = 9,
    NameGet = 10,
    NameReport = 11,
    InfoGet = 12,
    InfoReport = 13,
    PropertiesGet = 14,
    PropertiesReport = 15,
    DefaultReset = 1
}
export declare enum ValueFormat {
    SignedInteger = 0,
    UnsignedInteger = 1,
    Enumerated = 2,
    BitField = 3
}
export interface ParameterInfo {
    minValue?: number;
    maxValue?: ConfigValue;
    defaultValue?: ConfigValue;
    valueSize?: number;
    format?: ValueFormat;
    name?: string;
    info?: string;
    noBulkSupport?: boolean;
    isAdvanced?: boolean;
    isReadonly?: boolean;
    requiresReInclusion?: boolean;
}
export declare type ConfigValue = number | Set<number>;
export declare class ConfigurationCC extends CommandClass {
    nodeId: number;
    ccCommand?: ConfigurationCommand;
    constructor(driver: IDriver, nodeId?: number);
    constructor(driver: IDriver, nodeId: number, ccCommand: ConfigurationCommand.Get | ConfigurationCommand.NameGet | ConfigurationCommand.InfoGet | ConfigurationCommand.PropertiesGet, parameter: number);
    constructor(driver: IDriver, nodeId: number, ccCommand: ConfigurationCommand.Set, parameter: number, resetToDefault: boolean, valueSize?: number, value?: number);
    constructor(driver: IDriver, nodeId: number, ccCommand: ConfigurationCommand.BulkSet, parameters: number[], resetToDefault: boolean, valueSize?: number, values?: number[], handshake?: boolean);
    constructor(driver: IDriver, nodeId: number, ccCommand: ConfigurationCommand.BulkGet, parameters: number[]);
    defaultFlag: boolean;
    handshake: boolean;
    parameter: number;
    valueToSet: ConfigValue;
    valueSize: number;
    parameters: number[];
    valuesToSet: ConfigValue[];
    values: Map<number, ConfigValue>;
    paramInformation: Map<number, ParameterInfo>;
    private extendParamInformation;
    private getParamInformation;
    private _reportsToFollow;
    readonly reportsToFollow: number;
    private _nextParameter;
    readonly nextParameter: number;
    supportsCommand(cmd: ConfigurationCommand): Maybe<boolean>;
    serialize(): Buffer;
    deserialize(data: Buffer): void;
}
