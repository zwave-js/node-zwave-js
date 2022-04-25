import { JSONObject, pick } from "@zwave-js/shared/safe";
import { throwInvalidConfig } from "../utils_safe";
import {
	ConditionalItem,
	conditionApplies,
	validateCondition,
} from "./ConditionalItem";
import type { DeviceID } from "./shared";

export class ConditionalAssociationConfig
	implements ConditionalItem<AssociationConfig>
{
	public constructor(
		filename: string,
		groupId: number,
		definition: JSONObject,
	) {
		this.groupId = groupId;

		validateCondition(
			filename,
			definition,
			`Association ${groupId} contains an`,
		);
		this.condition = definition.$if;

		if (typeof definition.label !== "string") {
			throwInvalidConfig(
				"devices",
				`packages/config/config/devices/${filename}:
Association ${groupId} has a non-string label`,
			);
		}
		this.label = definition.label;

		if (
			definition.description != undefined &&
			typeof definition.description !== "string"
		) {
			throwInvalidConfig(
				"devices",
				`packages/config/config/devices/${filename}:
Association ${groupId} has a non-string description`,
			);
		}
		this.description = definition.description;

		if (typeof definition.maxNodes !== "number") {
			throwInvalidConfig(
				"devices",
				`packages/config/config/devices/${filename}:
maxNodes for association ${groupId} is not a number`,
			);
		}
		this.maxNodes = definition.maxNodes;

		if (
			definition.isLifeline != undefined &&
			typeof definition.isLifeline !== "boolean"
		) {
			throwInvalidConfig(
				"devices",
				`packages/config/config/devices/${filename}:
isLifeline in association ${groupId} must be a boolean`,
			);
		}
		this.isLifeline = !!definition.isLifeline;

		if (
			definition.multiChannel != undefined &&
			typeof definition.multiChannel !== "boolean"
		) {
			throwInvalidConfig(
				"devices",
				`packages/config/config/devices/${filename}:
multiChannel in association ${groupId} must be a boolean`,
			);
		}
		// Default to the "auto" strategy
		this.multiChannel = definition.multiChannel ?? "auto";
	}

	public readonly condition?: string;

	public readonly groupId: number;
	public readonly label: string;
	public readonly description?: string;
	public readonly maxNodes: number;
	/**
	 * Whether this association group is used to report updates to the controller.
	 * While Z-Wave+ defines a single lifeline, older devices may have multiple lifeline associations.
	 */
	public readonly isLifeline: boolean;
	/**
	 * Controls the strategy of setting up lifeline associations:
	 *
	 * * `true` - Use a multi channel association (if possible)
	 * * `false` - Use a node association (if possible)
	 * * `"auto"` - Prefer node associations, fall back to multi channel associations
	 */
	public readonly multiChannel: boolean | "auto";

	public evaluateCondition(
		deviceId?: DeviceID,
	): AssociationConfig | undefined {
		if (!conditionApplies(this, deviceId)) return;

		return pick(this, [
			"groupId",
			"label",
			"description",
			"maxNodes",
			"isLifeline",
			"multiChannel",
		]);
	}
}

export type AssociationConfig = Omit<
	ConditionalAssociationConfig,
	"condition" | "evaluateCondition"
>;
