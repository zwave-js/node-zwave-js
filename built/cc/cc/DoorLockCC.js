"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var _a, _b;
Object.defineProperty(exports, "__esModule", { value: true });
exports.DoorLockCCCapabilitiesGet = exports.DoorLockCCCapabilitiesReport = exports.DoorLockCCConfigurationSet = exports.DoorLockCCConfigurationGet = exports.DoorLockCCConfigurationReport = exports.DoorLockCCOperationGet = exports.DoorLockCCOperationReport = exports.DoorLockCCOperationSet = exports.DoorLockCC = exports.DoorLockCCAPI = exports.DoorLockCCValues = void 0;
function __assertType(argName, typeName, boundHasError) {
    const { ZWaveError, ZWaveErrorCodes } = require("@zwave-js/core");
    if (boundHasError()) {
        throw new ZWaveError(typeName ? `${argName} is not a ${typeName}` : `${argName} has the wrong type`, ZWaveErrorCodes.Argument_Invalid);
    }
}
const __assertType__DoorLockMode = $o => {
    function su__1__2__3__4__5__6__7__8_eu($o) {
        return ![0, 1, 16, 17, 32, 33, 254, 255].includes($o) ? {} : null;
    }
    return su__1__2__3__4__5__6__7__8_eu($o);
};
const __assertType__DoorLockCCConfigurationSetOptions = $o => {
    function _6($o) {
        return $o !== 2 ? {} : null;
    }
    function _number($o) {
        return typeof $o !== "number" ? {} : null;
    }
    function _2($o) {
        if (typeof $o !== "object" || $o === null || Array.isArray($o))
            return {};
        if ("operationType" in $o && $o["operationType"] !== undefined) {
            const error = _6($o["operationType"]);
            if (error)
                return error;
        }
        else
            return {};
        if ("lockTimeoutConfiguration" in $o && $o["lockTimeoutConfiguration"] !== undefined) {
            const error = _number($o["lockTimeoutConfiguration"]);
            if (error)
                return error;
        }
        else
            return {};
        return null;
    }
    function _boolean($o) {
        return typeof $o !== "boolean" ? {} : null;
    }
    function st__boolean__boolean__boolean__boolean_et_9_9_9_9($o) {
        if (!Array.isArray($o) || $o.length < 4 || 4 < $o.length)
            return {};
        {
            const error = _boolean($o[0]);
            if (error)
                return error;
        }
        {
            const error = _boolean($o[1]);
            if (error)
                return error;
        }
        {
            const error = _boolean($o[2]);
            if (error)
                return error;
        }
        {
            const error = _boolean($o[3]);
            if (error)
                return error;
        }
        return null;
    }
    function _3($o) {
        if (typeof $o !== "object" || $o === null || Array.isArray($o))
            return {};
        if ("outsideHandlesCanOpenDoorConfiguration" in $o && $o["outsideHandlesCanOpenDoorConfiguration"] !== undefined) {
            const error = st__boolean__boolean__boolean__boolean_et_9_9_9_9($o["outsideHandlesCanOpenDoorConfiguration"]);
            if (error)
                return error;
        }
        else
            return {};
        if ("insideHandlesCanOpenDoorConfiguration" in $o && $o["insideHandlesCanOpenDoorConfiguration"] !== undefined) {
            const error = st__boolean__boolean__boolean__boolean_et_9_9_9_9($o["insideHandlesCanOpenDoorConfiguration"]);
            if (error)
                return error;
        }
        else
            return {};
        if ("autoRelockTime" in $o && $o["autoRelockTime"] !== undefined) {
            const error = _number($o["autoRelockTime"]);
            if (error)
                return error;
        }
        if ("holdAndReleaseTime" in $o && $o["holdAndReleaseTime"] !== undefined) {
            const error = _number($o["holdAndReleaseTime"]);
            if (error)
                return error;
        }
        if ("twistAssist" in $o && $o["twistAssist"] !== undefined) {
            const error = _boolean($o["twistAssist"]);
            if (error)
                return error;
        }
        if ("blockToBlock" in $o && $o["blockToBlock"] !== undefined) {
            const error = _boolean($o["blockToBlock"]);
            if (error)
                return error;
        }
        return null;
    }
    function si__2__3_ei($o) {
        const conditions = [_2, _3];
        for (const condition of conditions) {
            const error = condition($o);
            if (error)
                return error;
        }
        return null;
    }
    function _13($o) {
        return $o !== 1 ? {} : null;
    }
    function _undefined($o) {
        return $o !== undefined ? {} : null;
    }
    function _5($o) {
        if (typeof $o !== "object" || $o === null || Array.isArray($o))
            return {};
        if ("operationType" in $o && $o["operationType"] !== undefined) {
            const error = _13($o["operationType"]);
            if (error)
                return error;
        }
        else
            return {};
        if ("lockTimeoutConfiguration" in $o && $o["lockTimeoutConfiguration"] !== undefined) {
            const error = _undefined($o["lockTimeoutConfiguration"]);
            if (error)
                return error;
        }
        return null;
    }
    function si__5__3_ei($o) {
        const conditions = [_5, _3];
        for (const condition of conditions) {
            const error = condition($o);
            if (error)
                return error;
        }
        return null;
    }
    function su_si__2__3_ei_si__5__3_ei_eu($o) {
        const conditions = [si__2__3_ei, si__5__3_ei];
        for (const condition of conditions) {
            const error = condition($o);
            if (!error)
                return null;
        }
        return {};
    }
    return su_si__2__3_ei_si__5__3_ei_eu($o);
};
const safe_1 = require("@zwave-js/core/safe");
const safe_2 = require("@zwave-js/shared/safe");
const typeguards_1 = require("alcalzone-shared/typeguards");
const API_1 = require("../lib/API");
const CommandClass_1 = require("../lib/CommandClass");
const CommandClassDecorators_1 = require("../lib/CommandClassDecorators");
const Values_1 = require("../lib/Values");
const _Types_1 = require("../lib/_Types");
exports.DoorLockCCValues = Object.freeze({
    ...Values_1.V.defineStaticCCValues(safe_1.CommandClasses["Door Lock"], {
        ...Values_1.V.staticProperty("targetMode", {
            ...safe_1.ValueMetadata.UInt8,
            label: "Target lock mode",
            states: (0, safe_1.enumValuesToMetadataStates)(_Types_1.DoorLockMode),
        }),
        ...Values_1.V.staticProperty("currentMode", {
            ...safe_1.ValueMetadata.ReadOnlyUInt8,
            label: "Current lock mode",
            states: (0, safe_1.enumValuesToMetadataStates)(_Types_1.DoorLockMode),
        }),
        ...Values_1.V.staticProperty("duration", {
            ...safe_1.ValueMetadata.ReadOnlyDuration,
            label: "Remaining duration until target lock mode",
        }, { minVersion: 3 }),
        ...Values_1.V.staticProperty("supportedOutsideHandles", undefined, {
            internal: true,
            minVersion: 4,
        }),
        ...Values_1.V.staticProperty("outsideHandlesCanOpenDoorConfiguration", {
            ...safe_1.ValueMetadata.Any,
            label: "Which outside handles can open the door (configuration)",
        }),
        ...Values_1.V.staticProperty("outsideHandlesCanOpenDoor", {
            ...safe_1.ValueMetadata.ReadOnly,
            label: "Which outside handles can open the door (actual status)",
        }),
        ...Values_1.V.staticProperty("supportedInsideHandles", undefined, {
            internal: true,
            minVersion: 4,
        }),
        ...Values_1.V.staticProperty("insideHandlesCanOpenDoorConfiguration", {
            ...safe_1.ValueMetadata.Any,
            label: "Which inside handles can open the door (configuration)",
        }),
        ...Values_1.V.staticProperty("insideHandlesCanOpenDoor", {
            ...safe_1.ValueMetadata.ReadOnly,
            label: "Which inside handles can open the door (actual status)",
        }),
        ...Values_1.V.staticProperty("operationType", {
            ...safe_1.ValueMetadata.UInt8,
            label: "Lock operation type",
            states: (0, safe_1.enumValuesToMetadataStates)(_Types_1.DoorLockOperationType),
        }),
        ...Values_1.V.staticProperty("lockTimeoutConfiguration", {
            ...safe_1.ValueMetadata.UInt16,
            label: "Duration of timed mode in seconds",
        }),
        ...Values_1.V.staticProperty("lockTimeout", {
            ...safe_1.ValueMetadata.ReadOnlyUInt16,
            label: "Seconds until lock mode times out",
        }),
        ...Values_1.V.staticProperty("autoRelockSupported", undefined, {
            internal: true,
            minVersion: 4,
        }),
        ...Values_1.V.staticProperty("autoRelockTime", {
            ...safe_1.ValueMetadata.UInt16,
            label: "Duration in seconds until lock returns to secure state",
        }, { minVersion: 4 }),
        ...Values_1.V.staticProperty("holdAndReleaseSupported", undefined, {
            internal: true,
            minVersion: 4,
        }),
        ...Values_1.V.staticProperty("holdAndReleaseTime", {
            ...safe_1.ValueMetadata.UInt16,
            label: "Duration in seconds the latch stays retracted",
        }, { minVersion: 4 }),
        ...Values_1.V.staticProperty("twistAssistSupported", undefined, {
            internal: true,
            minVersion: 4,
        }),
        ...Values_1.V.staticProperty("twistAssist", {
            ...safe_1.ValueMetadata.Boolean,
            label: "Twist Assist enabled",
        }, { minVersion: 4 }),
        ...Values_1.V.staticProperty("blockToBlockSupported", undefined, {
            internal: true,
            minVersion: 4,
        }),
        ...Values_1.V.staticProperty("blockToBlock", {
            ...safe_1.ValueMetadata.Boolean,
            label: "Block-to-block functionality enabled",
        }, { minVersion: 4 }),
        ...Values_1.V.staticProperty("latchSupported", undefined, { internal: true }),
        ...Values_1.V.staticProperty("latchStatus", {
            ...safe_1.ValueMetadata.ReadOnly,
            label: "Current status of the latch",
        }, {
            autoCreate: shouldAutoCreateLatchStatusValue,
        }),
        ...Values_1.V.staticProperty("boltSupported", undefined, { internal: true }),
        ...Values_1.V.staticProperty("boltStatus", {
            ...safe_1.ValueMetadata.ReadOnly,
            label: "Current status of the bolt",
        }, {
            autoCreate: shouldAutoCreateBoltStatusValue,
        }),
        ...Values_1.V.staticProperty("doorSupported", undefined, { internal: true }),
        ...Values_1.V.staticProperty("doorStatus", {
            ...safe_1.ValueMetadata.ReadOnly,
            label: "Current status of the door",
        }, {
            autoCreate: shouldAutoCreateDoorStatusValue,
        }),
    }),
});
function shouldAutoCreateLatchStatusValue(applHost, endpoint) {
    const valueDB = applHost.tryGetValueDB(endpoint.nodeId);
    if (!valueDB)
        return false;
    return !!valueDB.getValue(exports.DoorLockCCValues.latchSupported.endpoint(endpoint.index));
}
function shouldAutoCreateBoltStatusValue(applHost, endpoint) {
    const valueDB = applHost.tryGetValueDB(endpoint.nodeId);
    if (!valueDB)
        return false;
    return !!valueDB.getValue(exports.DoorLockCCValues.boltSupported.endpoint(endpoint.index));
}
function shouldAutoCreateDoorStatusValue(applHost, endpoint) {
    const valueDB = applHost.tryGetValueDB(endpoint.nodeId);
    if (!valueDB)
        return false;
    return !!valueDB.getValue(exports.DoorLockCCValues.doorSupported.endpoint(endpoint.index));
}
const configurationSetParameters = [
    "operationType",
    "outsideHandlesCanOpenDoorConfiguration",
    "insideHandlesCanOpenDoorConfiguration",
    "lockTimeoutConfiguration",
    "autoRelockTime",
    "holdAndReleaseTime",
    "twistAssist",
    "blockToBlock",
];
let DoorLockCCAPI = class DoorLockCCAPI extends API_1.PhysicalCCAPI {
    constructor() {
        super(...arguments);
        this[_a] = async ({ property }, value) => {
            if (property === "targetMode") {
                if (typeof value !== "number") {
                    (0, API_1.throwWrongValueType)(this.ccId, property, "number", typeof value);
                }
                const result = await this.set(value);
                // Verify the current value after a delay, unless the command was supervised and successful
                if ((0, safe_1.supervisedCommandSucceeded)(result)) {
                    this.getValueDB().setValue(exports.DoorLockCCValues.currentMode.endpoint(this.endpoint.index), value);
                }
                else {
                    this.schedulePoll({ property }, value);
                }
                return result;
            }
            else if (typeof property === "string" &&
                configurationSetParameters.includes(property)) {
                // checking every type here would create a LOT of duplicate code, so we don't
                // ConfigurationSet expects all parameters --> read the others from cache
                const config = {
                    [property]: value,
                };
                for (const param of configurationSetParameters) {
                    if (param !== property) {
                        config[param] = this.tryGetValueDB()?.getValue({
                            commandClass: this.ccId,
                            endpoint: this.endpoint.index,
                            property: param,
                        });
                    }
                }
                // Fix insideHandlesCanOpenDoorConfiguration is not iterable
                const allTrue = [true, true, true, true];
                if (!config.insideHandlesCanOpenDoorConfiguration) {
                    config.insideHandlesCanOpenDoorConfiguration = allTrue;
                }
                if (!config.outsideHandlesCanOpenDoorConfiguration) {
                    config.outsideHandlesCanOpenDoorConfiguration = allTrue;
                }
                const result = await this.setConfiguration(config);
                // Verify the current value after a delay, unless the command was supervised and successful
                if (!(0, safe_1.supervisedCommandSucceeded)(result)) {
                    this.schedulePoll({ property }, value);
                }
                return result;
            }
            else {
                (0, API_1.throwUnsupportedProperty)(this.ccId, property);
            }
        };
        this[_b] = async ({ property, }) => {
            switch (property) {
                case "currentMode":
                case "targetMode":
                case "duration":
                case "outsideHandlesCanOpenDoor":
                case "insideHandlesCanOpenDoor":
                case "latchStatus":
                case "boltStatus":
                case "doorStatus":
                case "lockTimeout":
                    return (await this.get())?.[property];
                case "operationType":
                case "outsideHandlesCanOpenDoorConfiguration":
                case "insideHandlesCanOpenDoorConfiguration":
                case "lockTimeoutConfiguration":
                case "autoRelockTime":
                case "holdAndReleaseTime":
                case "twistAssist":
                case "blockToBlock":
                    return (await this.getConfiguration())?.[property];
                default:
                    (0, API_1.throwUnsupportedProperty)(this.ccId, property);
            }
        };
    }
    supportsCommand(cmd) {
        switch (cmd) {
            case _Types_1.DoorLockCommand.OperationSet:
            case _Types_1.DoorLockCommand.OperationGet:
            case _Types_1.DoorLockCommand.ConfigurationSet:
            case _Types_1.DoorLockCommand.ConfigurationGet:
                return true; // This is mandatory
            case _Types_1.DoorLockCommand.CapabilitiesGet:
                return this.version >= 4;
        }
        return super.supportsCommand(cmd);
    }
    // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
    async getCapabilities() {
        this.assertSupportsCommand(_Types_1.DoorLockCommand, _Types_1.DoorLockCommand.CapabilitiesGet);
        const cc = new DoorLockCCCapabilitiesGet(this.applHost, {
            nodeId: this.endpoint.nodeId,
            endpoint: this.endpoint.index,
        });
        const response = await this.applHost.sendCommand(cc, this.commandOptions);
        if (response) {
            return (0, safe_2.pick)(response, [
                "autoRelockSupported",
                "blockToBlockSupported",
                "boltSupported",
                "doorSupported",
                "holdAndReleaseSupported",
                "latchSupported",
                "twistAssistSupported",
                "supportedDoorLockModes",
                "supportedInsideHandles",
                "supportedOperationTypes",
                "supportedOutsideHandles",
            ]);
        }
    }
    // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
    async get() {
        this.assertSupportsCommand(_Types_1.DoorLockCommand, _Types_1.DoorLockCommand.OperationGet);
        const cc = new DoorLockCCOperationGet(this.applHost, {
            nodeId: this.endpoint.nodeId,
            endpoint: this.endpoint.index,
        });
        const response = await this.applHost.sendCommand(cc, this.commandOptions);
        if (response) {
            return (0, safe_2.pick)(response, [
                "currentMode",
                "targetMode",
                "duration",
                "outsideHandlesCanOpenDoor",
                "insideHandlesCanOpenDoor",
                "latchStatus",
                "boltStatus",
                "doorStatus",
                "lockTimeout",
            ]);
        }
    }
    async set(mode) {
        __assertType("mode", "DoorLockMode", __assertType__DoorLockMode.bind(void 0, mode));
        this.assertSupportsCommand(_Types_1.DoorLockCommand, _Types_1.DoorLockCommand.OperationSet);
        const cc = new DoorLockCCOperationSet(this.applHost, {
            nodeId: this.endpoint.nodeId,
            endpoint: this.endpoint.index,
            mode,
        });
        return this.applHost.sendCommand(cc, this.commandOptions);
    }
    async setConfiguration(configuration) {
        __assertType("configuration", "DoorLockCCConfigurationSetOptions", __assertType__DoorLockCCConfigurationSetOptions.bind(void 0, configuration));
        this.assertSupportsCommand(_Types_1.DoorLockCommand, _Types_1.DoorLockCommand.ConfigurationSet);
        const cc = new DoorLockCCConfigurationSet(this.applHost, {
            nodeId: this.endpoint.nodeId,
            endpoint: this.endpoint.index,
            ...configuration,
        });
        return this.applHost.sendCommand(cc, this.commandOptions);
    }
    // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
    async getConfiguration() {
        this.assertSupportsCommand(_Types_1.DoorLockCommand, _Types_1.DoorLockCommand.ConfigurationGet);
        const cc = new DoorLockCCConfigurationGet(this.applHost, {
            nodeId: this.endpoint.nodeId,
            endpoint: this.endpoint.index,
        });
        const response = await this.applHost.sendCommand(cc, this.commandOptions);
        if (response) {
            return (0, safe_2.pick)(response, [
                "operationType",
                "outsideHandlesCanOpenDoorConfiguration",
                "insideHandlesCanOpenDoorConfiguration",
                "lockTimeoutConfiguration",
                "autoRelockTime",
                "holdAndReleaseTime",
                "twistAssist",
                "blockToBlock",
            ]);
        }
    }
};
_a = API_1.SET_VALUE;
_b = API_1.POLL_VALUE;
DoorLockCCAPI = __decorate([
    (0, CommandClassDecorators_1.API)(safe_1.CommandClasses["Door Lock"])
], DoorLockCCAPI);
exports.DoorLockCCAPI = DoorLockCCAPI;
let DoorLockCC = class DoorLockCC extends CommandClass_1.CommandClass {
    async interview(applHost) {
        const node = this.getNode(applHost);
        const endpoint = this.getEndpoint(applHost);
        const api = API_1.CCAPI.create(safe_1.CommandClasses["Door Lock"], applHost, endpoint).withOptions({
            priority: safe_1.MessagePriority.NodeQuery,
        });
        applHost.controllerLog.logNode(node.id, {
            endpoint: this.endpointIndex,
            message: `Interviewing ${this.ccName}...`,
            direction: "none",
        });
        // We need to do some queries after a potential timeout
        // In this case, do now mark this CC as interviewed completely
        let hadCriticalTimeout = false;
        // By default, assume all status sensors to be supported
        let doorSupported = true;
        let boltSupported = true;
        let latchSupported = true;
        if (this.version >= 4) {
            applHost.controllerLog.logNode(node.id, {
                endpoint: this.endpointIndex,
                message: "requesting lock capabilities...",
                direction: "outbound",
            });
            const resp = await api.getCapabilities();
            if (resp) {
                const logMessage = `received lock capabilities:
supported operation types: ${resp.supportedOperationTypes
                    .map((t) => (0, safe_2.getEnumMemberName)(_Types_1.DoorLockOperationType, t))
                    .join(", ")}
supported door lock modes: ${resp.supportedDoorLockModes
                    .map((t) => (0, safe_2.getEnumMemberName)(_Types_1.DoorLockMode, t))
                    .map((str) => `\n· ${str}`)
                    .join("")}
supported outside handles: ${resp.supportedOutsideHandles
                    .map(String)
                    .join(", ")}
supported inside handles:  ${resp.supportedInsideHandles.map(String).join(", ")}
supports door status:      ${resp.doorSupported}
supports bolt status:      ${resp.boltSupported}
supports latch status:     ${resp.latchSupported}
supports auto-relock:      ${resp.autoRelockSupported}
supports hold-and-release: ${resp.holdAndReleaseSupported}
supports twist assist:     ${resp.twistAssistSupported}
supports block to block:   ${resp.blockToBlockSupported}`;
                applHost.controllerLog.logNode(node.id, {
                    endpoint: this.endpointIndex,
                    message: logMessage,
                    direction: "inbound",
                });
                doorSupported = resp.doorSupported;
                boltSupported = resp.boltSupported;
                latchSupported = resp.latchSupported;
                // Update metadata of settable states
                const targetModeValue = exports.DoorLockCCValues.targetMode;
                this.setMetadata(applHost, targetModeValue, {
                    ...targetModeValue.meta,
                    states: (0, safe_1.enumValuesToMetadataStates)(_Types_1.DoorLockMode, resp.supportedDoorLockModes),
                });
                const operationTypeValue = exports.DoorLockCCValues.operationType;
                this.setMetadata(applHost, operationTypeValue, {
                    ...operationTypeValue.meta,
                    states: (0, safe_1.enumValuesToMetadataStates)(_Types_1.DoorLockOperationType, resp.supportedOperationTypes),
                });
            }
            else {
                hadCriticalTimeout = true;
            }
        }
        if (!hadCriticalTimeout) {
            // Save support information for the status values
            const doorStatusValue = exports.DoorLockCCValues.doorStatus;
            if (doorSupported)
                this.setMetadata(applHost, doorStatusValue);
            this.setValue(applHost, exports.DoorLockCCValues.doorSupported, doorSupported);
            const latchStatusValue = exports.DoorLockCCValues.latchStatus;
            if (latchSupported)
                this.setMetadata(applHost, latchStatusValue);
            this.setValue(applHost, exports.DoorLockCCValues.latchSupported, latchSupported);
            const boltStatusValue = exports.DoorLockCCValues.boltStatus;
            if (boltSupported)
                this.setMetadata(applHost, boltStatusValue);
            this.setValue(applHost, exports.DoorLockCCValues.boltSupported, boltSupported);
        }
        await this.refreshValues(applHost);
        // Remember that the interview is complete
        if (!hadCriticalTimeout)
            this.setInterviewComplete(applHost, true);
    }
    async refreshValues(applHost) {
        const node = this.getNode(applHost);
        const endpoint = this.getEndpoint(applHost);
        const api = API_1.CCAPI.create(safe_1.CommandClasses["Door Lock"], applHost, endpoint).withOptions({
            priority: safe_1.MessagePriority.NodeQuery,
        });
        applHost.controllerLog.logNode(node.id, {
            endpoint: this.endpointIndex,
            message: "requesting lock configuration...",
            direction: "outbound",
        });
        const config = await api.getConfiguration();
        if (config) {
            let logMessage = `received lock configuration:
operation type:                ${(0, safe_2.getEnumMemberName)(_Types_1.DoorLockOperationType, config.operationType)}`;
            if (config.operationType === _Types_1.DoorLockOperationType.Timed) {
                logMessage += `
lock timeout:                  ${config.lockTimeoutConfiguration} seconds
`;
            }
            logMessage += `
outside handles can open door: ${config.outsideHandlesCanOpenDoorConfiguration
                .map(String)
                .join(", ")}
inside handles can open door:  ${config.insideHandlesCanOpenDoorConfiguration
                .map(String)
                .join(", ")}`;
            if (this.version >= 4) {
                logMessage += `
auto-relock time               ${config.autoRelockTime ?? "-"} seconds
hold-and-release time          ${config.holdAndReleaseTime ?? "-"} seconds
twist assist                   ${!!config.twistAssist}
block to block                 ${!!config.blockToBlock}`;
            }
            applHost.controllerLog.logNode(node.id, {
                endpoint: this.endpointIndex,
                message: logMessage,
                direction: "inbound",
            });
        }
        applHost.controllerLog.logNode(node.id, {
            endpoint: this.endpointIndex,
            message: "requesting current lock status...",
            direction: "outbound",
        });
        const status = await api.get();
        if (status) {
            let logMessage = `received lock status:
current mode:       ${(0, safe_2.getEnumMemberName)(_Types_1.DoorLockMode, status.currentMode)}`;
            if (status.targetMode != undefined) {
                logMessage += `
target mode:        ${(0, safe_2.getEnumMemberName)(_Types_1.DoorLockMode, status.targetMode)}
remaining duration: ${status.duration?.toString() ?? "undefined"}`;
            }
            if (status.lockTimeout != undefined) {
                logMessage += `
lock timeout:       ${status.lockTimeout} seconds`;
            }
            if (status.doorStatus != undefined) {
                logMessage += `
door status:        ${status.doorStatus}`;
            }
            if (status.boltStatus != undefined) {
                logMessage += `
bolt status:        ${status.boltStatus}`;
            }
            if (status.latchStatus != undefined) {
                logMessage += `
latch status:       ${status.latchStatus}`;
            }
            applHost.controllerLog.logNode(node.id, {
                endpoint: this.endpointIndex,
                message: logMessage,
                direction: "inbound",
            });
        }
    }
};
DoorLockCC = __decorate([
    (0, CommandClassDecorators_1.commandClass)(safe_1.CommandClasses["Door Lock"]),
    (0, CommandClassDecorators_1.implementedVersion)(4),
    (0, CommandClassDecorators_1.ccValues)(exports.DoorLockCCValues)
], DoorLockCC);
exports.DoorLockCC = DoorLockCC;
let DoorLockCCOperationSet = class DoorLockCCOperationSet extends DoorLockCC {
    constructor(host, options) {
        super(host, options);
        if ((0, CommandClass_1.gotDeserializationOptions)(options)) {
            // TODO: Deserialize payload
            throw new safe_1.ZWaveError(`${this.constructor.name}: deserialization not implemented`, safe_1.ZWaveErrorCodes.Deserialization_NotImplemented);
        }
        else {
            if (options.mode === _Types_1.DoorLockMode.Unknown) {
                throw new safe_1.ZWaveError(`Unknown is not a valid door lock target state!`, safe_1.ZWaveErrorCodes.Argument_Invalid);
            }
            this.mode = options.mode;
        }
    }
    serialize() {
        this.payload = Buffer.from([this.mode]);
        return super.serialize();
    }
    toLogEntry(applHost) {
        return {
            ...super.toLogEntry(applHost),
            message: {
                "target mode": (0, safe_2.getEnumMemberName)(_Types_1.DoorLockMode, this.mode),
            },
        };
    }
};
DoorLockCCOperationSet = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.DoorLockCommand.OperationSet),
    (0, CommandClassDecorators_1.useSupervision)()
], DoorLockCCOperationSet);
exports.DoorLockCCOperationSet = DoorLockCCOperationSet;
let DoorLockCCOperationReport = class DoorLockCCOperationReport extends DoorLockCC {
    constructor(host, options) {
        super(host, options);
        (0, safe_1.validatePayload)(this.payload.length >= 5);
        this.currentMode = this.payload[0];
        this.outsideHandlesCanOpenDoor = [
            !!(this.payload[1] & 16),
            !!(this.payload[1] & 32),
            !!(this.payload[1] & 64),
            !!(this.payload[1] & 128),
        ];
        this.insideHandlesCanOpenDoor = [
            !!(this.payload[1] & 0b0001),
            !!(this.payload[1] & 0b0010),
            !!(this.payload[1] & 0b0100),
            !!(this.payload[1] & 0b1000),
        ];
        this.doorStatus = !!(this.payload[2] & 0b1) ? "closed" : "open";
        this.boltStatus = !!(this.payload[2] & 0b10) ? "unlocked" : "locked";
        this.latchStatus = !!(this.payload[2] & 0b100) ? "closed" : "open";
        // Ignore invalid timeout values
        const lockTimeoutMinutes = this.payload[3];
        const lockTimeoutSeconds = this.payload[4];
        if (lockTimeoutMinutes <= 253 && lockTimeoutSeconds <= 59) {
            this.lockTimeout = lockTimeoutSeconds + lockTimeoutMinutes * 60;
        }
        if (this.version >= 3 && this.payload.length >= 7) {
            this.targetMode = this.payload[5];
            this.duration = safe_1.Duration.parseReport(this.payload[6]);
        }
    }
    persistValues(applHost) {
        if (!super.persistValues(applHost))
            return false;
        // Only store the door/bolt/latch status if the lock supports it
        const supportsDoorStatus = !!this.getValue(applHost, exports.DoorLockCCValues.doorSupported);
        if (supportsDoorStatus) {
            this.setValue(applHost, exports.DoorLockCCValues.doorStatus, this.doorStatus);
        }
        const supportsBoltStatus = !!this.getValue(applHost, exports.DoorLockCCValues.boltSupported);
        if (supportsBoltStatus) {
            this.setValue(applHost, exports.DoorLockCCValues.boltStatus, this.boltStatus);
        }
        const supportsLatchStatus = !!this.getValue(applHost, exports.DoorLockCCValues.latchSupported);
        if (supportsLatchStatus) {
            this.setValue(applHost, exports.DoorLockCCValues.latchStatus, this.latchStatus);
        }
        return true;
    }
    toLogEntry(applHost) {
        const message = {
            "current mode": (0, safe_2.getEnumMemberName)(_Types_1.DoorLockMode, this.currentMode),
            "active outside handles": this.outsideHandlesCanOpenDoor.join(", "),
            "active inside handles": this.insideHandlesCanOpenDoor.join(", "),
        };
        if (this.latchStatus != undefined) {
            message["latch status"] = this.latchStatus;
        }
        if (this.boltStatus != undefined) {
            message["bolt status"] = this.boltStatus;
        }
        if (this.doorStatus != undefined) {
            message["door status"] = this.doorStatus;
        }
        if (this.targetMode != undefined) {
            message["target mode"] = (0, safe_2.getEnumMemberName)(_Types_1.DoorLockMode, this.targetMode);
        }
        if (this.duration != undefined) {
            message["remaining duration"] = this.duration.toString();
        }
        if (this.lockTimeout != undefined) {
            message["lock timeout"] = `${this.lockTimeout} seconds`;
        }
        return {
            ...super.toLogEntry(applHost),
            message,
        };
    }
};
__decorate([
    (0, CommandClassDecorators_1.ccValue)(exports.DoorLockCCValues.currentMode)
], DoorLockCCOperationReport.prototype, "currentMode", void 0);
__decorate([
    (0, CommandClassDecorators_1.ccValue)(exports.DoorLockCCValues.targetMode)
], DoorLockCCOperationReport.prototype, "targetMode", void 0);
__decorate([
    (0, CommandClassDecorators_1.ccValue)(exports.DoorLockCCValues.duration)
], DoorLockCCOperationReport.prototype, "duration", void 0);
__decorate([
    (0, CommandClassDecorators_1.ccValue)(exports.DoorLockCCValues.outsideHandlesCanOpenDoor)
], DoorLockCCOperationReport.prototype, "outsideHandlesCanOpenDoor", void 0);
__decorate([
    (0, CommandClassDecorators_1.ccValue)(exports.DoorLockCCValues.insideHandlesCanOpenDoor)
], DoorLockCCOperationReport.prototype, "insideHandlesCanOpenDoor", void 0);
__decorate([
    (0, CommandClassDecorators_1.ccValue)(exports.DoorLockCCValues.lockTimeout)
], DoorLockCCOperationReport.prototype, "lockTimeout", void 0);
DoorLockCCOperationReport = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.DoorLockCommand.OperationReport)
], DoorLockCCOperationReport);
exports.DoorLockCCOperationReport = DoorLockCCOperationReport;
let DoorLockCCOperationGet = class DoorLockCCOperationGet extends DoorLockCC {
};
DoorLockCCOperationGet = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.DoorLockCommand.OperationGet),
    (0, CommandClassDecorators_1.expectedCCResponse)(DoorLockCCOperationReport)
], DoorLockCCOperationGet);
exports.DoorLockCCOperationGet = DoorLockCCOperationGet;
let DoorLockCCConfigurationReport = class DoorLockCCConfigurationReport extends DoorLockCC {
    constructor(host, options) {
        super(host, options);
        (0, safe_1.validatePayload)(this.payload.length >= 4);
        this.operationType = this.payload[0];
        this.outsideHandlesCanOpenDoorConfiguration = [
            !!(this.payload[1] & 16),
            !!(this.payload[1] & 32),
            !!(this.payload[1] & 64),
            !!(this.payload[1] & 128),
        ];
        this.insideHandlesCanOpenDoorConfiguration = [
            !!(this.payload[1] & 0b0001),
            !!(this.payload[1] & 0b0010),
            !!(this.payload[1] & 0b0100),
            !!(this.payload[1] & 0b1000),
        ];
        if (this.operationType === _Types_1.DoorLockOperationType.Timed) {
            const lockTimeoutMinutes = this.payload[2];
            const lockTimeoutSeconds = this.payload[3];
            if (lockTimeoutMinutes <= 0xfd && lockTimeoutSeconds <= 59) {
                this.lockTimeoutConfiguration =
                    lockTimeoutSeconds + lockTimeoutMinutes * 60;
            }
        }
        if (this.version >= 4 && this.payload.length >= 5) {
            this.autoRelockTime = this.payload.readUInt16BE(4);
            this.holdAndReleaseTime = this.payload.readUInt16BE(6);
            const flags = this.payload[8];
            this.twistAssist = !!(flags & 0b1);
            this.blockToBlock = !!(flags & 0b10);
        }
    }
    toLogEntry(applHost) {
        const message = {
            "operation type": (0, safe_2.getEnumMemberName)(_Types_1.DoorLockOperationType, this.operationType),
            "outside handle configuration": this.outsideHandlesCanOpenDoorConfiguration.join(", "),
            "inside handle configuration": this.insideHandlesCanOpenDoorConfiguration.join(", "),
        };
        if (this.lockTimeoutConfiguration != undefined) {
            message["timed mode duration"] = `${this.lockTimeoutConfiguration} seconds`;
        }
        if (this.autoRelockTime != undefined) {
            message["auto-relock time"] = `${this.autoRelockTime} seconds`;
        }
        if (this.holdAndReleaseTime != undefined) {
            message["hold-and-release time"] = `${this.holdAndReleaseTime} seconds`;
        }
        if (this.twistAssist != undefined) {
            message["twist assist enabled"] = this.twistAssist;
        }
        if (this.blockToBlock != undefined) {
            message["block-to-block enabled"] = this.blockToBlock;
        }
        return {
            ...super.toLogEntry(applHost),
            message,
        };
    }
};
__decorate([
    (0, CommandClassDecorators_1.ccValue)(exports.DoorLockCCValues.operationType)
], DoorLockCCConfigurationReport.prototype, "operationType", void 0);
__decorate([
    (0, CommandClassDecorators_1.ccValue)(exports.DoorLockCCValues.outsideHandlesCanOpenDoorConfiguration)
], DoorLockCCConfigurationReport.prototype, "outsideHandlesCanOpenDoorConfiguration", void 0);
__decorate([
    (0, CommandClassDecorators_1.ccValue)(exports.DoorLockCCValues.insideHandlesCanOpenDoorConfiguration)
], DoorLockCCConfigurationReport.prototype, "insideHandlesCanOpenDoorConfiguration", void 0);
__decorate([
    (0, CommandClassDecorators_1.ccValue)(exports.DoorLockCCValues.lockTimeoutConfiguration)
], DoorLockCCConfigurationReport.prototype, "lockTimeoutConfiguration", void 0);
__decorate([
    (0, CommandClassDecorators_1.ccValue)(exports.DoorLockCCValues.autoRelockTime)
], DoorLockCCConfigurationReport.prototype, "autoRelockTime", void 0);
__decorate([
    (0, CommandClassDecorators_1.ccValue)(exports.DoorLockCCValues.holdAndReleaseTime)
], DoorLockCCConfigurationReport.prototype, "holdAndReleaseTime", void 0);
__decorate([
    (0, CommandClassDecorators_1.ccValue)(exports.DoorLockCCValues.twistAssist)
], DoorLockCCConfigurationReport.prototype, "twistAssist", void 0);
__decorate([
    (0, CommandClassDecorators_1.ccValue)(exports.DoorLockCCValues.blockToBlock)
], DoorLockCCConfigurationReport.prototype, "blockToBlock", void 0);
DoorLockCCConfigurationReport = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.DoorLockCommand.ConfigurationReport)
], DoorLockCCConfigurationReport);
exports.DoorLockCCConfigurationReport = DoorLockCCConfigurationReport;
let DoorLockCCConfigurationGet = class DoorLockCCConfigurationGet extends DoorLockCC {
};
DoorLockCCConfigurationGet = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.DoorLockCommand.ConfigurationGet),
    (0, CommandClassDecorators_1.expectedCCResponse)(DoorLockCCConfigurationReport)
], DoorLockCCConfigurationGet);
exports.DoorLockCCConfigurationGet = DoorLockCCConfigurationGet;
let DoorLockCCConfigurationSet = class DoorLockCCConfigurationSet extends DoorLockCC {
    constructor(host, options) {
        super(host, options);
        if ((0, CommandClass_1.gotDeserializationOptions)(options)) {
            // TODO: Deserialize payload
            throw new safe_1.ZWaveError(`${this.constructor.name}: deserialization not implemented`, safe_1.ZWaveErrorCodes.Deserialization_NotImplemented);
        }
        else {
            this.operationType = options.operationType;
            this.outsideHandlesCanOpenDoorConfiguration =
                options.outsideHandlesCanOpenDoorConfiguration;
            this.insideHandlesCanOpenDoorConfiguration =
                options.insideHandlesCanOpenDoorConfiguration;
            this.lockTimeoutConfiguration = options.lockTimeoutConfiguration;
            this.autoRelockTime = options.autoRelockTime;
            this.holdAndReleaseTime = options.holdAndReleaseTime;
            this.twistAssist = options.twistAssist;
            this.blockToBlock = options.blockToBlock;
        }
    }
    serialize() {
        const insideHandles = (0, typeguards_1.isArray)(this.insideHandlesCanOpenDoorConfiguration)
            ? this.insideHandlesCanOpenDoorConfiguration
            : [];
        const outsideHandles = (0, typeguards_1.isArray)(this.outsideHandlesCanOpenDoorConfiguration)
            ? this.outsideHandlesCanOpenDoorConfiguration
            : [];
        const handles = [...insideHandles, ...outsideHandles]
            .map((val, i) => (val ? 1 << i : 0))
            .reduce((acc, cur) => acc | cur, 0);
        let lockTimeoutMinutes;
        let lockTimeoutSeconds;
        if (this.operationType === _Types_1.DoorLockOperationType.Constant) {
            lockTimeoutMinutes = lockTimeoutSeconds = 0xfe;
        }
        else {
            lockTimeoutMinutes = Math.floor(this.lockTimeoutConfiguration / 60);
            lockTimeoutSeconds = this.lockTimeoutConfiguration % 60;
        }
        this.payload = Buffer.from([
            this.operationType,
            handles,
            lockTimeoutMinutes,
            lockTimeoutSeconds,
        ]);
        if (this.version >= 4 &&
            (this.twistAssist != undefined ||
                this.blockToBlock != undefined ||
                this.autoRelockTime != undefined ||
                this.holdAndReleaseTime != undefined)) {
            const flags = (this.twistAssist ? 0b1 : 0) | (this.blockToBlock ? 0b10 : 0);
            this.payload = Buffer.concat([
                this.payload,
                Buffer.from([
                    // placeholder for auto relock time
                    0,
                    0,
                    // placeholder for hold and release time
                    0,
                    0,
                    flags,
                ]),
            ]);
            this.payload.writeUInt16BE((this.autoRelockTime ?? 0) & 0xffff, 4);
            this.payload.writeUInt16BE((this.holdAndReleaseTime ?? 0) & 0xffff, 6);
        }
        return super.serialize();
    }
    toLogEntry(applHost) {
        const insideHandles = (0, typeguards_1.isArray)(this.insideHandlesCanOpenDoorConfiguration)
            ? this.insideHandlesCanOpenDoorConfiguration
            : [];
        const outsideHandles = (0, typeguards_1.isArray)(this.outsideHandlesCanOpenDoorConfiguration)
            ? this.outsideHandlesCanOpenDoorConfiguration
            : [];
        const message = {
            "operation type": (0, safe_2.getEnumMemberName)(_Types_1.DoorLockOperationType, this.operationType),
            "outside handle configuration": outsideHandles.join(", "),
            "inside handle configuration": insideHandles.join(", "),
        };
        if (this.lockTimeoutConfiguration != undefined) {
            message["timed mode duration"] = `${this.lockTimeoutConfiguration} seconds`;
        }
        if (this.autoRelockTime != undefined) {
            message["auto-relock time"] = `${this.autoRelockTime} seconds`;
        }
        if (this.holdAndReleaseTime != undefined) {
            message["hold-and-release time"] = `${this.holdAndReleaseTime} seconds`;
        }
        if (this.twistAssist != undefined) {
            message["enable twist assist"] = this.twistAssist;
        }
        if (this.blockToBlock != undefined) {
            message["enable block-to-block"] = this.blockToBlock;
        }
        return {
            ...super.toLogEntry(applHost),
            message,
        };
    }
};
DoorLockCCConfigurationSet = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.DoorLockCommand.ConfigurationSet),
    (0, CommandClassDecorators_1.useSupervision)()
], DoorLockCCConfigurationSet);
exports.DoorLockCCConfigurationSet = DoorLockCCConfigurationSet;
let DoorLockCCCapabilitiesReport = class DoorLockCCCapabilitiesReport extends DoorLockCC {
    constructor(host, options) {
        super(host, options);
        // parse variable length operation type bit mask
        (0, safe_1.validatePayload)(this.payload.length >= 1);
        const bitMaskLength = this.payload[0] & 0b11111;
        let offset = 1;
        (0, safe_1.validatePayload)(this.payload.length >= offset + bitMaskLength + 1);
        this.supportedOperationTypes = (0, safe_1.parseBitMask)(this.payload.slice(offset, offset + bitMaskLength), 
        // bit 0 is reserved, bitmask starts at 1
        0);
        offset += bitMaskLength;
        // parse variable length door lock mode list
        const listLength = this.payload[offset];
        offset += 1;
        (0, safe_1.validatePayload)(this.payload.length >= offset + listLength + 3);
        this.supportedDoorLockModes = [
            ...this.payload.slice(offset, offset + listLength),
        ];
        offset += listLength;
        this.supportedOutsideHandles = [
            !!(this.payload[offset] & 16),
            !!(this.payload[offset] & 32),
            !!(this.payload[offset] & 64),
            !!(this.payload[offset] & 128),
        ];
        this.supportedInsideHandles = [
            !!(this.payload[offset] & 0b0001),
            !!(this.payload[offset] & 0b0010),
            !!(this.payload[offset] & 0b0100),
            !!(this.payload[offset] & 0b1000),
        ];
        this.doorSupported = !!(this.payload[offset + 1] & 0b1);
        this.boltSupported = !!(this.payload[offset + 1] & 0b10);
        this.latchSupported = !!(this.payload[offset + 1] & 0b100);
        this.blockToBlockSupported = !!(this.payload[offset + 2] & 0b1);
        this.twistAssistSupported = !!(this.payload[offset + 2] & 0b10);
        this.holdAndReleaseSupported = !!(this.payload[offset + 2] & 0b100);
        this.autoRelockSupported = !!(this.payload[offset + 2] & 0b1000);
    }
    toLogEntry(applHost) {
        return {
            ...super.toLogEntry(applHost),
            message: {
                door: this.doorSupported,
                bolt: this.boltSupported,
                latch: this.latchSupported,
                "block-to-block feature": this.blockToBlockSupported,
                "twist assist feature": this.twistAssistSupported,
                "hold-and-release feature": this.holdAndReleaseSupported,
                "auto-relock feature": this.autoRelockSupported,
                "operation types": this.supportedOperationTypes
                    .map((t) => `\n· ${(0, safe_2.getEnumMemberName)(_Types_1.DoorLockOperationType, t)}`)
                    .join(""),
                "door lock modes": this.supportedDoorLockModes
                    .map((t) => `\n· ${(0, safe_2.getEnumMemberName)(_Types_1.DoorLockMode, t)}`)
                    .join(""),
                "outside handles": this.supportedOutsideHandles.join(", "),
                "inside handles": this.supportedInsideHandles.join(", "),
            },
        };
    }
};
__decorate([
    (0, CommandClassDecorators_1.ccValue)(exports.DoorLockCCValues.supportedOutsideHandles)
], DoorLockCCCapabilitiesReport.prototype, "supportedOutsideHandles", void 0);
__decorate([
    (0, CommandClassDecorators_1.ccValue)(exports.DoorLockCCValues.supportedInsideHandles)
], DoorLockCCCapabilitiesReport.prototype, "supportedInsideHandles", void 0);
__decorate([
    (0, CommandClassDecorators_1.ccValue)(exports.DoorLockCCValues.autoRelockSupported)
], DoorLockCCCapabilitiesReport.prototype, "autoRelockSupported", void 0);
__decorate([
    (0, CommandClassDecorators_1.ccValue)(exports.DoorLockCCValues.holdAndReleaseSupported)
], DoorLockCCCapabilitiesReport.prototype, "holdAndReleaseSupported", void 0);
__decorate([
    (0, CommandClassDecorators_1.ccValue)(exports.DoorLockCCValues.twistAssistSupported)
], DoorLockCCCapabilitiesReport.prototype, "twistAssistSupported", void 0);
__decorate([
    (0, CommandClassDecorators_1.ccValue)(exports.DoorLockCCValues.blockToBlockSupported)
], DoorLockCCCapabilitiesReport.prototype, "blockToBlockSupported", void 0);
DoorLockCCCapabilitiesReport = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.DoorLockCommand.CapabilitiesReport)
], DoorLockCCCapabilitiesReport);
exports.DoorLockCCCapabilitiesReport = DoorLockCCCapabilitiesReport;
let DoorLockCCCapabilitiesGet = class DoorLockCCCapabilitiesGet extends DoorLockCC {
};
DoorLockCCCapabilitiesGet = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.DoorLockCommand.CapabilitiesGet),
    (0, CommandClassDecorators_1.expectedCCResponse)(DoorLockCCCapabilitiesReport)
], DoorLockCCCapabilitiesGet);
exports.DoorLockCCCapabilitiesGet = DoorLockCCCapabilitiesGet;
//# sourceMappingURL=DoorLockCC.js.map