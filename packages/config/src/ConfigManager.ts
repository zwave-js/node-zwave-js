import {
	ZWaveError,
	ZWaveErrorCodes,
	ZWaveLogContainer,
	isZWaveError,
} from "@zwave-js/core";
import { type JSONObject, getErrorMessage, num2hex } from "@zwave-js/shared";
import { isObject } from "alcalzone-shared/typeguards";
import { pathExists, readFile } from "fs-extra";
import JSON5 from "json5";
import path from "node:path";
import {
	type BasicDeviceClass,
	type BasicDeviceClassMap,
	GenericDeviceClass,
	type GenericDeviceClassMap,
	type SpecificDeviceClass,
	getDefaultGenericDeviceClass,
	getDefaultSpecificDeviceClass,
} from "./DeviceClasses";
import {
	type IndicatorMap,
	type IndicatorPropertiesMap,
	IndicatorProperty,
} from "./Indicators";
import { ConfigLogger } from "./Logger";
import {
	type ManufacturersMap,
	loadManufacturersInternal,
	saveManufacturersInternal,
} from "./Manufacturers";
import { Notification, type NotificationMap } from "./Notifications";
import {
	ConditionalDeviceConfig,
	type DeviceConfig,
	type DeviceConfigIndex,
	type FulltextDeviceConfigIndex,
	generatePriorityDeviceIndex,
	getDevicesPaths,
	loadDeviceIndexInternal,
	loadFulltextDeviceIndexInternal,
} from "./devices/DeviceConfig";
import {
	configDir,
	externalConfigDir,
	getDeviceEntryPredicate,
	getEmbeddedConfigVersion,
	syncExternalConfigDir,
} from "./utils";
import { hexKeyRegexNDigits, throwInvalidConfig } from "./utils_safe";

export interface ConfigManagerOptions {
	logContainer?: ZWaveLogContainer;
	deviceConfigPriorityDir?: string;
}

export class ConfigManager {
	public constructor(options: ConfigManagerOptions = {}) {
		this.logger = new ConfigLogger(
			options.logContainer ?? new ZWaveLogContainer({ enabled: false }),
		);
		this.deviceConfigPriorityDir = options.deviceConfigPriorityDir;
		this._configVersion =
			// eslint-disable-next-line @typescript-eslint/no-var-requires
			require("@zwave-js/config/package.json").version;
	}

	private _configVersion: string;
	public get configVersion(): string {
		return this._configVersion;
	}

	private logger: ConfigLogger;

	private _indicators: IndicatorMap | undefined;
	public get indicators(): IndicatorMap {
		if (!this._indicators) {
			throw new ZWaveError(
				"The config has not been loaded yet!",
				ZWaveErrorCodes.Driver_NotReady,
			);
		}
		return this._indicators;
	}

	private _indicatorProperties: IndicatorPropertiesMap | undefined;
	public get indicatorProperties(): IndicatorPropertiesMap {
		if (!this._indicatorProperties) {
			throw new ZWaveError(
				"The config has not been loaded yet!",
				ZWaveErrorCodes.Driver_NotReady,
			);
		}
		return this._indicatorProperties;
	}

	private _manufacturers: ManufacturersMap | undefined;
	public get manufacturers(): ManufacturersMap {
		if (!this._manufacturers) {
			throw new ZWaveError(
				"The config has not been loaded yet!",
				ZWaveErrorCodes.Driver_NotReady,
			);
		}
		return this._manufacturers;
	}

	private _basicDeviceClasses: BasicDeviceClassMap | undefined;
	public get basicDeviceClasses(): BasicDeviceClassMap {
		if (!this._basicDeviceClasses) {
			throw new ZWaveError(
				"The config has not been loaded yet!",
				ZWaveErrorCodes.Driver_NotReady,
			);
		}
		return this._basicDeviceClasses;
	}

	private _genericDeviceClasses: GenericDeviceClassMap | undefined;
	public get genericDeviceClasses(): GenericDeviceClassMap {
		if (!this._genericDeviceClasses) {
			throw new ZWaveError(
				"The config has not been loaded yet!",
				ZWaveErrorCodes.Driver_NotReady,
			);
		}
		return this._genericDeviceClasses;
	}

	private deviceConfigPriorityDir: string | undefined;
	private index: DeviceConfigIndex | undefined;
	private fulltextIndex: FulltextDeviceConfigIndex | undefined;

	private _notifications: NotificationMap | undefined;
	public get notifications(): NotificationMap {
		if (!this._notifications) {
			throw new ZWaveError(
				"The config has not been loaded yet!",
				ZWaveErrorCodes.Driver_NotReady,
			);
		}
		return this._notifications;
	}

	private _useExternalConfig: boolean = false;
	public get useExternalConfig(): boolean {
		return this._useExternalConfig;
	}

	public async loadAll(): Promise<void> {
		// If the environment option for an external config dir is set
		// try to sync it and then use it
		const syncResult = await syncExternalConfigDir(this.logger);
		if (syncResult.success) {
			this._useExternalConfig = true;
			this.logger.print(
				`Using external configuration dir ${externalConfigDir()}`,
			);
			this._configVersion = syncResult.version;
		} else {
			this._useExternalConfig = false;
			this._configVersion = await getEmbeddedConfigVersion();
		}
		this.logger.print(`version ${this._configVersion}`, "info");

		await this.loadDeviceClasses();
		await this.loadManufacturers();
		await this.loadDeviceIndex();
		await this.loadNotifications();
		await this.loadIndicators();
	}

	public async loadManufacturers(): Promise<void> {
		try {
			this._manufacturers = await loadManufacturersInternal(
				this._useExternalConfig,
			);
		} catch (e) {
			// If the config file is missing or invalid, don't try to find it again
			if (isZWaveError(e) && e.code === ZWaveErrorCodes.Config_Invalid) {
				if (process.env.NODE_ENV !== "test") {
					this.logger.print(
						`Could not load manufacturers config: ${e.message}`,
						"error",
					);
				}
				if (!this._manufacturers) this._manufacturers = new Map();
			} else {
				// This is an unexpected error
				throw e;
			}
		}
	}

	public async saveManufacturers(): Promise<void> {
		if (!this._manufacturers) {
			throw new ZWaveError(
				"The config has not been loaded yet!",
				ZWaveErrorCodes.Driver_NotReady,
			);
		}

		await saveManufacturersInternal(this._manufacturers);
	}

	/**
	 * Looks up the name of the manufacturer with the given ID in the configuration DB
	 * @param manufacturerId The manufacturer id to look up
	 */
	public lookupManufacturer(manufacturerId: number): string | undefined {
		if (!this._manufacturers) {
			throw new ZWaveError(
				"The config has not been loaded yet!",
				ZWaveErrorCodes.Driver_NotReady,
			);
		}

		return this._manufacturers.get(manufacturerId);
	}

	/**
	 * Add new manufacturers to configuration DB
	 * @param manufacturerId The manufacturer id to look up
	 * @param manufacturerName The manufacturer name
	 */
	public setManufacturer(
		manufacturerId: number,
		manufacturerName: string,
	): void {
		if (!this._manufacturers) {
			throw new ZWaveError(
				"The config has not been loaded yet!",
				ZWaveErrorCodes.Driver_NotReady,
			);
		}

		this._manufacturers.set(manufacturerId, manufacturerName);
	}

	public async loadIndicators(): Promise<void> {
		try {
			const config = await loadIndicatorsInternal(
				this._useExternalConfig,
			);
			this._indicators = config.indicators;
			this._indicatorProperties = config.properties;
		} catch (e) {
			// If the config file is missing or invalid, don't try to find it again
			if (isZWaveError(e) && e.code === ZWaveErrorCodes.Config_Invalid) {
				if (process.env.NODE_ENV !== "test") {
					this.logger.print(
						`Could not load indicators config: ${e.message}`,
						"error",
					);
				}
				if (!this._indicators) this._indicators = new Map();
				if (!this._indicatorProperties) {
					this._indicatorProperties = new Map();
				}
			} else {
				// This is an unexpected error
				throw e;
			}
		}
	}

	/**
	 * Looks up the label for a given indicator id
	 */
	public lookupIndicator(indicatorId: number): string | undefined {
		if (!this._indicators) {
			throw new ZWaveError(
				"The config has not been loaded yet!",
				ZWaveErrorCodes.Driver_NotReady,
			);
		}

		return this._indicators.get(indicatorId);
	}

	/**
	 * Looks up the property definition for a given indicator property id
	 */
	public lookupProperty(propertyId: number): IndicatorProperty | undefined {
		if (!this._indicatorProperties) {
			throw new ZWaveError(
				"The config has not been loaded yet!",
				ZWaveErrorCodes.Driver_NotReady,
			);
		}

		return this._indicatorProperties.get(propertyId);
	}

	public async loadDeviceClasses(): Promise<void> {
		try {
			const config = await loadDeviceClassesInternal(
				this._useExternalConfig,
			);
			this._basicDeviceClasses = config.basicDeviceClasses;
			this._genericDeviceClasses = config.genericDeviceClasses;
		} catch (e) {
			// If the config file is missing or invalid, don't try to find it again
			if (isZWaveError(e) && e.code === ZWaveErrorCodes.Config_Invalid) {
				if (process.env.NODE_ENV !== "test") {
					this.logger.print(
						`Could not load scales config: ${e.message}`,
						"error",
					);
				}
				if (!this._basicDeviceClasses) {
					this._basicDeviceClasses = new Map();
				}
				if (!this._genericDeviceClasses) {
					this._genericDeviceClasses = new Map();
				}
			} else {
				// This is an unexpected error
				throw e;
			}
		}
	}

	public lookupBasicDeviceClass(basic: number): BasicDeviceClass {
		if (!this._basicDeviceClasses) {
			throw new ZWaveError(
				"The config has not been loaded yet!",
				ZWaveErrorCodes.Driver_NotReady,
			);
		}

		return {
			key: basic,
			label: this._basicDeviceClasses.get(basic)
				?? `UNKNOWN (${num2hex(basic)})`,
		};
	}

	public lookupGenericDeviceClass(generic: number): GenericDeviceClass {
		if (!this._genericDeviceClasses) {
			throw new ZWaveError(
				"The config has not been loaded yet!",
				ZWaveErrorCodes.Driver_NotReady,
			);
		}

		return (
			this._genericDeviceClasses.get(generic)
				?? getDefaultGenericDeviceClass(generic)
		);
	}

	public lookupSpecificDeviceClass(
		generic: number,
		specific: number,
	): SpecificDeviceClass {
		const genericClass = this.lookupGenericDeviceClass(generic);
		return (
			genericClass.specific.get(specific)
				?? getDefaultSpecificDeviceClass(genericClass, specific)
		);
	}

	public async loadDeviceIndex(): Promise<void> {
		try {
			// The index of config files included in this package
			const embeddedIndex = await loadDeviceIndexInternal(
				this.logger,
				this._useExternalConfig,
			);
			// A dynamic index of the user-defined priority device config files
			const priorityIndex: DeviceConfigIndex = [];
			if (this.deviceConfigPriorityDir) {
				if (await pathExists(this.deviceConfigPriorityDir)) {
					priorityIndex.push(
						...(await generatePriorityDeviceIndex(
							this.deviceConfigPriorityDir,
							this.logger,
						)),
					);
				} else {
					this.logger.print(
						`Priority device configuration directory ${this.deviceConfigPriorityDir} not found`,
						"warn",
					);
				}
			}
			// Put the priority index in front, so the files get resolved first
			this.index = [...priorityIndex, ...embeddedIndex];
		} catch (e) {
			// If the index file is missing or invalid, don't try to find it again
			if (
				(!isZWaveError(e) && e instanceof Error)
				|| (isZWaveError(e)
					&& e.code === ZWaveErrorCodes.Config_Invalid)
			) {
				// Fall back to no index on production systems
				if (!this.index) this.index = [];
				if (process.env.NODE_ENV !== "test") {
					this.logger.print(
						`Could not load or regenerate device config index: ${e.message}`,
						"error",
					);
					// and don't throw
					return;
				}
				// But fail hard in tests
				throw e;
			}
		}
	}

	public getIndex(): DeviceConfigIndex | undefined {
		return this.index;
	}

	public async loadFulltextDeviceIndex(): Promise<void> {
		this.fulltextIndex = await loadFulltextDeviceIndexInternal(this.logger);
	}

	public getFulltextIndex(): FulltextDeviceConfigIndex | undefined {
		return this.fulltextIndex;
	}

	/**
	 * Looks up the definition of a given device in the configuration DB, but does not evaluate conditional settings.
	 * @param manufacturerId The manufacturer id of the device
	 * @param productType The product type of the device
	 * @param productId The product id of the device
	 * @param firmwareVersion If known, configuration for a specific firmware version can be loaded.
	 * If this is `undefined` or not given, the first matching file with a defined firmware range will be returned.
	 */
	public async lookupDevicePreserveConditions(
		manufacturerId: number,
		productType: number,
		productId: number,
		firmwareVersion?: string,
	): Promise<ConditionalDeviceConfig | undefined> {
		// Load/regenerate the index if necessary
		if (!this.index) await this.loadDeviceIndex();

		// Look up the device in the index
		const indexEntries = this.index!.filter(
			getDeviceEntryPredicate(
				manufacturerId,
				productType,
				productId,
				firmwareVersion,
			),
		);
		// If there are multiple with overlapping firmware ranges, return the preferred one first
		const indexEntry = indexEntries.find((e) => !!e.preferred)
			?? indexEntries[0];

		if (indexEntry) {
			const devicesDir = getDevicesPaths(
				this._useExternalConfig ? externalConfigDir()! : configDir,
			).devicesDir;
			const filePath = path.isAbsolute(indexEntry.filename)
				? indexEntry.filename
				: path.join(devicesDir, indexEntry.filename);
			if (!(await pathExists(filePath))) return;

			// A config file is treated as am embedded one when it is located under the devices root dir
			// or the external config dir
			const isEmbedded = !path
				.relative(devicesDir, filePath)
				.startsWith("..");

			// When a device file is located in a different root directory than the embedded config files,
			// we use the embedded dir a fallback
			const rootDir = indexEntry.rootDir ?? devicesDir;
			const fallbackDirs = rootDir === devicesDir
				? undefined
				: [devicesDir];

			try {
				return await ConditionalDeviceConfig.from(
					filePath,
					isEmbedded,
					{ rootDir, fallbackDirs },
				);
			} catch (e) {
				if (process.env.NODE_ENV !== "test") {
					this.logger.print(
						`Error loading device config ${filePath}: ${
							getErrorMessage(
								e,
								true,
							)
						}`,
						"error",
					);
				}
			}
		}
	}

	/**
	 * Looks up the definition of a given device in the configuration DB
	 * @param manufacturerId The manufacturer id of the device
	 * @param productType The product type of the device
	 * @param productId The product id of the device
	 * @param firmwareVersion If known, configuration for a specific firmware version can be loaded.
	 * If this is `undefined` or not given, the first matching file with a defined firmware range will be returned.
	 */
	public async lookupDevice(
		manufacturerId: number,
		productType: number,
		productId: number,
		firmwareVersion?: string,
	): Promise<DeviceConfig | undefined> {
		const ret = await this.lookupDevicePreserveConditions(
			manufacturerId,
			productType,
			productId,
			firmwareVersion,
		);
		return ret?.evaluate({
			manufacturerId,
			productType,
			productId,
			firmwareVersion,
		});
	}

	public async loadNotifications(): Promise<void> {
		try {
			this._notifications = await loadNotificationsInternal(
				this._useExternalConfig,
			);
		} catch (e) {
			// If the config file is missing or invalid, don't try to find it again
			if (isZWaveError(e) && e.code === ZWaveErrorCodes.Config_Invalid) {
				if (process.env.NODE_ENV !== "test") {
					this.logger.print(
						`Could not load notifications config: ${e.message}`,
						"error",
					);
				}
				this._notifications = new Map();
			} else {
				// This is an unexpected error
				throw e;
			}
		}
	}

	/**
	 * Looks up the notification configuration for a given notification type
	 */
	public lookupNotification(
		notificationType: number,
	): Notification | undefined {
		if (!this._notifications) {
			throw new ZWaveError(
				"The config has not been loaded yet!",
				ZWaveErrorCodes.Driver_NotReady,
			);
		}

		return this._notifications.get(notificationType);
	}

	/**
	 * Looks up the notification configuration for a given notification type.
	 * If the config has not been loaded yet, this returns undefined.
	 */
	private lookupNotificationUnsafe(
		notificationType: number,
	): Notification | undefined {
		return this._notifications?.get(notificationType);
	}

	public getNotificationName(notificationType: number): string {
		return (
			this.lookupNotificationUnsafe(notificationType)?.name
				?? `Unknown (${num2hex(notificationType)})`
		);
	}
}

/** @internal */
export async function loadDeviceClassesInternal(
	externalConfig?: boolean,
): Promise<{
	basicDeviceClasses: BasicDeviceClassMap;
	genericDeviceClasses: GenericDeviceClassMap;
}> {
	const configPath = path.join(
		(externalConfig && externalConfigDir()) || configDir,
		"deviceClasses.json",
	);

	if (!(await pathExists(configPath))) {
		throw new ZWaveError(
			"The device classes config file does not exist!",
			ZWaveErrorCodes.Config_Invalid,
		);
	}

	try {
		const fileContents = await readFile(configPath, "utf8");
		const definition = JSON5.parse(fileContents);
		if (!isObject(definition)) {
			throwInvalidConfig(
				"device classes",
				`the dictionary is not an object`,
			);
		}

		if (!isObject(definition.basic)) {
			throwInvalidConfig(
				"device classes",
				`The "basic" property is not an object`,
			);
		}
		if (!isObject(definition.generic)) {
			throwInvalidConfig(
				"device classes",
				`The "generic" property is not an object`,
			);
		}

		const basicDeviceClasses = new Map<number, string>();
		for (const [key, basicClass] of Object.entries(definition.basic)) {
			if (!hexKeyRegexNDigits.test(key)) {
				throwInvalidConfig(
					"device classes",
					`found invalid key "${key}" in the basic device class definition. Device classes must have lowercase hexadecimal IDs.`,
				);
			}
			if (typeof basicClass !== "string") {
				throwInvalidConfig(
					"device classes",
					`basic device class "${key}" must be a string`,
				);
			}
			const keyNum = parseInt(key.slice(2), 16);
			basicDeviceClasses.set(keyNum, basicClass);
		}

		const genericDeviceClasses = new Map<number, GenericDeviceClass>();
		for (
			const [key, genericDefinition] of Object.entries(
				definition.generic,
			)
		) {
			if (!hexKeyRegexNDigits.test(key)) {
				throwInvalidConfig(
					"device classes",
					`found invalid key "${key}" in the generic device class definition. Device classes must have lowercase hexadecimal IDs.`,
				);
			}
			const keyNum = parseInt(key.slice(2), 16);
			genericDeviceClasses.set(
				keyNum,
				new GenericDeviceClass(keyNum, genericDefinition as any),
			);
		}

		return { basicDeviceClasses, genericDeviceClasses };
	} catch (e) {
		if (isZWaveError(e)) {
			throw e;
		} else {
			throwInvalidConfig("device classes");
		}
	}
}

/** @internal */
export async function loadIndicatorsInternal(
	externalConfig?: boolean,
): Promise<{
	indicators: IndicatorMap;
	properties: IndicatorPropertiesMap;
}> {
	const indicatorsConfigPath = path.join(
		(externalConfig && externalConfigDir()) || configDir,
		"indicators.json",
	);

	if (!(await pathExists(indicatorsConfigPath))) {
		throw new ZWaveError(
			"The config file does not exist!",
			ZWaveErrorCodes.Config_Invalid,
		);
	}

	try {
		const fileContents = await readFile(indicatorsConfigPath, "utf8");
		const definition = JSON5.parse(fileContents);
		if (!isObject(definition)) {
			throwInvalidConfig("indicators", "the database is not an object");
		}
		if (!("indicators" in definition)) {
			throwInvalidConfig(
				"indicators",
				`the required key "indicators" is missing`,
			);
		}
		if (!("properties" in definition)) {
			throwInvalidConfig(
				"indicators",
				`the required key "properties" is missing`,
			);
		}

		const indicators = new Map<number, string>();
		for (const [id, label] of Object.entries(definition.indicators)) {
			if (!hexKeyRegexNDigits.test(id)) {
				throwInvalidConfig(
					"indicators",
					`found invalid key "${id}" in "indicators". Indicators must have lowercase hexadecimal IDs.`,
				);
			}
			if (typeof label !== "string") {
				throwInvalidConfig(
					"indicators",
					`indicator "${id}" must be a string`,
				);
			}
			const idNum = parseInt(id.slice(2), 16);
			indicators.set(idNum, label);
		}

		const properties = new Map<number, IndicatorProperty>();
		for (
			const [id, propDefinition] of Object.entries(
				definition.properties,
			)
		) {
			if (!hexKeyRegexNDigits.test(id)) {
				throwInvalidConfig(
					"indicators",
					`found invalid key "${id}" in "properties". Indicator properties must have lowercase hexadecimal IDs.`,
				);
			}
			const idNum = parseInt(id.slice(2), 16);
			properties.set(
				idNum,
				new IndicatorProperty(idNum, propDefinition as any),
			);
		}

		return { indicators, properties };
	} catch (e) {
		if (isZWaveError(e)) {
			throw e;
		} else {
			throwInvalidConfig("indicators");
		}
	}
}

/** @internal */
export async function loadNotificationsInternal(
	externalConfig?: boolean,
): Promise<NotificationMap> {
	const configPath = path.join(
		(externalConfig && externalConfigDir()) || configDir,
		"notifications.json",
	);

	if (!(await pathExists(configPath))) {
		throw new ZWaveError(
			"The config file does not exist!",
			ZWaveErrorCodes.Config_Invalid,
		);
	}

	try {
		const fileContents = await readFile(configPath, "utf8");
		const definition = JSON5.parse(fileContents);
		if (!isObject(definition)) {
			throwInvalidConfig(
				"notifications",
				"the database is not an object",
			);
		}

		const notifications = new Map();
		for (const [id, ntfcnDefinition] of Object.entries(definition)) {
			if (!hexKeyRegexNDigits.test(id)) {
				throwInvalidConfig(
					"notifications",
					`found invalid key "${id}" at the root. Notifications must have lowercase hexadecimal IDs.`,
				);
			}
			const idNum = parseInt(id.slice(2), 16);
			notifications.set(
				idNum,
				new Notification(idNum, ntfcnDefinition as JSONObject),
			);
		}
		return notifications;
	} catch (e) {
		if (isZWaveError(e)) {
			throw e;
		} else {
			throwInvalidConfig("notifications");
		}
	}
}
