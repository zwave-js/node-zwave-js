import { composeObject } from "alcalzone-shared/objects";
import { isArray, isObject } from "alcalzone-shared/typeguards";
import { JSONObject } from "../util/misc";

// export type SerializableValue = number | string | boolean | Map<string | number, any> | JSONObject;
export type SerializedValue =
	| number
	| string
	| boolean
	| JSONObject
	| undefined;
export interface CacheValue {
	endpoint: number | undefined;
	propertyName: string;
	type?: "map";
	value: SerializedValue;
}

export function serializeCacheValue(value: unknown): SerializedValue {
	if (value instanceof Map) {
		return composeObject(
			[...value.entries()].map(([k, v]) => [k, serializeCacheValue(v)]),
		);
	} else if (
		typeof value === "number" ||
		typeof value === "string" ||
		typeof value === "boolean" ||
		isObject(value) ||
		isArray(value)
	) {
		return value;
	}
}
