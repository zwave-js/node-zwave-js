import { ZWaveError, ZWaveErrorCodes, ZWaveLogContainer } from "@zwave-js/core";
import { num2hex } from "@zwave-js/shared";
import { pathExists, readFile } from "fs-extra";
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
	DeviceConfig,
	DeviceConfigIndex,
	DeviceConfigIndexEntry,
	FirmwareVersionRange,
	loadDeviceIndexInternal,
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
import { configDir, formatId, getDeviceEntryPredicate } from "./utils";

export class ConfigManager {
	public constructor(container?: ZWaveLogContainer) {
		// Make it easier to use this in tests and scripts
		if (!container) {
			container = new ZWaveLogContainer({ enabled: false });
		}
		this.logger = new ConfigLogger(container);
	}

	private logger: ConfigLogger;

	private indicators: IndicatorMap | undefined;
	private indicatorProperties: IndicatorPropertiesMap | undefined;
	private manufacturers: ManufacturersMap | undefined;
	private namedScales: NamedScalesGroupMap | undefined;
	private sensorTypes: SensorTypeMap | undefined;
	private meters: MeterMap | undefined;
	private basicDeviceClasses: BasicDeviceClassMap | undefined;
	private genericDeviceClasses: GenericDeviceClassMap | undefined;
	private index: DeviceConfigIndex | undefined;
	private notifications: NotificationMap | undefined;

	public async loadManufacturers(): Promise<void> {
		try {
			this.manufacturers = await loadManufacturersInternal();
		} catch (e: unknown) {
			// If the config file is missing or invalid, don't try to find it again
			if (
				e instanceof ZWaveError &&
				e.code === ZWaveErrorCodes.Config_Invalid
			) {
				if (process.env.NODE_ENV !== "test") {
					this.logger.print(
						`Could not load manufacturers config: ${e.message}`,
						"error",
					);
				}
				if (!this.manufacturers) this.manufacturers = new Map();
			} else {
				// This is an unexpected error
				throw e;
			}
		}
	}

	public async saveManufacturers(): Promise<void> {
		if (!this.manufacturers) {
			throw new ZWaveError(
				"The config has not been loaded yet!",
				ZWaveErrorCodes.Driver_NotReady,
			);
		}

		await saveManufacturersInternal(this.manufacturers);
	}

	/**
	 * Looks up the name of the manufacturer with the given ID in the configuration DB
	 * @param manufacturerId The manufacturer id to look up
	 */
	public lookupManufacturer(manufacturerId: number): string | undefined {
		if (!this.manufacturers) {
			throw new ZWaveError(
				"The config has not been loaded yet!",
				ZWaveErrorCodes.Driver_NotReady,
			);
		}

		return this.manufacturers.get(manufacturerId);
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
		if (!this.manufacturers) {
			throw new ZWaveError(
				"The config has not been loaded yet!",
				ZWaveErrorCodes.Driver_NotReady,
			);
		}

		this.manufacturers.set(manufacturerId, manufacturerName);
	}

	public async loadIndicators(): Promise<void> {
		try {
			const config = await loadIndicatorsInternal();
			this.indicators = config.indicators;
			this.indicatorProperties = config.properties;
		} catch (e: unknown) {
			// If the config file is missing or invalid, don't try to find it again
			if (
				e instanceof ZWaveError &&
				e.code === ZWaveErrorCodes.Config_Invalid
			) {
				if (process.env.NODE_ENV !== "test") {
					this.logger.print(
						`Could not load indicators config: ${e.message}`,
						"error",
					);
				}
				if (!this.indicators) this.indicators = new Map();
				if (!this.indicatorProperties)
					this.indicatorProperties = new Map();
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
		if (!this.indicators) {
			throw new ZWaveError(
				"The config has not been loaded yet!",
				ZWaveErrorCodes.Driver_NotReady,
			);
		}

		return this.indicators.get(indicatorId);
	}

	/**
	 * Looks up the property definition for a given indicator property id
	 */
	public lookupProperty(propertyId: number): IndicatorProperty | undefined {
		if (!this.indicatorProperties) {
			throw new ZWaveError(
				"The config has not been loaded yet!",
				ZWaveErrorCodes.Driver_NotReady,
			);
		}

		return this.indicatorProperties.get(propertyId);
	}

	public async loadNamedScales(): Promise<void> {
		try {
			this.namedScales = await loadNamedScalesInternal();
		} catch (e: unknown) {
			// If the config file is missing or invalid, don't try to find it again
			if (
				e instanceof ZWaveError &&
				e.code === ZWaveErrorCodes.Config_Invalid
			) {
				if (process.env.NODE_ENV !== "test") {
					this.logger.print(
						`Could not load scales config: ${e.message}`,
						"error",
					);
				}
				if (!this.namedScales) this.namedScales = new Map();
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
		if (!this.namedScales) {
			throw new ZWaveError(
				"The config has not been loaded yet!",
				ZWaveErrorCodes.Driver_NotReady,
			);
		}

		return this.namedScales.get(name);
	}

	/** Looks up a scale definition for a given sensor type */
	public lookupNamedScale(name: string, scale: number): Scale {
		const group = this.lookupNamedScaleGroup(name);
		return group?.get(scale) ?? getDefaultScale(scale);
	}

	public async loadSensorTypes(): Promise<void> {
		try {
			this.sensorTypes = await loadSensorTypesInternal(this);
		} catch (e: unknown) {
			// If the config file is missing or invalid, don't try to find it again
			if (
				e instanceof ZWaveError &&
				e.code === ZWaveErrorCodes.Config_Invalid
			) {
				if (process.env.NODE_ENV !== "test") {
					this.logger.print(
						`Could not load sensor types config: ${e.message}`,
						"error",
					);
				}
				if (!this.sensorTypes) this.sensorTypes = new Map();
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
		if (!this.sensorTypes) {
			throw new ZWaveError(
				"The config has not been loaded yet!",
				ZWaveErrorCodes.Driver_NotReady,
			);
		}

		return this.sensorTypes.get(sensorType);
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
			this.meters = await loadMetersInternal();
		} catch (e: unknown) {
			// If the config file is missing or invalid, don't try to find it again
			if (
				e instanceof ZWaveError &&
				e.code === ZWaveErrorCodes.Config_Invalid
			) {
				if (process.env.NODE_ENV !== "test") {
					this.logger.print(
						`Could not meters config: ${e.message}`,
						"error",
					);
				}
				if (!this.meters) this.meters = new Map();
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
		if (!this.meters) {
			throw new ZWaveError(
				"The config has not been loaded yet!",
				ZWaveErrorCodes.Driver_NotReady,
			);
		}

		return this.meters.get(meterType);
	}

	/** Looks up a scale definition for a given meter type */
	public lookupMeterScale(type: number, scale: number): MeterScale {
		const meter = this.lookupMeter(type);
		return meter?.scales.get(scale) ?? getDefaultMeterScale(scale);
	}

	public async loadDeviceClasses(): Promise<void> {
		try {
			const config = await loadDeviceClassesInternal();
			this.basicDeviceClasses = config.basicDeviceClasses;
			this.genericDeviceClasses = config.genericDeviceClasses;
		} catch (e: unknown) {
			// If the config file is missing or invalid, don't try to find it again
			if (
				e instanceof ZWaveError &&
				e.code === ZWaveErrorCodes.Config_Invalid
			) {
				if (process.env.NODE_ENV !== "test") {
					this.logger.print(
						`Could not load scales config: ${e.message}`,
						"error",
					);
				}
				if (!this.basicDeviceClasses)
					this.basicDeviceClasses = new Map();
				if (!this.genericDeviceClasses)
					this.genericDeviceClasses = new Map();
			} else {
				// This is an unexpected error
				throw e;
			}
		}
	}

	public lookupBasicDeviceClass(basic: number): BasicDeviceClass {
		if (!this.basicDeviceClasses) {
			throw new ZWaveError(
				"The config has not been loaded yet!",
				ZWaveErrorCodes.Driver_NotReady,
			);
		}

		return {
			key: basic,
			label:
				this.basicDeviceClasses.get(basic) ??
				`UNKNOWN (${num2hex(basic)})`,
		};
	}

	public lookupGenericDeviceClass(generic: number): GenericDeviceClass {
		if (!this.genericDeviceClasses) {
			throw new ZWaveError(
				"The config has not been loaded yet!",
				ZWaveErrorCodes.Driver_NotReady,
			);
		}

		return (
			this.genericDeviceClasses.get(generic) ??
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
			this.index = await loadDeviceIndexInternal();
		} catch (e: unknown) {
			// If the index file is missing or invalid, don't try to find it again
			if (
				e instanceof ZWaveError &&
				e.code === ZWaveErrorCodes.Config_Invalid
			) {
				if (process.env.NODE_ENV !== "test") {
					this.logger.print(
						`Could not load or regenerate device config index: ${e.message}`,
						"error",
					);
				}
				if (!this.index) this.index = [];
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
	 * @param firmwareVersion If known, configuration for a specific firmware version can be loaded.
	 * If this is `undefined` or not given, the first matching file with a defined firmware range will be returned.
	 * If this is `false`, **only** the first matching file without a firmware version (`firmwareVersion: false`) will be returned.
	 */
	public async lookupDevice(
		manufacturerId: number,
		productType: number,
		productId: number,
		firmwareVersion?: string | false,
	): Promise<DeviceConfig | undefined> {
		if (!this.index) {
			throw new ZWaveError(
				"The config has not been loaded yet!",
				ZWaveErrorCodes.Driver_NotReady,
			);
		}

		// Look up the device in the index
		let indexEntry: DeviceConfigIndexEntry | undefined;
		if (firmwareVersion === false) {
			// A config file with no firmware version is explicitly requested
			const predicate = getDeviceEntryPredicate(
				manufacturerId,
				productType,
				productId,
			);
			indexEntry = this.index.find(
				(e) => e.firmwareVersion === false && predicate(e),
			);
		} else {
			indexEntry = this.index.find(
				getDeviceEntryPredicate(
					manufacturerId,
					productType,
					productId,
					firmwareVersion,
				),
			);
		}

		if (indexEntry) {
			const filePath = path.join(
				configDir,
				"devices",
				indexEntry.filename,
			);
			if (!(await pathExists(filePath))) return;

			try {
				const fileContents = await readFile(filePath, "utf8");
				return new DeviceConfig(indexEntry.filename, fileContents);
			} catch (e) {
				if (process.env.NODE_ENV !== "test") {
					this.logger.print(
						`Error loading device config ${filePath}`,
						"error",
					);
				}
			}
		}
	}

	/**
	 * Adds a given device to the index
	 * @param manufacturerId The manufacturer id of the device
	 * @param productType The product type of the device
	 * @param productId The product id of the device
	 * @param filename The path to the json configuration of this device
	 * @param firmwareVersionMin Min firmware version
	 * @param firmwareVersionMax Max firmware version
	 *
	 */
	public addDeviceToIndex(
		manufacturerId: number,
		productType: number,
		productId: number,
		filename: string,
		firmwareVersion?: FirmwareVersionRange | false,
	): void {
		if (!this.index) {
			throw new ZWaveError(
				"The config has not been loaded yet!",
				ZWaveErrorCodes.Driver_NotReady,
			);
		}
		// Look up the device in the index
		const indexEntry: DeviceConfigIndexEntry = {
			manufacturerId: formatId(manufacturerId),
			productId: formatId(productId),
			productType: formatId(productType),
			firmwareVersion:
				firmwareVersion === false
					? false
					: {
							min: firmwareVersion?.min || "0.0",
							max: firmwareVersion?.max || "255.255",
					  },
			filename: filename,
		};

		this.index.push(indexEntry);
	}

	public getIndex(): DeviceConfigIndexEntry[] | undefined {
		return this.index;
	}

	public async loadNotifications(): Promise<void> {
		try {
			this.notifications = await loadNotificationsInternal();
		} catch (e: unknown) {
			// If the config file is missing or invalid, don't try to find it again
			if (
				e instanceof ZWaveError &&
				e.code === ZWaveErrorCodes.Config_Invalid
			) {
				if (process.env.NODE_ENV !== "test") {
					this.logger.print(
						`Could not load notifications config: ${e.message}`,
						"error",
					);
				}
				this.notifications = new Map();
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
		if (!this.notifications) {
			throw new ZWaveError(
				"The config has not been loaded yet!",
				ZWaveErrorCodes.Driver_NotReady,
			);
		}

		return this.notifications.get(notificationType);
	}

	/**
	 * Looks up the notification configuration for a given notification type.
	 * If the config has not been loaded yet, this returns undefined.
	 */
	private lookupNotificationUnsafe(
		notificationType: number,
	): Notification | undefined {
		return this.notifications?.get(notificationType);
	}

	public getNotificationName(notificationType: number): string {
		return (
			this.lookupNotificationUnsafe(notificationType)?.name ??
			`Unknown (${num2hex(notificationType)})`
		);
	}
}
