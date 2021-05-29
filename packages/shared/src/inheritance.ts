import type { Constructor } from "./types";

/** Decorator to support multi-inheritance using mixins */
export function Mixin(baseCtors: Constructor[]) {
	return function (derivedCtor: Constructor): void {
		baseCtors.forEach((baseCtor) => {
			// Figure out the inheritance chain of the mixin
			const inheritanceChain: Constructor[] = [baseCtor];
			while (true) {
				const current = inheritanceChain[0];
				const base = Object.getPrototypeOf(current);
				if (base?.prototype) {
					inheritanceChain.unshift(base);
				} else {
					break;
				}
			}
			for (const ctor of inheritanceChain) {
				for (const prop of Object.getOwnPropertyNames(ctor.prototype)) {
					// Do not override the constructor
					if (prop !== "constructor") {
						Object.defineProperty(
							derivedCtor.prototype,
							prop,
							Object.getOwnPropertyDescriptor(
								ctor.prototype,
								prop,
							) ?? Object.create(null),
						);
					}
				}
			}
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
