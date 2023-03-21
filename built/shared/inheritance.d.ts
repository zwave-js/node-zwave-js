import type { Constructor, UnionToIntersection } from "./types";
/** Decorator to support multi-inheritance using mixins */
export declare function Mixin(baseCtors: Constructor[]): (derivedCtor: Constructor) => void;
export declare function applyMixin(target: Constructor, mixin: Constructor, includeConstructor?: boolean): void;
type Constructors<T extends any[]> = {
    [K in keyof T]: Constructor<T[K]>;
};
/**
 * Merges the given base classes into one, so extending from all of them at once is possible.
 * The first one will be included with proper inheritance, the remaining ones are mixed in.
 */
export declare function AllOf<T extends any[]>(...BaseClasses: Constructors<T>): Constructor<UnionToIntersection<T[number]>>;
/** Tests if base is in the super chain of `constructor` */
export declare function staticExtends<T extends new (...args: any[]) => any>(constructor: unknown, base: T): constructor is T;
export {};
//# sourceMappingURL=inheritance.d.ts.map