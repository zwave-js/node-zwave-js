import { composeObject, entries } from "alcalzone-shared/objects";
import { isArray, isObject } from "alcalzone-shared/typeguards";

// export type SerializableValue = number | string | boolean | Map<string | number, any> | Record<string, any>;
export type SerializedValue = number | string | boolean | Record<string, any>;
export interface CacheValue {
	value: SerializedValue;
	endpoint: number;
	propertyName: string;
}

export function serializeCacheValue(value: unknown): SerializedValue {
	if (value instanceof Map) {
		return composeObject(
			[...value.entries()]
				.map(([k, v]) => [k, serializeCacheValue(v)]),
		);
	} else if (
		typeof value === "number"
		|| typeof value === "string"
		|| typeof value === "boolean"
		|| isObject(value) || isArray(value)
	) {
		return value;
	}
}
