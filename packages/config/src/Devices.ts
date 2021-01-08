import type { CommandClasses, CommandClassInfo, ValueID } from "@zwave-js/core";
import { ZWaveError, ZWaveErrorCodes } from "@zwave-js/core";
import {
	JSONObject,
	ObjectKeyMap,
	ReadonlyObjectKeyMap,
	stringify,
} from "@zwave-js/shared";
import { entries } from "alcalzone-shared/objects";
import { isArray, isObject } from "alcalzone-shared/typeguards";
import { pathExists, readFile, writeFile } from "fs-extra";
import JSON5 from "json5";
import path from "path";
import {
	configDir,
	hexKeyRegex2Digits,
	hexKeyRegex4Digits,
	throwInvalidConfig,
} from "./utils";

export interface FirmwareVersionRange {
	min: string;
	max: string;
}

export interface DeviceConfigIndexEntry {
	manufacturerId: string;
	productType: string;
	productId: string;
	firmwareVersion: FirmwareVersionRange | false;
	filename: string;
}

export type ParamInfoMap = ReadonlyObjectKeyMap<
	{ parameter: number; valueBitMask?: number },
	ParamInformation
>;

const indexPath = path.join(configDir, "devices/index.json");
export type DeviceConfigIndex = DeviceConfigIndexEntry[];

/** @internal */
export async function loadDeviceIndexInternal(): Promise<DeviceConfigIndex> {
	if (!(await pathExists(indexPath))) {
		throw new ZWaveError(
			"The device config index does not exist!",
			ZWaveErrorCodes.Config_Invalid,
		);
	}
	try {
		const fileContents = await readFile(indexPath, "utf8");
		return JSON5.parse(fileContents);
	} catch (e: unknown) {
		if (e instanceof ZWaveError) {
			throw e;
		} else {
			throwInvalidConfig("devices");
		}
	}
}

export async function writeIndexToFile(
	index: DeviceConfigIndex,
): Promise<void> {
	await writeFile(indexPath, stringify(index));
}

function isHexKeyWith4Digits(val: any): val is string {
	return typeof val === "string" && hexKeyRegex4Digits.test(val);
}

const firmwareVersionRegex = /^\d{1,3}\.\d{1,3}$/;
function isFirmwareVersion(val: any): val is string {
	return (
		typeof val === "string" &&
		firmwareVersionRegex.test(val) &&
		val
			.split(".")
			.map((str) => parseInt(str, 10))
			.every((num) => num >= 0 && num <= 255)
	);
}

export class DeviceConfig {
	public constructor(filename: string, fileContents: string) {
		const definition = JSON5.parse(fileContents);
		if (!isHexKeyWith4Digits(definition.manufacturerId)) {
			throwInvalidConfig(
				`device`,
				`config/devices/${filename}:
manufacturer id must be a hexadecimal number with 4 digits`,
			);
		}
		this.manufacturerId = parseInt(definition.manufacturerId, 16);

		for (const prop of ["manufacturer", "label", "description"] as const) {
			if (typeof definition[prop] !== "string") {
				throwInvalidConfig(
					`device`,
					`config/devices/${filename}:
${prop} is not a string`,
				);
			}
			this[prop] = definition[prop];
		}

		if (
			!isArray(definition.devices) ||
			!(definition.devices as any[]).every(
				(dev: unknown) =>
					isObject(dev) &&
					isHexKeyWith4Digits(dev.productType) &&
					isHexKeyWith4Digits(dev.productId),
			)
		) {
			throwInvalidConfig(
				`device`,
				`config/devices/${filename}:
devices is malformed (not an object or type/id that is not a 4-digit hex key)`,
			);
		}
		this.devices = (definition.devices as any[]).map(
			({ productType, productId }) => ({ productType, productId }),
		);

		if (definition.firmwareVersion === false) {
			this.firmwareVersion = false;
		} else if (
			!isObject(definition.firmwareVersion) ||
			!isFirmwareVersion(definition.firmwareVersion.min) ||
			!isFirmwareVersion(definition.firmwareVersion.max)
		) {
			throwInvalidConfig(
				`device`,
				`config/devices/${filename}:
firmwareVersion is malformed or invalid`,
			);
		} else {
			const { min, max } = definition.firmwareVersion;
			this.firmwareVersion = { min, max };
		}

		if (definition.associations != undefined) {
			const associations = new Map<number, AssociationConfig>();
			if (!isObject(definition.associations)) {
				throwInvalidConfig(
					`device`,
					`config/devices/${filename}:
associations is not an object`,
				);
			}
			for (const [key, assocDefinition] of entries(
				definition.associations,
			)) {
				if (!/^[1-9][0-9]*$/.test(key))
					throwInvalidConfig(
						`device`,
						`config/devices/${filename}:
found non-numeric group id "${key}" in associations`,
					);
				const keyNum = parseInt(key, 10);
				associations.set(
					keyNum,
					new AssociationConfig(filename, keyNum, assocDefinition),
				);
			}
			this.associations = associations;
		}

		if (definition.paramInformation != undefined) {
			const paramInformation = new ObjectKeyMap<
				{ parameter: number; valueBitMask?: number },
				ParamInformation
			>();
			if (!isObject(definition.paramInformation)) {
				throwInvalidConfig(
					`device`,
					`config/devices/${filename}:
paramInformation is not an object`,
				);
			}
			for (const [key, paramDefinition] of entries(
				definition.paramInformation,
			)) {
				const match = /^(\d+)(?:\[0x([0-9a-fA-F]+)\])?$/.exec(key);
				if (!match) {
					throwInvalidConfig(
						`device`,
						`config/devices/${filename}: 
found invalid param number "${key}" in paramInformation`,
					);
				}
				const keyNum = parseInt(match[1], 10);
				const bitMask =
					match[2] != undefined ? parseInt(match[2], 16) : undefined;
				paramInformation.set(
					{ parameter: keyNum, valueBitMask: bitMask },
					new ParamInformation(
						filename,
						keyNum,
						bitMask,
						paramDefinition,
					),
				);
			}
			this.paramInformation = paramInformation;
		}

		if (definition.proprietary != undefined) {
			if (!isObject(definition.proprietary)) {
				throwInvalidConfig(
					`device`,
					`config/devices/${filename}:
proprietary is not an object`,
				);
			}
			this.proprietary = definition.proprietary;
		}

		if (definition.compat != undefined) {
			if (!isObject(definition.compat)) {
				throwInvalidConfig(
					`device`,
					`config/devices/${filename}:
compat is not an object`,
				);
			}
			this.compat = new CompatConfig(filename, definition.compat);
		}
	}

	public readonly manufacturer!: string;
	public readonly manufacturerId: number;
	public readonly label!: string;
	public readonly description!: string;
	public readonly devices: readonly {
		productType: string;
		productId: string;
	}[];
	public readonly firmwareVersion: FirmwareVersionRange | false;
	public readonly associations?: ReadonlyMap<number, AssociationConfig>;
	public readonly paramInformation?: ParamInfoMap;
	/**
	 * Contains manufacturer-specific support information for the
	 * ManufacturerProprietary CC
	 */
	public readonly proprietary?: Record<string, unknown>;
	/** Contains compatibility options */
	public readonly compat?: CompatConfig;
}

export class AssociationConfig {
	public constructor(
		filename: string,
		groupId: number,
		definition: JSONObject,
	) {
		this.groupId = groupId;
		if (typeof definition.label !== "string") {
			throwInvalidConfig(
				"devices",
				`config/devices/${filename}:
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
				`config/devices/${filename}:
Association ${groupId} has a non-string description`,
			);
		}
		this.description = definition.description;

		if (typeof definition.maxNodes !== "number") {
			throwInvalidConfig(
				"devices",
				`config/devices/${filename}:
maxNodes for association ${groupId} is not a number`,
			);
		}
		this.maxNodes = definition.maxNodes;

		if (
			definition.isLifeline != undefined &&
			definition.isLifeline !== true
		) {
			throwInvalidConfig(
				"devices",
				`config/devices/${filename}:
isLifeline in association ${groupId} must be either true or left out`,
			);
		}
		this.isLifeline = !!definition.isLifeline;

		if (
			definition.noEndpoint != undefined &&
			definition.noEndpoint !== true
		) {
			throwInvalidConfig(
				"devices",
				`config/devices/${filename}:
noEndpoint in association ${groupId} must be either true or left out`,
			);
		}
		this.noEndpoint = !!definition.noEndpoint;
	}

	public readonly groupId: number;
	public readonly label: string;
	public readonly description?: string;
	public readonly maxNodes: number;
	/**
	 * Whether this association group is used to report updates to the controller.
	 * While Z-Wave+ defines a single lifeline, older devices may have multiple lifeline associations.
	 */
	public readonly isLifeline: boolean;
	/** Some devices support multi channel associations but require some of its groups to use node id associations */
	public readonly noEndpoint: boolean;
}

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

export class ParamInformation {
	public constructor(
		filename: string,
		parameterNumber: number,
		valueBitMask: number | undefined,
		definition: JSONObject,
	) {
		this.parameterNumber = parameterNumber;
		this.valueBitMask = valueBitMask;

		if (typeof definition.label !== "string") {
			throwInvalidConfig(
				"devices",
				`config/devices/${filename}:
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
				`config/devices/${filename}:
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
				`config/devices/${filename}:
Parameter #${parameterNumber} has an invalid value size`,
			);
		}
		this.valueSize = definition.valueSize;

		if (typeof definition.minValue !== "number") {
			throwInvalidConfig(
				"devices",
				`config/devices/${filename}:
Parameter #${parameterNumber} has a non-numeric property minValue`,
			);
		}
		this.minValue = definition.minValue;

		if (typeof definition.maxValue !== "number") {
			throwInvalidConfig(
				"devices",
				`config/devices/${filename}:
Parameter #${parameterNumber} has a non-numeric property maxValue`,
			);
		}
		this.maxValue = definition.maxValue;

		if (typeof definition.defaultValue !== "number") {
			throwInvalidConfig(
				"devices",
				`config/devices/${filename}:
Parameter #${parameterNumber} has a non-numeric property defaultValue`,
			);
		}
		this.defaultValue = definition.defaultValue;

		if (
			definition.unsigned != undefined &&
			typeof definition.unsigned !== "boolean"
		) {
			throwInvalidConfig(
				"devices",
				`config/devices/${filename}:
Parameter #${parameterNumber} has a non-boolean property unsigned`,
			);
		}
		this.unsigned = definition.unsigned === true;

		if (typeof definition.readOnly !== "boolean") {
			throwInvalidConfig(
				"devices",
				`config/devices/${filename}:
Parameter #${parameterNumber}: readOnly must be a boolean!`,
			);
		}
		this.readOnly = definition.readOnly;

		if (typeof definition.writeOnly !== "boolean") {
			throwInvalidConfig(
				"devices",
				`config/devices/${filename}:
Parameter #${parameterNumber}: writeOnly must be a boolean!`,
			);
		}
		this.writeOnly = definition.writeOnly;

		if (typeof definition.allowManualEntry !== "boolean") {
			throwInvalidConfig(
				"devices",
				`config/devices/${filename}:
Parameter #${parameterNumber}: allowManualEntry must be a boolean!`,
			);
		}
		this.allowManualEntry = definition.allowManualEntry;

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
				`config/devices/${filename}:
Parameter #${parameterNumber}: options is malformed!`,
			);
		}
		this.options =
			definition.options?.map(
				({ label, value }: { label: string; value: any }) => ({
					label,
					value,
				}),
			) ?? [];
	}

	public readonly parameterNumber: number;
	public readonly valueBitMask?: number;
	public readonly label: string;
	public readonly description?: string;
	public readonly valueSize: number;
	public readonly minValue: number;
	public readonly maxValue: number;
	public readonly unsigned?: boolean;
	public readonly defaultValue: number;
	public readonly readOnly: boolean;
	public readonly writeOnly: boolean;
	public readonly allowManualEntry: boolean;
	public readonly options: readonly ConfigOption[];
}

export interface ConfigOption {
	value: number;
	label: string;
}
