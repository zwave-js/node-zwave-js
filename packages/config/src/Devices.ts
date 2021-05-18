import { ZWaveError, ZWaveErrorCodes } from "@zwave-js/core";
import {
	enumFilesRecursive,
	formatId,
	JSONObject,
	ObjectKeyMap,
	pick,
	ReadonlyObjectKeyMap,
	stringify,
} from "@zwave-js/shared";
import { entries } from "alcalzone-shared/objects";
import { isArray, isObject } from "alcalzone-shared/typeguards";
import * as fs from "fs-extra";
import { pathExists, readFile, writeFile } from "fs-extra";
import JSON5 from "json5";
import path from "path";
import { CompatConfig } from "./CompatConfig";
import { readJsonWithTemplate } from "./JsonTemplate";
import type { ConfigLogger } from "./Logger";
import { evaluate } from "./Logic";
import {
	configDir,
	externalConfigDir,
	hexKeyRegex4Digits,
	throwInvalidConfig,
} from "./utils";

export interface FirmwareVersionRange {
	min: string;
	max: string;
}

export interface DeviceID {
	manufacturerId: number;
	productType: number;
	productId: number;
	firmwareVersion?: string;
}

export interface DeviceConfigIndexEntry {
	manufacturerId: string;
	productType: string;
	productId: string;
	firmwareVersion: FirmwareVersionRange;
	filename: string;
}

export interface FulltextDeviceConfigIndexEntry {
	manufacturerId: string;
	manufacturer: string;
	label: string;
	description: string;
	productType: string;
	productId: string;
	firmwareVersion: FirmwareVersionRange;
	filename: string;
}

export type ConditionalParamInfoMap = ReadonlyObjectKeyMap<
	{ parameter: number; valueBitMask?: number },
	ConditionalParamInformation[]
>;

export type ParamInfoMap = ReadonlyObjectKeyMap<
	{ parameter: number; valueBitMask?: number },
	ParamInformation
>;

const embeddedDevicesDir = path.join(configDir, "devices");
const fulltextIndexPath = path.join(embeddedDevicesDir, "fulltext_index.json");

function getDevicesPaths(
	configDir: string,
): { devicesDir: string; indexPath: string } {
	const devicesDir = path.join(configDir, "devices");
	const indexPath = path.join(devicesDir, "index.json");
	return { devicesDir, indexPath };
}

export type DeviceConfigIndex = DeviceConfigIndexEntry[];
export type FulltextDeviceConfigIndex = FulltextDeviceConfigIndexEntry[];

async function hasChangedDeviceFiles(
	devicesRoot: string,
	dir: string,
	lastChange: Date,
): Promise<boolean> {
	// Check if there are any files BUT index.json that were changed
	// or directories that were modified
	const filesAndDirs = await fs.readdir(dir);
	for (const f of filesAndDirs) {
		const fullPath = path.join(dir, f);

		const stat = await fs.stat(fullPath);
		if (
			(dir !== devicesRoot || f !== "index.json") &&
			(stat.isFile() || stat.isDirectory()) &&
			stat.mtime > lastChange
		) {
			return true;
		} else if (stat.isDirectory()) {
			// we need to go deeper!
			if (await hasChangedDeviceFiles(devicesRoot, fullPath, lastChange))
				return true;
		}
	}
	return false;
}

/**
 * Read all device config files from a given directory and return them as index entries.
 * Does not update the index itself.
 */
async function generateIndex<T extends Record<string, unknown>>(
	devicesDir: string,
	extractIndexEntries: (config: DeviceConfig) => T[],
	logger?: ConfigLogger,
): Promise<(T & { filename: string })[]> {
	const index: (T & { filename: string })[] = [];

	const configFiles = await enumFilesRecursive(
		devicesDir,
		(file) =>
			file.endsWith(".json") &&
			!file.endsWith("index.json") &&
			!file.includes("/templates/") &&
			!file.includes("\\templates\\"),
	);

	for (const file of configFiles) {
		const relativePath = path
			.relative(devicesDir, file)
			.replace(/\\/g, "/");
		// Try parsing the file
		try {
			const config = await DeviceConfig.from(file, {
				relativeTo: devicesDir,
			});
			// Add the file to the index
			index.push(
				...extractIndexEntries(config).map((entry) => ({
					...entry,
					filename: relativePath,
				})),
			);
		} catch (e: unknown) {
			const message = `Error parsing config file ${relativePath}: ${
				(e as Error).message
			}`;
			// Crash hard during tests, just print an error when in production systems.
			// A user could have changed a config file
			if (process.env.NODE_ENV === "test" || !!process.env.CI) {
				throw new ZWaveError(message, ZWaveErrorCodes.Config_Invalid);
			} else {
				logger?.print(message, "error");
			}
		}
	}

	return index;
}

async function loadDeviceIndexShared<T extends Record<string, unknown>>(
	devicesDir: string,
	indexPath: string,
	extractIndexEntries: (config: DeviceConfig) => T[],
	logger?: ConfigLogger,
): Promise<(T & { filename: string })[]> {
	// The index file needs to be regenerated if it does not exist
	let needsUpdate = !(await pathExists(indexPath));
	let index: (T & { filename: string })[] | undefined;
	let mtimeIndex: Date | undefined;
	// ...or if cannot be parsed
	if (!needsUpdate) {
		try {
			const fileContents = await readFile(indexPath, "utf8");
			index = JSON5.parse(fileContents);
			mtimeIndex = (await fs.stat(indexPath)).mtime;
		} catch {
			logger?.print(
				"Error while parsing index file - regenerating...",
				"warn",
			);
			needsUpdate = true;
		} finally {
			if (!index) {
				logger?.print(
					"Index file was malformed - regenerating...",
					"warn",
				);
				needsUpdate = true;
			}
		}
	}

	// ...or if there were any changes in the file system
	if (!needsUpdate) {
		needsUpdate = await hasChangedDeviceFiles(
			devicesDir,
			devicesDir,
			mtimeIndex!,
		);
		if (needsUpdate) {
			logger?.print(
				"Device configuration files on disk changed - regenerating index...",
				"verbose",
			);
		}
	}

	if (needsUpdate) {
		// Read all files from disk and generate an index
		index = await generateIndex(devicesDir, extractIndexEntries, logger);
		// Save the index to disk
		try {
			await writeFile(
				path.join(indexPath),
				`// This file is auto-generated. DO NOT edit it by hand if you don't know what you're doing!"
${stringify(index, "\t")}
`,
				"utf8",
			);
			logger?.print("Device index regenerated", "verbose");
		} catch (e: unknown) {
			logger?.print(
				`Writing the device index to disk failed: ${
					(e as Error).message
				}`,
				"error",
			);
		}
	}

	return index!;
}

/**
 * @internal
 * Loads the index file to quickly access the device configs.
 * Transparently handles updating the index if necessary
 */
export async function generatePriorityDeviceIndex(
	deviceConfigPriorityDir: string,
	logger?: ConfigLogger,
): Promise<DeviceConfigIndex> {
	return (
		await generateIndex(
			deviceConfigPriorityDir,
			(config) =>
				config.devices.map((dev) => ({
					manufacturerId: formatId(
						config.manufacturerId.toString(16),
					),
					manufacturer: config.manufacturer,
					label: config.label,
					productType: formatId(dev.productType),
					productId: formatId(dev.productId),
					firmwareVersion: config.firmwareVersion,
				})),
			logger,
		)
	).map(({ filename, ...entry }) => ({
		...entry,
		// The generated index makes the filenames relative to the given directory
		// but we need them to be absolute
		filename: path.join(deviceConfigPriorityDir, filename),
	}));
}

/**
 * @internal
 * Loads the index file to quickly access the device configs.
 * Transparently handles updating the index if necessary
 */
export async function loadDeviceIndexInternal(
	logger?: ConfigLogger,
	externalConfig?: boolean,
): Promise<DeviceConfigIndex> {
	const { devicesDir, indexPath } = getDevicesPaths(
		(externalConfig && externalConfigDir) || configDir,
	);

	return loadDeviceIndexShared(
		devicesDir,
		indexPath,
		(config) =>
			config.devices.map((dev) => ({
				manufacturerId: formatId(config.manufacturerId.toString(16)),
				manufacturer: config.manufacturer,
				label: config.label,
				productType: formatId(dev.productType),
				productId: formatId(dev.productId),
				firmwareVersion: config.firmwareVersion,
			})),
		logger,
	);
}

/**
 * @internal
 * Loads the full text index file to quickly search the device configs.
 * Transparently handles updating the index if necessary
 */
export async function loadFulltextDeviceIndexInternal(
	logger?: ConfigLogger,
): Promise<FulltextDeviceConfigIndex> {
	// This method is not meant to operate with the external device index!
	return loadDeviceIndexShared(
		embeddedDevicesDir,
		fulltextIndexPath,
		(config) =>
			config.devices.map((dev) => ({
				manufacturerId: formatId(config.manufacturerId.toString(16)),
				manufacturer: config.manufacturer,
				label: config.label,
				description: config.description,
				productType: formatId(dev.productType),
				productId: formatId(dev.productId),
				firmwareVersion: config.firmwareVersion,
			})),
		logger,
	);
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

function conditionApplies(condition: string, context: unknown): boolean {
	try {
		return !!evaluate(condition, context);
	} catch (e) {
		throw new ZWaveError(
			`Invalid condition "condition"!`,
			ZWaveErrorCodes.Config_Invalid,
		);
	}
}

/** This class represents a device config entry whose conditional settings have not been evaluated yet */
export class ConditionalDeviceConfig {
	public static async from(
		filename: string,
		options: {
			relativeTo?: string;
		} = {},
	): Promise<ConditionalDeviceConfig> {
		const { relativeTo } = options;

		const relativePath = relativeTo
			? path.relative(relativeTo, filename).replace(/\\/g, "/")
			: filename;
		const json = await readJsonWithTemplate(filename);
		return new ConditionalDeviceConfig(relativePath, json);
	}

	public constructor(filename: string, definition: any) {
		this.filename = filename;

		if (!isHexKeyWith4Digits(definition.manufacturerId)) {
			throwInvalidConfig(
				`device`,
				`packages/config/config/devices/${filename}:
manufacturer id must be a hexadecimal number with 4 digits`,
			);
		}
		this.manufacturerId = parseInt(definition.manufacturerId, 16);

		for (const prop of ["manufacturer", "label", "description"] as const) {
			if (typeof definition[prop] !== "string") {
				throwInvalidConfig(
					`device`,
					`packages/config/config/devices/${filename}:
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
				`packages/config/config/devices/${filename}:
devices is malformed (not an object or type/id that is not a 4-digit hex key)`,
			);
		}
		this.devices = (definition.devices as any[]).map(
			({ productType, productId }) => ({
				productType: parseInt(productType, 16),
				productId: parseInt(productId, 16),
			}),
		);

		if (
			!isObject(definition.firmwareVersion) ||
			!isFirmwareVersion(definition.firmwareVersion.min) ||
			!isFirmwareVersion(definition.firmwareVersion.max)
		) {
			throwInvalidConfig(
				`device`,
				`packages/config/config/devices/${filename}:
firmwareVersion is malformed or invalid`,
			);
		} else {
			const { min, max } = definition.firmwareVersion;
			this.firmwareVersion = { min, max };
		}

		if (definition.endpoints != undefined) {
			const endpoints = new Map<number, ConditionalEndpointConfig>();
			if (!isObject(definition.endpoints)) {
				throwInvalidConfig(
					`device`,
					`packages/config/config/devices/${filename}:
endpoints is not an object`,
				);
			}
			for (const [key, ep] of entries(definition.endpoints)) {
				if (!/^\d+$/.test(key)) {
					throwInvalidConfig(
						`device`,
						`packages/config/config/devices/${filename}:
found non-numeric endpoint index "${key}" in endpoints`,
					);
				}

				const epIndex = parseInt(key, 10);
				endpoints.set(
					epIndex,
					new ConditionalEndpointConfig(filename, epIndex, ep),
				);
			}
			this.endpoints = endpoints;
		}

		if (definition.associations != undefined) {
			const associations = new Map<
				number,
				ConditionalAssociationConfig
			>();
			if (!isObject(definition.associations)) {
				throwInvalidConfig(
					`device`,
					`packages/config/config/devices/${filename}:
associations is not an object`,
				);
			}
			for (const [key, assocDefinition] of entries(
				definition.associations,
			)) {
				if (!/^[1-9][0-9]*$/.test(key)) {
					throwInvalidConfig(
						`device`,
						`packages/config/config/devices/${filename}:
found non-numeric group id "${key}" in associations`,
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

		if (definition.paramInformation != undefined) {
			const paramInformation = new ObjectKeyMap<
				{ parameter: number; valueBitMask?: number },
				ConditionalParamInformation[]
			>();
			if (!isObject(definition.paramInformation)) {
				throwInvalidConfig(
					`device`,
					`packages/config/config/devices/${filename}:
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
						`packages/config/config/devices/${filename}: 
found invalid param number "${key}" in paramInformation`,
					);
				}

				if (
					!isObject(paramDefinition) &&
					!(
						isArray(paramDefinition) &&
						(paramDefinition as any[]).every((p) => isObject(p))
					)
				) {
					throwInvalidConfig(
						`device`,
						`packages/config/config/devices/${filename}: 
paramInformation "${key}" is invalid: Every entry must either be an object or an array of objects!`,
					);
				}

				// Normalize to an array
				const defns: any[] = isArray(paramDefinition)
					? paramDefinition
					: [paramDefinition];
				if (
					!defns.every(
						(d, index) => index === defns.length - 1 || "$if" in d,
					)
				) {
					throwInvalidConfig(
						`device`,
						`packages/config/config/devices/${filename}: 
paramInformation "${key}" is invalid: When there are multiple definitions, every definition except the last one MUST have an "$if" condition!`,
					);
				}

				const keyNum = parseInt(match[1], 10);
				const bitMask =
					match[2] != undefined ? parseInt(match[2], 16) : undefined;
				paramInformation.set(
					{ parameter: keyNum, valueBitMask: bitMask },
					defns.map(
						(def) =>
							new ConditionalParamInformation(
								this,
								keyNum,
								bitMask,
								def,
							),
					),
				);
			}
			this.paramInformation = paramInformation;
		}

		if (definition.proprietary != undefined) {
			if (!isObject(definition.proprietary)) {
				throwInvalidConfig(
					`device`,
					`packages/config/config/devices/${filename}:
proprietary is not an object`,
				);
			}
			this.proprietary = definition.proprietary;
		}

		if (definition.compat != undefined) {
			if (!isObject(definition.compat)) {
				throwInvalidConfig(
					`device`,
					`packages/config/config/devices/${filename}:
compat is not an object`,
				);
			}
			this.compat = new CompatConfig(filename, definition.compat);
		}

		if (definition.metadata != undefined) {
			if (!isObject(definition.metadata)) {
				throwInvalidConfig(
					`device`,
					`packages/config/config/devices/${filename}:
metadata is not an object`,
				);
			}
			this.metadata = new DeviceMetadata(filename, definition.metadata);
		}
	}

	public readonly filename: string;

	public readonly manufacturer!: string;
	public readonly manufacturerId: number;
	public readonly label!: string;
	public readonly description!: string;
	public readonly devices: readonly {
		productType: number;
		productId: number;
	}[];
	public readonly firmwareVersion: FirmwareVersionRange;
	public readonly endpoints?: ReadonlyMap<number, ConditionalEndpointConfig>;
	public readonly associations?: ReadonlyMap<
		number,
		ConditionalAssociationConfig
	>;
	public readonly paramInformation?: ConditionalParamInfoMap;
	/**
	 * Contains manufacturer-specific support information for the
	 * ManufacturerProprietary CC
	 */
	public readonly proprietary?: Record<string, unknown>;
	/** Contains compatibility options */
	public readonly compat?: CompatConfig;
	/** Contains instructions and other metadata for the device */
	public readonly metadata?: DeviceMetadata;

	public evaluate(deviceId?: DeviceID): DeviceConfig {
		let associations: Map<number, AssociationConfig> | undefined;
		if (this.associations) {
			associations = new Map();
			for (const [group, assoc] of this.associations) {
				const evaluated = assoc.evaluateCondition(deviceId);
				if (evaluated) associations.set(group, evaluated);
			}
		}

		let endpoints: Map<number, EndpointConfig> | undefined;
		if (this.endpoints) {
			endpoints = new Map();
			for (const [group, assoc] of this.endpoints) {
				const evaluated = assoc.evaluateCondition(deviceId);
				if (evaluated) endpoints.set(group, evaluated);
			}
		}

		let paramInformation:
			| ObjectKeyMap<
					{ parameter: number; valueBitMask?: number },
					ParamInformation
			  >
			| undefined;
		if (this.paramInformation) {
			paramInformation = new ObjectKeyMap();
			for (const [key, params] of this.paramInformation.entries()) {
				// Only take the first matching parameter
				for (const param of params) {
					const evaluated = param.evaluateCondition(deviceId);
					if (evaluated) paramInformation.set(key, evaluated);
				}
			}
		}

		return new DeviceConfig(
			this.filename,
			this.manufacturer,
			this.manufacturerId,
			this.label,
			this.description,
			this.devices,
			this.firmwareVersion,
			endpoints,
			associations,
			paramInformation,
			this.proprietary,
			this.compat,
			this.metadata,
		);
	}
}

export class DeviceConfig {
	public static async from(
		filename: string,
		options: {
			relativeTo?: string;
			deviceId?: DeviceID;
		} = {},
	): Promise<DeviceConfig> {
		const ret = await ConditionalDeviceConfig.from(filename, options);
		return ret.evaluate(options.deviceId);
	}

	public constructor(
		public readonly filename: string,
		public readonly manufacturer: string,
		public readonly manufacturerId: number,
		public readonly label: string,
		public readonly description: string,
		public readonly devices: readonly {
			productType: number;
			productId: number;
		}[],
		public readonly firmwareVersion: FirmwareVersionRange,
		public readonly endpoints?: ReadonlyMap<number, EndpointConfig>,
		public readonly associations?: ReadonlyMap<number, AssociationConfig>,
		public readonly paramInformation?: ParamInfoMap,
		/**
		 * Contains manufacturer-specific support information for the
		 * ManufacturerProprietary CC
		 */
		public readonly proprietary?: Record<string, unknown>,
		/** Contains compatibility options */
		public readonly compat?: CompatConfig,
		/** Contains instructions and other metadata for the device */
		public readonly metadata?: DeviceMetadata,
	) {
		// A config file is treated as am embedded one when it is located under the devices root dir
		this.isEmbedded = !path
			.relative(embeddedDevicesDir, this.filename)
			.startsWith("..");
	}

	/** Whether this is an embedded configuration or not */
	public readonly isEmbedded: boolean;
}

export class ConditionalEndpointConfig {
	public constructor(
		filename: string,
		index: number,
		definition: JSONObject,
	) {
		this.index = index;

		if (definition.$if != undefined && typeof definition.$if !== "string") {
			throwInvalidConfig(
				"devices",
				`packages/config/config/devices/${filename}:
Endpoint ${index} has a non-string $if condition`,
			);
		}
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
	public readonly condition?: string;

	public readonly associations?: ReadonlyMap<
		number,
		ConditionalAssociationConfig
	>;

	public evaluateCondition(deviceId?: DeviceID): EndpointConfig | undefined {
		if (
			deviceId &&
			this.condition &&
			!conditionApplies(this.condition, deviceId)
		) {
			return;
		}

		let associations: Map<number, AssociationConfig> | undefined;
		if (this.associations) {
			associations = new Map();
			for (const [group, assoc] of this.associations) {
				const evaluated = assoc.evaluateCondition(deviceId);
				if (evaluated) associations.set(group, evaluated);
			}
		}

		return {
			...pick(this, ["index"]),
			associations,
		};
	}
}

export type EndpointConfig = Omit<
	ConditionalEndpointConfig,
	"condition" | "evaluateCondition" | "associations"
> & {
	associations: Map<number, AssociationConfig> | undefined;
};

export class ConditionalAssociationConfig {
	public constructor(
		filename: string,
		groupId: number,
		definition: JSONObject,
	) {
		this.groupId = groupId;

		if (definition.$if != undefined && typeof definition.$if !== "string") {
			throwInvalidConfig(
				"devices",
				`packages/config/config/devices/${filename}:
Association ${groupId} has a non-string $if condition`,
			);
		}
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
			definition.multiChannel !== false
		) {
			throwInvalidConfig(
				"devices",
				`packages/config/config/devices/${filename}:
multiChannel in association ${groupId} must be either false or left out`,
			);
		}
		// Default to multi channel associations
		this.multiChannel = definition.multiChannel ?? true;
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
	/** Some devices support multi channel associations but require some of its groups to use node id associations */
	public readonly multiChannel: boolean;

	public evaluateCondition(
		deviceId?: DeviceID,
	): AssociationConfig | undefined {
		if (
			deviceId &&
			this.condition &&
			!conditionApplies(this.condition, deviceId)
		) {
			return;
		}

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

export class ConditionalParamInformation {
	public constructor(
		parent: ConditionalDeviceConfig,
		parameterNumber: number,
		valueBitMask: number | undefined,
		definition: JSONObject,
	) {
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

		if (typeof definition.minValue !== "number") {
			throwInvalidConfig(
				"devices",
				`packages/config/config/devices/${parent.filename}:
Parameter #${parameterNumber} has a non-numeric property minValue`,
			);
		}
		this.minValue = definition.minValue;

		if (typeof definition.maxValue !== "number") {
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

	public readonly parameterNumber: number;
	public readonly valueBitMask?: number;
	public readonly label: string;
	public readonly description?: string;
	public readonly valueSize: number;
	public readonly minValue: number;
	public readonly maxValue: number;
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
		if (
			deviceId &&
			this.condition &&
			!conditionApplies(this.condition, deviceId)
		) {
			return;
		}

		return {
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
			options: this.options
				.map((o) => o.evaluateCondition(deviceId))
				.filter((o): o is ConfigOption => !!o),
		};
	}
}

export type ParamInformation = Omit<
	ConditionalParamInformation,
	"condition" | "evaluateCondition" | "options"
> & { options: readonly ConfigOption[] };

export class ConditionalConfigOption {
	public constructor(
		public readonly value: number,
		public readonly label: string,
		public readonly condition?: string,
	) {}

	public evaluateCondition(deviceId?: DeviceID): ConfigOption | undefined {
		if (
			deviceId &&
			this.condition &&
			!conditionApplies(this.condition, deviceId)
		) {
			return;
		}

		return pick(this, ["value", "label"]);
	}
}

export interface ConfigOption {
	value: number;
	label: string;
}

export class DeviceMetadata {
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
}
