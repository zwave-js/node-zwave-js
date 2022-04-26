import { pick, type JSONObject } from "@zwave-js/shared/safe";
import { isArray, isObject } from "alcalzone-shared/typeguards";
import { throwInvalidConfig } from "../utils_safe";
import {
	ConditionalItem,
	conditionApplies,
	evaluateDeep,
} from "./ConditionalItem";
import {
	ConditionalPrimitive,
	parseConditionalPrimitive,
} from "./ConditionalPrimitive";
import type { DeviceID } from "./shared";

export class ConditionalDeviceMetadata
	implements ConditionalItem<DeviceMetadata>
{
	public constructor(filename: string, definition: JSONObject) {
		for (const prop of [
			"wakeup",
			"inclusion",
			"exclusion",
			"reset",
			"manual",
		] as const) {
			if (prop in definition) {
				this[prop] = parseConditionalPrimitive(
					filename,
					"string",
					prop,
					definition[prop],
					"The metadata entry ",
				);
			}
		}

		if ("comments" in definition) {
			const value = definition.comments;
			const isComment = (opt: unknown) =>
				isObject(opt) &&
				typeof opt.level === "string" &&
				typeof opt.text === "string";

			if (isComment(value)) {
				this.comments = new ConditionalDeviceComment(
					value.level,
					value.text,
					value.$if,
				);
			} else if (isArray(value) && value.every(isComment)) {
				this.comments = value.map(
					(c: any) =>
						new ConditionalDeviceComment(c.level, c.text, c.$if),
				);
			} else {
				throwInvalidConfig(
					"devices",
					`packages/config/config/devices/${filename}:
The metadata entry comments is invalid!`,
				);
			}
		}
	}

	public readonly condition?: string;

	public evaluateCondition(deviceId?: DeviceID): DeviceMetadata | undefined {
		if (!conditionApplies(this, deviceId)) return;
		const ret: DeviceMetadata = {};
		for (const prop of [
			"wakeup",
			"inclusion",
			"exclusion",
			"reset",
			"manual",
		] as const) {
			if (this[prop]) {
				const evaluated = evaluateDeep(this[prop], deviceId);
				if (evaluated) ret[prop] = evaluated;
			}
		}
		const comments = evaluateDeep(this.comments, deviceId, true);
		if (comments) ret.comments = comments;

		return ret;
	}

	/** How to wake up the device manually */
	public readonly wakeup?: ConditionalPrimitive<string>;
	/** Inclusion instructions */
	public readonly inclusion?: ConditionalPrimitive<string>;
	/** Exclusion instructions */
	public readonly exclusion?: ConditionalPrimitive<string>;
	/** Instructions for resetting the device to factory defaults */
	public readonly reset?: ConditionalPrimitive<string>;
	/** A link to the device manual */
	public readonly manual?: ConditionalPrimitive<string>;
	/** Comments for this device */
	public readonly comments?:
		| ConditionalDeviceComment
		| ConditionalDeviceComment[];
}

export interface DeviceMetadata {
	wakeup?: string;
	inclusion?: string;
	exclusion?: string;
	reset?: string;
	manual?: string;
	comments?: DeviceComment | DeviceComment[];
}

export class ConditionalDeviceComment
	implements ConditionalItem<DeviceComment>
{
	public constructor(
		public readonly level: DeviceComment["level"],
		public readonly text: string,
		public readonly condition?: string,
	) {}

	public evaluateCondition(deviceId?: DeviceID): DeviceComment | undefined {
		if (!conditionApplies(this, deviceId)) return;
		return pick(this, ["level", "text"]);
	}
}

export interface DeviceComment {
	level: "info" | "warning" | "error";
	text: string;
}
