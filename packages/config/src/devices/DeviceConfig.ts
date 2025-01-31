import { ZWaveError, ZWaveErrorCodes } from "@zwave-js/core";
import { digest } from "@zwave-js/core";
import {
	Bytes,
	type JSONObject,
	enumFilesRecursive,
	formatId,
	getenv,
	num2hex,
	padVersion,
	pathExists,
	pick,
	readTextFile,
	stringify,
	writeTextFile,
} from "@zwave-js/shared";
import {
	type ReadFile,
	type ReadFileSystemInfo,
	type WriteFile,
} from "@zwave-js/shared/bindings";
import { isArray, isObject } from "alcalzone-shared/typeguards";
import JSON5 from "json5";
import path from "pathe";
import semverGt from "semver/functions/gt.js";
import { clearTemplateCache, readJsonWithTemplate } from "../JsonTemplate.js";
import type { ConfigLogger } from "../Logger.js";
import { configDir } from "../utils.js";
import { hexKeyRegex4Digits, throwInvalidConfig } from "../utils_safe.js";
import {
	type AssociationConfig,
	ConditionalAssociationConfig,
} from "./AssociationConfig.js";
import { type CompatConfig, ConditionalCompatConfig } from "./CompatConfig.js";
import { evaluateDeep, validateCondition } from "./ConditionalItem.js";
import {
	type ConditionalPrimitive,
	parseConditionalPrimitive,
} from "./ConditionalPrimitive.js";
import {
	ConditionalDeviceMetadata,
	type DeviceMetadata,
} from "./DeviceMetadata.js";
import {
	ConditionalEndpointConfig,
	type EndpointConfig,
} from "./EndpointConfig.js";
import {
	type ConditionalParamInfoMap,
	type ParamInfoMap,
	type ParamInformation,
	parseConditionalParamInformationMap,
} from "./ParamInformation.js";
import type { DeviceID, FirmwareVersionRange } from "./shared.js";

export interface DeviceConfigIndexEntry {
	manufacturerId: string;
	productType: string;
	productId: string;
	firmwareVersion: FirmwareVersionRange;
	preferred?: true;
	rootDir?: string;
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
	preferred?: true;
	rootDir?: string;
	filename: string;
}

export const embeddedDevicesDir = path.join(configDir, "devices");
const fulltextIndexPath = path.join(embeddedDevicesDir, "fulltext_index.json");

export function getDevicesPaths(configDir: string): {
	devicesDir: string;
	indexPath: string;
} {
	const devicesDir = path.join(configDir, "devices");
	const indexPath = path.join(devicesDir, "index.json");
	return { devicesDir, indexPath };
}

export type DeviceConfigIndex = DeviceConfigIndexEntry[];
export type FulltextDeviceConfigIndex = FulltextDeviceConfigIndexEntry[];

async function hasChangedDeviceFiles(
	fs: ReadFileSystemInfo,
	devicesRoot: string,
	dir: string,
	lastChange: Date,
): Promise<boolean> {
	// Check if there are any files BUT index.json that were changed
	// or directories that were modified
	const filesAndDirs = await fs.readDir(dir);
	for (const f of filesAndDirs) {
		const fullPath = path.join(dir, f);

		const stat = await fs.stat(fullPath);
		if (
			(dir !== devicesRoot || f !== "index.json")
			&& (stat.isFile() || stat.isDirectory())
			&& stat.mtime > lastChange
		) {
			return true;
		} else if (stat.isDirectory()) {
			// we need to go deeper!
			if (
				await hasChangedDeviceFiles(
					fs,
					devicesRoot,
					fullPath,
					lastChange,
				)
			) {
				return true;
			}
		}
	}
	return false;
}

/**
 * Read all device config files from a given directory and return them as index entries.
 * Does not update the index itself.
 */
async function generateIndex<T extends Record<string, unknown>>(
	fs: ReadFileSystemInfo & ReadFile,
	devicesDir: string,
	isEmbedded: boolean,
	extractIndexEntries: (config: DeviceConfig) => T[],
	logger?: ConfigLogger,
): Promise<(T & { filename: string; rootDir?: string })[]> {
	const index: (T & { filename: string; rootDir?: string })[] = [];

	clearTemplateCache();
	const configFiles = await enumFilesRecursive(
		fs,
		devicesDir,
		(file) =>
			file.endsWith(".json")
			&& !file.endsWith("index.json")
			&& !file.includes("/templates/")
			&& !file.includes("\\templates\\"),
	);

	// Add the embedded devices dir as a fallback if necessary
	const fallbackDirs = devicesDir !== embeddedDevicesDir
		? [embeddedDevicesDir]
		: undefined;

	for (const file of configFiles) {
		const relativePath = path
			.relative(devicesDir, file)
			.replaceAll("\\", "/");
		// Try parsing the file
		try {
			const config = await DeviceConfig.from(
				fs,
				file,
				isEmbedded,
				{
					rootDir: devicesDir,
					fallbackDirs,
					relative: true,
				},
			);
			// Add the file to the index
			index.push(
				...extractIndexEntries(config).map((entry) => {
					const ret: T & { filename: string; rootDir?: string } = {
						...entry,
						filename: relativePath,
					};
					// Only add the root dir to the index if necessary
					if (devicesDir !== embeddedDevicesDir) {
						ret.rootDir = devicesDir;
					}
					return ret;
				}),
			);
		} catch (e) {
			const message = `Error parsing config file ${relativePath}: ${
				(e as Error).message
			}`;
			// Crash hard during tests, just print an error when in production systems.
			// A user could have changed a config file
			if (process.env.NODE_ENV === "test" || !!getenv("CI")) {
				throw new ZWaveError(message, ZWaveErrorCodes.Config_Invalid);
			} else {
				logger?.print(message, "error");
			}
		}
	}

	return index;
}

async function loadDeviceIndexShared<T extends Record<string, unknown>>(
	fs: ReadFileSystemInfo & ReadFile & WriteFile,
	devicesDir: string,
	indexPath: string,
	extractIndexEntries: (config: DeviceConfig) => T[],
	logger?: ConfigLogger,
): Promise<(T & { filename: string })[]> {
	// The index file needs to be regenerated if it does not exist
	let needsUpdate = !(await pathExists(fs, indexPath));
	let index: (T & { filename: string })[] | undefined;
	let mtimeIndex: Date | undefined;
	// ...or if cannot be parsed
	if (!needsUpdate) {
		try {
			const fileContents = await readTextFile(fs, indexPath, "utf8");
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
			fs,
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
		index = await generateIndex(
			fs,
			devicesDir,
			true,
			extractIndexEntries,
			logger,
		);
		// Save the index to disk
		try {
			await writeTextFile(
				fs,
				path.join(indexPath),
				`// This file is auto-generated. DO NOT edit it by hand if you don't know what you're doing!"
${stringify(index, "\t")}
`,
				"utf8",
			);
			logger?.print("Device index regenerated", "verbose");
		} catch (e) {
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
	fs: ReadFileSystemInfo & ReadFile,
	deviceConfigPriorityDir: string,
	logger?: ConfigLogger,
): Promise<DeviceConfigIndex> {
	return (
		await generateIndex(
			fs,
			deviceConfigPriorityDir,
			false,
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
					...(config.preferred ? { preferred: true as const } : {}),
					rootDir: deviceConfigPriorityDir,
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
	fs: ReadFileSystemInfo & ReadFile & WriteFile,
	logger?: ConfigLogger,
	externalConfigDir?: string,
): Promise<DeviceConfigIndex> {
	const { devicesDir, indexPath } = getDevicesPaths(
		externalConfigDir || configDir,
	);

	return loadDeviceIndexShared(
		fs,
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
				...(config.preferred ? { preferred: true as const } : {}),
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
	fs: ReadFileSystemInfo & ReadFile & WriteFile,
	logger?: ConfigLogger,
): Promise<FulltextDeviceConfigIndex> {
	// This method is not meant to operate with the external device index!
	return loadDeviceIndexShared(
		fs,
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
				...(config.preferred ? { preferred: true as const } : {}),
				rootDir: embeddedDevicesDir,
			})),
		logger,
	);
}

function isHexKeyWith4Digits(val: any): val is string {
	return typeof val === "string" && hexKeyRegex4Digits.test(val);
}

const firmwareVersionRegex = /^\d{1,3}\.\d{1,3}(\.\d{1,3})?$/;
function isFirmwareVersion(val: any): val is string {
	return (
		typeof val === "string"
		&& firmwareVersionRegex.test(val)
		&& val
			.split(".")
			.map((str) => parseInt(str, 10))
			.every((num) => num >= 0 && num <= 255)
	);
}

/** This class represents a device config entry whose conditional settings have not been evaluated yet */
export class ConditionalDeviceConfig {
	public static async from(
		fs: ReadFileSystemInfo & ReadFile,
		filename: string,
		isEmbedded: boolean,
		options: {
			rootDir: string;
			fallbackDirs?: string[];
			relative?: boolean;
		},
	): Promise<ConditionalDeviceConfig> {
		const { relative, rootDir } = options;

		const relativePath = relative
			? path.relative(rootDir, filename).replaceAll("\\", "/")
			: filename;
		const json = await readJsonWithTemplate(
			fs,
			filename,
			[
				options.rootDir,
				...(options.fallbackDirs ?? []),
			],
		);
		return new ConditionalDeviceConfig(relativePath, isEmbedded, json);
	}

	public constructor(
		filename: string,
		isEmbedded: boolean,
		definition: JSONObject,
	) {
		this.filename = filename;
		this.isEmbedded = isEmbedded;

		if (!isHexKeyWith4Digits(definition.manufacturerId)) {
			throwInvalidConfig(
				`device`,
				`packages/config/config/devices/${filename}:
manufacturer id must be a lowercase hexadecimal number with 4 digits`,
			);
		}
		this.manufacturerId = parseInt(definition.manufacturerId, 16);

		for (const prop of ["manufacturer", "label", "description"] as const) {
			this[prop] = parseConditionalPrimitive(
				filename,
				"string",
				prop,
				definition[prop],
			);
		}

		if (
			!isArray(definition.devices)
			|| !(definition.devices as any[]).every(
				(dev: unknown) =>
					isObject(dev)
					&& isHexKeyWith4Digits(dev.productType)
					&& isHexKeyWith4Digits(dev.productId),
			)
		) {
			throwInvalidConfig(
				`device`,
				`packages/config/config/devices/${filename}:
devices is malformed (not an object or type/id that is not a lowercase 4-digit hex key)`,
			);
		}
		this.devices = (definition.devices as any[]).map(
			({ productType, productId }) => ({
				productType: parseInt(productType, 16),
				productId: parseInt(productId, 16),
			}),
		);

		if (
			!isObject(definition.firmwareVersion)
			|| !isFirmwareVersion(definition.firmwareVersion.min)
			|| !isFirmwareVersion(definition.firmwareVersion.max)
		) {
			throwInvalidConfig(
				`device`,
				`packages/config/config/devices/${filename}:
firmwareVersion is malformed or invalid. Must be x.y or x.y.z where x, y, and z are integers between 0 and 255`,
			);
		} else {
			const { min, max } = definition.firmwareVersion;
			if (semverGt(padVersion(min), padVersion(max))) {
				throwInvalidConfig(
					`device`,
					`packages/config/config/devices/${filename}:
firmwareVersion.min ${min} must not be greater than firmwareVersion.max ${max}`,
				);
			}
			this.firmwareVersion = { min, max };
		}

		if (
			definition.preferred != undefined
			&& definition.preferred !== true
		) {
			throwInvalidConfig(
				`device`,
				`packages/config/config/devices/${filename}:
preferred must be true or omitted`,
			);
		}
		this.preferred = !!definition.preferred;

		if (definition.endpoints != undefined) {
			const endpoints = new Map<number, ConditionalEndpointConfig>();
			if (!isObject(definition.endpoints)) {
				throwInvalidConfig(
					`device`,
					`packages/config/config/devices/${filename}:
endpoints is not an object`,
				);
			}
			for (const [key, ep] of Object.entries(definition.endpoints)) {
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
					new ConditionalEndpointConfig(this, epIndex, ep as any),
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
			for (
				const [key, assocDefinition] of Object.entries(
					definition.associations,
				)
			) {
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
						assocDefinition as any,
					),
				);
			}
			this.associations = associations;
		}

		if (definition.paramInformation != undefined) {
			this.paramInformation = parseConditionalParamInformationMap(
				definition,
				this,
			);
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
			if (
				isArray(definition.compat)
				&& definition.compat.every((item: any) => isObject(item))
			) {
				// Make sure all conditions are valid
				for (const entry of definition.compat) {
					validateCondition(
						filename,
						entry,
						`At least one entry of compat contains an`,
					);
				}

				this.compat = definition.compat.map(
					(item: any) => new ConditionalCompatConfig(filename, item),
				);
			} else if (isObject(definition.compat)) {
				this.compat = new ConditionalCompatConfig(
					filename,
					definition.compat,
				);
			} else {
				throwInvalidConfig(
					`device`,
					`packages/config/config/devices/${filename}:
compat must be an object or any array of conditional objects`,
				);
			}
		}

		if (definition.metadata != undefined) {
			if (!isObject(definition.metadata)) {
				throwInvalidConfig(
					`device`,
					`packages/config/config/devices/${filename}:
metadata is not an object`,
				);
			}
			this.metadata = new ConditionalDeviceMetadata(
				filename,
				definition.metadata,
			);
		}
	}

	public readonly filename: string;

	public readonly manufacturer!: ConditionalPrimitive<string>;
	public readonly manufacturerId: number;
	public readonly label!: ConditionalPrimitive<string>;
	public readonly description!: ConditionalPrimitive<string>;
	public readonly devices: readonly {
		productType: number;
		productId: number;
	}[];
	public readonly firmwareVersion: FirmwareVersionRange;
	/** Mark this configuration as preferred over other config files with an overlapping firmware range */
	public readonly preferred: boolean;
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
	public readonly compat?:
		| ConditionalCompatConfig
		| ConditionalCompatConfig[];
	/** Contains instructions and other metadata for the device */
	public readonly metadata?: ConditionalDeviceMetadata;

	/** Whether this is an embedded configuration or not */
	public readonly isEmbedded: boolean;

	public evaluate(deviceId?: DeviceID): DeviceConfig {
		return new DeviceConfig(
			this.filename,
			this.isEmbedded,
			evaluateDeep(this.manufacturer, deviceId),
			this.manufacturerId,
			evaluateDeep(this.label, deviceId),
			evaluateDeep(this.description, deviceId),
			this.devices,
			this.firmwareVersion,
			this.preferred,
			evaluateDeep(this.endpoints, deviceId),
			evaluateDeep(this.associations, deviceId),
			evaluateDeep(this.paramInformation, deviceId),
			this.proprietary,
			evaluateDeep(this.compat, deviceId),
			evaluateDeep(this.metadata, deviceId),
		);
	}
}

export class DeviceConfig {
	public static async from(
		fs: ReadFileSystemInfo & ReadFile,
		filename: string,
		isEmbedded: boolean,
		options: {
			rootDir: string;
			fallbackDirs?: string[];
			relative?: boolean;
			deviceId?: DeviceID;
		},
	): Promise<DeviceConfig> {
		const ret = await ConditionalDeviceConfig.from(
			fs,
			filename,
			isEmbedded,
			options,
		);
		return ret.evaluate(options.deviceId);
	}

	public constructor(
		filename: string,
		isEmbedded: boolean,
		manufacturer: string,
		manufacturerId: number,
		label: string,
		description: string,
		devices: readonly {
			productType: number;
			productId: number;
		}[],
		firmwareVersion: FirmwareVersionRange,
		preferred: boolean,
		endpoints?: ReadonlyMap<number, EndpointConfig>,
		associations?: ReadonlyMap<number, AssociationConfig>,
		paramInformation?: ParamInfoMap,
		proprietary?: Record<string, unknown>,
		compat?: CompatConfig,
		metadata?: DeviceMetadata,
	) {
		this.filename = filename;
		this.isEmbedded = isEmbedded;
		this.manufacturer = manufacturer;
		this.manufacturerId = manufacturerId;
		this.label = label;
		this.description = description;
		this.devices = devices;
		this.firmwareVersion = firmwareVersion;
		this.preferred = preferred;
		this.endpoints = endpoints;
		this.associations = associations;
		this.paramInformation = paramInformation;
		this.proprietary = proprietary;
		this.compat = compat;
		this.metadata = metadata;
	}

	public readonly filename: string;
	/** Whether this is an embedded configuration or not */
	public readonly isEmbedded: boolean;
	public readonly manufacturer: string;
	public readonly manufacturerId: number;
	public readonly label: string;
	public readonly description: string;
	public readonly devices: readonly {
		productType: number;
		productId: number;
	}[];
	public readonly firmwareVersion: FirmwareVersionRange;
	/** Mark this configuration as preferred over other config files with an overlapping firmware range */
	public readonly preferred: boolean;
	public readonly endpoints?: ReadonlyMap<number, EndpointConfig>;
	public readonly associations?: ReadonlyMap<number, AssociationConfig>;
	public readonly paramInformation?: ParamInfoMap;
	/**
	 * Contains manufacturer-specific support information for the
	 * ManufacturerProprietary CC
	 */
	public readonly proprietary?: Record<string, unknown>;
	/** Contains compatibility options */
	public readonly compat?: CompatConfig;
	/** Contains instructions and other metadata for the device */
	public readonly metadata?: DeviceMetadata;

	/** Returns the association config for a given endpoint */
	public getAssociationConfigForEndpoint(
		endpointIndex: number,
		group: number,
	): AssociationConfig | undefined {
		if (endpointIndex === 0) {
			// The root endpoint's associations may be configured separately or as part of "endpoints"
			return (
				this.associations?.get(group)
					?? this.endpoints?.get(0)?.associations?.get(group)
			);
		} else {
			// The other endpoints can only have a configuration as part of "endpoints"
			return this.endpoints?.get(endpointIndex)?.associations?.get(group);
		}
	}

	private getHashable(): Uint8Array {
		// We only need to compare the information that is persisted elsewhere:
		// - config parameters
		// - functional association settings
		// - CC-related compat flags

		let hashable: Record<string, any> = {
			// endpoints: {
			// 	associations: {},
			// 	paramInformation: []
			// },
			// proprietary: {},
			// compat: {},
		};

		const sortObject = (obj: Record<string, any>) => {
			const ret: Record<string, any> = {};
			for (const key of Object.keys(obj).sort()) {
				ret[key] = obj[key];
			}
			return ret;
		};

		const cloneAssociationConfig = (a: AssociationConfig) => {
			return sortObject(
				pick(a, ["maxNodes", "multiChannel", "isLifeline"]),
			);
		};
		const cloneAssociationMap = (
			target: Record<string, any>,
			map: ReadonlyMap<number, AssociationConfig> | undefined,
		) => {
			if (!map || !map.size) return;
			target.associations = {};
			for (const [key, value] of map) {
				target.associations[key] = cloneAssociationConfig(value);
			}
			target.associations = sortObject(target.associations);
		};

		const cloneParamInformationMap = (
			target: Record<string, any>,
			map: ParamInfoMap | undefined,
		) => {
			if (!map || !map.size) return;
			const getParamKey = (param: ParamInformation) =>
				`${param.parameterNumber}${
					param.valueBitMask ? `[${num2hex(param.valueBitMask)}]` : ""
				}`;
			target.paramInformation = [...map.values()].sort((a, b) =>
				getParamKey(a).localeCompare(getParamKey(b))
			);
		};

		// Clone associations and param information on the root (ep 0) and endpoints
		{
			let ep0: Record<string, any> = {};
			cloneAssociationMap(ep0, this.associations);
			cloneParamInformationMap(ep0, this.paramInformation);
			ep0 = sortObject(ep0);

			if (Object.keys(ep0).length > 0) {
				hashable.endpoints ??= {};
				hashable.endpoints[0] = ep0;
			}
		}

		if (this.endpoints) {
			for (const [index, endpoint] of this.endpoints) {
				let ep: Record<string, any> = {};

				cloneAssociationMap(ep, endpoint.associations);
				cloneParamInformationMap(ep, endpoint.paramInformation);

				ep = sortObject(ep);

				if (Object.keys(ep).length > 0) {
					hashable.endpoints ??= {};
					hashable.endpoints[index] = ep;
				}
			}
		}

		// Clone proprietary config
		if (this.proprietary && Object.keys(this.proprietary).length > 0) {
			hashable.proprietary = sortObject({ ...this.proprietary });
		}

		// Clone relevant compat flags
		if (this.compat) {
			let c: Record<string, any> = {};

			// Copy some simple flags over
			for (
				const prop of [
					"forceSceneControllerGroupCount",
					"mapRootReportsToEndpoint",
					"mapBasicSet",
					"preserveRootApplicationCCValueIDs",
					"preserveEndpoints",
					"removeEndpoints",
					"treatMultilevelSwitchSetAsEvent",
				] as const
			) {
				if (this.compat[prop] != undefined) {
					c[prop] = this.compat[prop];
				}
			}

			// Copy other, more complex flags
			if (this.compat.overrideQueries) {
				c.overrideQueries = Object.fromEntries(
					this.compat.overrideQueries["overrides"],
				);
			}
			if (this.compat.addCCs) {
				c.addCCs = Object.fromEntries(
					[...this.compat.addCCs].map(([ccId, def]) => [
						ccId,
						Object.fromEntries(def.endpoints),
					]),
				);
			}
			if (this.compat.removeCCs) {
				c.removeCCs = Object.fromEntries(this.compat.removeCCs);
			}
			if (this.compat.treatSetAsReport) {
				c.treatSetAsReport = [...this.compat.treatSetAsReport].sort();
			}

			c = sortObject(c);
			if (Object.keys(c).length > 0) {
				hashable.compat = c;
			}
		}

		hashable = sortObject(hashable);

		return Bytes.from(JSON.stringify(hashable), "utf8");
	}

	/**
	 * Returns a hash code that can be used to check whether a device config has changed enough to require a re-interview.
	 */
	public getHash(
		algorithm: "md5" | "sha-256" = "sha-256",
	): Promise<Uint8Array> {
		// Figure out what to hash
		const buffer = this.getHashable();

		// And create a hash from it. This does not need to be cryptographically secure, just good enough to detect changes.
		return digest(algorithm, buffer);
	}
}
