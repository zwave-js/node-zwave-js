import type { CommandClasses } from "@zwave-js/core";
import type { ValueIDProperties } from "./API";

export const VALUES: unique symbol = Symbol.for("CC_VALUE_DEFINITIONS");

export interface DefineCCValueOptions {
	/** Whether the CC value may exist on endpoints. Default: `true` */
	supportsEndpoints?: boolean;
}

// expands object types recursively
type ExpandRecursively<T> =
	// Keep funktions but expand their return type
	T extends (...args: infer A) => infer R
		? (...args: A) => ExpandRecursively<R>
		: // Ignore the CCValueMeta type
		T extends CCValueMeta
		? T
		: // Expand object types
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

export interface CCValueDefinition {
	blueprint: CCValueBlueprint;
	options?: DefineCCValueOptions;
}

// Namespace for utilities to define CC values
export const V = {
	/** Defines multiple static CC values that belong to a CC */
	defineStaticCCValue<
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
			...valueId,
			getMeta() {
				return { ...blueprint.meta };
			},
			withEndpoint: (endpoint: number = 0) => {
				if (!options.supportsEndpoints) endpoint = 0;
				return { ...valueId, endpoint };
			},
		};

		return ret as any;
	},

	/** Defines a single static CC values that belong to a CC */
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
					V.defineStaticCCValue(commandClass, blueprint, options),
				],
			),
		) as any;
	},

	/** Returns a CC value definition that is named like the value `property` */
	staticProperty<TProp extends string>(
		property: TProp,
	): {
		[K in TProp]: { blueprint: { property: TProp } };
	} {
		return {
			[property]: {
				blueprint: {
					property,
				},
			},
		} as any;
	},

	/** Returns a CC value definition with the given name and `property` */
	staticPropertyWithName<TName extends string, TProp extends string>(
		name: TName,
		property: TProp,
	): {
		[K in TName]: { blueprint: { property: TProp } };
	} {
		return {
			[name]: {
				blueprint: {
					property,
				},
			},
		} as any;
	},

	/** Returns a CC value definition with the given name, `property` and `propertyKey` */
	staticPropertyAndKeyWithName<
		TName extends string,
		TProp extends string,
		TKey extends string,
	>(
		name: TName,
		property: TProp,
		propertyKey: TKey,
	): {
		[K in TName]: { blueprint: { property: TProp; propertyKey: TKey } };
	} {
		return {
			[name]: {
				blueprint: {
					property,
					propertyKey,
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

type WithDynamicEndpoint<T extends Record<string, any>> = T & {
	withEndpoint(
		endpoint?: number,
	): Readonly<
		Pick<T, "commandClass"> & { endpoint: number } & Omit<T, "commandClass">
	>;
};
type WithCCValueMeta<T> = T & {
	getMeta(): Readonly<CCValueMeta>;
};

/** A static or evaluated CC value definition */
export type StaticCCValue<
	TCommandClass extends CommandClasses,
	TBlueprint extends CCValueBlueprint,
> = Readonly<
	WithCCValueMeta<
		WithDynamicEndpoint<InferValueIDBase<TCommandClass, TBlueprint>>
	>
>;

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
