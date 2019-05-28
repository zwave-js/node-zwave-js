import { entries } from "alcalzone-shared/objects";
import { ZWaveError, ZWaveErrorCodes } from "../error/ZWaveError";

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
export function stripUndefined<T extends Record<string, any>>(obj: T): T {
	const ret = {} as T;
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
