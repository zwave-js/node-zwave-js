import type { TypedClassDecorator } from "@zwave-js/shared";
import "reflect-metadata";
type Constructor<T> = new (...args: any[]) => T;
export interface ReflectionDecorator<TBase extends Object, TArgs extends any[], TValue, TConstructor extends Constructor<TBase> = Constructor<TBase>> {
    /** The decorator which is used to decorate classes */
    decorator: <TTarget extends TBase>(...args: TArgs) => TypedClassDecorator<TTarget>;
    /** Looks up the value which was assigned to the target class by the decorator, using a class instance */
    lookupValue: (target: TBase) => TValue | undefined;
    /** Looks up the value which was assigned to the target class by the decorator, using the class itself */
    lookupValueStatic: (constr: Function) => TValue | undefined;
    /** Looks up the class constructor for a given value. This can only be used if the value does not need to be transformed using `constructorLookupKey`. */
    lookupConstructorByValue: (value: TValue) => TConstructor | undefined;
    /** Looks up the class constructor for a given lookup key. This MUST be used if the value needs to be transformed using `constructorLookupKey`. */
    lookupConstructorByKey: (key: string) => TConstructor | undefined;
}
export interface CreateReflectionDecoratorOptions<TBase extends Object, TArgs extends any[], TValue, TConstructor extends Constructor<TBase> = Constructor<TBase>> {
    /** The name of this decorator */
    name: string;
    /** Determines the value to be stored for the given arguments */
    valueFromArgs: (...args: TArgs) => TValue;
    /**
     * Determines the key under which the constructor should be stored in the Map for reverse constructor lookup.
     * Defaults to the value. Return `false` to disable storing the constructor for lookup.
     */
    constructorLookupKey?: false | ((target: TConstructor, ...args: TArgs) => string);
}
/** Creates a reflection decorator and corresponding methods for reverse lookup of values and constructors */
export declare function createReflectionDecorator<TBase extends Object, TArgs extends any[], TValue, TConstructor extends Constructor<TBase> = Constructor<TBase>>({ name, valueFromArgs, constructorLookupKey, }: CreateReflectionDecoratorOptions<TBase, TArgs, TValue, TConstructor>): ReflectionDecorator<TBase, TArgs, TValue, TConstructor>;
export interface SimpleReflectionDecorator<TBase extends Object, TArgs extends [any], TConstructor extends Constructor<TBase> = Constructor<TBase>> {
    /** The decorator which is used to decorate the super class */
    decorator: <TTarget extends TBase>(...args: TArgs) => TypedClassDecorator<TTarget>;
    /** Looks up the value which was assigned to the target class by the decorator, using a class instance */
    lookupValue: (target: TBase) => TArgs[0] | undefined;
    /** Looks up the value which was assigned to the target class by the decorator, using the class itself */
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
export declare function createSimpleReflectionDecorator<TBase extends Object, TArgs extends [any], TConstructor extends Constructor<TBase> = Constructor<TBase>>({ name, }: CreateSimpleReflectionDecoratorOptions): SimpleReflectionDecorator<TBase, TArgs, TConstructor>;
export interface ValuelessReflectionDecorator<TBase extends Object> {
    /** The decorator which is used to decorate the super class */
    decorator: <TTarget extends TBase>() => TypedClassDecorator<TTarget>;
    /** Checks if the target class was decorated by this decorator, using a class instance */
    isDecorated: (target: TBase) => boolean;
    /** Checks if the target class was decorated by this decorator, using the class itself */
    isDecoratedStatic: (constr: Function) => boolean;
}
export interface CreateValuelessReflectionDecoratorOptions {
    /** The name of the decorator */
    name: string;
}
/**
 * Like {@link createReflectionDecorator}, but for valueless decorators.
 */
export declare function createValuelessReflectionDecorator<TBase extends Object>({ name, }: CreateValuelessReflectionDecoratorOptions): ValuelessReflectionDecorator<TBase>;
export interface ReflectionDecoratorPair<TBase extends Object, TSuperArgs extends [any], TSubArgs extends [any], TConstructor extends Constructor<TBase> = Constructor<TBase>> {
    /** The decorator which is used to decorate the super class */
    superDecorator: <TTarget extends TBase>(...args: TSuperArgs) => TypedClassDecorator<TTarget>;
    /** The decorator which is used to decorate the sub classes */
    subDecorator: <TTarget extends TBase>(...args: TSubArgs) => TypedClassDecorator<TTarget>;
    /** Looks up the value which was assigned to the target super class by the decorator, using a class instance */
    lookupSuperValue: (target: TBase) => TSuperArgs[0] | undefined;
    /** Looks up the value which was assigned to the target sub class by the decorator, using a class instance */
    lookupSubValue: (target: TBase) => TSubArgs[0] | undefined;
    /** Looks up the value which was assigned to the target super class by the decorator, using the class itself */
    lookupSuperValueStatic: (constr: Function) => TSuperArgs[0] | undefined;
    /** Looks up the value which was assigned to the target sub class by the decorator, using the class itself */
    lookupSubValueStatic: (constr: Function) => TSubArgs[0] | undefined;
    /** Looks up the super class constructor for a given value. */
    lookupSuperConstructor: (...args: TSuperArgs) => TConstructor | undefined;
    /** Looks up the sub class constructor for a given value pair. */
    lookupSubConstructor: (...args: [...TSuperArgs, ...TSubArgs]) => TConstructor | undefined;
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
export declare function createReflectionDecoratorPair<TBase extends Object, TSuperArgs extends [any], TSubArgs extends [any], TConstructor extends Constructor<TBase> = Constructor<TBase>>({ superName, subName, }: CreateReflectionDecoratorPairOptions): ReflectionDecoratorPair<TBase, TSuperArgs, TSubArgs, TConstructor>;
export {};
//# sourceMappingURL=decorators.d.ts.map