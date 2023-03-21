import { ZWaveLogContainer } from "@zwave-js/core";
import { BasicDeviceClass, BasicDeviceClassMap, GenericDeviceClass, GenericDeviceClassMap, SpecificDeviceClass } from "./DeviceClasses";
import { ConditionalDeviceConfig, DeviceConfig, DeviceConfigIndex, FulltextDeviceConfigIndex } from "./devices/DeviceConfig";
import { IndicatorMap, IndicatorPropertiesMap, IndicatorProperty } from "./Indicators";
import { ManufacturersMap } from "./Manufacturers";
import { Meter, MeterMap, MeterScale } from "./Meters";
import { Notification, NotificationMap } from "./Notifications";
import { NamedScalesGroupMap, Scale, ScaleGroup } from "./Scales";
import { SensorType, SensorTypeMap } from "./SensorTypes";
export interface ConfigManagerOptions {
    logContainer?: ZWaveLogContainer;
    deviceConfigPriorityDir?: string;
}
export declare class ConfigManager {
    constructor(options?: ConfigManagerOptions);
    private _configVersion;
    get configVersion(): string;
    private logger;
    private _indicators;
    get indicators(): IndicatorMap;
    private _indicatorProperties;
    get indicatorProperties(): IndicatorPropertiesMap;
    private _manufacturers;
    get manufacturers(): ManufacturersMap;
    private _namedScales;
    get namedScales(): NamedScalesGroupMap;
    private _sensorTypes;
    get sensorTypes(): SensorTypeMap;
    private _meters;
    get meters(): MeterMap;
    private _basicDeviceClasses;
    get basicDeviceClasses(): BasicDeviceClassMap;
    private _genericDeviceClasses;
    get genericDeviceClasses(): GenericDeviceClassMap;
    private deviceConfigPriorityDir;
    private index;
    private fulltextIndex;
    private _notifications;
    get notifications(): NotificationMap;
    private _useExternalConfig;
    get useExternalConfig(): boolean;
    loadAll(): Promise<void>;
    loadManufacturers(): Promise<void>;
    saveManufacturers(): Promise<void>;
    /**
     * Looks up the name of the manufacturer with the given ID in the configuration DB
     * @param manufacturerId The manufacturer id to look up
     */
    lookupManufacturer(manufacturerId: number): string | undefined;
    /**
     * Add new manufacturers to configuration DB
     * @param manufacturerId The manufacturer id to look up
     * @param manufacturerName The manufacturer name
     */
    setManufacturer(manufacturerId: number, manufacturerName: string): void;
    loadIndicators(): Promise<void>;
    /**
     * Looks up the label for a given indicator id
     */
    lookupIndicator(indicatorId: number): string | undefined;
    /**
     * Looks up the property definition for a given indicator property id
     */
    lookupProperty(propertyId: number): IndicatorProperty | undefined;
    loadNamedScales(): Promise<void>;
    /**
     * Looks up all scales defined under a given name
     */
    lookupNamedScaleGroup(name: string): ScaleGroup | undefined;
    /** Looks up a scale definition for a given scale type */
    lookupNamedScale(name: string, scale: number): Scale;
    loadSensorTypes(): Promise<void>;
    /**
     * Looks up the configuration for a given sensor type
     */
    lookupSensorType(sensorType: number): SensorType | undefined;
    /** Looks up a scale definition for a given sensor type */
    lookupSensorScale(sensorType: number, scale: number): Scale;
    getSensorTypeName(sensorType: number): string;
    loadMeters(): Promise<void>;
    /**
     * Looks up the notification configuration for a given notification type
     */
    lookupMeter(meterType: number): Meter | undefined;
    getMeterName(meterType: number): string;
    /** Looks up a scale definition for a given meter type */
    lookupMeterScale(type: number, scale: number): MeterScale;
    loadDeviceClasses(): Promise<void>;
    lookupBasicDeviceClass(basic: number): BasicDeviceClass;
    lookupGenericDeviceClass(generic: number): GenericDeviceClass;
    lookupSpecificDeviceClass(generic: number, specific: number): SpecificDeviceClass;
    loadDeviceIndex(): Promise<void>;
    getIndex(): DeviceConfigIndex | undefined;
    loadFulltextDeviceIndex(): Promise<void>;
    getFulltextIndex(): FulltextDeviceConfigIndex | undefined;
    /**
     * Looks up the definition of a given device in the configuration DB, but does not evaluate conditional settings.
     * @param manufacturerId The manufacturer id of the device
     * @param productType The product type of the device
     * @param productId The product id of the device
     * @param firmwareVersion If known, configuration for a specific firmware version can be loaded.
     * If this is `undefined` or not given, the first matching file with a defined firmware range will be returned.
     */
    lookupDevicePreserveConditions(manufacturerId: number, productType: number, productId: number, firmwareVersion?: string): Promise<ConditionalDeviceConfig | undefined>;
    /**
     * Looks up the definition of a given device in the configuration DB
     * @param manufacturerId The manufacturer id of the device
     * @param productType The product type of the device
     * @param productId The product id of the device
     * @param firmwareVersion If known, configuration for a specific firmware version can be loaded.
     * If this is `undefined` or not given, the first matching file with a defined firmware range will be returned.
     */
    lookupDevice(manufacturerId: number, productType: number, productId: number, firmwareVersion?: string): Promise<DeviceConfig | undefined>;
    loadNotifications(): Promise<void>;
    /**
     * Looks up the notification configuration for a given notification type
     */
    lookupNotification(notificationType: number): Notification | undefined;
    /**
     * Looks up the notification configuration for a given notification type.
     * If the config has not been loaded yet, this returns undefined.
     */
    private lookupNotificationUnsafe;
    getNotificationName(notificationType: number): string;
}
//# sourceMappingURL=ConfigManager.d.ts.map