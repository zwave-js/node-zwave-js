import { CommandClasses, ValueID, ValueMetadata } from "@zwave-js/core";
import type { Overwrite } from "alcalzone-shared/types";
import type { ValueIDProperties } from "./API";

// HINT: To fully view types for definitions created by this, open
// node_modules/typescript/lib/tsserver.js and change the definition of
// ts.defaultMaximumTruncationLength = 160
// to something higher like
// ts.defaultMaximumTruncationLength = 1000
// Then restart TS Server

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
	// TODO: Do we need this?
	/**
	 * Whether this value should always be created/persisted, even if it is undefined. Default: `false`
	 */
	forceCreation?: boolean;

	/** Whether the CC value may exist on endpoints. Default: `true` */
	supportsEndpoints?: boolean;
}

const defaultOptions = {
	internal: false,
	minVersion: 1,
	secret: false,
	stateful: true,
	supportsEndpoints: true,
} as const;

type DefaultOptions = typeof defaultOptions;

// expands object types recursively
type ExpandRecursively<T> =
	// Keep funktions but expand their return type
	T extends (...args: infer A) => infer R
		? (...args: A) => ExpandRecursively<R>
		: // : // Ignore the CCValueMeta type
		// T extends CCValueMeta
		// ? T
		// Expand object types
		T extends object
		? T extends infer O
			? { [K in keyof O]: ExpandRecursively<O[K]> }
			: never
		: // Fallback to the type itself if no match
		  T;

type InferValueIDBase<
	TCommandClass extends CommandClasses,
	TBlueprint extends CCValueBlueprint,
	TWorker = {
		commandClass: TCommandClass;
	} & Pick<TBlueprint, "property" | "propertyKey">,
> = {
	[K in keyof TWorker as unknown extends TWorker[K] ? never : K]: TWorker[K];
};

type ToStaticCCValues<
	TCommandClass extends CommandClasses,
	TValues extends Record<keyof TValues, CCValueBlueprint>,
> = Readonly<{
	[K in keyof TValues]: ExpandRecursively<
		StaticCCValue<TCommandClass, TValues[K]>
	>;
}>;

type ToDynamicCCValues<
	TCommandClass extends CommandClasses,
	TValues extends Record<keyof TValues, DynamicCCValueBlueprint<any>>,
> = Readonly<{
	[K in keyof TValues]: ExpandRecursively<
		DynamicCCValue<TCommandClass, TValues[K]>
	>;
}>;

type FnOrStatic<TArgs extends any[], TReturn> =
	| ((...args: TArgs) => TReturn)
	| TReturn;

type ReturnTypeOrStatic<T> = T extends (...args: any[]) => infer R ? R : T;

type InferArgs<T extends FnOrStatic<any, any>[]> = T extends [
	(...args: infer A) => any,
	...any,
]
	? A
	: T extends [any, ...infer R]
	? InferArgs<R>
	: [];

function evalOrStatic<T>(fnOrConst: T, ...args: any[]): ReturnTypeOrStatic<T> {
	return typeof fnOrConst === "function" ? fnOrConst(...args) : fnOrConst;
}

/** Defines a single static CC values that belong to a CC */
function defineStaticCCValue<
	TCommandClass extends CommandClasses,
	TBlueprint extends CCValueBlueprint,
>(
	commandClass: TCommandClass,
	blueprint: TBlueprint,
): ExpandRecursively<StaticCCValue<TCommandClass, TBlueprint>> {
	// Normalize value options
	const _blueprint = {
		...blueprint,
		options: {
			...defaultOptions,
			...blueprint.options,
		},
	};

	const valueId = {
		commandClass,
		property: _blueprint.property,
		propertyKey: _blueprint.propertyKey,
	};

	const ret: StaticCCValue<TCommandClass, TBlueprint> = {
		get id() {
			return { ...valueId };
		},
		endpoint: (endpoint: number = 0) => {
			if (!_blueprint.options.supportsEndpoints) endpoint = 0;
			return { ...valueId, endpoint };
		},
		get meta() {
			return { ...ValueMetadata.Any, ..._blueprint.meta } as any;
		},
		get options() {
			return { ..._blueprint.options } as any;
		},
	};

	return ret as any;
}

/** Defines a single CC value which depends on one or more parameters */
function defineDynamicCCValue<
	TCommandClass extends CommandClasses,
	TBlueprint extends DynamicCCValueBlueprint<any[]>,
>(
	commandClass: TCommandClass,
	blueprint: TBlueprint,
): ExpandRecursively<DynamicCCValue<TCommandClass, TBlueprint>> {
	return ((...args: Parameters<TBlueprint>) => {
		const _blueprint = blueprint(...args);

		// Normalize value options
		const actualBlueprint = {
			..._blueprint,
			options: {
				...defaultOptions,
				..._blueprint.options,
			},
		};

		const valueId = {
			commandClass,
			property: actualBlueprint.property,
			propertyKey: actualBlueprint.propertyKey,
		};

		const ret: StaticCCValue<TCommandClass, ReturnType<TBlueprint>> = {
			get id() {
				return { ...valueId };
			},
			endpoint: (endpoint: number = 0) => {
				if (!actualBlueprint.options.supportsEndpoints) endpoint = 0;
				return { ...valueId, endpoint };
			},
			get meta() {
				return { ...ValueMetadata.Any, ...actualBlueprint.meta } as any;
			},
			get options() {
				return { ..._blueprint.options } as any;
			},
		};

		return ret;
	}) as any;
}

// Namespace for utilities to define CC values
export const V = {
	/** Defines multiple static CC values that belong to the same CC */
	defineStaticCCValues<
		TCommandClass extends CommandClasses,
		TValues extends Record<keyof TValues, CCValueBlueprint>,
	>(
		commandClass: TCommandClass,
		values: TValues,
	): TValues extends Record<keyof TValues, CCValueBlueprint>
		? ExpandRecursively<ToStaticCCValues<TCommandClass, TValues>>
		: never {
		return Object.fromEntries(
			Object.entries<CCValueBlueprint>(values).map(([key, blueprint]) => [
				key,
				defineStaticCCValue(commandClass, blueprint),
			]),
		) as any;
	},

	/** Defines multiple static CC values that belong to the same CC */
	defineDynamicCCValues<
		TCommandClass extends CommandClasses,
		TValues extends Record<keyof TValues, DynamicCCValueBlueprint<any>>,
	>(
		commandClass: TCommandClass,
		values: TValues,
	): TValues extends Record<keyof TValues, DynamicCCValueBlueprint<any>>
		? ExpandRecursively<ToDynamicCCValues<TCommandClass, TValues>>
		: never {
		return Object.fromEntries(
			Object.entries<DynamicCCValueBlueprint<any>>(values).map(
				([key, blueprint]) => [
					key,
					defineDynamicCCValue(commandClass, blueprint),
				],
			),
		) as any;
	},

	/** Returns a CC value definition that is named like the value `property` */
	staticProperty<
		TProp extends string | number,
		TMeta extends ValueMetadata,
		TOptions extends CCValueOptions,
	>(
		property: TProp,
		meta?: TMeta,
		options?: TOptions,
	): {
		[K in TProp]: {
			property: TProp;
			meta: TMeta;
			options: TOptions;
		};
	} {
		return {
			[property]: {
				property,
				meta,
				options,
			},
		} as any;
	},

	/** Returns a CC value definition with the given name and `property` */
	staticPropertyWithName<
		TName extends string,
		TProp extends string | number,
		TMeta extends ValueMetadata,
		TOptions extends CCValueOptions,
	>(
		name: TName,
		property: TProp,
		meta?: TMeta,
		options?: TOptions,
	): {
		[K in TName]: {
			property: TProp;
			meta: TMeta;
			options: TOptions;
		};
	} {
		return {
			[name]: {
				property,
				meta,
				options,
			},
		} as any;
	},

	/** Returns a CC value definition with the given name, `property` and `propertyKey` */
	staticPropertyAndKeyWithName<
		TName extends string,
		TProp extends string | number,
		TKey extends string | number,
		TMeta extends ValueMetadata,
		TOptions extends CCValueOptions,
	>(
		name: TName,
		property: TProp,
		propertyKey: TKey,
		meta?: TMeta,
		options?: TOptions,
	): {
		[K in TName]: {
			property: TProp;
			propertyKey: TKey;
			meta: TMeta;
			options: TOptions;
		};
	} {
		return {
			[name]: {
				property,
				propertyKey,
				meta,
				options,
			},
		} as any;
	},

	/** Returns a CC value definition with the given name and a dynamic `property` */
	dynamicPropertyWithName<
		TName extends string,
		TProp extends FnOrStatic<any[], ValueIDProperties["property"]>,
		TMeta extends FnOrStatic<any[], ValueMetadata> = ValueMetadata,
		TOptions extends FnOrStatic<any[], CCValueOptions> = CCValueOptions,
	>(
		name: TName,
		property: TProp,
		meta?: TMeta,
		options?: TOptions,
	): {
		[K in TName]: (...args: InferArgs<[TProp, TMeta, TOptions]>) => {
			property: ReturnTypeOrStatic<TProp>;
			meta: ReturnTypeOrStatic<TMeta>;
			options: ReturnTypeOrStatic<TOptions>;
		};
	} {
		return {
			[name]: (...args: InferArgs<[TProp, TMeta, TOptions]>) => ({
				property: evalOrStatic(property, ...args),
				meta: evalOrStatic(meta, ...args),
				options: evalOrStatic(options, ...args),
			}),
		} as any;
	},

	/** Returns a CC value definition with the given name and a dynamic `property` */
	dynamicPropertyAndKeyWithName<
		TName extends string,
		TProp extends FnOrStatic<any[], ValueIDProperties["property"]>,
		TKey extends FnOrStatic<any[], ValueIDProperties["propertyKey"]>,
		TMeta extends FnOrStatic<any[], ValueMetadata> = ValueMetadata,
		TOptions extends FnOrStatic<any[], CCValueOptions> = CCValueOptions,
	>(
		name: TName,
		property: TProp,
		propertyKey: TKey,
		meta?: TMeta,
		options?: TOptions,
	): {
		[K in TName]: (...args: InferArgs<[TProp, TKey, TMeta, TOptions]>) => {
			property: ReturnTypeOrStatic<TProp>;
			propertyKey: ReturnTypeOrStatic<TKey>;
			meta: ReturnTypeOrStatic<TMeta>;
			options: ReturnTypeOrStatic<TOptions>;
		};
	} {
		return {
			[name]: (...args: InferArgs<[TProp, TKey, TMeta, TOptions]>) => {
				return {
					property: evalOrStatic(property, ...args),
					propertyKey: evalOrStatic(propertyKey, ...args),
					meta: evalOrStatic(meta, ...args),
					options: evalOrStatic(options, ...args),
				};
			},
		} as any;
	},
};

// export interface CCValueDynamic extends StaticCCValue {
// 	/** Evaluates the dynamic part of a CC value definition, e.g. by testing support */
// 	eval(
// 		applHost: ZWaveApplicationHost,
// 		endpoint: IZWaveEndpoint,
// 	): StaticCCValue;
// }

export interface CCValueBlueprint extends Readonly<ValueIDProperties> {
	readonly meta?: Readonly<ValueMetadata>;
	readonly options?: Readonly<CCValueOptions>;
}

/** A blueprint for a CC value which depends on one or more parameters */
export type DynamicCCValueBlueprint<TArgs extends any[]> = (
	...args: TArgs
) => CCValueBlueprint;

type DropOptional<T> = {
	[K in keyof T as [undefined] extends [T[K]] ? never : K]: T[K];
};

type MergeOptions<TOptions extends CCValueOptions> = DropOptional<
	CCValueOptions extends TOptions
		? // When the type cannot be inferred exactly (not given), default to DefaultOptions
		  DefaultOptions
		: Overwrite<DefaultOptions, TOptions>
>;

type MergeMeta<TMeta extends ValueMetadata> = DropOptional<
	ValueMetadata extends TMeta
		? // When the type cannot be inferred exactly (not given), default to ValueMetadata.Any
		  typeof ValueMetadata["Any"]
		: Overwrite<typeof ValueMetadata["Any"], TMeta>
>;

/** The common base type of all CC value definitions */
export interface CCValue {
	readonly id: Omit<ValueID, "endpoint">;
	endpoint(endpoint?: number): ValueID;
	readonly meta: ValueMetadata;
	readonly options: CCValueOptions;
}

type AddCCValueProperties<
	TCommandClass extends CommandClasses,
	TBlueprint extends CCValueBlueprint,
	ValueIDBase extends Record<string, any> = InferValueIDBase<
		TCommandClass,
		TBlueprint
	>,
> = {
	/** Returns the value ID of this CC value, without endpoint information */
	get id(): ValueIDBase;

	/** Returns the value ID, specialized to the given endpoint */
	endpoint(
		endpoint?: number,
	): Readonly<
		Pick<ValueIDBase, "commandClass"> & { endpoint: number } & Omit<
				ValueIDBase,
				"commandClass"
			>
	>;

	/** Returns the metadata for this value ID */
	get meta(): Readonly<MergeMeta<NonNullable<TBlueprint["meta"]>>>;
	/** Returns the value options for this value ID */
	get options(): Readonly<MergeOptions<NonNullable<TBlueprint["options"]>>>;
};

/** A blueprint for a CC value which depends on one or more parameters */
export type DynamicCCValue<
	TCommandClass extends CommandClasses,
	TBlueprint extends DynamicCCValueBlueprint<any[]>,
> = TBlueprint extends DynamicCCValueBlueprint<infer TArgs>
	? (...args: TArgs) => StaticCCValue<TCommandClass, ReturnType<TBlueprint>>
	: never;

/** A static or evaluated CC value definition */
export type StaticCCValue<
	TCommandClass extends CommandClasses,
	TBlueprint extends CCValueBlueprint,
> = Readonly<AddCCValueProperties<TCommandClass, TBlueprint>>;

// This interface is auto-generated by maintenance/generateCCValuesInterface.ts
// Do not edit it by hand or your changes will be lost
export interface CCValues {
	// AUTO GENERATION BELOW
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
	"Sound Switch": typeof import("../cc/SoundSwitchCC").SoundSwitchCCValues;
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
