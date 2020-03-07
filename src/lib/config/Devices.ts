import { entries } from "alcalzone-shared/objects";
import { isArray, isObject } from "alcalzone-shared/typeguards";
import { pathExists, readFile } from "fs-extra";
import JSON5 from "json5";
import path from "path";
import { ZWaveError, ZWaveErrorCodes } from "../error/ZWaveError";
import log from "../log";
import type { JSONObject } from "../util/misc";
import { ObjectKeyMap, ReadonlyObjectKeyMap } from "../util/ObjectKeyMap";
import {
	configDir,
	getDeviceEntryPredicate,
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
	firmwareVersion: FirmwareVersionRange;
	filename: string;
}

export type ParamInfoMap = ReadonlyObjectKeyMap<
	{ parameter: number; valueBitMask?: number },
	ParamInformation
>;

const indexPath = path.join(configDir, "devices/index.json");
let index: readonly DeviceConfigIndexEntry[] | undefined;

/** @internal */
export async function loadDeviceIndexInternal(): Promise<typeof index> {
	if (!(await pathExists(indexPath))) {
		throw new ZWaveError(
			"The device config index does not exist!",
			ZWaveErrorCodes.Config_Invalid,
		);
	}
	try {
		const fileContents = await readFile(indexPath, "utf8");
		index = JSON5.parse(fileContents);
		return index;
	} catch (e) {
		if (e instanceof ZWaveError) {
			throw e;
		} else {
			throwInvalidConfig("devices");
		}
	}
}

export async function loadDeviceIndex(): Promise<void> {
	try {
		await loadDeviceIndexInternal();
	} catch (e) {
		// If the index file is missing or invalid, don't try to find it again
		if (
			e instanceof ZWaveError &&
			e.code === ZWaveErrorCodes.Config_Invalid
		) {
			if (process.env.NODE_ENV !== "test") {
				// FIXME: This call breaks when using jest.isolateModule()
				log.driver.print(
					`Could not load device config index: ${e.message}`,
					"error",
				);
			}
			index = [];
		} else {
			// This is an unexpected error
			throw e;
		}
	}
}

/**
 * Looks up the definition of a given device in the configuration DB
 * @param manufacturerId The manufacturer id of the device
 * @param productType The product type of the device
 * @param productId The product id of the device
 * @param firmwareVersion If known, configuration for a specific firmware version can be loaded
 */
export async function lookupDevice(
	manufacturerId: number,
	productType: number,
	productId: number,
	firmwareVersion?: string,
): Promise<DeviceConfig | undefined> {
	if (!index) {
		throw new ZWaveError(
			"The config has not been loaded yet!",
			ZWaveErrorCodes.Driver_NotReady,
		);
	}

	// Look up the device in the index
	const indexEntry = index.find(
		getDeviceEntryPredicate(
			manufacturerId,
			productType,
			productId,
			firmwareVersion,
		),
	);

	if (indexEntry) {
		const filePath = path.join(configDir, "devices", indexEntry.filename);
		if (!(await pathExists(filePath))) return;

		try {
			const fileContents = await readFile(filePath, "utf8");
			return new DeviceConfig(indexEntry.filename, fileContents);
		} catch (e) {
			if (process.env.NODE_ENV !== "test") {
				// FIXME: This call breaks when using jest.isolateModule()
				log.driver.print(
					`Error loading device config ${filePath}`,
					"error",
				);
			}
		}
	}
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
			.map(str => parseInt(str, 10))
			.every(num => num >= 0 && num <= 255)
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
				dev =>
					isObject(dev) &&
					isHexKeyWith4Digits((dev as any).productType) &&
					isHexKeyWith4Digits((dev as any).productId),
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

		if (
			!isObject(definition.firmwareVersion) ||
			!isFirmwareVersion(definition.firmwareVersion.min) ||
			!isFirmwareVersion(definition.firmwareVersion.max)
		) {
			throwInvalidConfig(
				`device`,
				`config/devices/${filename}:
firmwareVersion is malformed or invalid`,
			);
		}
		const { min, max } = definition.firmwareVersion;
		this.firmwareVersion = { min, max };

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
				const match = key.match(/^(\d+)(?:\[0x([0-9a-fA-F]+)\])?$/);
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
	}

	public readonly manufacturer!: string;
	public readonly manufacturerId: number;
	public readonly label!: string;
	public readonly description!: string;
	public readonly devices: readonly {
		productType: string;
		productId: string;
	}[];
	public readonly firmwareVersion: FirmwareVersionRange;
	public readonly associations?: ReadonlyMap<number, AssociationConfig>;
	public readonly paramInformation?: ParamInfoMap;
	/**
	 * Contains manufacturer-specific support information for the
	 * ManufacturerProprietary CC
	 */
	public readonly proprietary?: Record<string, unknown>;
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
			typeof definition.label !== "string"
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
				opt =>
					isObject(opt) &&
					typeof (opt as any).label === "string" &&
					typeof (opt as any).value === "number",
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
