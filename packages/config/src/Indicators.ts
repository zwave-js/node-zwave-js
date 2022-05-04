import type { ValueType } from "@zwave-js/core/safe";
import { JSONObject, num2hex } from "@zwave-js/shared/safe";
import { throwInvalidConfig } from "./utils_safe";

export type IndicatorMap = ReadonlyMap<number, string>;
export type IndicatorPropertiesMap = ReadonlyMap<number, IndicatorProperty>;

export class IndicatorProperty {
	public constructor(id: number, definition: JSONObject) {
		this.id = id;

		if (typeof definition.label !== "string") {
			throwInvalidConfig(
				"indicators",
				`The label for property ${num2hex(id)} is not a string!`,
			);
		}
		this.label = definition.label;

		if (
			definition.description != undefined &&
			typeof definition.description !== "string"
		) {
			throwInvalidConfig(
				"indicators",
				`The description for property ${num2hex(id)} is not a string!`,
			);
		}
		this.description = definition.description;

		if (definition.min != undefined && typeof definition.min !== "number") {
			throwInvalidConfig(
				"indicators",
				`The minimum value for property ${num2hex(
					id,
				)} is not a number!`,
			);
		}
		this.min = definition.min;

		if (definition.max != undefined && typeof definition.max !== "number") {
			throwInvalidConfig(
				"indicators",
				`The maximum value for property ${num2hex(
					id,
				)} is not a number!`,
			);
		}
		this.max = definition.max;

		if (
			definition.readonly != undefined &&
			typeof definition.readonly !== "boolean"
		) {
			throwInvalidConfig(
				"indicators",
				`readonly for property ${num2hex(id)} is not a boolean!`,
			);
		}
		this.readonly = definition.readonly;

		if (
			definition.type != undefined &&
			typeof definition.type !== "string"
		) {
			throwInvalidConfig(
				"indicators",
				`type for property ${num2hex(id)} is not a string!`,
			);
		}
		// TODO: Validate that the value is ok
		this.type = definition.type;
	}

	public readonly id: number;
	public readonly label: string;
	public readonly description: string | undefined;
	public readonly min: number | undefined;
	public readonly max: number | undefined;
	public readonly readonly: boolean | undefined;
	public readonly type: ValueType | undefined;
}
