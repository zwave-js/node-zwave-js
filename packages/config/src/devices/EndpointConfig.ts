import type { JSONObject } from "@zwave-js/shared/safe";
import { entries } from "alcalzone-shared/objects";
import { isObject } from "alcalzone-shared/typeguards";
import { throwInvalidConfig } from "../utils_safe";
import {
	ConditionalAssociationConfig,
	type AssociationConfig,
} from "./AssociationConfig";
import {
	ConditionalItem,
	conditionApplies,
	evaluateDeep,
	validateCondition,
} from "./ConditionalItem";
import type { DeviceID } from "./shared";

export class ConditionalEndpointConfig
	implements ConditionalItem<EndpointConfig>
{
	public constructor(
		filename: string,
		index: number,
		definition: JSONObject,
	) {
		this.index = index;

		validateCondition(
			filename,
			definition,
			`Endpoint ${index} contains an`,
		);
		this.condition = definition.$if;

		if (definition.associations != undefined) {
			const associations = new Map<
				number,
				ConditionalAssociationConfig
			>();
			if (!isObject(definition.associations)) {
				throwInvalidConfig(
					`device`,
					`packages/config/config/devices/${filename}:
Endpoint ${index}: associations is not an object`,
				);
			}
			for (const [key, assocDefinition] of entries(
				definition.associations,
			)) {
				if (!/^[1-9][0-9]*$/.test(key)) {
					throwInvalidConfig(
						`device`,
						`packages/config/config/devices/${filename}:
Endpoint ${index}: found non-numeric group id "${key}" in associations`,
					);
				}

				const keyNum = parseInt(key, 10);
				associations.set(
					keyNum,
					new ConditionalAssociationConfig(
						filename,
						keyNum,
						assocDefinition,
					),
				);
			}
			this.associations = associations;
		}
	}

	public readonly index: number;
	public readonly associations?: ReadonlyMap<
		number,
		ConditionalAssociationConfig
	>;

	public readonly condition?: string;

	public evaluateCondition(deviceId?: DeviceID): EndpointConfig | undefined {
		if (!conditionApplies(this, deviceId)) return;
		const ret: EndpointConfig = {
			index: this.index,
		};
		const associations = evaluateDeep(this.associations, deviceId);
		if (associations) ret.associations = associations;

		return ret;
	}
}

export type EndpointConfig = Omit<
	ConditionalEndpointConfig,
	"condition" | "evaluateCondition" | "associations"
> & {
	associations?: Map<number, AssociationConfig> | undefined;
};
