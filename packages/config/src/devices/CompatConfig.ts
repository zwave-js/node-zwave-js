import {
	getCCName,
	type CommandClassInfo,
	type CommandClasses,
	type ValueID,
} from "@zwave-js/core/safe";
import { pick, type JSONObject } from "@zwave-js/shared/safe";
import { isArray, isObject } from "alcalzone-shared/typeguards";
import { throwInvalidConfig, tryParseCCId } from "../utils_safe";
import { conditionApplies, type ConditionalItem } from "./ConditionalItem";
import type { DeviceID } from "./shared";

export class ConditionalCompatConfig implements ConditionalItem<CompatConfig> {
	private valueIdRegex = /^\$value\$\[.+\]$/;

	public constructor(filename: string, definition: JSONObject) {
		this.condition = definition.$if;

		if (definition.queryOnWakeup != undefined) {
			if (
				!isArray(definition.queryOnWakeup) ||
				!definition.queryOnWakeup.every(
					(cmd: unknown) =>
						isArray(cmd) &&
						cmd.length >= 2 &&
						typeof cmd[0] === "string" &&
						typeof cmd[1] === "string" &&
						cmd
							.slice(2)
							.every(
								(arg) =>
									typeof arg === "string" ||
									typeof arg === "number" ||
									typeof arg === "boolean",
							),
				)
			) {
				throwInvalidConfig(
					"devices",
					`config/devices/${filename}:
error in compat option queryOnWakeup`,
				);
			}

			// Parse "smart" values into partial Value IDs
			this.queryOnWakeup = (definition.queryOnWakeup as any[][]).map(
				(cmd) =>
					cmd.map((arg) => {
						if (
							typeof arg === "string" &&
							this.valueIdRegex.test(arg)
						) {
							const tuple = JSON.parse(
								arg.slice("$value$".length),
							);
							return {
								property: tuple[0],
								propertyKey: tuple[1],
							};
						}
						return arg;
					}),
			) as any;
		}

		if (definition.disableAutoRefresh != undefined) {
			if (definition.disableAutoRefresh !== true) {
				throwInvalidConfig(
					"devices",
					`config/devices/${filename}:
compat option disableAutoRefresh must be true or omitted`,
				);
			}

			this.disableAutoRefresh = definition.disableAutoRefresh;
		}

		if (definition.disableBasicMapping != undefined) {
			if (definition.disableBasicMapping !== true) {
				throwInvalidConfig(
					"devices",
					`config/devices/${filename}:
compat option disableBasicMapping must be true or omitted`,
				);
			}

			this.disableBasicMapping = definition.disableBasicMapping;
		}

		if (definition.disableStrictEntryControlDataValidation != undefined) {
			if (definition.disableStrictEntryControlDataValidation !== true) {
				throwInvalidConfig(
					"devices",
					`config/devices/${filename}:
compat option disableStrictEntryControlDataValidation must be true or omitted`,
				);
			}

			this.disableStrictEntryControlDataValidation =
				definition.disableStrictEntryControlDataValidation;
		}

		if (definition.disableStrictMeasurementValidation != undefined) {
			if (definition.disableStrictMeasurementValidation !== true) {
				throwInvalidConfig(
					"devices",
					`config/devices/${filename}:
compat option disableStrictMeasurementValidation must be true or omitted`,
				);
			}

			this.disableStrictMeasurementValidation =
				definition.disableStrictMeasurementValidation;
		}

		if (definition.enableBasicSetMapping != undefined) {
			if (definition.enableBasicSetMapping !== true) {
				throwInvalidConfig(
					"devices",
					`config/devices/${filename}:
compat option enableBasicSetMapping must be true or omitted`,
				);
			}

			this.enableBasicSetMapping = definition.enableBasicSetMapping;
		}

		if (definition.forceNotificationIdleReset != undefined) {
			if (definition.forceNotificationIdleReset !== true) {
				throwInvalidConfig(
					"devices",
					`config/devices/${filename}:
compat option forceNotificationIdleReset must be true or omitted`,
				);
			}

			this.forceNotificationIdleReset =
				definition.forceNotificationIdleReset;
		}

		if (definition.forceSceneControllerGroupCount != undefined) {
			if (typeof definition.forceSceneControllerGroupCount !== "number") {
				throwInvalidConfig(
					"devices",
					`config/devices/${filename}:
compat option forceSceneControllerGroupCount must be a number!`,
				);
			}

			if (
				definition.forceSceneControllerGroupCount < 0 ||
				definition.forceSceneControllerGroupCount > 255
			) {
				throwInvalidConfig(
					"devices",
					`config/devices/${filename}:
compat option forceSceneControllerGroupCount must be between 0 and 255!`,
				);
			}

			this.forceSceneControllerGroupCount =
				definition.forceSceneControllerGroupCount;
		}

		if (definition.preserveRootApplicationCCValueIDs != undefined) {
			if (definition.preserveRootApplicationCCValueIDs !== true) {
				throwInvalidConfig(
					"devices",
					`config/devices/${filename}:
error in compat option preserveRootApplicationCCValueIDs`,
				);
			}

			this.preserveRootApplicationCCValueIDs =
				definition.preserveRootApplicationCCValueIDs;
		}

		if (definition.preserveEndpoints != undefined) {
			if (
				definition.preserveEndpoints !== "*" &&
				!(
					isArray(definition.preserveEndpoints) &&
					definition.preserveEndpoints.every(
						(d: any) =>
							typeof d === "number" && d % 1 === 0 && d > 0,
					)
				)
			) {
				throwInvalidConfig(
					"devices",
					`config/devices/${filename}:
compat option preserveEndpoints must be "*" or an array of positive integers`,
				);
			}

			this.preserveEndpoints = definition.preserveEndpoints;
		}

		if (definition.removeEndpoints != undefined) {
			if (
				definition.removeEndpoints !== "*" &&
				!(
					isArray(definition.removeEndpoints) &&
					definition.removeEndpoints.every(
						(d: any) =>
							typeof d === "number" && d % 1 === 0 && d > 0,
					)
				)
			) {
				throwInvalidConfig(
					"devices",
					`config/devices/${filename}:
compat option removeEndpoints must be "*" or an array of positive integers`,
				);
			}

			this.removeEndpoints = definition.removeEndpoints;
		}

		if (definition.skipConfigurationNameQuery != undefined) {
			if (definition.skipConfigurationNameQuery !== true) {
				throwInvalidConfig(
					"devices",
					`config/devices/${filename}:
error in compat option skipConfigurationNameQuery`,
				);
			}

			this.skipConfigurationNameQuery =
				definition.skipConfigurationNameQuery;
		}

		if (definition.skipConfigurationInfoQuery != undefined) {
			if (definition.skipConfigurationInfoQuery !== true) {
				throwInvalidConfig(
					"devices",
					`config/devices/${filename}:
error in compat option skipConfigurationInfoQuery`,
				);
			}

			this.skipConfigurationInfoQuery =
				definition.skipConfigurationInfoQuery;
		}

		if (definition.treatBasicSetAsEvent != undefined) {
			if (definition.treatBasicSetAsEvent !== true) {
				throwInvalidConfig(
					"devices",
					`config/devices/${filename}:
error in compat option treatBasicSetAsEvent`,
				);
			}

			this.treatBasicSetAsEvent = definition.treatBasicSetAsEvent;
		}

		if (definition.treatMultilevelSwitchSetAsEvent != undefined) {
			if (definition.treatMultilevelSwitchSetAsEvent !== true) {
				throwInvalidConfig(
					"devices",
					`config/devices/${filename}:
					error in compat option treatMultilevelSwitchSetAsEvent`,
				);
			}

			this.treatMultilevelSwitchSetAsEvent =
				definition.treatMultilevelSwitchSetAsEvent;
		}

		if (definition.treatDestinationEndpointAsSource != undefined) {
			if (definition.treatDestinationEndpointAsSource !== true) {
				throwInvalidConfig(
					"devices",
					`config/devices/${filename}:
error in compat option treatDestinationEndpointAsSource`,
				);
			}

			this.treatDestinationEndpointAsSource =
				definition.treatDestinationEndpointAsSource;
		}

		if (definition.manualValueRefreshDelayMs != undefined) {
			if (typeof definition.manualValueRefreshDelayMs !== "number") {
				throwInvalidConfig(
					"devices",
					`config/devices/${filename}:
compat option manualValueRefreshDelayMs must be a number!`,
				);
			}

			if (
				definition.manualValueRefreshDelayMs % 1 !== 0 ||
				definition.manualValueRefreshDelayMs < 0
			) {
				throwInvalidConfig(
					"devices",
					`config/devices/${filename}:
compat option manualValueRefreshDelayMs must be a non-negative integer!`,
				);
			}

			this.manualValueRefreshDelayMs =
				definition.manualValueRefreshDelayMs;
		}

		if (definition.reportTimeout != undefined) {
			if (typeof definition.reportTimeout !== "number") {
				throwInvalidConfig(
					"devices",
					`config/devices/${filename}:
compat option reportTimeout must be a number!`,
				);
			}

			if (
				definition.reportTimeout % 1 !== 0 ||
				definition.reportTimeout < 1000 ||
				definition.reportTimeout > 10000
			) {
				throwInvalidConfig(
					"devices",
					`config/devices/${filename}:
compat option reportTimeout must be an integer between 1000 and 10000!`,
				);
			}

			this.reportTimeout = definition.reportTimeout;
		}

		if (definition.mapRootReportsToEndpoint != undefined) {
			if (typeof definition.mapRootReportsToEndpoint !== "number") {
				throwInvalidConfig(
					"devices",
					`config/devices/${filename}:
compat option mapRootReportsToEndpoint must be a number!`,
				);
			}

			if (
				definition.mapRootReportsToEndpoint % 1 !== 0 ||
				definition.mapRootReportsToEndpoint < 1
			) {
				throwInvalidConfig(
					"devices",
					`config/devices/${filename}:
compat option mapRootReportsToEndpoint must be a positive integer!`,
				);
			}

			this.mapRootReportsToEndpoint = definition.mapRootReportsToEndpoint;
		}

		if (definition.overrideFloatEncoding != undefined) {
			if (!isObject(definition.overrideFloatEncoding)) {
				throwInvalidConfig(
					"devices",
					`config/devices/${filename}:
error in compat option overrideFloatEncoding`,
				);
			}

			this.overrideFloatEncoding = {};
			if ("precision" in definition.overrideFloatEncoding) {
				if (
					typeof definition.overrideFloatEncoding.precision !=
					"number"
				) {
					throwInvalidConfig(
						"devices",
						`config/devices/${filename}:
compat option overrideFloatEncoding.precision must be a number!`,
					);
				}

				if (
					definition.overrideFloatEncoding.precision % 1 !== 0 ||
					definition.overrideFloatEncoding.precision < 0
				) {
					throwInvalidConfig(
						"devices",
						`config/devices/${filename}:
compat option overrideFloatEncoding.precision must be a positive integer!`,
					);
				}

				this.overrideFloatEncoding.precision =
					definition.overrideFloatEncoding.precision;
			}
			if ("size" in definition.overrideFloatEncoding) {
				if (typeof definition.overrideFloatEncoding.size != "number") {
					throwInvalidConfig(
						"devices",
						`config/devices/${filename}:
compat option overrideFloatEncoding.size must be a number!`,
					);
				}

				if (
					definition.overrideFloatEncoding.size % 1 !== 0 ||
					definition.overrideFloatEncoding.size < 1 ||
					definition.overrideFloatEncoding.size > 4
				) {
					throwInvalidConfig(
						"devices",
						`config/devices/${filename}:
compat option overrideFloatEncoding.size must be an integer between 1 and 4!`,
					);
				}

				this.overrideFloatEncoding.size =
					definition.overrideFloatEncoding.size;
			}

			if (Object.keys(this.overrideFloatEncoding).length === 0) {
				throwInvalidConfig(
					"devices",
					`config/devices/${filename}:
error in compat option overrideFloatEncoding: size and/or precision must be specified!`,
				);
			}
		}

		if (definition.commandClasses != undefined) {
			if (!isObject(definition.commandClasses)) {
				throwInvalidConfig(
					"devices",
					`config/devices/${filename}:
error in compat option commandClasses`,
				);
			}

			if (definition.commandClasses.add != undefined) {
				if (!isObject(definition.commandClasses.add)) {
					throwInvalidConfig(
						"devices",
						`config/devices/${filename}:
error in compat option commandClasses.add`,
					);
				} else if (
					!Object.values(definition.commandClasses.add).every((v) =>
						isObject(v),
					)
				) {
					throwInvalidConfig(
						"devices",
						`config/devices/${filename}:
All values in compat option commandClasses.add must be objects`,
					);
				}

				const addCCs = new Map<CommandClasses, CompatAddCC>();
				for (const [key, info] of Object.entries(
					definition.commandClasses.add,
				)) {
					// Parse the key into a CC ID
					const cc = tryParseCCId(key);
					if (cc == undefined) {
						throwInvalidConfig(
							"devices",
							`config/devices/${filename}:
Invalid Command Class "${key}" specified in compat option commandClasses.add!`,
						);
					}

					addCCs.set(cc, new CompatAddCC(filename, info as any));
				}
				this.addCCs = addCCs;
			}

			if (definition.commandClasses.remove != undefined) {
				if (!isObject(definition.commandClasses.remove)) {
					throwInvalidConfig(
						"devices",
						`config/devices/${filename}:
error in compat option commandClasses.remove`,
					);
				}

				const removeCCs = new Map<
					CommandClasses,
					"*" | readonly number[]
				>();
				for (const [key, info] of Object.entries(
					definition.commandClasses.remove,
				)) {
					// Parse the key into a CC ID
					const cc = tryParseCCId(key);
					if (cc == undefined) {
						throwInvalidConfig(
							"devices",
							`config/devices/${filename}:
Invalid Command Class "${key}" specified in compat option commandClasses.remove!`,
						);
					}
					if (isObject(info) && "endpoints" in info) {
						if (
							info.endpoints === "*" ||
							(isArray(info.endpoints) &&
								info.endpoints.every(
									(i) => typeof i === "number",
								))
						) {
							removeCCs.set(cc, info.endpoints as any);
						} else {
							throwInvalidConfig(
								"devices",
								`config/devices/${filename}:
Compat option commandClasses.remove has an invalid "endpoints" property. Only "*" and numeric arrays are allowed!`,
							);
						}
					} else {
						throwInvalidConfig(
							"devices",
							`config/devices/${filename}:
All values in compat option commandClasses.remove must be objects with an "endpoints" property!`,
						);
					}
				}
				this.removeCCs = removeCCs;
			}
		}

		if (definition.alarmMapping != undefined) {
			if (
				!isArray(definition.alarmMapping) ||
				!definition.alarmMapping.every((m: any) => isObject(m))
			) {
				throwInvalidConfig(
					"devices",
					`config/devices/${filename}:
compat option alarmMapping must be an array where all items are objects!`,
				);
			}
			this.alarmMapping = (definition.alarmMapping as any[]).map(
				(m, i) => new CompatMapAlarm(filename, m, i + 1),
			);
		}

		if (definition.overrideQueries != undefined) {
			if (!isObject(definition.overrideQueries)) {
				throwInvalidConfig(
					"devices",
					`config/devices/${filename}:
compat option overrideQueries must be an object!`,
				);
			}
			this.overrideQueries = new CompatOverrideQueries(
				filename,
				definition.overrideQueries,
			);
		}
	}

	public readonly alarmMapping?: readonly CompatMapAlarm[];
	public readonly addCCs?: ReadonlyMap<CommandClasses, CompatAddCC>;
	public readonly removeCCs?: ReadonlyMap<
		CommandClasses,
		"*" | readonly number[]
	>;
	public readonly disableAutoRefresh?: boolean;
	public readonly disableBasicMapping?: boolean;
	public readonly disableStrictEntryControlDataValidation?: boolean;
	public readonly disableStrictMeasurementValidation?: boolean;
	public readonly enableBasicSetMapping?: boolean;
	public readonly forceNotificationIdleReset?: boolean;
	public readonly forceSceneControllerGroupCount?: number;
	public readonly manualValueRefreshDelayMs?: number;
	public readonly mapRootReportsToEndpoint?: number;
	public readonly overrideFloatEncoding?: {
		size?: number;
		precision?: number;
	};
	public readonly overrideQueries?: CompatOverrideQueries;
	public readonly preserveRootApplicationCCValueIDs?: boolean;
	public readonly preserveEndpoints?: "*" | readonly number[];
	public readonly removeEndpoints?: "*" | readonly number[];
	public readonly reportTimeout?: number;
	public readonly skipConfigurationNameQuery?: boolean;
	public readonly skipConfigurationInfoQuery?: boolean;
	public readonly treatBasicSetAsEvent?: boolean;
	public readonly treatMultilevelSwitchSetAsEvent?: boolean;
	public readonly treatDestinationEndpointAsSource?: boolean;
	public readonly queryOnWakeup?: readonly [
		string,
		string,
		...(
			| string
			| number
			| boolean
			| Pick<ValueID, "property" | "propertyKey">
		)[],
	][];

	public readonly condition?: string | undefined;

	public evaluateCondition(deviceId?: DeviceID): CompatConfig | undefined {
		if (!conditionApplies(this, deviceId)) return;
		return pick(this, [
			"alarmMapping",
			"addCCs",
			"removeCCs",
			"disableAutoRefresh",
			"disableBasicMapping",
			"disableStrictEntryControlDataValidation",
			"disableStrictMeasurementValidation",
			"enableBasicSetMapping",
			"forceNotificationIdleReset",
			"forceSceneControllerGroupCount",
			"manualValueRefreshDelayMs",
			"mapRootReportsToEndpoint",
			"overrideFloatEncoding",
			"overrideQueries",
			"reportTimeout",
			"preserveRootApplicationCCValueIDs",
			"preserveEndpoints",
			"removeEndpoints",
			"skipConfigurationNameQuery",
			"skipConfigurationInfoQuery",
			"treatBasicSetAsEvent",
			"treatMultilevelSwitchSetAsEvent",
			"treatDestinationEndpointAsSource",
			"queryOnWakeup",
		]);
	}
}

export type CompatConfig = Omit<
	ConditionalCompatConfig,
	"condition" | "evaluateCondition"
>;

export class CompatAddCC {
	public constructor(filename: string, definition: JSONObject) {
		const endpoints = new Map<number, Partial<CommandClassInfo>>();
		const parseEndpointInfo = (endpoint: number, info: JSONObject) => {
			const parsed: Partial<CommandClassInfo> = {};
			if (info.isSupported != undefined) {
				if (typeof info.isSupported !== "boolean") {
					throwInvalidConfig(
						"devices",
						`config/devices/${filename}:
Property isSupported in compat option commandClasses.add, endpoint ${endpoint} must be a boolean!`,
					);
				} else {
					parsed.isSupported = info.isSupported;
				}
			}
			if (info.isControlled != undefined) {
				if (typeof info.isControlled !== "boolean") {
					throwInvalidConfig(
						"devices",
						`config/devices/${filename}:
Property isControlled in compat option commandClasses.add, endpoint ${endpoint} must be a boolean!`,
					);
				} else {
					parsed.isControlled = info.isControlled;
				}
			}
			if (info.secure != undefined) {
				if (typeof info.secure !== "boolean") {
					throwInvalidConfig(
						"devices",
						`config/devices/${filename}:
Property secure in compat option commandClasses.add, endpoint ${endpoint} must be a boolean!`,
					);
				} else {
					parsed.secure = info.secure;
				}
			}
			if (info.version != undefined) {
				if (typeof info.version !== "number") {
					throwInvalidConfig(
						"devices",
						`config/devices/${filename}:
Property version in compat option commandClasses.add, endpoint ${endpoint} must be a number!`,
					);
				} else {
					parsed.version = info.version;
				}
			}
			endpoints.set(endpoint, parsed);
		};
		// Parse root endpoint info if given
		if (
			definition.isSupported != undefined ||
			definition.isControlled != undefined ||
			definition.version != undefined ||
			definition.secure != undefined
		) {
			// We have info for the root endpoint
			parseEndpointInfo(0, definition);
		}
		// Parse all other endpoints
		if (isObject(definition.endpoints)) {
			if (
				!Object.keys(definition.endpoints).every((k) => /^\d+$/.test(k))
			) {
				throwInvalidConfig(
					"devices",
					`config/devices/${filename}:
invalid endpoint index in compat option commandClasses.add`,
				);
			} else {
				for (const [ep, info] of Object.entries(definition.endpoints)) {
					parseEndpointInfo(parseInt(ep), info as any);
				}
			}
		}
		this.endpoints = endpoints;
	}

	public readonly endpoints: ReadonlyMap<number, Partial<CommandClassInfo>>;
}

export interface CompatMapAlarmFrom {
	alarmType: number;
	alarmLevel?: number;
}

export interface CompatMapAlarmTo {
	notificationType: number;
	notificationEvent: number;
	eventParameters?: Record<string, number | "alarmLevel">;
}

export class CompatMapAlarm {
	public constructor(
		filename: string,
		definition: JSONObject,
		index: number,
	) {
		if (!isObject(definition.from)) {
			throwInvalidConfig(
				"devices",
				`config/devices/${filename}:
error in compat option alarmMapping, mapping #${index}: property "from" must be an object!`,
			);
		} else {
			if (typeof definition.from.alarmType !== "number") {
				throwInvalidConfig(
					"devices",
					`config/devices/${filename}:
error in compat option alarmMapping, mapping #${index}: property "from.alarmType" must be a number!`,
				);
			}
			if (
				definition.from.alarmLevel != undefined &&
				typeof definition.from.alarmLevel !== "number"
			) {
				throwInvalidConfig(
					"devices",
					`config/devices/${filename}:
error in compat option alarmMapping, mapping #${index}: if property "from.alarmLevel" is given, it must be a number!`,
				);
			}
		}

		if (!isObject(definition.to)) {
			throwInvalidConfig(
				"devices",
				`config/devices/${filename}:
error in compat option alarmMapping, mapping #${index}: property "to" must be an object!`,
			);
		} else {
			if (typeof definition.to.notificationType !== "number") {
				throwInvalidConfig(
					"devices",
					`config/devices/${filename}:
error in compat option alarmMapping, mapping #${index}: property "to.notificationType" must be a number!`,
				);
			}
			if (typeof definition.to.notificationEvent !== "number") {
				throwInvalidConfig(
					"devices",
					`config/devices/${filename}:
error in compat option alarmMapping, mapping #${index}: property "to.notificationEvent" must be a number!`,
				);
			}
			if (definition.to.eventParameters != undefined) {
				if (!isObject(definition.to.eventParameters)) {
					throwInvalidConfig(
						"devices",
						`config/devices/${filename}:
error in compat option alarmMapping, mapping #${index}: property "to.eventParameters" must be an object!`,
					);
				} else {
					for (const [key, val] of Object.entries(
						definition.to.eventParameters,
					)) {
						if (typeof val !== "number" && val !== "alarmLevel") {
							throwInvalidConfig(
								"devices",
								`config/devices/${filename}:
error in compat option alarmMapping, mapping #${index}: property "to.eventParameters.${key}" must be a number or the literal "alarmLevel"!`,
							);
						}
					}
				}
			}
		}

		this.from = pick(definition.from, ["alarmType", "alarmLevel"]);
		this.to = pick(definition.to, [
			"notificationType",
			"notificationEvent",
			"eventParameters",
		]);
	}

	public readonly from: CompatMapAlarmFrom;
	public readonly to: CompatMapAlarmTo;
}

export class CompatOverrideQueries {
	public constructor(filename: string, definition: JSONObject) {
		const overrides = new Map();

		const parseOverride = (
			cc: CommandClasses,
			info: JSONObject,
		): CompatOverrideQuery => {
			if (typeof info.method !== "string") {
				throwInvalidConfig(
					"devices",
					`config/devices/${filename}:
Property "method" in compat option overrideQueries, CC ${getCCName(
						cc,
					)} must be a string!`,
				);
			} else if (
				info.matchArgs != undefined &&
				!isArray(info.matchArgs)
			) {
				throwInvalidConfig(
					"devices",
					`config/devices/${filename}:
Property "matchArgs" in compat option overrideQueries, CC ${getCCName(
						cc,
					)} must be an array!`,
				);
			} else if (!("result" in info)) {
				throwInvalidConfig(
					"devices",
					`config/devices/${filename}:
Property "result" is missing in in compat option overrideQueries, CC ${getCCName(
						cc,
					)}!`,
				);
			} else if (
				info.endpoint != undefined &&
				typeof info.endpoint !== "number"
			) {
				throwInvalidConfig(
					"devices",
					`config/devices/${filename}:
Property "endpoint" in compat option overrideQueries, CC ${getCCName(
						cc,
					)} must be a number!`,
				);
			} else if (info.persistValues && !isObject(info.persistValues)) {
				throwInvalidConfig(
					"devices",
					`config/devices/${filename}:
Property "persistValues" in compat option overrideQueries, CC ${getCCName(
						cc,
					)} must be an object!`,
				);
			} else if (info.extendMetadata && !isObject(info.extendMetadata)) {
				throwInvalidConfig(
					"devices",
					`config/devices/${filename}:
Property "extendMetadata" in compat option overrideQueries, CC ${getCCName(
						cc,
					)} must be an object!`,
				);
			}

			return {
				endpoint: info.endpoint,
				method: info.method,
				matchArgs: info.matchArgs,
				result: info.result,
				persistValues: info.persistValues,
				extendMetadata: info.extendMetadata,
			};
		};

		for (const [key, value] of Object.entries(definition)) {
			// Parse the key into a CC ID
			const cc = tryParseCCId(key);
			if (cc == undefined) {
				throwInvalidConfig(
					"devices",
					`config/devices/${filename}:
Invalid Command Class "${key}" specified in compat option overrideQueries!`,
				);
			}

			let overrideDefinitions: any;
			if (isObject(value)) {
				overrideDefinitions = [value];
			} else if (!isArray(value)) {
				throwInvalidConfig(
					"devices",
					`config/devices/${filename}:
Property "${key}" in compat option overrideQueries must be a single override object or an array thereof!`,
				);
			} else {
				overrideDefinitions = value;
			}

			overrides.set(
				cc,
				overrideDefinitions.map((info: any) => parseOverride(cc, info)),
			);
		}

		this.overrides = overrides;
	}

	// CC -> endpoint -> queries
	private readonly overrides: ReadonlyMap<
		CommandClasses,
		CompatOverrideQuery[]
	>;

	public hasOverride(ccId: CommandClasses): boolean {
		return this.overrides.has(ccId);
	}

	public matchOverride(
		cc: CommandClasses,
		endpointIndex: number,
		method: string,
		args: any[],
	):
		| Pick<
				CompatOverrideQuery,
				"result" | "persistValues" | "extendMetadata"
		  >
		| undefined {
		const queries = this.overrides.get(cc);
		if (!queries) return undefined;
		for (const query of queries) {
			if ((query.endpoint ?? 0) !== endpointIndex) continue;
			if (query.method !== method) continue;
			if (query.matchArgs) {
				if (query.matchArgs.length !== args.length) continue;
				if (!query.matchArgs.every((arg, i) => arg === args[i]))
					continue;
			}
			return pick(query, ["result", "persistValues", "extendMetadata"]);
		}
	}
}

export interface CompatOverrideQuery {
	/** Which endpoint this override is for */
	endpoint?: number;
	/** For which API method this override is defined */
	method: string;
	/**
	 * An array of method arguments that needs to match for this override to apply.
	 * If `undefined`, no matching is performed.
	 */
	matchArgs?: any[];
	/** The result to return from the API call */
	result: any;
	/**
	 * An optional dictionary of values that will be persisted in the cache.
	 * The keys are properties of the `...CCValues` objects that belong to this CC.
	 */
	persistValues?: Record<string, any>;
	/**
	 * An optional dictionary of value metadata that will be persisted in the cache.
	 * The keys are properties of the `...CCValues` objects that belong to this CC.
	 * The given metadata will be merged with statically defined value metadata.
	 */
	extendMetadata?: Record<string, any>;
}
