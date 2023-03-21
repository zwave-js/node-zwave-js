import { CommandClasses, IZWaveEndpoint, ValueID, ValueMetadata } from "@zwave-js/core";
import type { ZWaveApplicationHost } from "@zwave-js/host";
import type { Overwrite } from "alcalzone-shared/types";
import type { ValueIDProperties } from "./API";
export interface CCValueOptions {
    /**
     * Whether the CC value is internal. Internal values are not exposed to the user.
     */
    internal?: boolean;
    /**
     * The minimum CC version required for this value to exist.
     */
    minVersion?: number;
    /**
     * Whether this value represents a state (`true`) or a notification/event (`false`). Default: `true`
     */
    stateful?: boolean;
    /**
     * Omit this value from value logs. Default: `false`
     */
    secret?: boolean;
    /** Whether the CC value may exist on endpoints. Default: `true` */
    supportsEndpoints?: boolean;
    /**
     * Can be used to dynamically decide if this value should be created automatically.
     * This is ignored for dynamic values and defaults to `true` if not given.
     */
    autoCreate?: boolean | ((applHost: ZWaveApplicationHost, endpoint: IZWaveEndpoint) => boolean);
}
export declare const defaultCCValueOptions: {
    readonly internal: false;
    readonly minVersion: 1;
    readonly secret: false;
    readonly stateful: true;
    readonly supportsEndpoints: true;
    readonly autoCreate: true;
};
type DefaultOptions = typeof defaultCCValueOptions;
export type ExpandRecursively<T> = T extends (...args: infer A) => infer R ? [keyof T] extends [never] ? (...args: A) => ExpandRecursively<R> : ((...args: A) => ExpandRecursively<R>) & {
    [P in keyof T]: ExpandRecursively<T[P]>;
} : T extends object ? T extends infer O ? {
    [K in keyof O]: ExpandRecursively<O[K]>;
} : never : T;
export type ExpandRecursivelySkipMeta<T> = T extends (...args: infer A) => infer R ? [keyof T] extends [never] ? (...args: A) => ExpandRecursivelySkipMeta<R> : ((...args: A) => ExpandRecursivelySkipMeta<R>) & {
    [P in keyof T]: ExpandRecursivelySkipMeta<T[P]>;
} : T extends ValueMetadata ? T : T extends object ? T extends infer O ? {
    [K in keyof O]: ExpandRecursivelySkipMeta<O[K]>;
} : never : T;
type InferValueIDBase<TCommandClass extends CommandClasses, TBlueprint extends CCValueBlueprint, TWorker = {
    commandClass: TCommandClass;
} & Pick<TBlueprint, "property" | "propertyKey">> = {
    [K in keyof TWorker as unknown extends TWorker[K] ? never : K]: TWorker[K];
};
type ToStaticCCValues<TCommandClass extends CommandClasses, TValues extends Record<keyof TValues, CCValueBlueprint>> = Readonly<{
    [K in keyof TValues]: ExpandRecursively<InferStaticCCValue<TCommandClass, TValues[K]>>;
}>;
type ToDynamicCCValues<TCommandClass extends CommandClasses, TValues extends Record<keyof TValues, DynamicCCValueBlueprint<any>>> = Readonly<{
    [K in keyof TValues]: ExpandRecursively<InferDynamicCCValue<TCommandClass, TValues[K]>>;
}>;
type FnOrStatic<TArgs extends any[], TReturn> = ((...args: TArgs) => TReturn) | TReturn;
type ReturnTypeOrStatic<T> = T extends (...args: any[]) => infer R ? R : T;
type InferArgs<T extends FnOrStatic<any, any>[]> = T extends [
    (...args: infer A) => any,
    ...any
] ? A : T extends [any, ...infer R] ? InferArgs<R> : [];
export declare const V: {
    /** Defines multiple static CC values that belong to the same CC */
    defineStaticCCValues<TCommandClass extends CommandClasses, TValues extends Record<keyof TValues, CCValueBlueprint>>(commandClass: TCommandClass, values: TValues): TValues extends Record<keyof TValues, CCValueBlueprint> ? ExpandRecursively<Readonly<TValues extends infer T extends Record<keyof TValues, CCValueBlueprint> ? { [K in keyof T]: {
        readonly id: ExpandRecursively<InferValueIDBase<TCommandClass, TValues[K], {
            commandClass: TCommandClass;
        } & Pick<TValues[K], "property" | "propertyKey">>>;
        readonly endpoint: (endpoint?: number | undefined) => ExpandRecursively<Readonly<Pick<InferValueIDBase<TCommandClass, TValues[K], {
            commandClass: TCommandClass;
        } & Pick<TValues[K], "property" | "propertyKey">>, "commandClass"> & {
            endpoint: number;
        } & Omit<InferValueIDBase<TCommandClass, TValues[K], {
            commandClass: TCommandClass;
        } & Pick<TValues[K], "property" | "propertyKey">>, "commandClass">>>;
        readonly is: (valueId: ValueID) => boolean;
        readonly meta: ExpandRecursively<Readonly<DropOptional<ValueMetadata extends NonNullable<TValues[K]["meta"]> ? Readonly<{
            readonly type: "any";
            readonly readable: true;
            readonly writeable: true;
        }> : import("alcalzone-shared/types").Simplify<import("alcalzone-shared/types").Omit<Readonly<{
            readonly type: "any";
            readonly readable: true;
            readonly writeable: true;
        }>, ("type" | "readable" | "writeable") & keyof NonNullable<TValues[K]["meta"]>> & TValues[K]["meta"]>>>>;
        readonly options: ExpandRecursively<Readonly<DropOptional<CCValueOptions extends NonNullable<TValues[K]["options"]> ? {
            readonly internal: false;
            readonly minVersion: 1;
            readonly secret: false;
            readonly stateful: true;
            readonly supportsEndpoints: true;
            readonly autoCreate: true;
        } : import("alcalzone-shared/types").Simplify<import("alcalzone-shared/types").Omit<{
            readonly internal: false;
            readonly minVersion: 1;
            readonly secret: false;
            readonly stateful: true;
            readonly supportsEndpoints: true;
            readonly autoCreate: true;
        }, ("internal" | "stateful" | "secret" | "minVersion" | "supportsEndpoints" | "autoCreate") & keyof NonNullable<TValues[K]["options"]>> & TValues[K]["options"]>>>>;
    }; } : never>> : never;
    /** Defines multiple static CC values that belong to the same CC */
    defineDynamicCCValues<TCommandClass_1 extends CommandClasses, TValues_1 extends Record<keyof TValues_1, DynamicCCValueBlueprint<any>>>(commandClass: TCommandClass_1, values: TValues_1): TValues_1 extends Record<keyof TValues_1, DynamicCCValueBlueprint<any>> ? ExpandRecursively<Readonly<TValues_1 extends infer T_1 extends Record<keyof TValues_1, DynamicCCValueBlueprint<any>> ? { [K_1 in keyof T_1]: ExpandRecursively<InferDynamicCCValue<TCommandClass_1, TValues_1[K_1]>>; } : never>> : never;
    /** Returns a CC value definition that is named like the value `property` */
    staticProperty<TProp extends string | number, TMeta extends ValueMetadata, TOptions extends CCValueOptions>(property: TProp, meta?: TMeta | undefined, options?: TOptions | undefined): { [K_2 in TProp]: {
        property: TProp;
        meta: TMeta;
        options: TOptions;
    }; };
    /** Returns a CC value definition with the given name and `property` */
    staticPropertyWithName<TName extends string, TProp_1 extends string | number, TMeta_1 extends ValueMetadata, TOptions_1 extends CCValueOptions>(name: TName, property: TProp_1, meta?: TMeta_1 | undefined, options?: TOptions_1 | undefined): { [K_3 in TName]: {
        property: TProp_1;
        meta: TMeta_1;
        options: TOptions_1;
    }; };
    /** Returns a CC value definition with the given name, `property` and `propertyKey` */
    staticPropertyAndKeyWithName<TName_1 extends string, TProp_2 extends string | number, TKey extends string | number, TMeta_2 extends ValueMetadata, TOptions_2 extends CCValueOptions>(name: TName_1, property: TProp_2, propertyKey: TKey, meta?: TMeta_2 | undefined, options?: TOptions_2 | undefined): { [K_4 in TName_1]: {
        property: TProp_2;
        propertyKey: TKey;
        meta: TMeta_2;
        options: TOptions_2;
    }; };
    /** Returns a CC value definition with the given name and a dynamic `property` */
    dynamicPropertyWithName<TName_2 extends string, TProp_3 extends FnOrStatic<any[], string | number>, TMeta_3 extends FnOrStatic<any[], ValueMetadata> = ValueMetadata, TOptions_3 extends CCValueOptions = CCValueOptions>(name: TName_2, property: TProp_3, is: PartialCCValuePredicate, meta?: TMeta_3 | undefined, options?: TOptions_3 | undefined): { [K_5 in TName_2]: {
        (...args: InferArgs<[TProp_3, TMeta_3]>): {
            property: ReturnTypeOrStatic<TProp_3>;
            meta: ReturnTypeOrStatic<TMeta_3>;
        };
        is: PartialCCValuePredicate;
        options: TOptions_3;
    }; };
    /** Returns a CC value definition with the given name and a dynamic `property` */
    dynamicPropertyAndKeyWithName<TName_3 extends string, TProp_4 extends FnOrStatic<any[], string | number>, TKey_1 extends FnOrStatic<any[], string | number | undefined>, TMeta_4 extends FnOrStatic<any[], ValueMetadata> = ValueMetadata, TOptions_4 extends FnOrStatic<any[], CCValueOptions> = CCValueOptions>(name: TName_3, property: TProp_4, propertyKey: TKey_1, is: PartialCCValuePredicate, meta?: TMeta_4 | undefined, options?: TOptions_4 | undefined): { [K_6 in TName_3]: {
        (...args: InferArgs<[TProp_4, TKey_1, TMeta_4]>): {
            property: ReturnTypeOrStatic<TProp_4>;
            propertyKey: ReturnTypeOrStatic<TKey_1>;
            meta: ReturnTypeOrStatic<TMeta_4>;
        };
        is: PartialCCValuePredicate;
        options: TOptions_4;
    }; };
};
export interface CCValueBlueprint extends Readonly<ValueIDProperties> {
    readonly meta?: Readonly<ValueMetadata>;
    readonly options?: Readonly<CCValueOptions>;
}
export type CCValuePredicate = (valueId: ValueID) => boolean;
export type PartialCCValuePredicate = (properties: ValueIDProperties) => boolean;
/** A blueprint for a CC value which depends on one or more parameters */
export interface DynamicCCValueBlueprint<TArgs extends any[]> {
    (...args: TArgs): Omit<CCValueBlueprint, "options">;
    is: PartialCCValuePredicate;
    readonly options?: Readonly<CCValueOptions>;
}
type DropOptional<T> = {
    [K in keyof T as [undefined] extends [T[K]] ? never : K]: T[K];
};
type MergeOptions<TOptions extends CCValueOptions> = DropOptional<CCValueOptions extends TOptions ? DefaultOptions : Overwrite<DefaultOptions, TOptions>>;
type MergeMeta<TMeta extends ValueMetadata> = DropOptional<ValueMetadata extends TMeta ? (typeof ValueMetadata)["Any"] : Overwrite<(typeof ValueMetadata)["Any"], TMeta>>;
/** The common base type of all CC value definitions */
export interface CCValue {
    readonly id: Omit<ValueID, "endpoint">;
    endpoint(endpoint?: number): ValueID;
    readonly meta: ValueMetadata;
}
type AddCCValueProperties<TCommandClass extends CommandClasses, TBlueprint extends CCValueBlueprint, ValueIDBase extends Record<string, any> = InferValueIDBase<TCommandClass, TBlueprint>> = {
    /** Returns the value ID of this CC value, without endpoint information */
    get id(): ValueIDBase;
    /** Returns the value ID, specialized to the given endpoint */
    endpoint(endpoint?: number): Readonly<Pick<ValueIDBase, "commandClass"> & {
        endpoint: number;
    } & Omit<ValueIDBase, "commandClass">>;
    /** Whether the given value ID matches this value definition */
    is: CCValuePredicate;
    /** Returns the metadata for this value ID */
    get meta(): Readonly<MergeMeta<NonNullable<TBlueprint["meta"]>>>;
    /** Returns the value options for this value ID */
    get options(): Readonly<MergeOptions<NonNullable<TBlueprint["options"]>>>;
};
/** A CC value definition which depends on one or more parameters, transparently inferred from its arguments */
export type InferDynamicCCValue<TCommandClass extends CommandClasses, TBlueprint extends DynamicCCValueBlueprint<any[]>> = TBlueprint extends DynamicCCValueBlueprint<infer TArgs> ? {
    (...args: TArgs): Omit<InferStaticCCValue<TCommandClass, ReturnType<TBlueprint>>, "options" | "is">;
    /** Whether the given value ID matches this value definition */
    is: CCValuePredicate;
    readonly options: InferStaticCCValue<TCommandClass, ReturnType<TBlueprint> & {
        options: TBlueprint["options"];
    }>["options"];
} : never;
/** A static or evaluated CC value definition, transparently inferred from its arguments */
export type InferStaticCCValue<TCommandClass extends CommandClasses, TBlueprint extends CCValueBlueprint> = Readonly<AddCCValueProperties<TCommandClass, TBlueprint>>;
/** The generic variant of {@link InferStaticCCValue}, without inferring arguments */
export interface StaticCCValue extends CCValue {
    /** Whether the given value ID matches this value definition */
    is: CCValuePredicate;
    readonly options: Required<CCValueOptions>;
}
/** The generic variant of {@link InferDynamicCCValue}, without inferring arguments */
export type DynamicCCValue<TArgs extends any[] = any[]> = ExpandRecursivelySkipMeta<(...args: TArgs) => CCValue> & {
    /** Whether the given value ID matches this value definition */
    is: CCValuePredicate;
    readonly options: Required<CCValueOptions>;
};
export type StaticCCValueFactory<T> = (self: T) => StaticCCValue;
export interface CCValues {
    "Alarm Sensor": typeof import("../cc/AlarmSensorCC").AlarmSensorCCValues;
    Association: typeof import("../cc/AssociationCC").AssociationCCValues;
    "Association Group Information": typeof import("../cc/AssociationGroupInfoCC").AssociationGroupInfoCCValues;
    "Barrier Operator": typeof import("../cc/BarrierOperatorCC").BarrierOperatorCCValues;
    Basic: typeof import("../cc/BasicCC").BasicCCValues;
    Battery: typeof import("../cc/BatteryCC").BatteryCCValues;
    "Binary Sensor": typeof import("../cc/BinarySensorCC").BinarySensorCCValues;
    "Binary Switch": typeof import("../cc/BinarySwitchCC").BinarySwitchCCValues;
    "Central Scene": typeof import("../cc/CentralSceneCC").CentralSceneCCValues;
    "Climate Control Schedule": typeof import("../cc/ClimateControlScheduleCC").ClimateControlScheduleCCValues;
    "Color Switch": typeof import("../cc/ColorSwitchCC").ColorSwitchCCValues;
    Configuration: typeof import("../cc/ConfigurationCC").ConfigurationCCValues;
    "Door Lock": typeof import("../cc/DoorLockCC").DoorLockCCValues;
    "Door Lock Logging": typeof import("../cc/DoorLockLoggingCC").DoorLockLoggingCCValues;
    "Entry Control": typeof import("../cc/EntryControlCC").EntryControlCCValues;
    "Firmware Update Meta Data": typeof import("../cc/FirmwareUpdateMetaDataCC").FirmwareUpdateMetaDataCCValues;
    "Humidity Control Mode": typeof import("../cc/HumidityControlModeCC").HumidityControlModeCCValues;
    "Humidity Control Operating State": typeof import("../cc/HumidityControlOperatingStateCC").HumidityControlOperatingStateCCValues;
    "Humidity Control Setpoint": typeof import("../cc/HumidityControlSetpointCC").HumidityControlSetpointCCValues;
    Indicator: typeof import("../cc/IndicatorCC").IndicatorCCValues;
    Irrigation: typeof import("../cc/IrrigationCC").IrrigationCCValues;
    Language: typeof import("../cc/LanguageCC").LanguageCCValues;
    Lock: typeof import("../cc/LockCC").LockCCValues;
    "Manufacturer Specific": typeof import("../cc/ManufacturerSpecificCC").ManufacturerSpecificCCValues;
    Meter: typeof import("../cc/MeterCC").MeterCCValues;
    "Multi Channel Association": typeof import("../cc/MultiChannelAssociationCC").MultiChannelAssociationCCValues;
    "Multi Channel": typeof import("../cc/MultiChannelCC").MultiChannelCCValues;
    "Multilevel Sensor": typeof import("../cc/MultilevelSensorCC").MultilevelSensorCCValues;
    "Multilevel Switch": typeof import("../cc/MultilevelSwitchCC").MultilevelSwitchCCValues;
    "Node Naming and Location": typeof import("../cc/NodeNamingCC").NodeNamingAndLocationCCValues;
    Notification: typeof import("../cc/NotificationCC").NotificationCCValues;
    Protection: typeof import("../cc/ProtectionCC").ProtectionCCValues;
    "Scene Activation": typeof import("../cc/SceneActivationCC").SceneActivationCCValues;
    "Scene Actuator Configuration": typeof import("../cc/SceneActuatorConfigurationCC").SceneActuatorConfigurationCCValues;
    "Scene Controller Configuration": typeof import("../cc/SceneControllerConfigurationCC").SceneControllerConfigurationCCValues;
    "Schedule Entry Lock": typeof import("../cc/ScheduleEntryLockCC").ScheduleEntryLockCCValues;
    "Sound Switch": typeof import("../cc/SoundSwitchCC").SoundSwitchCCValues;
    Supervision: typeof import("../cc/SupervisionCC").SupervisionCCValues;
    "Thermostat Fan Mode": typeof import("../cc/ThermostatFanModeCC").ThermostatFanModeCCValues;
    "Thermostat Fan State": typeof import("../cc/ThermostatFanStateCC").ThermostatFanStateCCValues;
    "Thermostat Mode": typeof import("../cc/ThermostatModeCC").ThermostatModeCCValues;
    "Thermostat Operating State": typeof import("../cc/ThermostatOperatingStateCC").ThermostatOperatingStateCCValues;
    "Thermostat Setback": typeof import("../cc/ThermostatSetbackCC").ThermostatSetbackCCValues;
    "Thermostat Setpoint": typeof import("../cc/ThermostatSetpointCC").ThermostatSetpointCCValues;
    "Time Parameters": typeof import("../cc/TimeParametersCC").TimeParametersCCValues;
    "User Code": typeof import("../cc/UserCodeCC").UserCodeCCValues;
    Version: typeof import("../cc/VersionCC").VersionCCValues;
    "Wake Up": typeof import("../cc/WakeUpCC").WakeUpCCValues;
    "Z-Wave Plus Info": typeof import("../cc/ZWavePlusCC").ZWavePlusCCValues;
}
export {};
//# sourceMappingURL=Values.d.ts.map