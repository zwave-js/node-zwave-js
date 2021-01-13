import type { CommandClasses, CommandClassInfo, ValueID } from "@zwave-js/core";
import type { JSONObject } from "@zwave-js/shared";
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

		if (definition.keepS0NonceUntilNext != undefined) {
			if (definition.keepS0NonceUntilNext !== true) {
				throwInvalidConfig(
					"devices",
					`config/devices/${filename}:
error in compat option keepS0NonceUntilNext`,
				);
			}

			this.keepS0NonceUntilNext = definition.keepS0NonceUntilNext;
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
		}
	}

	public readonly addCCs?: ReadonlyMap<CommandClasses, CompatAddCC>;
	public readonly disableBasicMapping?: boolean;
	public readonly keepS0NonceUntilNext?: boolean;
	public readonly preserveRootApplicationCCValueIDs?: boolean;
	public readonly skipConfigurationInfoQuery?: boolean;
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
