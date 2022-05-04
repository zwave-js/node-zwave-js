import { pick, type JSONObject } from "@zwave-js/shared/safe";
import { isArray, isObject } from "alcalzone-shared/typeguards";
import { throwInvalidConfig } from "../utils_safe";
import {
	ConditionalItem,
	conditionApplies,
	evaluateDeep,
} from "./ConditionalItem";
import type { ConditionalDeviceConfig } from "./DeviceConfig";
import type { DeviceID } from "./shared";

export class ConditionalParamInformation
	implements ConditionalItem<ParamInformation>
{
	public constructor(
		parent: ConditionalDeviceConfig,
		parameterNumber: number,
		valueBitMask: number | undefined,
		definition: JSONObject,
	) {
		this.parent = parent;
		this.parameterNumber = parameterNumber;
		this.valueBitMask = valueBitMask;
		// No need to validate here, this should be done one level higher
		this.condition = definition.$if;

		if (typeof definition.label !== "string") {
			throwInvalidConfig(
				"devices",
				`packages/config/config/devices/${parent.filename}:
Parameter #${parameterNumber} has a non-string label`,
			);
		}
		this.label = definition.label;

		if (
			definition.description != undefined &&
			typeof definition.description !== "string"
		) {
			throwInvalidConfig(
				"devices",
				`packages/config/config/devices/${parent.filename}:
Parameter #${parameterNumber} has a non-string description`,
			);
		}
		this.description = definition.description;

		if (
			typeof definition.valueSize !== "number" ||
			definition.valueSize <= 0
		) {
			throwInvalidConfig(
				"devices",
				`packages/config/config/devices/${parent.filename}:
Parameter #${parameterNumber} has an invalid value size`,
			);
		}
		this.valueSize = definition.valueSize;

		if (
			definition.minValue != undefined &&
			typeof definition.minValue !== "number"
		) {
			throwInvalidConfig(
				"devices",
				`packages/config/config/devices/${parent.filename}:
Parameter #${parameterNumber} has a non-numeric property minValue`,
			);
		}
		this.minValue = definition.minValue;

		if (
			definition.maxValue != undefined &&
			typeof definition.maxValue !== "number"
		) {
			throwInvalidConfig(
				"devices",
				`packages/config/config/devices/${parent.filename}:
Parameter #${parameterNumber} has a non-numeric property maxValue`,
			);
		}
		this.maxValue = definition.maxValue;

		if (
			definition.unsigned != undefined &&
			typeof definition.unsigned !== "boolean"
		) {
			throwInvalidConfig(
				"devices",
				`packages/config/config/devices/${parent.filename}:
Parameter #${parameterNumber} has a non-boolean property unsigned`,
			);
		}
		this.unsigned = definition.unsigned === true;

		if (
			definition.unit != undefined &&
			typeof definition.unit !== "string"
		) {
			throwInvalidConfig(
				"devices",
				`packages/config/config/devices/${parent.filename}:
Parameter #${parameterNumber} has a non-string unit`,
			);
		}
		this.unit = definition.unit;

		if (definition.readOnly != undefined && definition.readOnly !== true) {
			throwInvalidConfig(
				"devices",
				`packages/config/config/devices/${parent.filename}:
		Parameter #${parameterNumber}: readOnly must true or omitted!`,
			);
		}
		this.readOnly = definition.readOnly;

		if (
			definition.writeOnly != undefined &&
			definition.writeOnly !== true
		) {
			throwInvalidConfig(
				"devices",
				`packages/config/config/devices/${parent.filename}:
		Parameter #${parameterNumber}: writeOnly must be true or omitted!`,
			);
		}
		this.writeOnly = definition.writeOnly;

		if (definition.defaultValue == undefined) {
			if (!this.readOnly) {
				throwInvalidConfig(
					"devices",
					`packages/config/config/devices/${parent.filename}:
Parameter #${parameterNumber} is missing defaultValue, which is required unless the parameter is readOnly`,
				);
			}
		} else if (typeof definition.defaultValue !== "number") {
			throwInvalidConfig(
				"devices",
				`packages/config/config/devices/${parent.filename}:
Parameter #${parameterNumber} has a non-numeric property defaultValue`,
			);
		}
		this.defaultValue = definition.defaultValue;

		if (
			definition.allowManualEntry != undefined &&
			definition.allowManualEntry !== false
		) {
			throwInvalidConfig(
				"devices",
				`packages/config/config/devices/${parent.filename}:
Parameter #${parameterNumber}: allowManualEntry must be false or omitted!`,
			);
		}
		// Default to allowing manual entry, except if the param is readonly
		this.allowManualEntry =
			definition.allowManualEntry ?? (this.readOnly ? false : true);

		if (
			isArray(definition.options) &&
			!definition.options.every(
				(opt: unknown) =>
					isObject(opt) &&
					typeof opt.label === "string" &&
					typeof opt.value === "number",
			)
		) {
			throwInvalidConfig(
				"devices",
				`packages/config/config/devices/${parent.filename}:
Parameter #${parameterNumber}: options is malformed!`,
			);
		}

		this.options =
			definition.options?.map(
				(opt: any) =>
					new ConditionalConfigOption(opt.value, opt.label, opt.$if),
			) ?? [];
	}

	private parent: ConditionalDeviceConfig;
	public readonly parameterNumber: number;
	public readonly valueBitMask?: number;
	public readonly label: string;
	public readonly description?: string;
	public readonly valueSize: number;
	public readonly minValue?: number;
	public readonly maxValue?: number;
	public readonly unsigned?: boolean;
	public readonly defaultValue: number;
	public readonly unit?: string;
	public readonly readOnly?: true;
	public readonly writeOnly?: true;
	public readonly allowManualEntry: boolean;
	public readonly options: readonly ConditionalConfigOption[];

	public readonly condition?: string;

	public evaluateCondition(
		deviceId?: DeviceID,
	): ParamInformation | undefined {
		if (!conditionApplies(this, deviceId)) return;

		const ret = {
			...pick(this, [
				"parameterNumber",
				"valueBitMask",
				"label",
				"description",
				"valueSize",
				"minValue",
				"maxValue",
				"unsigned",
				"defaultValue",
				"unit",
				"readOnly",
				"writeOnly",
				"allowManualEntry",
			]),
			options: evaluateDeep(this.options, deviceId, true),
		};
		// Infer minValue from options if possible
		if (ret.minValue == undefined) {
			if (ret.allowManualEntry === false && ret.options.length > 0) {
				ret.minValue = Math.min(...ret.options.map((o) => o.value));
			} else {
				throw throwInvalidConfig(
					"devices",
					`packages/config/config/devices/${this.parent.filename}:
Parameter #${this.parameterNumber} is missing required property "minValue"!`,
				);
			}
		}
		if (ret.maxValue == undefined) {
			if (ret.allowManualEntry === false && ret.options.length > 0) {
				ret.maxValue = Math.max(...ret.options.map((o) => o.value));
			} else {
				throw throwInvalidConfig(
					"devices",
					`packages/config/config/devices/${this.parent.filename}:
Parameter #${this.parameterNumber} is missing required property "maxValue"!`,
				);
			}
		}

		// @ts-expect-error TS doesn't seem to understand that we do set min/maxValue
		return ret;
	}
}

export type ParamInformation = Omit<
	ConditionalParamInformation,
	"condition" | "evaluateCondition" | "options" | "minValue" | "maxValue"
> & {
	options: readonly ConfigOption[];
	minValue: NonNullable<ConditionalParamInformation["minValue"]>;
	maxValue: NonNullable<ConditionalParamInformation["maxValue"]>;
};

export class ConditionalConfigOption implements ConditionalItem<ConfigOption> {
	public constructor(
		public readonly value: number,
		public readonly label: string,
		public readonly condition?: string,
	) {}

	public evaluateCondition(deviceId?: DeviceID): ConfigOption | undefined {
		if (!conditionApplies(this, deviceId)) return;

		return pick(this, ["value", "label"]);
	}
}

export interface ConfigOption {
	value: number;
	label: string;
}
