"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createReflectionDecoratorPair = exports.createValuelessReflectionDecorator = exports.createSimpleReflectionDecorator = exports.createReflectionDecorator = void 0;
require("reflect-metadata");
/** Creates a reflection decorator and corresponding methods for reverse lookup of values and constructors */
function createReflectionDecorator({ name, valueFromArgs, 
// getConstructorLookupTarget,
constructorLookupKey, }) {
    const key = Symbol.for(`METADATA_${name}`);
    const mapKey = Symbol.for(`METADATA_MAP_${name}`);
    const lookupTarget = Object.create(null);
    const grp = {
        decorator: (...args) => {
            const value = valueFromArgs(...args);
            let body = (target) => {
                Reflect.defineMetadata(key, value, target);
                if (constructorLookupKey === false)
                    return;
                const reverseLookupKey = constructorLookupKey?.(target, ...args) ?? String(value);
                // Store the constructor on the reverse lookup target
                const map = Reflect.getMetadata(mapKey, lookupTarget) || new Map();
                map.set(reverseLookupKey, target);
                Reflect.defineMetadata(mapKey, map, lookupTarget);
            };
            // Rename the decorator body so it is easier to identify in stack traces
            body = Object.defineProperty(body, "name", {
                value: "decoratorBody_" + name,
            });
            return body;
        },
        lookupValue: (target) => {
            return Reflect.getMetadata(key, target.constructor);
        },
        lookupValueStatic: (constr) => {
            return Reflect.getMetadata(key, constr);
        },
        lookupConstructorByValue: (value) => {
            if (constructorLookupKey === false) {
                throw new Error("Constructor lookup is disabled for this decorator!");
            }
            else if (constructorLookupKey) {
                throw new Error("Cannot lookup constructor by value when constructorLookupKey is used");
            }
            else {
                return grp.lookupConstructorByKey(String(value));
            }
        },
        lookupConstructorByKey: (key) => {
            if (constructorLookupKey === false) {
                throw new Error("Constructor lookup is disabled for this decorator!");
            }
            const map = Reflect.getMetadata(mapKey, lookupTarget);
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
    ]) {
        grp[property] = Object.defineProperty(grp[property], "name", {
            value: `${property}_${name}`,
        });
    }
    return grp;
}
exports.createReflectionDecorator = createReflectionDecorator;
/**
 * Like {@link createReflectionDecorator}, but for single-value decorators. This has the advantage that the returned functions can be reused easier with named args.
 */
function createSimpleReflectionDecorator({ name, }) {
    const decorator = createReflectionDecorator({
        name,
        valueFromArgs: (arg) => arg,
    });
    const ret = {
        decorator: decorator.decorator,
        lookupValue: decorator.lookupValue,
        lookupValueStatic: decorator.lookupValueStatic,
        lookupConstructor: decorator.lookupConstructorByValue,
    };
    return ret;
}
exports.createSimpleReflectionDecorator = createSimpleReflectionDecorator;
/**
 * Like {@link createReflectionDecorator}, but for valueless decorators.
 */
function createValuelessReflectionDecorator({ name, }) {
    const decorator = createReflectionDecorator({
        name,
        valueFromArgs: () => true,
    });
    const ret = {
        decorator: decorator.decorator,
        isDecorated: (target) => !!decorator.lookupValue(target),
        // eslint-disable-next-line @typescript-eslint/ban-types
        isDecoratedStatic: (constr) => !!decorator.lookupValueStatic(constr),
    };
    return ret;
}
exports.createValuelessReflectionDecorator = createValuelessReflectionDecorator;
/**
 * Creates a pair of reflection decorators and corresponding methods for reverse lookup of values and constructors.
 * This pair is meant to decorate a super class and several of its subclasses
 */
function createReflectionDecoratorPair({ superName, subName, }) {
    const superDecorator = createReflectionDecorator({
        name: superName,
        valueFromArgs: (arg) => arg,
    });
    const getLookupKey = (superArg, subArg) => {
        return JSON.stringify({ [superName]: superArg, [subName]: subArg });
    };
    const subDecorator = createReflectionDecorator({
        name: subName,
        valueFromArgs: (arg) => arg,
        constructorLookupKey: (target, subArg) => {
            const superArg = superDecorator.lookupValueStatic(target);
            return getLookupKey(superArg, subArg);
        },
    });
    const ret = {
        superDecorator: superDecorator.decorator,
        subDecorator: subDecorator.decorator,
        lookupSuperValue: superDecorator.lookupValue,
        lookupSubValue: subDecorator.lookupValue,
        lookupSuperValueStatic: superDecorator.lookupValueStatic,
        lookupSubValueStatic: subDecorator.lookupValueStatic,
        lookupSuperConstructor: superDecorator.lookupConstructorByValue,
        lookupSubConstructor: (...args) => {
            return subDecorator.lookupConstructorByKey(getLookupKey(args[0], args[1]));
        },
    };
    return ret;
}
exports.createReflectionDecoratorPair = createReflectionDecoratorPair;
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
//# sourceMappingURL=decorators.js.map