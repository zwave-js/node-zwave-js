import type { CommandClasses, CommandClassInfo, ValueID } from "@zwave-js/core";
import { JSONObject, pick } from "@zwave-js/shared";
import { isArray, isObject } from "alcalzone-shared/typeguards";
import { hexKeyRegex2Digits, throwInvalidConfig } from "./utils";

export class CompatConfig {
	private valueIdRegex = /^\$value\$\[.+\]$/;

	public constructor(filename: string, definition: JSONObject) {
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
								arg.substr("$value$".length),
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

		if (definition.disableBasicMapping != undefined) {
			if (definition.disableBasicMapping !== true) {
				throwInvalidConfig(
					"devices",
					`config/devices/${filename}:
error in compat option disableBasicMapping`,
				);
			}

			this.disableBasicMapping = definition.disableBasicMapping;
		}

		if (definition.disableStrictEntryControlDataValidation != undefined) {
			if (definition.disableStrictEntryControlDataValidation !== true) {
				throwInvalidConfig(
					"devices",
					`config/devices/${filename}:
error in compat option disableStrictEntryControlDataValidation`,
				);
			}

			this.disableStrictEntryControlDataValidation =
				definition.disableStrictEntryControlDataValidation;
		}

		if (definition.enableBasicSetMapping != undefined) {
			if (definition.enableBasicSetMapping !== true) {
				throwInvalidConfig(
					"devices",
					`config/devices/${filename}:
error in compat option enableBasicSetMapping`,
				);
			}

			this.enableBasicSetMapping = definition.enableBasicSetMapping;
		}

		if (definition.forceNotificationIdleReset != undefined) {
			if (definition.forceNotificationIdleReset !== true) {
				throwInvalidConfig(
					"devices",
					`config/devices/${filename}:
error in compat option forceNotificationIdleReset`,
				);
			}

			this.forceNotificationIdleReset =
				definition.forceNotificationIdleReset;
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
					!Object.keys(definition.commandClasses.add).every((k) =>
						hexKeyRegex2Digits.test(k),
					)
				) {
					throwInvalidConfig(
						"devices",
						`config/devices/${filename}:
All keys in compat option commandClasses.add must be 2-digit hex numbers!`,
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
				for (const [cc, info] of Object.entries(
					definition.commandClasses.add,
				)) {
					addCCs.set(
						parseInt(cc),
						new CompatAddCC(filename, info as any),
					);
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
				} else if (
					!Object.keys(definition.commandClasses.remove).every((k) =>
						hexKeyRegex2Digits.test(k),
					)
				) {
					throwInvalidConfig(
						"devices",
						`config/devices/${filename}:
All keys in compat option commandClasses.remove must be 2-digit hex numbers!`,
					);
				}

				const removeCCs = new Map<
					CommandClasses,
					"*" | readonly number[]
				>();
				for (const [cc, info] of Object.entries(
					definition.commandClasses.remove,
				)) {
					if (isObject(info) && "endpoints" in info) {
						if (
							info.endpoints === "*" ||
							(isArray(info.endpoints) &&
								info.endpoints.every(
									(i) => typeof i === "number",
								))
						) {
							removeCCs.set(parseInt(cc), info.endpoints as any);
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
	}

	public readonly alarmMapping?: readonly CompatMapAlarm[];
	public readonly addCCs?: ReadonlyMap<CommandClasses, CompatAddCC>;
	public readonly removeCCs?: ReadonlyMap<
		CommandClasses,
		"*" | readonly number[]
	>;
	public readonly disableBasicMapping?: boolean;
	public readonly disableStrictEntryControlDataValidation?: boolean;
	public readonly enableBasicSetMapping?: boolean;
	public readonly forceNotificationIdleReset?: boolean;
	public readonly manualValueRefreshDelayMs?: number;
	public readonly overrideFloatEncoding?: {
		size?: number;
		precision?: number;
	};
	public readonly preserveRootApplicationCCValueIDs?: boolean;
	public readonly skipConfigurationInfoQuery?: boolean;
	public readonly treatBasicSetAsEvent?: boolean;
	public readonly queryOnWakeup?: readonly [
		string,
		string,
		...(
			| string
			| number
			| boolean
			| Pick<ValueID, "property" | "propertyKey">
		)[]
	][];
}

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
