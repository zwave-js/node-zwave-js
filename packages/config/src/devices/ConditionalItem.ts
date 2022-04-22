import { ZWaveError, ZWaveErrorCodes } from "@zwave-js/core/safe";
import { isArray } from "alcalzone-shared/typeguards";
import { evaluate } from "../Logic";
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

export function evaluateDeep<
	T extends
		| ConditionalItem<unknown>
		| ConditionalItem<unknown>[]
		| ReadonlyMap<any, ConditionalItem<unknown>>
		| Map<any, ConditionalItem<unknown>>
		| unknown[]
		| unknown,
>(
	obj: T,
	deviceId?: DeviceID,
): T extends undefined
	? undefined
	: T extends ConditionalItem<infer R>[]
	? R[]
	: T extends ConditionalItem<infer R>
	? R
	: T extends ReadonlyMap<infer K, ConditionalItem<infer V>>
	? Map<K, V>
	: T extends Map<infer K, ConditionalItem<infer V>>
	? Map<K, V>
	: T;

export function evaluateDeep(
	obj:
		| ConditionalItem<unknown>
		| ConditionalItem<unknown>[]
		| Map<any, ConditionalItem<unknown>>
		| unknown[]
		| unknown,
	deviceId?: DeviceID,
): unknown {
	if (obj == undefined) {
		return obj;
	} else if (isArray(obj)) {
		// Evaluate all array entries and return the ones that passed
		return obj
			.map((item) => evaluateDeep(item, deviceId))
			.filter((o) => o != undefined);
	} else if (obj instanceof Map) {
		const ret = new Map();
		for (const [key, val] of obj) {
			const evaluated = evaluateDeep(val, deviceId);
			if (evaluated != undefined) {
				ret.set(key, evaluated);
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
