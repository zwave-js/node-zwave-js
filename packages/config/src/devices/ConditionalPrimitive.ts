import { isArray, isObject } from "alcalzone-shared/typeguards";
import { throwInvalidConfig } from "../utils_safe";
import { conditionApplies, type ConditionalItem } from "./ConditionalItem";
import type { DeviceID } from "./shared";

type ToPrimitive<T extends string> = T extends "string"
	? string
	: T extends "number"
	? number
	: T extends "boolean"
	? boolean
	: never;

export function parseConditionalPrimitive<
	T extends "string" | "number" | "boolean",
>(
	filename: string,
	valueType: T,
	propertyName: string,
	definition: any,
	errorMessagePrefix: string = "",
): ConditionalPrimitive<ToPrimitive<T>> {
	if (
		isArray(definition) &&
		(definition as any[]).every(
			(i, index, dfn) =>
				// In arrays, only the last item may be non-conditional
				(isObject(i) && typeof i.value === valueType) ||
				(index === dfn.length - 1 && typeof i === valueType),
		)
	) {
		return definition.map((d: any) =>
			typeof d === valueType
				? new ConditionalPrimitiveVariant<ToPrimitive<T>>(d)
				: new ConditionalPrimitiveVariant<ToPrimitive<T>>(
						d.value,
						typeof d.$if === "string" ? d.$if : undefined,
				  ),
		);
	} else if (typeof definition === valueType) {
		return definition;
	} else {
		throwInvalidConfig(
			`device`,
			`packages/config/config/devices/${filename}:
${errorMessagePrefix}${propertyName} must be a ${valueType} or an array of conditional ${valueType} entries`,
		);
	}
}

export type ConditionalPrimitive<T extends number | string | boolean> =
	| T
	| ConditionalPrimitiveVariant<T>[];

export class ConditionalPrimitiveVariant<T extends number | string | boolean>
	implements ConditionalItem<T>
{
	public constructor(
		public readonly value: T,
		public readonly condition?: string,
	) {}

	public evaluateCondition(deviceId?: DeviceID): T | undefined {
		if (!conditionApplies(this, deviceId)) return;
		return this.value;
	}
}
