import { CommandClasses, Duration, IVirtualEndpoint, IZWaveEndpoint, IZWaveNode, Maybe, NODE_ID_BROADCAST, SendCommandOptions, SupervisionResult, TXReport, ValueChangeOptions, ValueDB, ValueID } from "@zwave-js/core";
import type { ZWaveApplicationHost } from "@zwave-js/host";
import { OnlyMethods } from "@zwave-js/shared";
export type ValueIDProperties = Pick<ValueID, "property" | "propertyKey">;
/** Used to identify the method on the CC API class that handles setting values on nodes directly */
export declare const SET_VALUE: unique symbol;
export type SetValueImplementation = (property: ValueIDProperties, value: unknown, options?: SetValueAPIOptions) => Promise<SupervisionResult | undefined>;
/**
 * A generic options bag for the `setValue` API.
 * Each implementation will choose the options that are relevant for it, so you can use the same options everywhere.
 * @publicAPI
 */
export type SetValueAPIOptions = Partial<ValueChangeOptions>;
/** Used to identify the method on the CC API class that handles polling values from nodes */
export declare const POLL_VALUE: unique symbol;
export type PollValueImplementation<T = unknown> = (property: ValueIDProperties) => Promise<T | undefined>;
export declare function throwUnsupportedProperty(cc: CommandClasses, property: string | number): never;
export declare function throwUnsupportedPropertyKey(cc: CommandClasses, property: string | number, propertyKey: string | number): never;
export declare function throwMissingPropertyKey(cc: CommandClasses, property: string | number): never;
export declare function throwWrongValueType(cc: CommandClasses, property: string | number, expectedType: string, receivedType: string): never;
export interface SchedulePollOptions {
    duration?: Duration;
    transition?: "fast" | "slow";
}
/**
 * The base class for all CC APIs exposed via `Node.commandClasses.<CCName>`
 * @publicAPI
 */
export declare class CCAPI {
    protected readonly applHost: ZWaveApplicationHost;
    protected readonly endpoint: IZWaveEndpoint | IVirtualEndpoint;
    constructor(applHost: ZWaveApplicationHost, endpoint: IZWaveEndpoint | IVirtualEndpoint);
    static create<T extends CommandClasses>(ccId: T, applHost: ZWaveApplicationHost, endpoint: IZWaveEndpoint | IVirtualEndpoint, requireSupport?: boolean): CommandClasses extends T ? CCAPI : CCToAPI<T>;
    /**
     * The identifier of the Command Class this API is for
     */
    readonly ccId: CommandClasses;
    protected [SET_VALUE]: SetValueImplementation | undefined;
    /**
     * Can be used on supported CC APIs to set a CC value by property name (and optionally the property key)
     */
    get setValue(): SetValueImplementation | undefined;
    /** Whether a successful setValue call should imply that the value was successfully updated */
    isSetValueOptimistic(valueId: ValueID): boolean;
    protected [POLL_VALUE]: PollValueImplementation | undefined;
    /**
     * Can be used on supported CC APIs to poll a CC value by property name (and optionally the property key)
     */
    get pollValue(): PollValueImplementation | undefined;
    /**
     * Schedules a value to be polled after a given time. Schedules are deduplicated on a per-property basis.
     * @returns `true` if the poll was scheduled, `false` otherwise
     */
    protected schedulePoll(property: ValueIDProperties, expectedValue: unknown, { duration, transition }?: SchedulePollOptions): boolean;
    /**
     * Retrieves the version of the given CommandClass this endpoint implements
     */
    get version(): number;
    /** Determines if this simplified API instance may be used. */
    isSupported(): boolean;
    /**
     * Determine whether the linked node supports a specific command of this command class.
     * "unknown" means that the information has not been received yet
     */
    supportsCommand(command: number): Maybe<boolean>;
    protected assertSupportsCommand(commandEnum: unknown, command: number): void;
    protected assertPhysicalEndpoint(endpoint: IZWaveEndpoint | IVirtualEndpoint): asserts endpoint is IZWaveEndpoint;
    /** Returns the command options to use for sendCommand calls */
    protected get commandOptions(): SendCommandOptions;
    /** Creates an instance of this API, scoped to use the given options */
    withOptions(options: SendCommandOptions): this;
    /** Creates an instance of this API which (if supported) will return TX reports along with the result. */
    withTXReport<T extends this>(): WithTXReport<T>;
    protected isSinglecast(): this is this & {
        endpoint: IZWaveEndpoint;
    };
    protected isMulticast(): this is this & {
        endpoint: IVirtualEndpoint & {
            nodeId: number[];
        };
    };
    protected isBroadcast(): this is this & {
        endpoint: IVirtualEndpoint & {
            nodeId: typeof NODE_ID_BROADCAST;
        };
    };
    /**
     * Returns the node this CC API is linked to. Throws if the controller is not yet ready.
     */
    getNode(): IZWaveNode | undefined;
    /** Returns the value DB for this CC API's node (if it can be safely accessed) */
    protected tryGetValueDB(): ValueDB | undefined;
    /** Returns the value DB for this CC's node (or throws if it cannot be accessed) */
    protected getValueDB(): ValueDB;
}
/** A CC API that is only available for physical endpoints */
export declare class PhysicalCCAPI extends CCAPI {
    constructor(applHost: ZWaveApplicationHost, endpoint: IZWaveEndpoint | IVirtualEndpoint);
    protected readonly endpoint: IZWaveEndpoint;
}
export type APIConstructor<T extends CCAPI = CCAPI> = new (applHost: ZWaveApplicationHost, endpoint: IZWaveEndpoint | IVirtualEndpoint) => T;
type CCNameMap = {
    "Alarm Sensor": (typeof CommandClasses)["Alarm Sensor"];
    Association: (typeof CommandClasses)["Association"];
    "Association Group Information": (typeof CommandClasses)["Association Group Information"];
    "Barrier Operator": (typeof CommandClasses)["Barrier Operator"];
    Basic: (typeof CommandClasses)["Basic"];
    Battery: (typeof CommandClasses)["Battery"];
    "Binary Sensor": (typeof CommandClasses)["Binary Sensor"];
    "Binary Switch": (typeof CommandClasses)["Binary Switch"];
    "CRC-16 Encapsulation": (typeof CommandClasses)["CRC-16 Encapsulation"];
    "Central Scene": (typeof CommandClasses)["Central Scene"];
    "Climate Control Schedule": (typeof CommandClasses)["Climate Control Schedule"];
    Clock: (typeof CommandClasses)["Clock"];
    "Color Switch": (typeof CommandClasses)["Color Switch"];
    Configuration: (typeof CommandClasses)["Configuration"];
    "Door Lock": (typeof CommandClasses)["Door Lock"];
    "Door Lock Logging": (typeof CommandClasses)["Door Lock Logging"];
    "Entry Control": (typeof CommandClasses)["Entry Control"];
    "Firmware Update Meta Data": (typeof CommandClasses)["Firmware Update Meta Data"];
    "Humidity Control Mode": (typeof CommandClasses)["Humidity Control Mode"];
    "Humidity Control Operating State": (typeof CommandClasses)["Humidity Control Operating State"];
    "Humidity Control Setpoint": (typeof CommandClasses)["Humidity Control Setpoint"];
    "Inclusion Controller": (typeof CommandClasses)["Inclusion Controller"];
    Indicator: (typeof CommandClasses)["Indicator"];
    Irrigation: (typeof CommandClasses)["Irrigation"];
    Language: (typeof CommandClasses)["Language"];
    Lock: (typeof CommandClasses)["Lock"];
    "Manufacturer Proprietary": (typeof CommandClasses)["Manufacturer Proprietary"];
    "Manufacturer Specific": (typeof CommandClasses)["Manufacturer Specific"];
    Meter: (typeof CommandClasses)["Meter"];
    "Multi Channel Association": (typeof CommandClasses)["Multi Channel Association"];
    "Multi Channel": (typeof CommandClasses)["Multi Channel"];
    "Multi Command": (typeof CommandClasses)["Multi Command"];
    "Multilevel Sensor": (typeof CommandClasses)["Multilevel Sensor"];
    "Multilevel Switch": (typeof CommandClasses)["Multilevel Switch"];
    "No Operation": (typeof CommandClasses)["No Operation"];
    "Node Naming and Location": (typeof CommandClasses)["Node Naming and Location"];
    Notification: (typeof CommandClasses)["Notification"];
    Powerlevel: (typeof CommandClasses)["Powerlevel"];
    Protection: (typeof CommandClasses)["Protection"];
    "Scene Activation": (typeof CommandClasses)["Scene Activation"];
    "Scene Actuator Configuration": (typeof CommandClasses)["Scene Actuator Configuration"];
    "Scene Controller Configuration": (typeof CommandClasses)["Scene Controller Configuration"];
    "Schedule Entry Lock": (typeof CommandClasses)["Schedule Entry Lock"];
    "Security 2": (typeof CommandClasses)["Security 2"];
    Security: (typeof CommandClasses)["Security"];
    "Sound Switch": (typeof CommandClasses)["Sound Switch"];
    Supervision: (typeof CommandClasses)["Supervision"];
    "Thermostat Fan Mode": (typeof CommandClasses)["Thermostat Fan Mode"];
    "Thermostat Fan State": (typeof CommandClasses)["Thermostat Fan State"];
    "Thermostat Mode": (typeof CommandClasses)["Thermostat Mode"];
    "Thermostat Operating State": (typeof CommandClasses)["Thermostat Operating State"];
    "Thermostat Setback": (typeof CommandClasses)["Thermostat Setback"];
    "Thermostat Setpoint": (typeof CommandClasses)["Thermostat Setpoint"];
    Time: (typeof CommandClasses)["Time"];
    "Time Parameters": (typeof CommandClasses)["Time Parameters"];
    "User Code": (typeof CommandClasses)["User Code"];
    Version: (typeof CommandClasses)["Version"];
    "Wake Up": (typeof CommandClasses)["Wake Up"];
    "Z-Wave Plus Info": (typeof CommandClasses)["Z-Wave Plus Info"];
};
export type CCToName<CC extends CommandClasses> = {
    [K in keyof CCNameMap]: CCNameMap[K] extends CC ? K : never;
}[keyof CCNameMap];
export type CCNameOrId = CommandClasses | Extract<keyof CCAPIs, string>;
export type CCToAPI<CC extends CCNameOrId> = CC extends CommandClasses ? CCToName<CC> extends keyof CCAPIs ? CCAPIs[CCToName<CC>] : never : CC extends keyof CCAPIs ? CCAPIs[CC] : never;
export type APIMethodsOf<CC extends CCNameOrId> = Omit<OnlyMethods<CCToAPI<CC>>, "ccId" | "getNode" | "getNodeUnsafe" | "isSetValueOptimistic" | "isSupported" | "pollValue" | "setValue" | "version" | "supportsCommand" | "withOptions" | "withTXReport">;
export type OwnMethodsOf<API extends CCAPI> = Omit<OnlyMethods<API>, keyof OnlyMethods<CCAPI>>;
export type WrapWithTXReport<T> = [T] extends [Promise<infer U>] ? Promise<WrapWithTXReport<U>> : [T] extends [void] ? {
    txReport: TXReport | undefined;
} : {
    result: T;
    txReport: TXReport | undefined;
};
export type WithTXReport<API extends CCAPI> = Omit<API, keyof OwnMethodsOf<API> | "withOptions" | "withTXReport"> & {
    [K in keyof OwnMethodsOf<API>]: API[K] extends (...args: any[]) => any ? (...args: Parameters<API[K]>) => WrapWithTXReport<ReturnType<API[K]>> : never;
};
export declare function normalizeCCNameOrId(ccNameOrId: number | string): CommandClasses | undefined;
export interface CCAPIs {
    [Symbol.iterator](): Iterator<CCAPI>;
    "Alarm Sensor": import("../cc/AlarmSensorCC").AlarmSensorCCAPI;
    Association: import("../cc/AssociationCC").AssociationCCAPI;
    "Association Group Information": import("../cc/AssociationGroupInfoCC").AssociationGroupInfoCCAPI;
    "Barrier Operator": import("../cc/BarrierOperatorCC").BarrierOperatorCCAPI;
    Basic: import("../cc/BasicCC").BasicCCAPI;
    Battery: import("../cc/BatteryCC").BatteryCCAPI;
    "Binary Sensor": import("../cc/BinarySensorCC").BinarySensorCCAPI;
    "Binary Switch": import("../cc/BinarySwitchCC").BinarySwitchCCAPI;
    "CRC-16 Encapsulation": import("../cc/CRC16CC").CRC16CCAPI;
    "Central Scene": import("../cc/CentralSceneCC").CentralSceneCCAPI;
    "Climate Control Schedule": import("../cc/ClimateControlScheduleCC").ClimateControlScheduleCCAPI;
    Clock: import("../cc/ClockCC").ClockCCAPI;
    "Color Switch": import("../cc/ColorSwitchCC").ColorSwitchCCAPI;
    Configuration: import("../cc/ConfigurationCC").ConfigurationCCAPI;
    "Door Lock": import("../cc/DoorLockCC").DoorLockCCAPI;
    "Door Lock Logging": import("../cc/DoorLockLoggingCC").DoorLockLoggingCCAPI;
    "Entry Control": import("../cc/EntryControlCC").EntryControlCCAPI;
    "Firmware Update Meta Data": import("../cc/FirmwareUpdateMetaDataCC").FirmwareUpdateMetaDataCCAPI;
    "Humidity Control Mode": import("../cc/HumidityControlModeCC").HumidityControlModeCCAPI;
    "Humidity Control Operating State": import("../cc/HumidityControlOperatingStateCC").HumidityControlOperatingStateCCAPI;
    "Humidity Control Setpoint": import("../cc/HumidityControlSetpointCC").HumidityControlSetpointCCAPI;
    "Inclusion Controller": import("../cc/InclusionControllerCC").InclusionControllerCCAPI;
    Indicator: import("../cc/IndicatorCC").IndicatorCCAPI;
    Irrigation: import("../cc/IrrigationCC").IrrigationCCAPI;
    Language: import("../cc/LanguageCC").LanguageCCAPI;
    Lock: import("../cc/LockCC").LockCCAPI;
    "Manufacturer Proprietary": import("../cc/ManufacturerProprietaryCC").ManufacturerProprietaryCCAPI;
    "Manufacturer Specific": import("../cc/ManufacturerSpecificCC").ManufacturerSpecificCCAPI;
    Meter: import("../cc/MeterCC").MeterCCAPI;
    "Multi Channel Association": import("../cc/MultiChannelAssociationCC").MultiChannelAssociationCCAPI;
    "Multi Channel": import("../cc/MultiChannelCC").MultiChannelCCAPI;
    "Multi Command": import("../cc/MultiCommandCC").MultiCommandCCAPI;
    "Multilevel Sensor": import("../cc/MultilevelSensorCC").MultilevelSensorCCAPI;
    "Multilevel Switch": import("../cc/MultilevelSwitchCC").MultilevelSwitchCCAPI;
    "No Operation": import("../cc/NoOperationCC").NoOperationCCAPI;
    "Node Naming and Location": import("../cc/NodeNamingCC").NodeNamingAndLocationCCAPI;
    Notification: import("../cc/NotificationCC").NotificationCCAPI;
    Powerlevel: import("../cc/PowerlevelCC").PowerlevelCCAPI;
    Protection: import("../cc/ProtectionCC").ProtectionCCAPI;
    "Scene Activation": import("../cc/SceneActivationCC").SceneActivationCCAPI;
    "Scene Actuator Configuration": import("../cc/SceneActuatorConfigurationCC").SceneActuatorConfigurationCCAPI;
    "Scene Controller Configuration": import("../cc/SceneControllerConfigurationCC").SceneControllerConfigurationCCAPI;
    "Schedule Entry Lock": import("../cc/ScheduleEntryLockCC").ScheduleEntryLockCCAPI;
    "Security 2": import("../cc/Security2CC").Security2CCAPI;
    Security: import("../cc/SecurityCC").SecurityCCAPI;
    "Sound Switch": import("../cc/SoundSwitchCC").SoundSwitchCCAPI;
    Supervision: import("../cc/SupervisionCC").SupervisionCCAPI;
    "Thermostat Fan Mode": import("../cc/ThermostatFanModeCC").ThermostatFanModeCCAPI;
    "Thermostat Fan State": import("../cc/ThermostatFanStateCC").ThermostatFanStateCCAPI;
    "Thermostat Mode": import("../cc/ThermostatModeCC").ThermostatModeCCAPI;
    "Thermostat Operating State": import("../cc/ThermostatOperatingStateCC").ThermostatOperatingStateCCAPI;
    "Thermostat Setback": import("../cc/ThermostatSetbackCC").ThermostatSetbackCCAPI;
    "Thermostat Setpoint": import("../cc/ThermostatSetpointCC").ThermostatSetpointCCAPI;
    Time: import("../cc/TimeCC").TimeCCAPI;
    "Time Parameters": import("../cc/TimeParametersCC").TimeParametersCCAPI;
    "User Code": import("../cc/UserCodeCC").UserCodeCCAPI;
    Version: import("../cc/VersionCC").VersionCCAPI;
    "Wake Up": import("../cc/WakeUpCC").WakeUpCCAPI;
    "Z-Wave Plus Info": import("../cc/ZWavePlusCC").ZWavePlusCCAPI;
}
export {};
//# sourceMappingURL=API.d.ts.map