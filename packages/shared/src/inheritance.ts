import type { Constructor } from "./types";

/** Decorator to support multi-inheritance using mixins */
export function Mixin(baseCtors: Constructor[]) {
	return function (derivedCtor: Constructor): void {
		baseCtors.forEach((baseCtor) => {
			Object.getOwnPropertyNames(baseCtor.prototype).forEach((name) => {
				// Do not override the constructor
				if (name !== "constructor") {
					derivedCtor.prototype[name] = baseCtor.prototype[name];
				}
			});
		});
	};
}

/** Tests if base is in the super chain of `constructor` */
export function staticExtends<T extends new (...args: any[]) => any>(
	constructor: unknown,
	base: T,
): constructor is T {
	while (constructor) {
		if (constructor === base) return true;
		constructor = Object.getPrototypeOf(constructor) as unknown;
	}
	return false;
}
