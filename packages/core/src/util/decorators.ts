import type { TypedClassDecorator } from "@zwave-js/shared";
import "reflect-metadata";

type Constructor<T> = new (...args: any[]) => T;

export interface ClassDecoratorGroup<
	// eslint-disable-next-line @typescript-eslint/ban-types
	TBase extends Object,
	TArgs extends any[],
	TValue,
	TConstructor extends Constructor<TBase> = Constructor<TBase>,
> {
	/** The decorator which is used to decorate classes */
	decorator: <TTarget extends TBase>(
		...args: TArgs
	) => TypedClassDecorator<TTarget>;
	/** Looks up the value which was assigned to the target class by the decorator, using a class instance */
	lookupValue: (target: TBase) => TValue | undefined;
	/** Looks up the value which was assigned to the target class by the decorator, using the class itself */
	// eslint-disable-next-line @typescript-eslint/ban-types
	lookupValueStatic: (constr: Function) => TValue | undefined;
	/** Looks up the class constructor for a given value. This can only be used if the value does not need to be transformed using `constructorLookupKey`. */
	lookupConstructorByValue: (value: TValue) => TConstructor | undefined;
	/** Looks up the class constructor for a given lookup key. This MUST be used if the value needs to be transformed using `constructorLookupKey`. */
	lookupConstructorByKey: (key: string) => TConstructor | undefined;
}

export interface CreateClassDecoratorOptions<
	// eslint-disable-next-line @typescript-eslint/ban-types
	TBase extends Object,
	TArgs extends any[],
	TValue,
	TConstructor extends Constructor<TBase> = Constructor<TBase>,
> {
	/** The name of this decorator */
	name: string;
	/** Determines the value to be stored for the given arguments */
	valueFromArgs: (...args: TArgs) => TValue;
	/**
	 * Determines the key under which the constructor should be stored in the Map for reverse constructor lookup.
	 * Defaults to the value. Return `false` to disable storing the constructor for lookup.
	 */
	constructorLookupKey?:
		| false
		| ((target: TConstructor, ...args: TArgs) => string);
}

export function createClassDecorator<
	// eslint-disable-next-line @typescript-eslint/ban-types
	TBase extends Object,
	TArgs extends any[],
	TValue,
	TConstructor extends Constructor<TBase> = Constructor<TBase>,
>({
	name,
	valueFromArgs,
	// getConstructorLookupTarget,
	constructorLookupKey,
}: CreateClassDecoratorOptions<
	TBase,
	TArgs,
	TValue,
	TConstructor
>): ClassDecoratorGroup<TBase, TArgs, TValue, TConstructor> {
	const key = Symbol.for(`METADATA_${name}`);
	const mapKey = Symbol.for(`METADATA_MAP_${name}`);

	const lookupTarget = Object.create(null);

	const grp: ClassDecoratorGroup<TBase, TArgs, TValue, TConstructor> = {
		decorator: (...args): TypedClassDecorator<TBase> => {
			const value = valueFromArgs(...args);
			let body = (target: TConstructor) => {
				Reflect.defineMetadata(key, value, target);

				if (constructorLookupKey === false) return;
				const reverseLookupKey =
					constructorLookupKey?.(target, ...args) ?? String(value);

				// Store the constructor on the reverse lookup target
				const map: Map<string, TConstructor> =
					Reflect.getMetadata(mapKey, lookupTarget) || new Map();
				map.set(reverseLookupKey, target);
				Reflect.defineMetadata(mapKey, map, lookupTarget);
			};

			// Rename the decorator body so it is easier to identify in stack traces
			body = Object.defineProperty(body, "name", {
				value: "decoratorBody_" + name,
			});

			return body as any;
		},

		lookupValue: (target) => {
			return Reflect.getMetadata(key, target.constructor);
		},

		lookupValueStatic: (constr) => {
			return Reflect.getMetadata(key, constr);
		},

		lookupConstructorByValue: (value) => {
			if (constructorLookupKey === false) {
				throw new Error(
					"Constructor lookup is disabled for this decorator!",
				);
			} else if (constructorLookupKey) {
				throw new Error(
					"Cannot lookup constructor by value when constructorLookupKey is used",
				);
			} else {
				return grp.lookupConstructorByKey(String(value));
			}
		},

		lookupConstructorByKey: (key: string) => {
			if (constructorLookupKey === false) {
				throw new Error(
					"Constructor lookup is disabled for this decorator!",
				);
			}
			const map = Reflect.getMetadata(mapKey, lookupTarget) as
				| Map<string, TConstructor>
				| undefined;
			return map?.get(key);
		},
	};

	// Rename the decorator functions so they are easier to identify in stack traces
	for (const property of [
		"decorator",
		"lookupValue",
		"lookupValueStatic",
		"lookupConstructorByValue",
		"lookupConstructorByKey",
	] as const) {
		grp[property] = Object.defineProperty(grp[property], "name", {
			value: `${property}_${name}`,
		}) as any;
	}

	return grp;
}
