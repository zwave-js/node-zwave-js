import { entries } from "alcalzone-shared/objects";
import { padStart } from "alcalzone-shared/strings";
import { isArray, isObject } from "alcalzone-shared/typeguards";
import { pathExists, readFile } from "fs-extra";
import JSON5 from "json5";
import path from "path";
import * as semver from "semver";
import { ZWaveError, ZWaveErrorCodes } from "../error/ZWaveError";
import log from "../log";
import { JSONObject } from "../util/misc";
import { configDir, hexKeyRegex, throwInvalidConfig } from "./utils";

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

const indexPath = path.join(configDir, "devices/index.json");
let index: readonly DeviceConfigIndexEntry[];

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

function formatId(id: number): string {
	return "0x" + padStart(id.toString(16), 4, "0");
}

/** Pads a firmware version string, so it can be compared with semver */
function padVersion(version: string): string {
	return version + ".0";
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
): Promise<JSONObject | undefined> {
	// Look up the device in the index
	const indexEntry = index.find(
		entry =>
			entry.manufacturerId === formatId(manufacturerId) &&
			entry.productType === formatId(productType) &&
			entry.productId === formatId(productId) &&
			(firmwareVersion == undefined ||
				(semver.lte(
					padVersion(entry.firmwareVersion.min),
					padVersion(firmwareVersion),
				) &&
					semver.gte(
						padVersion(entry.firmwareVersion.max),
						padVersion(firmwareVersion),
					))),
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

function isHexKey(val: any): val is string {
	return typeof val === "string" && hexKeyRegex.test(val);
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
		if (!isHexKey(definition.manufacturerId)) {
			throwInvalidConfig(
				`device`,
				`config/devices/${filename}:
manufacturer id is not a hexadecimal number`,
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
					isHexKey((dev as any).productType) &&
					isHexKey((dev as any).productId),
			)
		) {
			throwInvalidConfig(
				`device`,
				`config/devices/${filename}:
devices is malformed`,
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
				if (!/[1-9][0-9]*/.test(key))
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
