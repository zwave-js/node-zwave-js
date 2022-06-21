import type { TypedClassDecorator } from "@zwave-js/shared";
import "reflect-metadata";

type Constructor<T> = new (...args: any[]) => T;

export interface ReflectionDecorator<
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

export interface CreateReflectionDecoratorOptions<
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

/** Creates a reflection decorator and corresponding methods for reverse lookup of values and constructors */
export function createReflectionDecorator<
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
}: CreateReflectionDecoratorOptions<
	TBase,
	TArgs,
	TValue,
	TConstructor
>): ReflectionDecorator<TBase, TArgs, TValue, TConstructor> {
	const key = Symbol.for(`METADATA_${name}`);
	const mapKey = Symbol.for(`METADATA_MAP_${name}`);

	const lookupTarget = Object.create(null);

	const grp: ReflectionDecorator<TBase, TArgs, TValue, TConstructor> = {
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

export interface SimpleReflectionDecorator<
	// eslint-disable-next-line @typescript-eslint/ban-types
	TBase extends Object,
	TArgs extends [any],
	TConstructor extends Constructor<TBase> = Constructor<TBase>,
> {
	/** The decorator which is used to decorate the super class */
	decorator: <TTarget extends TBase>(
		...args: TArgs
	) => TypedClassDecorator<TTarget>;

	/** Looks up the value which was assigned to the target class by the decorator, using a class instance */
	lookupValue: (target: TBase) => TArgs[0] | undefined;

	/** Looks up the value which was assigned to the target class by the decorator, using the class itself */
	// eslint-disable-next-line @typescript-eslint/ban-types
	lookupValueStatic: (constr: Function) => TArgs[0] | undefined;

	/** Looks up the super class constructor for a given value. */
	lookupConstructor: (...args: TArgs) => TConstructor | undefined;
}

export interface CreateSimpleReflectionDecoratorOptions {
	/** The name of the decorator */
	name: string;
}

/**
 * Like {@link createReflectionDecorator}, but for single-value decorators. This has the advantage that the returned functions can be reused easier with named args.
 */
export function createSimpleReflectionDecorator<
	// eslint-disable-next-line @typescript-eslint/ban-types
	TBase extends Object,
	TArgs extends [any],
	TConstructor extends Constructor<TBase> = Constructor<TBase>,
>({
	name,
}: CreateSimpleReflectionDecoratorOptions): SimpleReflectionDecorator<
	TBase,
	TArgs,
	TConstructor
> {
	const decorator = createReflectionDecorator<
		TBase,
		TArgs,
		TArgs[0],
		TConstructor
	>({
		name,
		valueFromArgs: (arg) => arg,
	});

	const ret: SimpleReflectionDecorator<TBase, TArgs, TConstructor> = {
		decorator: decorator.decorator,
		lookupValue: decorator.lookupValue,
		lookupValueStatic: decorator.lookupValueStatic,
		lookupConstructor: decorator.lookupConstructorByValue,
	};

	return ret;
}

export interface ReflectionDecoratorPair<
	// eslint-disable-next-line @typescript-eslint/ban-types
	TBase extends Object,
	TSuperArgs extends [any],
	TSubArgs extends [any],
	TConstructor extends Constructor<TBase> = Constructor<TBase>,
> {
	/** The decorator which is used to decorate the super class */
	superDecorator: <TTarget extends TBase>(
		...args: TSuperArgs
	) => TypedClassDecorator<TTarget>;

	/** The decorator which is used to decorate the sub classes */
	subDecorator: <TTarget extends TBase>(
		...args: TSubArgs
	) => TypedClassDecorator<TTarget>;

	/** Looks up the value which was assigned to the target super class by the decorator, using a class instance */
	lookupSuperValue: (target: TBase) => TSuperArgs[0] | undefined;
	/** Looks up the value which was assigned to the target sub class by the decorator, using a class instance */
	lookupSubValue: (target: TBase) => TSubArgs[0] | undefined;

	/** Looks up the value which was assigned to the target super class by the decorator, using the class itself */
	// eslint-disable-next-line @typescript-eslint/ban-types
	lookupSuperValueStatic: (constr: Function) => TSuperArgs[0] | undefined;
	/** Looks up the value which was assigned to the target sub class by the decorator, using the class itself */
	// eslint-disable-next-line @typescript-eslint/ban-types
	lookupSubValueStatic: (constr: Function) => TSubArgs[0] | undefined;

	/** Looks up the super class constructor for a given value. */
	lookupSuperConstructor: (...args: TSuperArgs) => TConstructor | undefined;
	/** Looks up the sub class constructor for a given value pair. */
	lookupSubConstructor: (
		...args: [...TSuperArgs, ...TSubArgs]
	) => TConstructor | undefined;
}

export interface CreateReflectionDecoratorPairOptions {
	/** The name of the super decorator */
	superName: string;
	/** The name of the sub decorator */
	subName: string;
}

/**
 * Creates a pair of reflection decorators and corresponding methods for reverse lookup of values and constructors.
 * This pair is meant to decorate a super class and several of its subclasses
 */
export function createReflectionDecoratorPair<
	// eslint-disable-next-line @typescript-eslint/ban-types
	TBase extends Object,
	TSuperArgs extends [any],
	TSubArgs extends [any],
	TConstructor extends Constructor<TBase> = Constructor<TBase>,
>({
	superName,
	subName,
}: CreateReflectionDecoratorPairOptions): ReflectionDecoratorPair<
	TBase,
	TSuperArgs,
	TSubArgs,
	TConstructor
> {
	const superDecorator = createReflectionDecorator<
		TBase,
		TSuperArgs,
		TSuperArgs[0],
		TConstructor
	>({
		name: superName,
		valueFromArgs: (arg) => arg,
	});

	const getLookupKey = (superArg: TSuperArgs[0], subArg: TSubArgs[0]) => {
		return JSON.stringify({ [superName]: superArg, [subName]: subArg });
	};

	const subDecorator = createReflectionDecorator<
		TBase,
		TSubArgs,
		TSubArgs[0],
		TConstructor
	>({
		name: subName,
		valueFromArgs: (arg) => arg,
		constructorLookupKey: (target, subArg) => {
			const superArg = superDecorator.lookupValueStatic(target);
			return getLookupKey(superArg, subArg);
		},
	});

	const ret: ReflectionDecoratorPair<
		TBase,
		TSuperArgs,
		TSubArgs,
		TConstructor
	> = {
		superDecorator: superDecorator.decorator,
		subDecorator: subDecorator.decorator,
		lookupSuperValue: superDecorator.lookupValue,
		lookupSubValue: subDecorator.lookupValue,
		lookupSuperValueStatic: superDecorator.lookupValueStatic,
		lookupSubValueStatic: subDecorator.lookupValueStatic,
		lookupSuperConstructor: superDecorator.lookupConstructorByValue,
		lookupSubConstructor: (...args) => {
			return subDecorator.lookupConstructorByKey(
				getLookupKey(args[0], args[1]),
			);
		},
	};

	return ret;
}

// export interface PropertyReflectionDecorator<
// 	// eslint-disable-next-line @typescript-eslint/ban-types
// 	TTarget extends Object,
// 	TArgs extends any[],
// 	TValue,
// > {
// 	/** The decorator which is used to decorate properties */
// 	decorator: (...args: TArgs) => TypedPropertyDecorator<TTarget>;
// 	/** Looks up all decorated properties and the decorator arguments for a class instance */
// 	lookupValues: (target: TTarget) => ReadonlyMap<string | number, TValue>;
// }

// export interface CreatePropertyReflectionDecoratorOptions<
// 	TArgs extends any[],
// 	TValue,
// > {
// 	/** The name of this decorator */
// 	name: string;
// 	/** Determines the value to be stored for the given arguments */
// 	valueFromArgs: (...args: TArgs) => TValue;
// }

// /** Creates a reflection decorator for a class property and the corresponding method for reverse lookup of defined values */
// export function createPropertyReflectionDecorator<
// 	// eslint-disable-next-line @typescript-eslint/ban-types
// 	TTarget extends Object,
// 	TArgs extends any[],
// 	TValue,
// >({
// 	name,
// 	valueFromArgs,
// }: CreatePropertyReflectionDecoratorOptions<
// 	TArgs,
// 	TValue
// >): PropertyReflectionDecorator<TTarget, TArgs, TValue> {
// 	const key = Symbol.for(`METADATA_${name}`);

// 	const prp: PropertyReflectionDecorator<TTarget, TArgs, TValue> = {
// 		decorator: (...args) => {
// 			const value = valueFromArgs(...args);
// 			let body = (
// 				target: TTarget,
// 				property: string | number | symbol,
// 			) => {
// 				// get the class constructor
// 				const constr = target.constructor;

// 				// retrieve the current metadata
// 				const metadata: Map<string | number, TValue> =
// 					Reflect.getMetadata(key, constr) ?? new Map();

// 				// Add the variable
// 				metadata.set(property as string | number, value);

// 				// And store it back
// 				Reflect.defineMetadata(key, metadata, constr);
// 			};

// 			// Rename the decorator body so it is easier to identify in stack traces
// 			body = Object.defineProperty(body, "name", {
// 				value: "decoratorBody_" + name,
// 			});

// 			return body;
// 		},

// 		lookupValues: (target) => {
// 			return Reflect.getMetadata(key, target.constructor);
// 		},
// 	};

// 	// Rename the decorator functions so they are easier to identify in stack traces
// 	for (const property of ["decorator", "lookupValues"] as const) {
// 		prp[property] = Object.defineProperty(prp[property], "name", {
// 			value: `${property}_${name}`,
// 		}) as any;
// 	}

// 	return prp;
// }
