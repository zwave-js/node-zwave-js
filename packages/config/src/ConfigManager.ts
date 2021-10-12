import {
	isZWaveError,
	ZWaveError,
	ZWaveErrorCodes,
	ZWaveLogContainer,
} from "@zwave-js/core";
import { getErrorMessage, num2hex } from "@zwave-js/shared";
import { pathExists } from "fs-extra";
import path from "path";
import {
	BasicDeviceClass,
	BasicDeviceClassMap,
	GenericDeviceClass,
	GenericDeviceClassMap,
	getDefaultGenericDeviceClass,
	getDefaultSpecificDeviceClass,
	loadDeviceClassesInternal,
	SpecificDeviceClass,
} from "./DeviceClasses";
import {
	ConditionalDeviceConfig,
	DeviceConfig,
	DeviceConfigIndex,
	FulltextDeviceConfigIndex,
	generatePriorityDeviceIndex,
	getDevicesPaths,
	loadDeviceIndexInternal,
	loadFulltextDeviceIndexInternal,
} from "./Devices";
import {
	IndicatorMap,
	IndicatorPropertiesMap,
	IndicatorProperty,
	loadIndicatorsInternal,
} from "./Indicators";
import { ConfigLogger } from "./Logger";
import {
	loadManufacturersInternal,
	ManufacturersMap,
	saveManufacturersInternal,
} from "./Manufacturers";
import {
	getDefaultMeterScale,
	loadMetersInternal,
	Meter,
	MeterMap,
	MeterScale,
} from "./Meters";
import {
	loadNotificationsInternal,
	Notification,
	NotificationMap,
} from "./Notifications";
import {
	getDefaultScale,
	loadNamedScalesInternal,
	NamedScalesGroupMap,
	Scale,
	ScaleGroup,
} from "./Scales";
import {
	loadSensorTypesInternal,
	SensorType,
	SensorTypeMap,
} from "./SensorTypes";
import {
	configDir,
	externalConfigDir,
	getDeviceEntryPredicate,
	getEmbeddedConfigVersion,
	syncExternalConfigDir,
} from "./utils";

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

	private _namedScales: NamedScalesGroupMap | undefined;
	public get namedScales(): NamedScalesGroupMap {
		if (!this._namedScales) {
			throw new ZWaveError(
				"The config has not been loaded yet!",
				ZWaveErrorCodes.Driver_NotReady,
			);
		}
		return this._namedScales;
	}

	private _sensorTypes: SensorTypeMap | undefined;
	public get sensorTypes(): SensorTypeMap {
		if (!this._sensorTypes) {
			throw new ZWaveError(
				"The config has not been loaded yet!",
				ZWaveErrorCodes.Driver_NotReady,
			);
		}
		return this._sensorTypes;
	}

	private _meters: MeterMap | undefined;
	public get meters(): MeterMap {
		if (!this._meters) {
			throw new ZWaveError(
				"The config has not been loaded yet!",
				ZWaveErrorCodes.Driver_NotReady,
			);
		}
		return this._meters;
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
		await this.loadNamedScales();
		await this.loadSensorTypes();
		await this.loadMeters();
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
				if (!this._indicatorProperties)
					this._indicatorProperties = new Map();
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

	public async loadNamedScales(): Promise<void> {
		try {
			this._namedScales = await loadNamedScalesInternal(
				this._useExternalConfig,
			);
		} catch (e) {
			// If the config file is missing or invalid, don't try to find it again
			if (isZWaveError(e) && e.code === ZWaveErrorCodes.Config_Invalid) {
				if (process.env.NODE_ENV !== "test") {
					this.logger.print(
						`Could not load scales config: ${e.message}`,
						"error",
					);
				}
				if (!this._namedScales) this._namedScales = new Map();
			} else {
				// This is an unexpected error
				throw e;
			}
		}
	}

	/**
	 * Looks up all scales defined under a given name
	 */
	public lookupNamedScaleGroup(name: string): ScaleGroup | undefined {
		if (!this._namedScales) {
			throw new ZWaveError(
				"The config has not been loaded yet!",
				ZWaveErrorCodes.Driver_NotReady,
			);
		}

		return this._namedScales.get(name);
	}

	/** Looks up a scale definition for a given scale type */
	public lookupNamedScale(name: string, scale: number): Scale {
		const group = this.lookupNamedScaleGroup(name);
		return group?.get(scale) ?? getDefaultScale(scale);
	}

	public async loadSensorTypes(): Promise<void> {
		try {
			this._sensorTypes = await loadSensorTypesInternal(
				this,
				this._useExternalConfig,
			);
		} catch (e) {
			// If the config file is missing or invalid, don't try to find it again
			if (isZWaveError(e) && e.code === ZWaveErrorCodes.Config_Invalid) {
				if (process.env.NODE_ENV !== "test") {
					this.logger.print(
						`Could not load sensor types config: ${e.message}`,
						"error",
					);
				}
				if (!this._sensorTypes) this._sensorTypes = new Map();
			} else {
				// This is an unexpected error
				throw e;
			}
		}
	}

	/**
	 * Looks up the configuration for a given sensor type
	 */
	public lookupSensorType(sensorType: number): SensorType | undefined {
		if (!this._sensorTypes) {
			throw new ZWaveError(
				"The config has not been loaded yet!",
				ZWaveErrorCodes.Driver_NotReady,
			);
		}

		return this._sensorTypes.get(sensorType);
	}

	/** Looks up a scale definition for a given sensor type */
	public lookupSensorScale(sensorType: number, scale: number): Scale {
		const sensor = this.lookupSensorType(sensorType);
		return sensor?.scales.get(scale) ?? getDefaultScale(scale);
	}

	public getSensorTypeName(sensorType: number): string {
		const sensor = this.lookupSensorType(sensorType);
		if (sensor) return sensor.label;
		return `UNKNOWN (${num2hex(sensorType)})`;
	}

	public async loadMeters(): Promise<void> {
		try {
			this._meters = await loadMetersInternal(this._useExternalConfig);
		} catch (e) {
			// If the config file is missing or invalid, don't try to find it again
			if (isZWaveError(e) && e.code === ZWaveErrorCodes.Config_Invalid) {
				if (process.env.NODE_ENV !== "test") {
					this.logger.print(
						`Could not meters config: ${e.message}`,
						"error",
					);
				}
				if (!this._meters) this._meters = new Map();
			} else {
				// This is an unexpected error
				throw e;
			}
		}
	}

	/**
	 * Looks up the notification configuration for a given notification type
	 */
	public lookupMeter(meterType: number): Meter | undefined {
		if (!this._meters) {
			throw new ZWaveError(
				"The config has not been loaded yet!",
				ZWaveErrorCodes.Driver_NotReady,
			);
		}

		return this._meters.get(meterType);
	}

	public getMeterName(meterType: number): string {
		const meter = this.lookupMeter(meterType);
		return meter?.name ?? `UNKNOWN (${num2hex(meterType)})`;
	}

	/** Looks up a scale definition for a given meter type */
	public lookupMeterScale(type: number, scale: number): MeterScale {
		const meter = this.lookupMeter(type);
		return meter?.scales.get(scale) ?? getDefaultMeterScale(scale);
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
				if (!this._basicDeviceClasses)
					this._basicDeviceClasses = new Map();
				if (!this._genericDeviceClasses)
					this._genericDeviceClasses = new Map();
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
			label:
				this._basicDeviceClasses.get(basic) ??
				`UNKNOWN (${num2hex(basic)})`,
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
			this._genericDeviceClasses.get(generic) ??
			getDefaultGenericDeviceClass(generic)
		);
	}

	public lookupSpecificDeviceClass(
		generic: number,
		specific: number,
	): SpecificDeviceClass {
		const genericClass = this.lookupGenericDeviceClass(generic);
		return (
			genericClass.specific.get(specific) ??
			getDefaultSpecificDeviceClass(genericClass, specific)
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
				(!isZWaveError(e) && e instanceof Error) ||
				(isZWaveError(e) && e.code === ZWaveErrorCodes.Config_Invalid)
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
		const indexEntry = this.index!.find(
			getDeviceEntryPredicate(
				manufacturerId,
				productType,
				productId,
				firmwareVersion,
			),
		);

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

			try {
				return await ConditionalDeviceConfig.from(
					filePath,
					isEmbedded,
					{
						// When looking for device files, fall back to the embedded config dir
						rootDir: indexEntry.rootDir ?? devicesDir,
					},
				);
			} catch (e) {
				if (process.env.NODE_ENV !== "test") {
					this.logger.print(
						`Error loading device config ${filePath}: ${getErrorMessage(
							e,
							true,
						)}`,
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
			this.lookupNotificationUnsafe(notificationType)?.name ??
			`Unknown (${num2hex(notificationType)})`
		);
	}
}
