"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadSensorTypesInternal = exports.loadNamedScalesInternal = exports.loadNotificationsInternal = exports.loadMetersInternal = exports.loadIndicatorsInternal = exports.loadDeviceClassesInternal = exports.ConfigManager = void 0;
const core_1 = require("@zwave-js/core");
const shared_1 = require("@zwave-js/shared");
const typeguards_1 = require("alcalzone-shared/typeguards");
const fs_extra_1 = require("fs-extra");
const json5_1 = __importDefault(require("json5"));
const path_1 = __importDefault(require("path"));
const DeviceClasses_1 = require("./DeviceClasses");
const DeviceConfig_1 = require("./devices/DeviceConfig");
const Indicators_1 = require("./Indicators");
const Logger_1 = require("./Logger");
const Manufacturers_1 = require("./Manufacturers");
const Meters_1 = require("./Meters");
const Notifications_1 = require("./Notifications");
const Scales_1 = require("./Scales");
const SensorTypes_1 = require("./SensorTypes");
const utils_1 = require("./utils");
const utils_safe_1 = require("./utils_safe");
class ConfigManager {
    constructor(options = {}) {
        this._useExternalConfig = false;
        this.logger = new Logger_1.ConfigLogger(options.logContainer ?? new core_1.ZWaveLogContainer({ enabled: false }));
        this.deviceConfigPriorityDir = options.deviceConfigPriorityDir;
        this._configVersion =
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            require("@zwave-js/config/package.json").version;
    }
    get configVersion() {
        return this._configVersion;
    }
    get indicators() {
        if (!this._indicators) {
            throw new core_1.ZWaveError("The config has not been loaded yet!", core_1.ZWaveErrorCodes.Driver_NotReady);
        }
        return this._indicators;
    }
    get indicatorProperties() {
        if (!this._indicatorProperties) {
            throw new core_1.ZWaveError("The config has not been loaded yet!", core_1.ZWaveErrorCodes.Driver_NotReady);
        }
        return this._indicatorProperties;
    }
    get manufacturers() {
        if (!this._manufacturers) {
            throw new core_1.ZWaveError("The config has not been loaded yet!", core_1.ZWaveErrorCodes.Driver_NotReady);
        }
        return this._manufacturers;
    }
    get namedScales() {
        if (!this._namedScales) {
            throw new core_1.ZWaveError("The config has not been loaded yet!", core_1.ZWaveErrorCodes.Driver_NotReady);
        }
        return this._namedScales;
    }
    get sensorTypes() {
        if (!this._sensorTypes) {
            throw new core_1.ZWaveError("The config has not been loaded yet!", core_1.ZWaveErrorCodes.Driver_NotReady);
        }
        return this._sensorTypes;
    }
    get meters() {
        if (!this._meters) {
            throw new core_1.ZWaveError("The config has not been loaded yet!", core_1.ZWaveErrorCodes.Driver_NotReady);
        }
        return this._meters;
    }
    get basicDeviceClasses() {
        if (!this._basicDeviceClasses) {
            throw new core_1.ZWaveError("The config has not been loaded yet!", core_1.ZWaveErrorCodes.Driver_NotReady);
        }
        return this._basicDeviceClasses;
    }
    get genericDeviceClasses() {
        if (!this._genericDeviceClasses) {
            throw new core_1.ZWaveError("The config has not been loaded yet!", core_1.ZWaveErrorCodes.Driver_NotReady);
        }
        return this._genericDeviceClasses;
    }
    get notifications() {
        if (!this._notifications) {
            throw new core_1.ZWaveError("The config has not been loaded yet!", core_1.ZWaveErrorCodes.Driver_NotReady);
        }
        return this._notifications;
    }
    get useExternalConfig() {
        return this._useExternalConfig;
    }
    async loadAll() {
        // If the environment option for an external config dir is set
        // try to sync it and then use it
        const syncResult = await (0, utils_1.syncExternalConfigDir)(this.logger);
        if (syncResult.success) {
            this._useExternalConfig = true;
            this.logger.print(`Using external configuration dir ${(0, utils_1.externalConfigDir)()}`);
            this._configVersion = syncResult.version;
        }
        else {
            this._useExternalConfig = false;
            this._configVersion = await (0, utils_1.getEmbeddedConfigVersion)();
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
    async loadManufacturers() {
        try {
            this._manufacturers = await (0, Manufacturers_1.loadManufacturersInternal)(this._useExternalConfig);
        }
        catch (e) {
            // If the config file is missing or invalid, don't try to find it again
            if ((0, core_1.isZWaveError)(e) && e.code === core_1.ZWaveErrorCodes.Config_Invalid) {
                if (process.env.NODE_ENV !== "test") {
                    this.logger.print(`Could not load manufacturers config: ${e.message}`, "error");
                }
                if (!this._manufacturers)
                    this._manufacturers = new Map();
            }
            else {
                // This is an unexpected error
                throw e;
            }
        }
    }
    async saveManufacturers() {
        if (!this._manufacturers) {
            throw new core_1.ZWaveError("The config has not been loaded yet!", core_1.ZWaveErrorCodes.Driver_NotReady);
        }
        await (0, Manufacturers_1.saveManufacturersInternal)(this._manufacturers);
    }
    /**
     * Looks up the name of the manufacturer with the given ID in the configuration DB
     * @param manufacturerId The manufacturer id to look up
     */
    lookupManufacturer(manufacturerId) {
        if (!this._manufacturers) {
            throw new core_1.ZWaveError("The config has not been loaded yet!", core_1.ZWaveErrorCodes.Driver_NotReady);
        }
        return this._manufacturers.get(manufacturerId);
    }
    /**
     * Add new manufacturers to configuration DB
     * @param manufacturerId The manufacturer id to look up
     * @param manufacturerName The manufacturer name
     */
    setManufacturer(manufacturerId, manufacturerName) {
        if (!this._manufacturers) {
            throw new core_1.ZWaveError("The config has not been loaded yet!", core_1.ZWaveErrorCodes.Driver_NotReady);
        }
        this._manufacturers.set(manufacturerId, manufacturerName);
    }
    async loadIndicators() {
        try {
            const config = await loadIndicatorsInternal(this._useExternalConfig);
            this._indicators = config.indicators;
            this._indicatorProperties = config.properties;
        }
        catch (e) {
            // If the config file is missing or invalid, don't try to find it again
            if ((0, core_1.isZWaveError)(e) && e.code === core_1.ZWaveErrorCodes.Config_Invalid) {
                if (process.env.NODE_ENV !== "test") {
                    this.logger.print(`Could not load indicators config: ${e.message}`, "error");
                }
                if (!this._indicators)
                    this._indicators = new Map();
                if (!this._indicatorProperties)
                    this._indicatorProperties = new Map();
            }
            else {
                // This is an unexpected error
                throw e;
            }
        }
    }
    /**
     * Looks up the label for a given indicator id
     */
    lookupIndicator(indicatorId) {
        if (!this._indicators) {
            throw new core_1.ZWaveError("The config has not been loaded yet!", core_1.ZWaveErrorCodes.Driver_NotReady);
        }
        return this._indicators.get(indicatorId);
    }
    /**
     * Looks up the property definition for a given indicator property id
     */
    lookupProperty(propertyId) {
        if (!this._indicatorProperties) {
            throw new core_1.ZWaveError("The config has not been loaded yet!", core_1.ZWaveErrorCodes.Driver_NotReady);
        }
        return this._indicatorProperties.get(propertyId);
    }
    async loadNamedScales() {
        try {
            this._namedScales = await loadNamedScalesInternal(this._useExternalConfig);
        }
        catch (e) {
            // If the config file is missing or invalid, don't try to find it again
            if ((0, core_1.isZWaveError)(e) && e.code === core_1.ZWaveErrorCodes.Config_Invalid) {
                if (process.env.NODE_ENV !== "test") {
                    this.logger.print(`Could not load scales config: ${e.message}`, "error");
                }
                if (!this._namedScales)
                    this._namedScales = new Map();
            }
            else {
                // This is an unexpected error
                throw e;
            }
        }
    }
    /**
     * Looks up all scales defined under a given name
     */
    lookupNamedScaleGroup(name) {
        if (!this._namedScales) {
            throw new core_1.ZWaveError("The config has not been loaded yet!", core_1.ZWaveErrorCodes.Driver_NotReady);
        }
        return this._namedScales.get(name);
    }
    /** Looks up a scale definition for a given scale type */
    lookupNamedScale(name, scale) {
        const group = this.lookupNamedScaleGroup(name);
        return group?.get(scale) ?? (0, Scales_1.getDefaultScale)(scale);
    }
    async loadSensorTypes() {
        try {
            this._sensorTypes = await loadSensorTypesInternal(this, this._useExternalConfig);
        }
        catch (e) {
            // If the config file is missing or invalid, don't try to find it again
            if ((0, core_1.isZWaveError)(e) && e.code === core_1.ZWaveErrorCodes.Config_Invalid) {
                if (process.env.NODE_ENV !== "test") {
                    this.logger.print(`Could not load sensor types config: ${e.message}`, "error");
                }
                if (!this._sensorTypes)
                    this._sensorTypes = new Map();
            }
            else {
                // This is an unexpected error
                throw e;
            }
        }
    }
    /**
     * Looks up the configuration for a given sensor type
     */
    lookupSensorType(sensorType) {
        if (!this._sensorTypes) {
            throw new core_1.ZWaveError("The config has not been loaded yet!", core_1.ZWaveErrorCodes.Driver_NotReady);
        }
        return this._sensorTypes.get(sensorType);
    }
    /** Looks up a scale definition for a given sensor type */
    lookupSensorScale(sensorType, scale) {
        const sensor = this.lookupSensorType(sensorType);
        return sensor?.scales.get(scale) ?? (0, Scales_1.getDefaultScale)(scale);
    }
    getSensorTypeName(sensorType) {
        const sensor = this.lookupSensorType(sensorType);
        if (sensor)
            return sensor.label;
        return `UNKNOWN (${(0, shared_1.num2hex)(sensorType)})`;
    }
    async loadMeters() {
        try {
            this._meters = await loadMetersInternal(this._useExternalConfig);
        }
        catch (e) {
            // If the config file is missing or invalid, don't try to find it again
            if ((0, core_1.isZWaveError)(e) && e.code === core_1.ZWaveErrorCodes.Config_Invalid) {
                if (process.env.NODE_ENV !== "test") {
                    this.logger.print(`Could not meters config: ${e.message}`, "error");
                }
                if (!this._meters)
                    this._meters = new Map();
            }
            else {
                // This is an unexpected error
                throw e;
            }
        }
    }
    /**
     * Looks up the notification configuration for a given notification type
     */
    lookupMeter(meterType) {
        if (!this._meters) {
            throw new core_1.ZWaveError("The config has not been loaded yet!", core_1.ZWaveErrorCodes.Driver_NotReady);
        }
        return this._meters.get(meterType);
    }
    getMeterName(meterType) {
        const meter = this.lookupMeter(meterType);
        return meter?.name ?? `UNKNOWN (${(0, shared_1.num2hex)(meterType)})`;
    }
    /** Looks up a scale definition for a given meter type */
    lookupMeterScale(type, scale) {
        const meter = this.lookupMeter(type);
        return meter?.scales.get(scale) ?? (0, Meters_1.getDefaultMeterScale)(scale);
    }
    async loadDeviceClasses() {
        try {
            const config = await loadDeviceClassesInternal(this._useExternalConfig);
            this._basicDeviceClasses = config.basicDeviceClasses;
            this._genericDeviceClasses = config.genericDeviceClasses;
        }
        catch (e) {
            // If the config file is missing or invalid, don't try to find it again
            if ((0, core_1.isZWaveError)(e) && e.code === core_1.ZWaveErrorCodes.Config_Invalid) {
                if (process.env.NODE_ENV !== "test") {
                    this.logger.print(`Could not load scales config: ${e.message}`, "error");
                }
                if (!this._basicDeviceClasses)
                    this._basicDeviceClasses = new Map();
                if (!this._genericDeviceClasses)
                    this._genericDeviceClasses = new Map();
            }
            else {
                // This is an unexpected error
                throw e;
            }
        }
    }
    lookupBasicDeviceClass(basic) {
        if (!this._basicDeviceClasses) {
            throw new core_1.ZWaveError("The config has not been loaded yet!", core_1.ZWaveErrorCodes.Driver_NotReady);
        }
        return {
            key: basic,
            label: this._basicDeviceClasses.get(basic) ??
                `UNKNOWN (${(0, shared_1.num2hex)(basic)})`,
        };
    }
    lookupGenericDeviceClass(generic) {
        if (!this._genericDeviceClasses) {
            throw new core_1.ZWaveError("The config has not been loaded yet!", core_1.ZWaveErrorCodes.Driver_NotReady);
        }
        return (this._genericDeviceClasses.get(generic) ??
            (0, DeviceClasses_1.getDefaultGenericDeviceClass)(generic));
    }
    lookupSpecificDeviceClass(generic, specific) {
        const genericClass = this.lookupGenericDeviceClass(generic);
        return (genericClass.specific.get(specific) ??
            (0, DeviceClasses_1.getDefaultSpecificDeviceClass)(genericClass, specific));
    }
    async loadDeviceIndex() {
        try {
            // The index of config files included in this package
            const embeddedIndex = await (0, DeviceConfig_1.loadDeviceIndexInternal)(this.logger, this._useExternalConfig);
            // A dynamic index of the user-defined priority device config files
            const priorityIndex = [];
            if (this.deviceConfigPriorityDir) {
                if (await (0, fs_extra_1.pathExists)(this.deviceConfigPriorityDir)) {
                    priorityIndex.push(...(await (0, DeviceConfig_1.generatePriorityDeviceIndex)(this.deviceConfigPriorityDir, this.logger)));
                }
                else {
                    this.logger.print(`Priority device configuration directory ${this.deviceConfigPriorityDir} not found`, "warn");
                }
            }
            // Put the priority index in front, so the files get resolved first
            this.index = [...priorityIndex, ...embeddedIndex];
        }
        catch (e) {
            // If the index file is missing or invalid, don't try to find it again
            if ((!(0, core_1.isZWaveError)(e) && e instanceof Error) ||
                ((0, core_1.isZWaveError)(e) && e.code === core_1.ZWaveErrorCodes.Config_Invalid)) {
                // Fall back to no index on production systems
                if (!this.index)
                    this.index = [];
                if (process.env.NODE_ENV !== "test") {
                    this.logger.print(`Could not load or regenerate device config index: ${e.message}`, "error");
                    // and don't throw
                    return;
                }
                // But fail hard in tests
                throw e;
            }
        }
    }
    getIndex() {
        return this.index;
    }
    async loadFulltextDeviceIndex() {
        this.fulltextIndex = await (0, DeviceConfig_1.loadFulltextDeviceIndexInternal)(this.logger);
    }
    getFulltextIndex() {
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
    async lookupDevicePreserveConditions(manufacturerId, productType, productId, firmwareVersion) {
        // Load/regenerate the index if necessary
        if (!this.index)
            await this.loadDeviceIndex();
        // Look up the device in the index
        const indexEntry = this.index.find((0, utils_1.getDeviceEntryPredicate)(manufacturerId, productType, productId, firmwareVersion));
        if (indexEntry) {
            const devicesDir = (0, DeviceConfig_1.getDevicesPaths)(this._useExternalConfig ? (0, utils_1.externalConfigDir)() : utils_1.configDir).devicesDir;
            const filePath = path_1.default.isAbsolute(indexEntry.filename)
                ? indexEntry.filename
                : path_1.default.join(devicesDir, indexEntry.filename);
            if (!(await (0, fs_extra_1.pathExists)(filePath)))
                return;
            // A config file is treated as am embedded one when it is located under the devices root dir
            // or the external config dir
            const isEmbedded = !path_1.default
                .relative(devicesDir, filePath)
                .startsWith("..");
            try {
                return await DeviceConfig_1.ConditionalDeviceConfig.from(filePath, isEmbedded, {
                    // When looking for device files, fall back to the embedded config dir
                    rootDir: indexEntry.rootDir ?? devicesDir,
                });
            }
            catch (e) {
                if (process.env.NODE_ENV !== "test") {
                    this.logger.print(`Error loading device config ${filePath}: ${(0, shared_1.getErrorMessage)(e, true)}`, "error");
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
    async lookupDevice(manufacturerId, productType, productId, firmwareVersion) {
        const ret = await this.lookupDevicePreserveConditions(manufacturerId, productType, productId, firmwareVersion);
        return ret?.evaluate({
            manufacturerId,
            productType,
            productId,
            firmwareVersion,
        });
    }
    async loadNotifications() {
        try {
            this._notifications = await loadNotificationsInternal(this._useExternalConfig);
        }
        catch (e) {
            // If the config file is missing or invalid, don't try to find it again
            if ((0, core_1.isZWaveError)(e) && e.code === core_1.ZWaveErrorCodes.Config_Invalid) {
                if (process.env.NODE_ENV !== "test") {
                    this.logger.print(`Could not load notifications config: ${e.message}`, "error");
                }
                this._notifications = new Map();
            }
            else {
                // This is an unexpected error
                throw e;
            }
        }
    }
    /**
     * Looks up the notification configuration for a given notification type
     */
    lookupNotification(notificationType) {
        if (!this._notifications) {
            throw new core_1.ZWaveError("The config has not been loaded yet!", core_1.ZWaveErrorCodes.Driver_NotReady);
        }
        return this._notifications.get(notificationType);
    }
    /**
     * Looks up the notification configuration for a given notification type.
     * If the config has not been loaded yet, this returns undefined.
     */
    lookupNotificationUnsafe(notificationType) {
        return this._notifications?.get(notificationType);
    }
    getNotificationName(notificationType) {
        return (this.lookupNotificationUnsafe(notificationType)?.name ??
            `Unknown (${(0, shared_1.num2hex)(notificationType)})`);
    }
}
exports.ConfigManager = ConfigManager;
/** @internal */
async function loadDeviceClassesInternal(externalConfig) {
    const configPath = path_1.default.join((externalConfig && (0, utils_1.externalConfigDir)()) || utils_1.configDir, "deviceClasses.json");
    if (!(await (0, fs_extra_1.pathExists)(configPath))) {
        throw new core_1.ZWaveError("The device classes config file does not exist!", core_1.ZWaveErrorCodes.Config_Invalid);
    }
    try {
        const fileContents = await (0, fs_extra_1.readFile)(configPath, "utf8");
        const definition = json5_1.default.parse(fileContents);
        if (!(0, typeguards_1.isObject)(definition)) {
            (0, utils_safe_1.throwInvalidConfig)("device classes", `the dictionary is not an object`);
        }
        if (!(0, typeguards_1.isObject)(definition.basic)) {
            (0, utils_safe_1.throwInvalidConfig)("device classes", `The "basic" property is not an object`);
        }
        if (!(0, typeguards_1.isObject)(definition.generic)) {
            (0, utils_safe_1.throwInvalidConfig)("device classes", `The "generic" property is not an object`);
        }
        const basicDeviceClasses = new Map();
        for (const [key, basicClass] of Object.entries(definition.basic)) {
            if (!utils_safe_1.hexKeyRegexNDigits.test(key)) {
                (0, utils_safe_1.throwInvalidConfig)("device classes", `found invalid key "${key}" in the basic device class definition. Device classes must have lowercase hexadecimal IDs.`);
            }
            if (typeof basicClass !== "string") {
                (0, utils_safe_1.throwInvalidConfig)("device classes", `basic device class "${key}" must be a string`);
            }
            const keyNum = parseInt(key.slice(2), 16);
            basicDeviceClasses.set(keyNum, basicClass);
        }
        const genericDeviceClasses = new Map();
        for (const [key, genericDefinition] of Object.entries(definition.generic)) {
            if (!utils_safe_1.hexKeyRegexNDigits.test(key)) {
                (0, utils_safe_1.throwInvalidConfig)("device classes", `found invalid key "${key}" in the generic device class definition. Device classes must have lowercase hexadecimal IDs.`);
            }
            const keyNum = parseInt(key.slice(2), 16);
            genericDeviceClasses.set(keyNum, new DeviceClasses_1.GenericDeviceClass(keyNum, genericDefinition));
        }
        return { basicDeviceClasses, genericDeviceClasses };
    }
    catch (e) {
        if ((0, core_1.isZWaveError)(e)) {
            throw e;
        }
        else {
            (0, utils_safe_1.throwInvalidConfig)("device classes");
        }
    }
}
exports.loadDeviceClassesInternal = loadDeviceClassesInternal;
/** @internal */
async function loadIndicatorsInternal(externalConfig) {
    const indicatorsConfigPath = path_1.default.join((externalConfig && (0, utils_1.externalConfigDir)()) || utils_1.configDir, "indicators.json");
    if (!(await (0, fs_extra_1.pathExists)(indicatorsConfigPath))) {
        throw new core_1.ZWaveError("The config file does not exist!", core_1.ZWaveErrorCodes.Config_Invalid);
    }
    try {
        const fileContents = await (0, fs_extra_1.readFile)(indicatorsConfigPath, "utf8");
        const definition = json5_1.default.parse(fileContents);
        if (!(0, typeguards_1.isObject)(definition)) {
            (0, utils_safe_1.throwInvalidConfig)("indicators", "the database is not an object");
        }
        if (!("indicators" in definition)) {
            (0, utils_safe_1.throwInvalidConfig)("indicators", `the required key "indicators" is missing`);
        }
        if (!("properties" in definition)) {
            (0, utils_safe_1.throwInvalidConfig)("indicators", `the required key "properties" is missing`);
        }
        const indicators = new Map();
        for (const [id, label] of Object.entries(definition.indicators)) {
            if (!utils_safe_1.hexKeyRegexNDigits.test(id)) {
                (0, utils_safe_1.throwInvalidConfig)("indicators", `found invalid key "${id}" in "indicators". Indicators must have lowercase hexadecimal IDs.`);
            }
            if (typeof label !== "string") {
                (0, utils_safe_1.throwInvalidConfig)("indicators", `indicator "${id}" must be a string`);
            }
            const idNum = parseInt(id.slice(2), 16);
            indicators.set(idNum, label);
        }
        const properties = new Map();
        for (const [id, propDefinition] of Object.entries(definition.properties)) {
            if (!utils_safe_1.hexKeyRegexNDigits.test(id)) {
                (0, utils_safe_1.throwInvalidConfig)("indicators", `found invalid key "${id}" in "properties". Indicator properties must have lowercase hexadecimal IDs.`);
            }
            const idNum = parseInt(id.slice(2), 16);
            properties.set(idNum, new Indicators_1.IndicatorProperty(idNum, propDefinition));
        }
        return { indicators, properties };
    }
    catch (e) {
        if ((0, core_1.isZWaveError)(e)) {
            throw e;
        }
        else {
            (0, utils_safe_1.throwInvalidConfig)("indicators");
        }
    }
}
exports.loadIndicatorsInternal = loadIndicatorsInternal;
/** @internal */
async function loadMetersInternal(externalConfig) {
    const configPath = path_1.default.join((externalConfig && (0, utils_1.externalConfigDir)()) || utils_1.configDir, "meters.json");
    if (!(await (0, fs_extra_1.pathExists)(configPath))) {
        throw new core_1.ZWaveError("The config file does not exist!", core_1.ZWaveErrorCodes.Config_Invalid);
    }
    try {
        const fileContents = await (0, fs_extra_1.readFile)(configPath, "utf8");
        const definition = json5_1.default.parse(fileContents);
        if (!(0, typeguards_1.isObject)(definition)) {
            (0, utils_safe_1.throwInvalidConfig)("meters", "the database is not an object");
        }
        const meters = new Map();
        for (const [id, meterDefinition] of Object.entries(definition)) {
            if (!utils_safe_1.hexKeyRegexNDigits.test(id)) {
                (0, utils_safe_1.throwInvalidConfig)("meters", `found invalid key "${id}" at the root. Meters must have lowercase hexadecimal IDs.`);
            }
            const idNum = parseInt(id.slice(2), 16);
            meters.set(idNum, new Meters_1.Meter(idNum, meterDefinition));
        }
        return meters;
    }
    catch (e) {
        if ((0, core_1.isZWaveError)(e)) {
            throw e;
        }
        else {
            (0, utils_safe_1.throwInvalidConfig)("meters");
        }
    }
}
exports.loadMetersInternal = loadMetersInternal;
/** @internal */
async function loadNotificationsInternal(externalConfig) {
    const configPath = path_1.default.join((externalConfig && (0, utils_1.externalConfigDir)()) || utils_1.configDir, "notifications.json");
    if (!(await (0, fs_extra_1.pathExists)(configPath))) {
        throw new core_1.ZWaveError("The config file does not exist!", core_1.ZWaveErrorCodes.Config_Invalid);
    }
    try {
        const fileContents = await (0, fs_extra_1.readFile)(configPath, "utf8");
        const definition = json5_1.default.parse(fileContents);
        if (!(0, typeguards_1.isObject)(definition)) {
            (0, utils_safe_1.throwInvalidConfig)("notifications", "the database is not an object");
        }
        const notifications = new Map();
        for (const [id, ntfcnDefinition] of Object.entries(definition)) {
            if (!utils_safe_1.hexKeyRegexNDigits.test(id)) {
                (0, utils_safe_1.throwInvalidConfig)("notifications", `found invalid key "${id}" at the root. Notifications must have lowercase hexadecimal IDs.`);
            }
            const idNum = parseInt(id.slice(2), 16);
            notifications.set(idNum, new Notifications_1.Notification(idNum, ntfcnDefinition));
        }
        return notifications;
    }
    catch (e) {
        if ((0, core_1.isZWaveError)(e)) {
            throw e;
        }
        else {
            (0, utils_safe_1.throwInvalidConfig)("notifications");
        }
    }
}
exports.loadNotificationsInternal = loadNotificationsInternal;
/** @internal */
async function loadNamedScalesInternal(externalConfig) {
    const configPath = path_1.default.join((externalConfig && (0, utils_1.externalConfigDir)()) || utils_1.configDir, "scales.json");
    if (!(await (0, fs_extra_1.pathExists)(configPath))) {
        throw new core_1.ZWaveError("The named scales config file does not exist!", core_1.ZWaveErrorCodes.Config_Invalid);
    }
    try {
        const fileContents = await (0, fs_extra_1.readFile)(configPath, "utf8");
        const definition = json5_1.default.parse(fileContents);
        if (!(0, typeguards_1.isObject)(definition)) {
            (0, utils_safe_1.throwInvalidConfig)("named scales", `the dictionary is not an object`);
        }
        const namedScales = new Map();
        for (const [name, scales] of Object.entries(definition)) {
            if (!/[\w\d]+/.test(name)) {
                (0, utils_safe_1.throwInvalidConfig)("named scales", `Name ${name} contains other characters than letters and numbers`);
            }
            const named = new Map();
            named.name = name;
            for (const [key, scaleDefinition] of Object.entries(scales)) {
                if (!utils_safe_1.hexKeyRegexNDigits.test(key)) {
                    (0, utils_safe_1.throwInvalidConfig)("named scales", `found invalid key "${key}" in the definition for "${name}". Scales must have lowercase hexadecimal IDs.`);
                }
                const keyNum = parseInt(key.slice(2), 16);
                named.set(keyNum, new Scales_1.Scale(keyNum, scaleDefinition));
            }
            namedScales.set(name, named);
        }
        return namedScales;
    }
    catch (e) {
        if ((0, core_1.isZWaveError)(e)) {
            throw e;
        }
        else {
            (0, utils_safe_1.throwInvalidConfig)("named scales");
        }
    }
}
exports.loadNamedScalesInternal = loadNamedScalesInternal;
/** @internal */
async function loadSensorTypesInternal(manager, externalConfig) {
    const configPath = path_1.default.join((externalConfig && (0, utils_1.externalConfigDir)()) || utils_1.configDir, "sensorTypes.json");
    if (!(await (0, fs_extra_1.pathExists)(configPath))) {
        throw new core_1.ZWaveError("The sensor types config file does not exist!", core_1.ZWaveErrorCodes.Config_Invalid);
    }
    try {
        const fileContents = await (0, fs_extra_1.readFile)(configPath, "utf8");
        const definition = json5_1.default.parse(fileContents);
        if (!(0, typeguards_1.isObject)(definition)) {
            (0, utils_safe_1.throwInvalidConfig)("sensor types", `the dictionary is not an object`);
        }
        const sensorTypes = new Map();
        for (const [key, sensorDefinition] of Object.entries(definition)) {
            if (!utils_safe_1.hexKeyRegexNDigits.test(key)) {
                (0, utils_safe_1.throwInvalidConfig)("sensor types", `found invalid key "${key}" at the root. Sensor types must have lowercase hexadecimal IDs.`);
            }
            const keyNum = parseInt(key.slice(2), 16);
            sensorTypes.set(keyNum, new SensorTypes_1.SensorType(manager, keyNum, sensorDefinition));
        }
        return sensorTypes;
    }
    catch (e) {
        if ((0, core_1.isZWaveError)(e)) {
            throw e;
        }
        else {
            (0, utils_safe_1.throwInvalidConfig)("sensor types");
        }
    }
}
exports.loadSensorTypesInternal = loadSensorTypesInternal;
//# sourceMappingURL=ConfigManager.js.map