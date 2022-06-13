import type { CommandClasses } from "@zwave-js/core";
import type { Overwrite } from "alcalzone-shared/types";
import type { ValueIDProperties } from "./API";

export const VALUES: unique symbol = Symbol.for("CC_VALUE_DEFINITIONS");

// HINT: To fully view types for definitions created by this, open
// node_modules/typescript/lib/tsserver.js and change the definition of
// ts.defaultMaximumTruncationLength = 160
// to something higher like
// ts.defaultMaximumTruncationLength = 1000
// Then restart TS Server

export interface DefineCCValueOptions {
	/** Whether the CC value may exist on endpoints. Default: `true` */
	supportsEndpoints?: boolean;
}

const defaultMeta = {
	internal: false,
	minVersion: 1,
	readable: true,
	secret: false,
	stateful: true,
	writable: true,
} as const;

type DefaultMeta = typeof defaultMeta;

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
	TValues extends Record<keyof TValues, CCValueDefinition>,
> = Readonly<{
	[K in keyof TValues]: ExpandRecursively<
		StaticCCValue<TCommandClass, TValues[K]["blueprint"]>
	>;
}>;

type ToDynamicCCValues<
	TCommandClass extends CommandClasses,
	TValues extends Record<keyof TValues, DynamicCCValueDefinition<any>>,
> = Readonly<{
	[K in keyof TValues]: ExpandRecursively<
		DynamicCCValue<TCommandClass, TValues[K]["blueprint"]>
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

export interface CCValueDefinition {
	blueprint: CCValueBlueprint;
	options?: DefineCCValueOptions;
}

export type DynamicCCValueDefinition<TArgs extends any[]> = {
	blueprint: DynamicCCValueBlueprint<TArgs>;
	options?: DefineCCValueOptions;
};

/** Defines a single static CC values that belong to a CC */
function defineStaticCCValue<
	TCommandClass extends CommandClasses,
	TBlueprint extends CCValueBlueprint,
>(
	commandClass: TCommandClass,
	blueprint: TBlueprint,
	options: DefineCCValueOptions = {},
): ExpandRecursively<StaticCCValue<TCommandClass, TBlueprint>> {
	// Normalize generic options
	options.supportsEndpoints ??= true;

	const valueId = {
		commandClass,
		property: blueprint.property,
		propertyKey: blueprint.propertyKey,
	};

	const ret: StaticCCValue<TCommandClass, TBlueprint> = {
		get id() {
			return { ...valueId };
		},
		endpoint: (endpoint: number = 0) => {
			if (!options.supportsEndpoints) endpoint = 0;
			return { ...valueId, endpoint };
		},
		get meta() {
			return { ...defaultMeta, ...blueprint.meta } as any;
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
	options: DefineCCValueOptions = {},
): ExpandRecursively<DynamicCCValue<TCommandClass, TBlueprint>> {
	// Normalize generic options
	options.supportsEndpoints ??= true;

	return ((...args: Parameters<TBlueprint>) => {
		const actualBlueprint = blueprint(...args);

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
				if (!options.supportsEndpoints) endpoint = 0;
				return { ...valueId, endpoint };
			},
			get meta() {
				return { ...defaultMeta, ...actualBlueprint.meta } as any;
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
		TValues extends Record<keyof TValues, CCValueDefinition>,
	>(
		commandClass: TCommandClass,
		values: TValues,
	): TValues extends Record<keyof TValues, CCValueDefinition>
		? ExpandRecursively<ToStaticCCValues<TCommandClass, TValues>>
		: never {
		return Object.fromEntries(
			Object.entries<CCValueDefinition>(values).map(
				([key, { blueprint, options }]) => [
					key,
					defineStaticCCValue(commandClass, blueprint, options),
				],
			),
		) as any;
	},

	/** Defines multiple static CC values that belong to the same CC */
	defineDynamicCCValues<
		TCommandClass extends CommandClasses,
		TValues extends Record<keyof TValues, DynamicCCValueDefinition<any>>,
	>(
		commandClass: TCommandClass,
		values: TValues,
	): TValues extends Record<keyof TValues, DynamicCCValueDefinition<any>>
		? ExpandRecursively<ToDynamicCCValues<TCommandClass, TValues>>
		: never {
		return Object.fromEntries(
			Object.entries<DynamicCCValueDefinition<any>>(values).map(
				([key, { blueprint, options }]) => [
					key,
					defineDynamicCCValue(commandClass, blueprint, options),
				],
			),
		) as any;
	},

	/** Returns a CC value definition that is named like the value `property` */
	staticProperty<
		TProp extends string | number,
		TMeta extends CCValueMeta | undefined = undefined,
	>(
		property: TProp,
		meta?: TMeta,
	): {
		[K in TProp]: { blueprint: { property: TProp; meta: TMeta } };
	} {
		return {
			[property]: {
				blueprint: {
					property,
					meta,
				},
			},
		} as any;
	},

	/** Returns a CC value definition with the given name and `property` */
	staticPropertyWithName<
		TName extends string,
		TProp extends string | number,
		TMeta extends CCValueMeta | undefined = undefined,
	>(
		name: TName,
		property: TProp,
		meta?: TMeta,
	): {
		[K in TName]: { blueprint: { property: TProp; meta: TMeta } };
	} {
		return {
			[name]: {
				blueprint: {
					property,
					meta,
				},
			},
		} as any;
	},

	/** Returns a CC value definition with the given name, `property` and `propertyKey` */
	staticPropertyAndKeyWithName<
		TName extends string,
		TProp extends string | number,
		TKey extends string | number,
		TMeta extends CCValueMeta | undefined = undefined,
	>(
		name: TName,
		property: TProp,
		propertyKey: TKey,
		meta?: TMeta,
	): {
		[K in TName]: {
			blueprint: {
				property: TProp;
				propertyKey: TKey;
				meta: TMeta;
			};
		};
	} {
		return {
			[name]: {
				blueprint: {
					property,
					propertyKey,
					meta,
				},
			},
		} as any;
	},

	/** Returns a CC value definition with the given name and a dynamic `property` */
	dynamicPropertyWithName<
		TName extends string,
		TProp extends FnOrStatic<any[], ValueIDProperties["property"]>,
		TMeta extends FnOrStatic<any[], CCValueMeta | undefined> = undefined,
	>(
		name: TName,
		property: TProp,
		meta?: TMeta,
	): {
		[K in TName]: {
			blueprint: (...args: InferArgs<[TProp, TMeta]>) => {
				property: ReturnTypeOrStatic<TProp>;
				meta: ReturnTypeOrStatic<TMeta>;
			};
		};
	} {
		return {
			[name]: {
				blueprint: (...args: InferArgs<[TProp, TMeta]>) => ({
					property: evalOrStatic(property, ...args),
					meta: evalOrStatic(meta, ...args),
				}),
			},
		} as any;
	},

	/** Returns a CC value definition with the given name and a dynamic `property` */
	dynamicPropertyAndKeyWithName<
		TName extends string,
		TProp extends FnOrStatic<any[], ValueIDProperties["property"]>,
		TKey extends FnOrStatic<any[], ValueIDProperties["propertyKey"]>,
		TMeta extends FnOrStatic<any[], CCValueMeta | undefined> = undefined,
	>(
		name: TName,
		property: TProp,
		propertyKey: TKey,
		meta?: TMeta,
	): {
		[K in TName]: {
			blueprint: (...args: InferArgs<[TProp, TKey, TMeta]>) => {
				property: ReturnTypeOrStatic<TProp>;
				propertyKey: ReturnTypeOrStatic<TKey>;
				meta: ReturnTypeOrStatic<TMeta>;
			};
		};
	} {
		return {
			[name]: {
				blueprint: (...args: InferArgs<[TProp, TKey, TMeta]>) => {
					return {
						property: evalOrStatic(property, ...args),
						propertyKey: evalOrStatic(propertyKey, ...args),
						meta: evalOrStatic(meta, ...args),
					};
				},
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
	readonly meta?: Readonly<CCValueMeta>;
}

/** A blueprint for a CC value which depends on one or more parameters */
export type DynamicCCValueBlueprint<TArgs extends any[]> = (
	...args: TArgs
) => CCValueBlueprint;

type MergeMeta<TMeta extends CCValueMeta | undefined> =
	TMeta extends CCValueMeta ? Overwrite<DefaultMeta, TMeta> : DefaultMeta;

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

	/** Returns the meta information for this value ID */
	get meta(): Readonly<MergeMeta<TBlueprint["meta"]>>;
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

export interface CCValueMeta {
	/**
	 * Whether the CC value is internal. Internal values are not exposed to the user.
	 */
	internal?: boolean;

	/** Whether the CC value is readable. Default: `true` */
	readable?: boolean;
	/** Whether the CC value is writable. Default: `true` */
	writable?: boolean;

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
	// /**
	//  * Whether this value should always be created/persisted, even if it is undefined. Default: false
	//  */
	//  forceCreation?: boolean;
}

// This interface is auto-generated by maintenance/generateCCValuesInterface.ts
// Do not edit it by hand or your changes will be lost
export interface CCValues {
	// AUTO GENERATION BELOW
	Basic: typeof import("../cc/BasicCC").BasicCCValues;
}
