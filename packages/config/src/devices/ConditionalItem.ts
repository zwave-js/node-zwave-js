import { ZWaveError, ZWaveErrorCodes } from "@zwave-js/core/safe";
import { ObjectKeyMap } from "@zwave-js/shared/safe";
import { isArray } from "alcalzone-shared/typeguards";
import { evaluate } from "../Logic";
import { throwInvalidConfig } from "../utils_safe";
import type { DeviceID } from "./shared";

/** A conditional config item */
export interface ConditionalItem<T> {
	readonly condition?: string;
	evaluateCondition(deviceId?: DeviceID): T | undefined;
}

export function isConditionalItem<T>(val: any): val is ConditionalItem<T> {
	// Conditional items must be objects or classes
	if (typeof val !== "object" || val == undefined) return false;
	// Conditional items may have a string-valued condition
	if (
		typeof val.condition !== "string" &&
		typeof val.condition !== "undefined"
	) {
		return false;
	}
	// Conditional items must have an evaluateCondition method
	if (typeof val.evaluateCondition !== "function") return false;
	return true;
}

/** Checks if a given condition applies for the given device ID */
export function conditionApplies<T>(
	self: ConditionalItem<T>,
	deviceId: DeviceID | undefined,
): boolean {
	// No condition? Always applies
	if (!self.condition) return true;
	// No device ID? Always applies
	if (!deviceId) return true;

	try {
		return !!evaluate(self.condition, deviceId);
	} catch (e) {
		throw new ZWaveError(
			`Invalid condition "${self.condition}"!`,
			ZWaveErrorCodes.Config_Invalid,
		);
	}
}

export function validateCondition(
	filename: string,
	definition: Record<string, any>,
	errorPrefix: string,
): void {
	if (definition.$if != undefined && typeof definition.$if !== "string") {
		throwInvalidConfig(
			"devices",
			`packages/config/config/devices/${filename}:
${errorPrefix} invalid $if condition`,
		);
	}
}

export type EvaluateDeepReturnType<
	T extends
		| ConditionalItem<unknown>
		| ConditionalItem<unknown>[]
		| ObjectKeyMap<
				any,
				ConditionalItem<unknown> | ConditionalItem<unknown>[]
		  >
		| ReadonlyMap<
				any,
				ConditionalItem<unknown> | ConditionalItem<unknown>[]
		  >
		| Map<any, ConditionalItem<unknown> | ConditionalItem<unknown>[]>
		| unknown[]
		| unknown,
	PreserveArray extends boolean = false,
> = T extends undefined
	? undefined
	: T extends ConditionalItem<infer R>[]
	? [PreserveArray] extends [true]
		? R[]
		: R
	: T extends ConditionalItem<infer R>
	? R
	: T extends ObjectKeyMap<infer K, infer V>
	? ObjectKeyMap<K, EvaluateDeepReturnType<V, false>>
	: T extends ReadonlyMap<infer K, infer V>
	? Map<K, EvaluateDeepReturnType<V, false>>
	: T extends Map<infer K, infer V>
	? Map<K, EvaluateDeepReturnType<V, false>>
	: T extends unknown[]
	? [PreserveArray] extends [true]
		? T
		: T[number]
	: T;

export function evaluateDeep<
	T extends
		| ConditionalItem<unknown>
		| ConditionalItem<unknown>[]
		| Map<any, ConditionalItem<unknown>>
		| Map<any, ConditionalItem<unknown>[]>
		| Map<any, ConditionalItem<unknown>>
		| Map<any, ConditionalItem<unknown>[]>
		| ObjectKeyMap<any, ConditionalItem<unknown>>
		| ObjectKeyMap<any, ConditionalItem<unknown>[]>
		| unknown[]
		| unknown,
	PA extends boolean,
>(
	obj: T,
	deviceId?: DeviceID,
	preserveArray?: PA,
): EvaluateDeepReturnType<T, PA>;

/**
 * Recursively evaluates the given conditional item. By default, arrays are collapsed to the first applicable item.
 */
export function evaluateDeep(
	obj:
		| ConditionalItem<unknown>
		| ConditionalItem<unknown>[]
		| Map<any, ConditionalItem<unknown>>
		| Map<any, ConditionalItem<unknown>[]>
		| ObjectKeyMap<any, ConditionalItem<unknown>>
		| ObjectKeyMap<any, ConditionalItem<unknown>[]>
		| unknown[]
		| unknown,
	deviceId?: DeviceID,
	preserveArray: boolean = false,
): unknown {
	if (obj == undefined) {
		return obj;
	} else if (isArray(obj)) {
		if (preserveArray) {
			// Evaluate all array entries and return the ones that passed
			return obj
				.map((item) => evaluateDeep(item, deviceId, true))
				.filter((o) => o != undefined);
		} else {
			// Return the first matching array entry
			for (const item of obj) {
				const evaluated = evaluateDeep(item, deviceId, false);
				if (evaluated != undefined) return evaluated;
			}
		}
	} else if (obj instanceof Map) {
		const ret = new Map();
		for (const [key, val] of obj) {
			// In maps only take the first possible value for each entry
			const evaluated = evaluateDeep(val, deviceId, false);

			if (evaluated != undefined) {
				ret.set(key, evaluated);
				continue;
			}
		}
		if (ret.size > 0) return ret;
	} else if (obj instanceof ObjectKeyMap) {
		const ret = new ObjectKeyMap();
		for (const [key, val] of obj) {
			// In maps only take the first possible value for each entry
			const evaluated = evaluateDeep(val, deviceId, false);

			if (evaluated != undefined) {
				ret.set(key, evaluated);
				continue;
			}
		}
		if (ret.size > 0) return ret;
	} else if (isConditionalItem(obj)) {
		// Evaluate the condition for simple items
		return obj.evaluateCondition(deviceId);
	} else {
		// Simply return non-conditional items
		return obj;
	}
}
