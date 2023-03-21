"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CompatMapAlarm = exports.CompatAddCC = exports.ConditionalCompatConfig = void 0;
const safe_1 = require("@zwave-js/shared/safe");
const typeguards_1 = require("alcalzone-shared/typeguards");
const utils_safe_1 = require("../utils_safe");
const ConditionalItem_1 = require("./ConditionalItem");
class ConditionalCompatConfig {
    constructor(filename, definition) {
        this.valueIdRegex = /^\$value\$\[.+\]$/;
        this.condition = definition.$if;
        if (definition.queryOnWakeup != undefined) {
            if (!(0, typeguards_1.isArray)(definition.queryOnWakeup) ||
                !definition.queryOnWakeup.every((cmd) => (0, typeguards_1.isArray)(cmd) &&
                    cmd.length >= 2 &&
                    typeof cmd[0] === "string" &&
                    typeof cmd[1] === "string" &&
                    cmd
                        .slice(2)
                        .every((arg) => typeof arg === "string" ||
                        typeof arg === "number" ||
                        typeof arg === "boolean"))) {
                (0, utils_safe_1.throwInvalidConfig)("devices", `config/devices/${filename}:
error in compat option queryOnWakeup`);
            }
            // Parse "smart" values into partial Value IDs
            this.queryOnWakeup = definition.queryOnWakeup.map((cmd) => cmd.map((arg) => {
                if (typeof arg === "string" &&
                    this.valueIdRegex.test(arg)) {
                    const tuple = JSON.parse(arg.substr("$value$".length));
                    return {
                        property: tuple[0],
                        propertyKey: tuple[1],
                    };
                }
                return arg;
            }));
        }
        if (definition.disableBasicMapping != undefined) {
            if (definition.disableBasicMapping !== true) {
                (0, utils_safe_1.throwInvalidConfig)("devices", `config/devices/${filename}:
error in compat option disableBasicMapping`);
            }
            this.disableBasicMapping = definition.disableBasicMapping;
        }
        if (definition.disableStrictEntryControlDataValidation != undefined) {
            if (definition.disableStrictEntryControlDataValidation !== true) {
                (0, utils_safe_1.throwInvalidConfig)("devices", `config/devices/${filename}:
error in compat option disableStrictEntryControlDataValidation`);
            }
            this.disableStrictEntryControlDataValidation =
                definition.disableStrictEntryControlDataValidation;
        }
        if (definition.disableStrictMeasurementValidation != undefined) {
            if (definition.disableStrictMeasurementValidation !== true) {
                (0, utils_safe_1.throwInvalidConfig)("devices", `config/devices/${filename}:
error in compat option disableStrictMeasurementValidation`);
            }
            this.disableStrictMeasurementValidation =
                definition.disableStrictMeasurementValidation;
        }
        if (definition.enableBasicSetMapping != undefined) {
            if (definition.enableBasicSetMapping !== true) {
                (0, utils_safe_1.throwInvalidConfig)("devices", `config/devices/${filename}:
error in compat option enableBasicSetMapping`);
            }
            this.enableBasicSetMapping = definition.enableBasicSetMapping;
        }
        if (definition.forceNotificationIdleReset != undefined) {
            if (definition.forceNotificationIdleReset !== true) {
                (0, utils_safe_1.throwInvalidConfig)("devices", `config/devices/${filename}:
error in compat option forceNotificationIdleReset`);
            }
            this.forceNotificationIdleReset =
                definition.forceNotificationIdleReset;
        }
        if (definition.forceSceneControllerGroupCount != undefined) {
            if (typeof definition.forceSceneControllerGroupCount !== "number") {
                (0, utils_safe_1.throwInvalidConfig)("devices", `config/devices/${filename}:
compat option forceSceneControllerGroupCount must be a number!`);
            }
            if (definition.forceSceneControllerGroupCount < 0 ||
                definition.forceSceneControllerGroupCount > 255) {
                (0, utils_safe_1.throwInvalidConfig)("devices", `config/devices/${filename}:
compat option forceSceneControllerGroupCount must be between 0 and 255!`);
            }
            this.forceSceneControllerGroupCount =
                definition.forceSceneControllerGroupCount;
        }
        if (definition.preserveRootApplicationCCValueIDs != undefined) {
            if (definition.preserveRootApplicationCCValueIDs !== true) {
                (0, utils_safe_1.throwInvalidConfig)("devices", `config/devices/${filename}:
error in compat option preserveRootApplicationCCValueIDs`);
            }
            this.preserveRootApplicationCCValueIDs =
                definition.preserveRootApplicationCCValueIDs;
        }
        if (definition.preserveEndpoints != undefined) {
            if (definition.preserveEndpoints !== "*" &&
                !((0, typeguards_1.isArray)(definition.preserveEndpoints) &&
                    definition.preserveEndpoints.every((d) => typeof d === "number" && d % 1 === 0 && d > 0))) {
                (0, utils_safe_1.throwInvalidConfig)("devices", `config/devices/${filename}:
compat option preserveEndpoints must be "*" or an array of positive integers`);
            }
            this.preserveEndpoints = definition.preserveEndpoints;
        }
        if (definition.removeEndpoints != undefined) {
            if (definition.removeEndpoints !== "*" &&
                !((0, typeguards_1.isArray)(definition.removeEndpoints) &&
                    definition.removeEndpoints.every((d) => typeof d === "number" && d % 1 === 0 && d > 0))) {
                (0, utils_safe_1.throwInvalidConfig)("devices", `config/devices/${filename}:
compat option removeEndpoints must be "*" or an array of positive integers`);
            }
            this.removeEndpoints = definition.removeEndpoints;
        }
        if (definition.skipConfigurationNameQuery != undefined) {
            if (definition.skipConfigurationNameQuery !== true) {
                (0, utils_safe_1.throwInvalidConfig)("devices", `config/devices/${filename}:
error in compat option skipConfigurationNameQuery`);
            }
            this.skipConfigurationNameQuery =
                definition.skipConfigurationNameQuery;
        }
        if (definition.skipConfigurationInfoQuery != undefined) {
            if (definition.skipConfigurationInfoQuery !== true) {
                (0, utils_safe_1.throwInvalidConfig)("devices", `config/devices/${filename}:
error in compat option skipConfigurationInfoQuery`);
            }
            this.skipConfigurationInfoQuery =
                definition.skipConfigurationInfoQuery;
        }
        if (definition.treatBasicSetAsEvent != undefined) {
            if (definition.treatBasicSetAsEvent !== true) {
                (0, utils_safe_1.throwInvalidConfig)("devices", `config/devices/${filename}:
error in compat option treatBasicSetAsEvent`);
            }
            this.treatBasicSetAsEvent = definition.treatBasicSetAsEvent;
        }
        if (definition.treatMultilevelSwitchSetAsEvent != undefined) {
            if (definition.treatMultilevelSwitchSetAsEvent !== true) {
                (0, utils_safe_1.throwInvalidConfig)("devices", `config/devices/${filename}:
					error in compat option treatMultilevelSwitchSetAsEvent`);
            }
            this.treatMultilevelSwitchSetAsEvent =
                definition.treatMultilevelSwitchSetAsEvent;
        }
        if (definition.treatDestinationEndpointAsSource != undefined) {
            if (definition.treatDestinationEndpointAsSource !== true) {
                (0, utils_safe_1.throwInvalidConfig)("devices", `config/devices/${filename}:
error in compat option treatDestinationEndpointAsSource`);
            }
            this.treatDestinationEndpointAsSource =
                definition.treatDestinationEndpointAsSource;
        }
        if (definition.manualValueRefreshDelayMs != undefined) {
            if (typeof definition.manualValueRefreshDelayMs !== "number") {
                (0, utils_safe_1.throwInvalidConfig)("devices", `config/devices/${filename}:
compat option manualValueRefreshDelayMs must be a number!`);
            }
            if (definition.manualValueRefreshDelayMs % 1 !== 0 ||
                definition.manualValueRefreshDelayMs < 0) {
                (0, utils_safe_1.throwInvalidConfig)("devices", `config/devices/${filename}:
compat option manualValueRefreshDelayMs must be a non-negative integer!`);
            }
            this.manualValueRefreshDelayMs =
                definition.manualValueRefreshDelayMs;
        }
        if (definition.reportTimeout != undefined) {
            if (typeof definition.reportTimeout !== "number") {
                (0, utils_safe_1.throwInvalidConfig)("devices", `config/devices/${filename}:
compat option reportTimeout must be a number!`);
            }
            if (definition.reportTimeout % 1 !== 0 ||
                definition.reportTimeout < 1000 ||
                definition.reportTimeout > 10000) {
                (0, utils_safe_1.throwInvalidConfig)("devices", `config/devices/${filename}:
compat option reportTimeout must be an integer between 1000 and 10000!`);
            }
            this.reportTimeout = definition.reportTimeout;
        }
        if (definition.mapRootReportsToEndpoint != undefined) {
            if (typeof definition.mapRootReportsToEndpoint !== "number") {
                (0, utils_safe_1.throwInvalidConfig)("devices", `config/devices/${filename}:
compat option mapRootReportsToEndpoint must be a number!`);
            }
            if (definition.mapRootReportsToEndpoint % 1 !== 0 ||
                definition.mapRootReportsToEndpoint < 1) {
                (0, utils_safe_1.throwInvalidConfig)("devices", `config/devices/${filename}:
compat option mapRootReportsToEndpoint must be a positive integer!`);
            }
            this.mapRootReportsToEndpoint = definition.mapRootReportsToEndpoint;
        }
        if (definition.overrideFloatEncoding != undefined) {
            if (!(0, typeguards_1.isObject)(definition.overrideFloatEncoding)) {
                (0, utils_safe_1.throwInvalidConfig)("devices", `config/devices/${filename}:
error in compat option overrideFloatEncoding`);
            }
            this.overrideFloatEncoding = {};
            if ("precision" in definition.overrideFloatEncoding) {
                if (typeof definition.overrideFloatEncoding.precision !=
                    "number") {
                    (0, utils_safe_1.throwInvalidConfig)("devices", `config/devices/${filename}:
compat option overrideFloatEncoding.precision must be a number!`);
                }
                if (definition.overrideFloatEncoding.precision % 1 !== 0 ||
                    definition.overrideFloatEncoding.precision < 0) {
                    (0, utils_safe_1.throwInvalidConfig)("devices", `config/devices/${filename}:
compat option overrideFloatEncoding.precision must be a positive integer!`);
                }
                this.overrideFloatEncoding.precision =
                    definition.overrideFloatEncoding.precision;
            }
            if ("size" in definition.overrideFloatEncoding) {
                if (typeof definition.overrideFloatEncoding.size != "number") {
                    (0, utils_safe_1.throwInvalidConfig)("devices", `config/devices/${filename}:
compat option overrideFloatEncoding.size must be a number!`);
                }
                if (definition.overrideFloatEncoding.size % 1 !== 0 ||
                    definition.overrideFloatEncoding.size < 1 ||
                    definition.overrideFloatEncoding.size > 4) {
                    (0, utils_safe_1.throwInvalidConfig)("devices", `config/devices/${filename}:
compat option overrideFloatEncoding.size must be an integer between 1 and 4!`);
                }
                this.overrideFloatEncoding.size =
                    definition.overrideFloatEncoding.size;
            }
            if (Object.keys(this.overrideFloatEncoding).length === 0) {
                (0, utils_safe_1.throwInvalidConfig)("devices", `config/devices/${filename}:
error in compat option overrideFloatEncoding: size and/or precision must be specified!`);
            }
        }
        if (definition.commandClasses != undefined) {
            if (!(0, typeguards_1.isObject)(definition.commandClasses)) {
                (0, utils_safe_1.throwInvalidConfig)("devices", `config/devices/${filename}:
error in compat option commandClasses`);
            }
            if (definition.commandClasses.add != undefined) {
                if (!(0, typeguards_1.isObject)(definition.commandClasses.add)) {
                    (0, utils_safe_1.throwInvalidConfig)("devices", `config/devices/${filename}:
error in compat option commandClasses.add`);
                }
                else if (!Object.keys(definition.commandClasses.add).every((k) => utils_safe_1.hexKeyRegex2Digits.test(k))) {
                    (0, utils_safe_1.throwInvalidConfig)("devices", `config/devices/${filename}:
All keys in compat option commandClasses.add must be 2-digit lowercase hex numbers!`);
                }
                else if (!Object.values(definition.commandClasses.add).every((v) => (0, typeguards_1.isObject)(v))) {
                    (0, utils_safe_1.throwInvalidConfig)("devices", `config/devices/${filename}:
All values in compat option commandClasses.add must be objects`);
                }
                const addCCs = new Map();
                for (const [cc, info] of Object.entries(definition.commandClasses.add)) {
                    addCCs.set(parseInt(cc), new CompatAddCC(filename, info));
                }
                this.addCCs = addCCs;
            }
            if (definition.commandClasses.remove != undefined) {
                if (!(0, typeguards_1.isObject)(definition.commandClasses.remove)) {
                    (0, utils_safe_1.throwInvalidConfig)("devices", `config/devices/${filename}:
error in compat option commandClasses.remove`);
                }
                else if (!Object.keys(definition.commandClasses.remove).every((k) => utils_safe_1.hexKeyRegex2Digits.test(k))) {
                    (0, utils_safe_1.throwInvalidConfig)("devices", `config/devices/${filename}:
All keys in compat option commandClasses.remove must be 2-digit lowercase hex numbers!`);
                }
                const removeCCs = new Map();
                for (const [cc, info] of Object.entries(definition.commandClasses.remove)) {
                    if ((0, typeguards_1.isObject)(info) && "endpoints" in info) {
                        if (info.endpoints === "*" ||
                            ((0, typeguards_1.isArray)(info.endpoints) &&
                                info.endpoints.every((i) => typeof i === "number"))) {
                            removeCCs.set(parseInt(cc), info.endpoints);
                        }
                        else {
                            (0, utils_safe_1.throwInvalidConfig)("devices", `config/devices/${filename}:
Compat option commandClasses.remove has an invalid "endpoints" property. Only "*" and numeric arrays are allowed!`);
                        }
                    }
                    else {
                        (0, utils_safe_1.throwInvalidConfig)("devices", `config/devices/${filename}:
All values in compat option commandClasses.remove must be objects with an "endpoints" property!`);
                    }
                }
                this.removeCCs = removeCCs;
            }
        }
        if (definition.alarmMapping != undefined) {
            if (!(0, typeguards_1.isArray)(definition.alarmMapping) ||
                !definition.alarmMapping.every((m) => (0, typeguards_1.isObject)(m))) {
                (0, utils_safe_1.throwInvalidConfig)("devices", `config/devices/${filename}:
compat option alarmMapping must be an array where all items are objects!`);
            }
            this.alarmMapping = definition.alarmMapping.map((m, i) => new CompatMapAlarm(filename, m, i + 1));
        }
    }
    evaluateCondition(deviceId) {
        if (!(0, ConditionalItem_1.conditionApplies)(this, deviceId))
            return;
        return (0, safe_1.pick)(this, [
            "alarmMapping",
            "addCCs",
            "removeCCs",
            "disableBasicMapping",
            "disableStrictEntryControlDataValidation",
            "disableStrictMeasurementValidation",
            "enableBasicSetMapping",
            "forceNotificationIdleReset",
            "forceSceneControllerGroupCount",
            "manualValueRefreshDelayMs",
            "mapRootReportsToEndpoint",
            "overrideFloatEncoding",
            "reportTimeout",
            "preserveRootApplicationCCValueIDs",
            "preserveEndpoints",
            "removeEndpoints",
            "skipConfigurationNameQuery",
            "skipConfigurationInfoQuery",
            "treatBasicSetAsEvent",
            "treatMultilevelSwitchSetAsEvent",
            "treatDestinationEndpointAsSource",
            "queryOnWakeup",
        ]);
    }
}
exports.ConditionalCompatConfig = ConditionalCompatConfig;
class CompatAddCC {
    constructor(filename, definition) {
        const endpoints = new Map();
        const parseEndpointInfo = (endpoint, info) => {
            const parsed = {};
            if (info.isSupported != undefined) {
                if (typeof info.isSupported !== "boolean") {
                    (0, utils_safe_1.throwInvalidConfig)("devices", `config/devices/${filename}:
Property isSupported in compat option commandClasses.add, endpoint ${endpoint} must be a boolean!`);
                }
                else {
                    parsed.isSupported = info.isSupported;
                }
            }
            if (info.isControlled != undefined) {
                if (typeof info.isControlled !== "boolean") {
                    (0, utils_safe_1.throwInvalidConfig)("devices", `config/devices/${filename}:
Property isControlled in compat option commandClasses.add, endpoint ${endpoint} must be a boolean!`);
                }
                else {
                    parsed.isControlled = info.isControlled;
                }
            }
            if (info.secure != undefined) {
                if (typeof info.secure !== "boolean") {
                    (0, utils_safe_1.throwInvalidConfig)("devices", `config/devices/${filename}:
Property secure in compat option commandClasses.add, endpoint ${endpoint} must be a boolean!`);
                }
                else {
                    parsed.secure = info.secure;
                }
            }
            if (info.version != undefined) {
                if (typeof info.version !== "number") {
                    (0, utils_safe_1.throwInvalidConfig)("devices", `config/devices/${filename}:
Property version in compat option commandClasses.add, endpoint ${endpoint} must be a number!`);
                }
                else {
                    parsed.version = info.version;
                }
            }
            endpoints.set(endpoint, parsed);
        };
        // Parse root endpoint info if given
        if (definition.isSupported != undefined ||
            definition.isControlled != undefined ||
            definition.version != undefined ||
            definition.secure != undefined) {
            // We have info for the root endpoint
            parseEndpointInfo(0, definition);
        }
        // Parse all other endpoints
        if ((0, typeguards_1.isObject)(definition.endpoints)) {
            if (!Object.keys(definition.endpoints).every((k) => /^\d+$/.test(k))) {
                (0, utils_safe_1.throwInvalidConfig)("devices", `config/devices/${filename}:
invalid endpoint index in compat option commandClasses.add`);
            }
            else {
                for (const [ep, info] of Object.entries(definition.endpoints)) {
                    parseEndpointInfo(parseInt(ep), info);
                }
            }
        }
        this.endpoints = endpoints;
    }
}
exports.CompatAddCC = CompatAddCC;
class CompatMapAlarm {
    constructor(filename, definition, index) {
        if (!(0, typeguards_1.isObject)(definition.from)) {
            (0, utils_safe_1.throwInvalidConfig)("devices", `config/devices/${filename}:
error in compat option alarmMapping, mapping #${index}: property "from" must be an object!`);
        }
        else {
            if (typeof definition.from.alarmType !== "number") {
                (0, utils_safe_1.throwInvalidConfig)("devices", `config/devices/${filename}:
error in compat option alarmMapping, mapping #${index}: property "from.alarmType" must be a number!`);
            }
            if (definition.from.alarmLevel != undefined &&
                typeof definition.from.alarmLevel !== "number") {
                (0, utils_safe_1.throwInvalidConfig)("devices", `config/devices/${filename}:
error in compat option alarmMapping, mapping #${index}: if property "from.alarmLevel" is given, it must be a number!`);
            }
        }
        if (!(0, typeguards_1.isObject)(definition.to)) {
            (0, utils_safe_1.throwInvalidConfig)("devices", `config/devices/${filename}:
error in compat option alarmMapping, mapping #${index}: property "to" must be an object!`);
        }
        else {
            if (typeof definition.to.notificationType !== "number") {
                (0, utils_safe_1.throwInvalidConfig)("devices", `config/devices/${filename}:
error in compat option alarmMapping, mapping #${index}: property "to.notificationType" must be a number!`);
            }
            if (typeof definition.to.notificationEvent !== "number") {
                (0, utils_safe_1.throwInvalidConfig)("devices", `config/devices/${filename}:
error in compat option alarmMapping, mapping #${index}: property "to.notificationEvent" must be a number!`);
            }
            if (definition.to.eventParameters != undefined) {
                if (!(0, typeguards_1.isObject)(definition.to.eventParameters)) {
                    (0, utils_safe_1.throwInvalidConfig)("devices", `config/devices/${filename}:
error in compat option alarmMapping, mapping #${index}: property "to.eventParameters" must be an object!`);
                }
                else {
                    for (const [key, val] of Object.entries(definition.to.eventParameters)) {
                        if (typeof val !== "number" && val !== "alarmLevel") {
                            (0, utils_safe_1.throwInvalidConfig)("devices", `config/devices/${filename}:
error in compat option alarmMapping, mapping #${index}: property "to.eventParameters.${key}" must be a number or the literal "alarmLevel"!`);
                        }
                    }
                }
            }
        }
        this.from = (0, safe_1.pick)(definition.from, ["alarmType", "alarmLevel"]);
        this.to = (0, safe_1.pick)(definition.to, [
            "notificationType",
            "notificationEvent",
            "eventParameters",
        ]);
    }
}
exports.CompatMapAlarm = CompatMapAlarm;
//# sourceMappingURL=CompatConfig.js.map