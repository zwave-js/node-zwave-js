import {
	CommandClasses,
	IZWaveEndpoint,
	ValueID,
	ValueMetadata,
} from "@zwave-js/core";
import type { ZWaveApplicationHost } from "@zwave-js/host";
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

	/** Whether the CC value may exist on endpoints. Default: `true` */
	supportsEndpoints?: boolean;

	/**
	 * Can be used to dynamically decide if this value should be created automatically.
	 * This is ignored for dynamic values and defaults to `true` if not given.
	 */
	autoCreate?:
		| boolean
		| ((
				applHost: ZWaveApplicationHost,
				endpoint: IZWaveEndpoint,
		  ) => boolean);
}

export const defaultCCValueOptions = {
	internal: false,
	minVersion: 1,
	secret: false,
	stateful: true,
	supportsEndpoints: true,
	autoCreate: true,
} as const;

type DefaultOptions = typeof defaultCCValueOptions;

// expands object types recursively
export type ExpandRecursively<T> =
	// Split functions with properties into the function and object parts
	T extends (...args: infer A) => infer R
		? [keyof T] extends [never]
			? (...args: A) => ExpandRecursively<R>
			: ((...args: A) => ExpandRecursively<R>) & {
					[P in keyof T]: ExpandRecursively<T[P]>;
			  }
		: // Expand object types
		T extends object
		? T extends infer O
			? { [K in keyof O]: ExpandRecursively<O[K]> }
			: never
		: // Fallback to the type itself if no match
		  T;

export type ExpandRecursivelySkipMeta<T> =
	// Split functions with properties into the function and object parts
	T extends (...args: infer A) => infer R
		? [keyof T] extends [never]
			? (...args: A) => ExpandRecursivelySkipMeta<R>
			: ((...args: A) => ExpandRecursivelySkipMeta<R>) & {
					[P in keyof T]: ExpandRecursivelySkipMeta<T[P]>;
			  }
		: // Ignore the ValueMetadata type
		T extends ValueMetadata
		? T
		: // Expand object types
		T extends object
		? T extends infer O
			? { [K in keyof O]: ExpandRecursivelySkipMeta<O[K]> }
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
		InferStaticCCValue<TCommandClass, TValues[K]>
	>;
}>;

type ToDynamicCCValues<
	TCommandClass extends CommandClasses,
	TValues extends Record<keyof TValues, DynamicCCValueBlueprint<any>>,
> = Readonly<{
	[K in keyof TValues]: ExpandRecursively<
		InferDynamicCCValue<TCommandClass, TValues[K]>
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
): ExpandRecursively<InferStaticCCValue<TCommandClass, TBlueprint>> {
	// Normalize value options
	const _blueprint = {
		...blueprint,
		options: {
			...defaultCCValueOptions,
			...blueprint.options,
		},
	};

	const valueId = {
		commandClass,
		property: _blueprint.property,
		propertyKey: _blueprint.propertyKey,
	};

	const ret: InferStaticCCValue<TCommandClass, TBlueprint> = {
		get id() {
			return { ...valueId };
		},
		endpoint: (endpoint: number = 0) => {
			if (!_blueprint.options.supportsEndpoints) endpoint = 0;
			return { ...valueId, endpoint } as any;
		},
		is: (testValueId) => {
			return (
				valueId.commandClass === testValueId.commandClass &&
				valueId.property === testValueId.property &&
				valueId.propertyKey === testValueId.propertyKey
			);
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
): ExpandRecursively<InferDynamicCCValue<TCommandClass, TBlueprint>> {
	const options = {
		...defaultCCValueOptions,
		...blueprint.options,
	};

	const ret: ExpandRecursively<
		InferDynamicCCValue<TCommandClass, TBlueprint>
	> = ((...args: Parameters<TBlueprint>) => {
		const _blueprint = blueprint(...args);

		// Normalize value options
		const actualBlueprint = {
			..._blueprint,
		};

		const valueId = {
			commandClass,
			property: actualBlueprint.property,
			propertyKey: actualBlueprint.propertyKey,
		};

		const value: Omit<
			InferStaticCCValue<TCommandClass, ReturnType<TBlueprint>>,
			"options" | "is"
		> = {
			get id() {
				return { ...valueId };
			},
			endpoint: (endpoint: number = 0) => {
				if (!options.supportsEndpoints) endpoint = 0;
				return { ...valueId, endpoint } as any;
			},
			get meta() {
				return { ...ValueMetadata.Any, ...actualBlueprint.meta } as any;
			},
		};

		return value;
	}) as any;

	Object.defineProperty(ret, "options", {
		configurable: false,
		enumerable: true,
		get() {
			return { ...options };
		},
	});

	Object.defineProperty(ret, "is", {
		configurable: false,
		enumerable: false,
		writable: false,
		value: (id: ValueID) =>
			id.commandClass === commandClass && blueprint.is(id),
	});

	return ret;
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
		TOptions extends CCValueOptions = CCValueOptions,
	>(
		name: TName,
		property: TProp,
		is: PartialCCValuePredicate,
		meta?: TMeta,
		options?: TOptions | undefined,
	): {
		[K in TName]: {
			(...args: InferArgs<[TProp, TMeta]>): {
				property: ReturnTypeOrStatic<TProp>;
				meta: ReturnTypeOrStatic<TMeta>;
			};
			is: PartialCCValuePredicate;
			options: TOptions;
		};
	} {
		return {
			[name]: Object.assign(
				(...args: InferArgs<[TProp, TMeta]>) => ({
					property: evalOrStatic(property, ...args),
					meta: evalOrStatic(meta, ...args),
				}),
				{ is, options },
			),
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
		is: PartialCCValuePredicate,
		meta?: TMeta,
		options?: TOptions | undefined,
	): {
		[K in TName]: {
			(...args: InferArgs<[TProp, TKey, TMeta]>): {
				property: ReturnTypeOrStatic<TProp>;
				propertyKey: ReturnTypeOrStatic<TKey>;
				meta: ReturnTypeOrStatic<TMeta>;
			};
			is: PartialCCValuePredicate;
			options: TOptions;
		};
	} {
		return {
			[name]: Object.assign(
				(...args: any[]) => {
					return {
						property: evalOrStatic(property, ...args),
						propertyKey: evalOrStatic(propertyKey, ...args),
						meta: evalOrStatic(meta, ...args),
					};
				},
				{ is, options },
			),
		} as any;
	},
};

export interface CCValueBlueprint extends Readonly<ValueIDProperties> {
	readonly meta?: Readonly<ValueMetadata>;
	readonly options?: Readonly<CCValueOptions>;
}

export type CCValuePredicate = (valueId: ValueID) => boolean;
export type PartialCCValuePredicate = (
	properties: ValueIDProperties,
) => boolean;

/** A blueprint for a CC value which depends on one or more parameters */
export interface DynamicCCValueBlueprint<TArgs extends any[]> {
	(...args: TArgs): Omit<CCValueBlueprint, "options">;
	is: PartialCCValuePredicate;
	readonly options?: Readonly<CCValueOptions>;
}

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

	/** Whether the given value ID matches this value definition */
	is: CCValuePredicate;

	/** Returns the metadata for this value ID */
	get meta(): Readonly<MergeMeta<NonNullable<TBlueprint["meta"]>>>;
	/** Returns the value options for this value ID */
	get options(): Readonly<MergeOptions<NonNullable<TBlueprint["options"]>>>;
};

/** A CC value definition which depends on one or more parameters, transparently inferred from its arguments */
export type InferDynamicCCValue<
	TCommandClass extends CommandClasses,
	TBlueprint extends DynamicCCValueBlueprint<any[]>,
> = TBlueprint extends DynamicCCValueBlueprint<infer TArgs>
	? {
			(...args: TArgs): Omit<
				InferStaticCCValue<TCommandClass, ReturnType<TBlueprint>>,
				"options" | "is"
			>;

			/** Whether the given value ID matches this value definition */
			is: CCValuePredicate;

			readonly options: InferStaticCCValue<
				TCommandClass,
				ReturnType<TBlueprint> & { options: TBlueprint["options"] }
			>["options"];
	  }
	: never;

/** A static or evaluated CC value definition, transparently inferred from its arguments */
export type InferStaticCCValue<
	TCommandClass extends CommandClasses,
	TBlueprint extends CCValueBlueprint,
> = Readonly<AddCCValueProperties<TCommandClass, TBlueprint>>;

/** The generic variant of {@link InferStaticCCValue}, without inferring arguments */
export interface StaticCCValue extends CCValue {
	/** Whether the given value ID matches this value definition */
	is: CCValuePredicate;
	readonly options: Required<CCValueOptions>;
}

/** The generic variant of {@link InferDynamicCCValue}, without inferring arguments */
export type DynamicCCValue<TArgs extends any[] = any[]> =
	ExpandRecursivelySkipMeta<(...args: TArgs) => CCValue> & {
		/** Whether the given value ID matches this value definition */
		is: CCValuePredicate;
		readonly options: Required<CCValueOptions>;
	};

export type StaticCCValueFactory<T> = (self: T) => StaticCCValue;

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
