import { entries } from "alcalzone-shared/objects";
import { ZWaveError, ZWaveErrorCodes } from "../error/ZWaveError";
import { num2hex } from "./strings";

/** Ensures that the values array is consecutive */
export function isConsecutiveArray(values: number[]): boolean {
	return values.every((v, i, arr) => (i === 0 ? true : v - 1 === arr[i - 1]));
}

export type JSONObject = Record<string, any>;

/** Tests if base is in the super chain of `constructor` */
export function staticExtends<T extends new (...args: any[]) => any>(
	constructor: any,
	base: T,
): constructor is T {
	while (constructor) {
		if (constructor === base) return true;
		constructor = Object.getPrototypeOf(constructor);
	}
	return false;
}

/** Returns an object that includes all non-undefined properties from the original one */
export function stripUndefined<T>(obj: Record<string, T>): Record<string, T> {
	const ret = {} as Record<string, T>;
	for (const [key, value] of entries(obj)) {
		if (value !== undefined) ret[key] = value;
	}
	return ret;
}

/**
 * Validates the payload about to be parsed. This can be used to avoid crashes caused by malformed packets
 * @param assertions An array of assertions to check if we have a valid payload
 */
export function validatePayload(...assertions: unknown[]): void {
	if (!assertions.every(Boolean)) {
		throw new ZWaveError(
			"The message payload is invalid!",
			ZWaveErrorCodes.PacketFormat_InvalidPayload,
		);
	}
}

/** Decorator to support multi-inheritance using mixins */
// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export function Mixin(baseCtors: Function[]) {
	return function(derivedCtor: Function): void {
		baseCtors.forEach(baseCtor => {
			Object.getOwnPropertyNames(baseCtor.prototype).forEach(name => {
				// Do not override the constructor
				if (name !== "constructor") {
					derivedCtor.prototype[name] = baseCtor.prototype[name];
				}
			});
		});
	};
}

export type DeepPartial<T> = { [P in keyof T]+?: DeepPartial<T[P]> };

export function getEnumMemberName(enumeration: unknown, value: number): string {
	return (enumeration as any)[value] || `unknown (${num2hex(value)})`;
}
