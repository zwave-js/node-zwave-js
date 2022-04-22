import { pick, type JSONObject } from "@zwave-js/shared/safe";
import { isArray, isObject } from "alcalzone-shared/typeguards";
import { throwInvalidConfig } from "../utils_safe";
import {
	ConditionalItem,
	conditionApplies,
	evaluateDeep,
} from "./ConditionalItem";
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
				const value = definition[prop];
				if (typeof value !== "string") {
					throwInvalidConfig(
						"devices",
						`packages/config/config/devices/${filename}:
The metadata entry ${prop} must be a string!`,
					);
				}
				this[prop] = value;
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
		const ret: DeviceMetadata = {
			...pick(this, [
				"wakeup",
				"inclusion",
				"exclusion",
				"reset",
				"manual",
			]),
		};
		const comments = evaluateDeep(this.comments, deviceId);
		if (comments) ret.comments = comments;
		return ret;
	}

	/** How to wake up the device manually */
	public readonly wakeup?: string;
	/** Inclusion instructions */
	public readonly inclusion?: string;
	/** Exclusion instructions */
	public readonly exclusion?: string;
	/** Instructions for resetting the device to factory defaults */
	public readonly reset?: string;
	/** A link to the device manual */
	public readonly manual?: string;
	/** Comments for this device */
	public readonly comments?:
		| ConditionalDeviceComment
		| ConditionalDeviceComment[];
}

export type DeviceMetadata = Omit<
	ConditionalDeviceMetadata,
	"condition" | "evaluateCondition" | "comments"
> & {
	comments?: DeviceComment | DeviceComment[];
};

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
