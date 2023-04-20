"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.staticExtends = exports.AllOf = exports.applyMixin = exports.Mixin = void 0;
/** Decorator to support multi-inheritance using mixins */
function Mixin(baseCtors) {
    return function (derivedCtor) {
        for (const baseCtor of baseCtors) {
            applyMixin(derivedCtor, baseCtor);
        }
    };
}
exports.Mixin = Mixin;
function applyMixin(target, mixin, includeConstructor = false) {
    // Figure out the inheritance chain of the mixin
    const inheritanceChain = [mixin];
    while (true) {
        const current = inheritanceChain[0];
        const base = Object.getPrototypeOf(current);
        if (base?.prototype) {
            inheritanceChain.unshift(base);
        }
        else {
            break;
        }
    }
    for (const ctor of inheritanceChain) {
        for (const prop of Object.getOwnPropertyNames(ctor.prototype)) {
            // Do not override the constructor
            if (includeConstructor || prop !== "constructor") {
                Object.defineProperty(target.prototype, prop, Object.getOwnPropertyDescriptor(ctor.prototype, prop) ??
                    Object.create(null));
            }
        }
    }
}
exports.applyMixin = applyMixin;
/**
 * Merges the given base classes into one, so extending from all of them at once is possible.
 * The first one will be included with proper inheritance, the remaining ones are mixed in.
 */
function AllOf(...BaseClasses) {
    const [First, ...Others] = BaseClasses;
    const ret = class AllOf extends First {
    };
    for (const base of Others) {
        applyMixin(ret, base);
    }
    return ret;
}
exports.AllOf = AllOf;
/** Tests if base is in the super chain of `constructor` */
function staticExtends(constructor, base) {
    while (constructor) {
        if (constructor === base)
            return true;
        constructor = Object.getPrototypeOf(constructor);
    }
    return false;
}
exports.staticExtends = staticExtends;
//# sourceMappingURL=inheritance.js.map