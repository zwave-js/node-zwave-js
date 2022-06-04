import { JSONObject, num2hex } from "@zwave-js/shared/safe";
import { throwInvalidConfig } from "./utils_safe";

export type ScaleGroup = ReadonlyMap<number, Scale> & {
	/** The name of the scale group if it is named */
	readonly name?: string;
};
export type NamedScalesGroupMap = ReadonlyMap<string, ScaleGroup>;

export function getDefaultScale(scale: number): Scale {
	return new Scale(scale, {
		unit: undefined,
		label: "Unknown",
	});
}

export class Scale {
	public constructor(key: number, definition: JSONObject) {
		this.key = key;

		if (typeof definition.label !== "string") {
			throwInvalidConfig(
				"named scales",
				`The label for scale ${num2hex(key)} is not a string!`,
			);
		}
		this.label = definition.label;
		if (
			definition.unit != undefined &&
			typeof definition.unit !== "string"
		) {
			throwInvalidConfig(
				"named scales",
				`The unit for scale ${num2hex(key)} is not a string!`,
			);
		}
		this.unit = definition.unit;
		if (
			definition.description != undefined &&
			typeof definition.description !== "string"
		) {
			throwInvalidConfig(
				"named scales",
				`The description for scale ${num2hex(key)} is not a string!`,
			);
		}
		this.description = definition.description;
	}

	public readonly key: number;
	public readonly unit: string | undefined;
	public readonly label: string;
	public readonly description: string | undefined;
}
