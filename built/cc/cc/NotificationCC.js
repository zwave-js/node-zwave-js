"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var NotificationCC_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationCCEventSupportedGet = exports.NotificationCCEventSupportedReport = exports.NotificationCCSupportedGet = exports.NotificationCCSupportedReport = exports.NotificationCCGet = exports.NotificationCCReport = exports.NotificationCCSet = exports.NotificationCC = exports.getNotificationValueMetadata = exports.getNotificationStateValueWithEnum = exports.NotificationCCAPI = exports.NotificationCCValues = void 0;
function __assertType(argName, typeName, boundHasError) {
    const { ZWaveError, ZWaveErrorCodes } = require("@zwave-js/core");
    if (boundHasError()) {
        throw new ZWaveError(typeName ? `${argName} is not a ${typeName}` : `${argName} has the wrong type`, ZWaveErrorCodes.Argument_Invalid);
    }
}
const __assertType__NotificationCCReportOptions = $o => {
    function _number($o) {
        return typeof $o !== "number" ? {} : null;
    }
    function _1($o) {
        if (typeof $o !== "object" || $o === null || Array.isArray($o))
            return {};
        if ("alarmType" in $o && $o["alarmType"] !== undefined) {
            const error = _number($o["alarmType"]);
            if (error)
                return error;
        }
        else
            return {};
        if ("alarmLevel" in $o && $o["alarmLevel"] !== undefined) {
            const error = _number($o["alarmLevel"]);
            if (error)
                return error;
        }
        else
            return {};
        return null;
    }
    function _buffer($o) {
        return !Buffer.isBuffer($o) ? {} : null;
    }
    function _2($o) {
        if (typeof $o !== "object" || $o === null || Array.isArray($o))
            return {};
        if ("notificationType" in $o && $o["notificationType"] !== undefined) {
            const error = _number($o["notificationType"]);
            if (error)
                return error;
        }
        else
            return {};
        if ("notificationEvent" in $o && $o["notificationEvent"] !== undefined) {
            const error = _number($o["notificationEvent"]);
            if (error)
                return error;
        }
        else
            return {};
        if ("eventParameters" in $o && $o["eventParameters"] !== undefined) {
            const error = _buffer($o["eventParameters"]);
            if (error)
                return error;
        }
        if ("sequenceNumber" in $o && $o["sequenceNumber"] !== undefined) {
            const error = _number($o["sequenceNumber"]);
            if (error)
                return error;
        }
        return null;
    }
    function su__1__2_eu($o) {
        const conditions = [_1, _2];
        for (const condition of conditions) {
            const error = condition($o);
            if (!error)
                return null;
        }
        return {};
    }
    return su__1__2_eu($o);
};
const __assertType__NotificationCCGetSpecificOptions = $o => {
    function _number($o) {
        return typeof $o !== "number" ? {} : null;
    }
    function _1($o) {
        if (typeof $o !== "object" || $o === null || Array.isArray($o))
            return {};
        if ("alarmType" in $o && $o["alarmType"] !== undefined) {
            const error = _number($o["alarmType"]);
            if (error)
                return error;
        }
        else
            return {};
        return null;
    }
    function _2($o) {
        if (typeof $o !== "object" || $o === null || Array.isArray($o))
            return {};
        if ("notificationType" in $o && $o["notificationType"] !== undefined) {
            const error = _number($o["notificationType"]);
            if (error)
                return error;
        }
        else
            return {};
        if ("notificationEvent" in $o && $o["notificationEvent"] !== undefined) {
            const error = _number($o["notificationEvent"]);
            if (error)
                return error;
        }
        return null;
    }
    function su__1__2_eu($o) {
        const conditions = [_1, _2];
        for (const condition of conditions) {
            const error = condition($o);
            if (!error)
                return null;
        }
        return {};
    }
    return su__1__2_eu($o);
};
const __assertType__number = $o => {
    function _number($o) {
        return typeof $o !== "number" ? {} : null;
    }
    return _number($o);
};
const __assertType__boolean = $o => {
    function _boolean($o) {
        return typeof $o !== "boolean" ? {} : null;
    }
    return _boolean($o);
};
const config_1 = require("@zwave-js/config");
const core_1 = require("@zwave-js/core");
const safe_1 = require("@zwave-js/core/safe");
const safe_2 = require("@zwave-js/shared/safe");
const typeguards_1 = require("alcalzone-shared/typeguards");
const API_1 = require("../lib/API");
const CommandClass_1 = require("../lib/CommandClass");
const CommandClassDecorators_1 = require("../lib/CommandClassDecorators");
const NotificationEventPayload_1 = require("../lib/NotificationEventPayload");
const ccUtils = __importStar(require("../lib/utils"));
const Values_1 = require("../lib/Values");
const _Types_1 = require("../lib/_Types");
exports.NotificationCCValues = Object.freeze({
    ...Values_1.V.defineStaticCCValues(safe_1.CommandClasses.Notification, {
        ...Values_1.V.staticProperty("supportsV1Alarm", undefined, {
            internal: true,
            supportsEndpoints: false,
        }),
        ...Values_1.V.staticProperty("supportedNotificationTypes", undefined, {
            internal: true,
            supportsEndpoints: false,
        }),
        ...Values_1.V.staticProperty("notificationMode", undefined, {
            internal: true,
            supportsEndpoints: false,
        }),
        ...Values_1.V.staticProperty("lastRefresh", undefined, {
            internal: true,
        }),
        // V1 Alarm values
        ...Values_1.V.staticProperty("alarmType", {
            ...safe_1.ValueMetadata.ReadOnlyUInt8,
            label: "Alarm Type",
        }),
        ...Values_1.V.staticProperty("alarmLevel", {
            ...safe_1.ValueMetadata.ReadOnlyUInt8,
            label: "Alarm Level",
        }),
    }),
    ...Values_1.V.defineDynamicCCValues(safe_1.CommandClasses.Notification, {
        ...Values_1.V.dynamicPropertyAndKeyWithName("supportedNotificationEvents", "supportedNotificationEvents", (notificationType) => notificationType, ({ property, propertyKey }) => property === "supportedNotificationEvents" &&
            typeof propertyKey === "number", undefined, { internal: true, supportsEndpoints: false }),
        // Different variants of the V2 notification values:
        // Unknown type
        ...Values_1.V.dynamicPropertyWithName("unknownNotificationType", (notificationType) => `UNKNOWN_${(0, safe_2.num2hex)(notificationType)}`, ({ property }) => typeof property === "string" && /^UNKNOWN_0x/.test(property), (notificationType) => ({
            ...safe_1.ValueMetadata.ReadOnlyUInt8,
            label: `Unknown notification (${(0, safe_2.num2hex)(notificationType)})`,
            ccSpecific: { notificationType },
        })),
        // Known type, unknown variable
        ...Values_1.V.dynamicPropertyAndKeyWithName("unknownNotificationVariable", (notificationType, notificationName) => notificationName, "unknown", ({ property, propertyKey }) => typeof property === "string" && propertyKey === "unknown", (notificationType, notificationName) => ({
            ...safe_1.ValueMetadata.ReadOnlyUInt8,
            label: `${notificationName}: Unknown value`,
            ccSpecific: { notificationType },
        })),
        // (Stateful) notification variable
        ...Values_1.V.dynamicPropertyAndKeyWithName("notificationVariable", 
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        (notificationName, variableName) => notificationName, (notificationName, variableName) => variableName, ({ property, propertyKey }) => typeof property === "string" && typeof propertyKey === "string", 
        // Notification metadata is so dynamic, it does not make sense to define it here
        undefined),
    }),
});
function lookupNotificationNames(applHost, notificationTypes) {
    return notificationTypes
        .map((n) => {
        const ret = applHost.configManager.lookupNotification(n);
        return [n, ret];
    })
        .map(([type, ntfcn]) => ntfcn ? ntfcn.name : `UNKNOWN (${(0, safe_2.num2hex)(type)})`);
}
let NotificationCCAPI = class NotificationCCAPI extends API_1.PhysicalCCAPI {
    supportsCommand(cmd) {
        switch (cmd) {
            case _Types_1.NotificationCommand.Report:
            case _Types_1.NotificationCommand.Get:
                return true; // These exist starting with V1
            case _Types_1.NotificationCommand.Set:
            case _Types_1.NotificationCommand.SupportedGet:
                return this.version >= 2;
            case _Types_1.NotificationCommand.EventSupportedGet:
                return this.version >= 3;
        }
        return super.supportsCommand(cmd);
    }
    /**
     * @internal
     */
    async getInternal(options) {
        this.assertSupportsCommand(_Types_1.NotificationCommand, _Types_1.NotificationCommand.Get);
        const cc = new NotificationCCGet(this.applHost, {
            nodeId: this.endpoint.nodeId,
            endpoint: this.endpoint.index,
            ...options,
        });
        return this.applHost.sendCommand(cc, this.commandOptions);
    }
    async sendReport(options) {
        __assertType("options", "NotificationCCReportOptions", __assertType__NotificationCCReportOptions.bind(void 0, options));
        this.assertSupportsCommand(_Types_1.NotificationCommand, _Types_1.NotificationCommand.Report);
        const cc = new NotificationCCReport(this.applHost, {
            nodeId: this.endpoint.nodeId,
            endpoint: this.endpoint.index,
            ...options,
        });
        return this.applHost.sendCommand(cc, this.commandOptions);
    }
    async get(options) {
        __assertType("options", "NotificationCCGetSpecificOptions", __assertType__NotificationCCGetSpecificOptions.bind(void 0, options));
        const response = await this.getInternal(options);
        if (response) {
            return (0, safe_2.pick)(response, [
                "notificationStatus",
                "notificationEvent",
                "alarmLevel",
                "zensorNetSourceNodeId",
                "eventParameters",
                "sequenceNumber",
            ]);
        }
    }
    async set(notificationType, notificationStatus) {
        __assertType("notificationType", "number", __assertType__number.bind(void 0, notificationType));
        __assertType("notificationStatus", "boolean", __assertType__boolean.bind(void 0, notificationStatus));
        this.assertSupportsCommand(_Types_1.NotificationCommand, _Types_1.NotificationCommand.Set);
        const cc = new NotificationCCSet(this.applHost, {
            nodeId: this.endpoint.nodeId,
            endpoint: this.endpoint.index,
            notificationType,
            notificationStatus,
        });
        return this.applHost.sendCommand(cc, this.commandOptions);
    }
    // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
    async getSupported() {
        this.assertSupportsCommand(_Types_1.NotificationCommand, _Types_1.NotificationCommand.SupportedGet);
        const cc = new NotificationCCSupportedGet(this.applHost, {
            nodeId: this.endpoint.nodeId,
            endpoint: this.endpoint.index,
        });
        const response = await this.applHost.sendCommand(cc, this.commandOptions);
        if (response) {
            return (0, safe_2.pick)(response, [
                "supportsV1Alarm",
                "supportedNotificationTypes",
            ]);
        }
    }
    async getSupportedEvents(notificationType) {
        __assertType("notificationType", "number", __assertType__number.bind(void 0, notificationType));
        this.assertSupportsCommand(_Types_1.NotificationCommand, _Types_1.NotificationCommand.EventSupportedGet);
        const cc = new NotificationCCEventSupportedGet(this.applHost, {
            nodeId: this.endpoint.nodeId,
            endpoint: this.endpoint.index,
            notificationType,
        });
        const response = await this.applHost.sendCommand(cc, this.commandOptions);
        return response?.supportedEvents;
    }
};
NotificationCCAPI = __decorate([
    (0, CommandClassDecorators_1.API)(safe_1.CommandClasses.Notification)
], NotificationCCAPI);
exports.NotificationCCAPI = NotificationCCAPI;
function getNotificationEnumBehavior(notificationConfig, valueConfig) {
    const variable = notificationConfig.variables.find((v) => v.states.has(valueConfig.value));
    if (!variable)
        return "none";
    const numStatesWithEnums = [...variable.states.values()].filter((val) => val.parameter instanceof config_1.NotificationParameterWithEnum).length;
    if (numStatesWithEnums === 0)
        return "none";
    // An enum value replaces the original value if there is only a single possible state
    // which also has an enum parameter
    if (numStatesWithEnums === 1 && variable.states.size === 1)
        return "replace";
    return "extend";
}
function getNotificationStateValueWithEnum(stateValue, enumValue) {
    return (stateValue << 8) | enumValue;
}
exports.getNotificationStateValueWithEnum = getNotificationStateValueWithEnum;
/**
 * Returns the metadata to use for a known notification value.
 * Can be used to extend a previously defined metadata,
 * e.g. for V2 notifications that don't allow discovering supported events.
 */
function getNotificationValueMetadata(previous, notificationConfig, valueConfig) {
    const metadata = previous ?? {
        ...safe_1.ValueMetadata.ReadOnlyUInt8,
        label: valueConfig.variableName,
        states: {},
        ccSpecific: {
            notificationType: notificationConfig.id,
        },
    };
    if (valueConfig.idle) {
        metadata.states[0] = "idle";
    }
    const enumBehavior = getNotificationEnumBehavior(notificationConfig, valueConfig);
    if (enumBehavior !== "replace") {
        metadata.states[valueConfig.value] = valueConfig.label;
    }
    if (valueConfig.parameter instanceof config_1.NotificationParameterWithEnum) {
        for (const [value, label] of valueConfig.parameter.values) {
            metadata.states[getNotificationStateValueWithEnum(valueConfig.value, value)] = label;
        }
    }
    return metadata;
}
exports.getNotificationValueMetadata = getNotificationValueMetadata;
let NotificationCC = NotificationCC_1 = class NotificationCC extends CommandClass_1.CommandClass {
    // former AlarmCC (v1..v2)
    determineRequiredCCInterviews() {
        return [
            ...super.determineRequiredCCInterviews(),
            safe_1.CommandClasses.Association,
            safe_1.CommandClasses["Multi Channel Association"],
            safe_1.CommandClasses["Association Group Information"],
        ];
    }
    async determineNotificationMode(applHost, api, supportedNotificationEvents) {
        const node = this.getNode(applHost);
        // SDS14223: If the supporting node does not support the Association Command Class,
        // it may be concluded that the supporting node implements Pull Mode and discovery may be aborted.
        if (!node.supportsCC(safe_1.CommandClasses.Association))
            return "pull";
        try {
            if (node.supportsCC(safe_1.CommandClasses["Association Group Information"])) {
                const assocGroups = ccUtils.getAssociationGroups(applHost, node);
                for (const group of assocGroups.values()) {
                    // Check if this group sends Notification Reports
                    if (group.issuedCommands
                        ?.get(safe_1.CommandClasses.Notification)
                        ?.includes(_Types_1.NotificationCommand.Report)) {
                        return "push";
                    }
                }
                return "pull";
            }
        }
        catch {
            // We might be dealing with an older cache file, fall back to testing
        }
        applHost.controllerLog.logNode(node.id, {
            endpoint: this.endpointIndex,
            message: `determining whether this node is pull or push...`,
            direction: "outbound",
        });
        // Find a notification type with at least one supported event
        for (const [type, events] of supportedNotificationEvents) {
            if (events.length === 0)
                continue;
            // Enable the event and request the status
            await api.set(type, true);
            try {
                const resp = await api.get({
                    notificationType: type,
                    notificationEvent: events[0],
                });
                switch (resp?.notificationStatus) {
                    case 0xff:
                        return "push";
                    case 0xfe:
                    case 0x00:
                        return "pull";
                }
            }
            catch {
                /* ignore */
            }
        }
        // If everything failed, fall back to "pull"
        return "pull";
    }
    /** Whether the node implements push or pull notifications */
    static getNotificationMode(applHost, node) {
        return applHost
            .getValueDB(node.id)
            .getValue(exports.NotificationCCValues.notificationMode.id);
    }
    async interview(applHost) {
        const node = this.getNode(applHost);
        const endpoint = this.getEndpoint(applHost);
        const api = API_1.CCAPI.create(safe_1.CommandClasses.Notification, applHost, endpoint).withOptions({
            priority: safe_1.MessagePriority.NodeQuery,
        });
        applHost.controllerLog.logNode(node.id, {
            endpoint: this.endpointIndex,
            message: `Interviewing ${this.ccName}...`,
            direction: "none",
        });
        let supportsV1Alarm = false;
        if (this.version >= 2) {
            applHost.controllerLog.logNode(node.id, {
                endpoint: this.endpointIndex,
                message: "querying supported notification types...",
                direction: "outbound",
            });
            const suppResponse = await api.getSupported();
            if (!suppResponse) {
                applHost.controllerLog.logNode(node.id, {
                    endpoint: this.endpointIndex,
                    message: "Querying supported notification types timed out, skipping interview...",
                    level: "warn",
                });
                return;
            }
            supportsV1Alarm = suppResponse.supportsV1Alarm;
            const supportedNotificationTypes = suppResponse.supportedNotificationTypes;
            const supportedNotificationNames = lookupNotificationNames(applHost, supportedNotificationTypes);
            const supportedNotificationEvents = new Map();
            const logMessage = `received supported notification types:${supportedNotificationNames
                .map((name) => `\n· ${name}`)
                .join("")}`;
            applHost.controllerLog.logNode(node.id, {
                endpoint: this.endpointIndex,
                message: logMessage,
                direction: "inbound",
            });
            if (this.version >= 3) {
                // Query each notification for its supported events
                for (let i = 0; i < supportedNotificationTypes.length; i++) {
                    const type = supportedNotificationTypes[i];
                    const name = supportedNotificationNames[i];
                    applHost.controllerLog.logNode(node.id, {
                        endpoint: this.endpointIndex,
                        message: `querying supported notification events for ${name}...`,
                        direction: "outbound",
                    });
                    const supportedEvents = await api.getSupportedEvents(type);
                    if (supportedEvents) {
                        supportedNotificationEvents.set(type, supportedEvents);
                        applHost.controllerLog.logNode(node.id, {
                            endpoint: this.endpointIndex,
                            message: `received supported notification events for ${name}: ${supportedEvents
                                .map(String)
                                .join(", ")}`,
                            direction: "inbound",
                        });
                    }
                }
            }
            // Determine whether the node is a push or pull node
            let notificationMode = this.getValue(applHost, exports.NotificationCCValues.notificationMode);
            if (notificationMode !== "push" && notificationMode !== "pull") {
                notificationMode = await this.determineNotificationMode(applHost, api, supportedNotificationEvents);
                this.setValue(applHost, exports.NotificationCCValues.notificationMode, notificationMode);
            }
            if (notificationMode === "pull") {
                await this.refreshValues(applHost);
            } /* if (notificationMode === "push") */
            else {
                for (let i = 0; i < supportedNotificationTypes.length; i++) {
                    const type = supportedNotificationTypes[i];
                    const name = supportedNotificationNames[i];
                    const notificationConfig = applHost.configManager.lookupNotification(type);
                    // Enable reports for each notification type
                    applHost.controllerLog.logNode(node.id, {
                        endpoint: this.endpointIndex,
                        message: `enabling notifications for ${name}...`,
                        direction: "outbound",
                    });
                    await api.set(type, true);
                    // Set the value to idle if possible and there is no value yet
                    if (notificationConfig) {
                        const events = supportedNotificationEvents.get(type);
                        if (events) {
                            // Find all variables that are supported by this node and have an idle state
                            for (const variable of notificationConfig.variables.filter((v) => !!v.idle)) {
                                if ([...variable.states.keys()].some((key) => events.includes(key))) {
                                    const value = exports.NotificationCCValues.notificationVariable(notificationConfig.name, variable.name);
                                    // Set the value to idle if it has no value yet
                                    // TODO: GH#1028
                                    // * do this only if the last update was more than 5 minutes ago
                                    // * schedule an auto-idle if the last update was less than 5 minutes ago but before the current applHost start
                                    if (this.getValue(applHost, value) ==
                                        undefined) {
                                        this.setValue(applHost, value, 0 /* idle */);
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
        // Only create metadata for V1 values if necessary
        if (this.version === 1 || supportsV1Alarm) {
            this.ensureMetadata(applHost, exports.NotificationCCValues.alarmType);
            this.ensureMetadata(applHost, exports.NotificationCCValues.alarmLevel);
        }
        // Also create metadata for values mapped through compat config
        const mappings = applHost.getDeviceConfig?.(this.nodeId)
            ?.compat?.alarmMapping;
        if (mappings) {
            // Find all mappings to a valid notification variable
            for (const { to } of mappings) {
                const notificationConfig = applHost.configManager.lookupNotification(to.notificationType);
                if (!notificationConfig)
                    continue;
                const valueConfig = notificationConfig.lookupValue(to.notificationEvent);
                if (valueConfig?.type !== "state")
                    continue;
                const notificationValue = exports.NotificationCCValues.notificationVariable(notificationConfig.name, valueConfig.variableName);
                // Create or update the metadata
                const metadata = getNotificationValueMetadata(this.getMetadata(applHost, notificationValue), notificationConfig, valueConfig);
                this.setMetadata(applHost, notificationValue, metadata);
                // Set the value to idle if it has no value yet
                if (valueConfig.idle) {
                    // TODO: GH#1028
                    // * do this only if the last update was more than 5 minutes ago
                    // * schedule an auto-idle if the last update was less than 5 minutes ago but before the current applHost start
                    if (this.getValue(applHost, notificationValue) == undefined) {
                        this.setValue(applHost, notificationValue, 0 /* idle */);
                    }
                }
            }
        }
        // Remember that the interview is complete
        this.setInterviewComplete(applHost, true);
    }
    async refreshValues(applHost) {
        const node = this.getNode(applHost);
        // Refreshing values only works on pull nodes
        if (NotificationCC_1.getNotificationMode(applHost, node) === "pull") {
            const endpoint = this.getEndpoint(applHost);
            const api = API_1.CCAPI.create(safe_1.CommandClasses.Notification, applHost, endpoint).withOptions({
                priority: safe_1.MessagePriority.NodeQuery,
            });
            // Load supported notification types and events from cache
            const supportedNotificationTypes = this.getValue(applHost, exports.NotificationCCValues.supportedNotificationTypes) ?? [];
            const supportedNotificationNames = lookupNotificationNames(applHost, supportedNotificationTypes);
            for (let i = 0; i < supportedNotificationTypes.length; i++) {
                const type = supportedNotificationTypes[i];
                const name = supportedNotificationNames[i];
                // Always query each notification for its current status
                applHost.controllerLog.logNode(node.id, {
                    endpoint: this.endpointIndex,
                    message: `querying notification status for ${name}...`,
                    direction: "outbound",
                });
                const response = await api.getInternal({
                    notificationType: type,
                });
                // NotificationReports don't store their values themselves,
                // because the behaviour is too complex and spans the lifetime
                // of several reports. Thus we handle it in the Node instance
                // @ts-expect-error
                if (response)
                    await node.handleCommand(response);
            }
            // Remember when we did this
            this.setValue(applHost, exports.NotificationCCValues.lastRefresh, Date.now());
        }
    }
    shouldRefreshValues(applHost) {
        // Pull-mode nodes must be polled regularly
        const isPullMode = NotificationCC_1.getNotificationMode(applHost, this.getNode(applHost)) === "pull";
        if (!isPullMode)
            return false;
        const lastUpdated = this.getValue(applHost, exports.NotificationCCValues.lastRefresh);
        return (lastUpdated == undefined ||
            Date.now() - lastUpdated > core_1.timespan.hours(6));
    }
};
NotificationCC = NotificationCC_1 = __decorate([
    (0, CommandClassDecorators_1.commandClass)(safe_1.CommandClasses.Notification),
    (0, CommandClassDecorators_1.implementedVersion)(8),
    (0, CommandClassDecorators_1.ccValues)(exports.NotificationCCValues)
], NotificationCC);
exports.NotificationCC = NotificationCC;
let NotificationCCSet = class NotificationCCSet extends NotificationCC {
    constructor(host, options) {
        super(host, options);
        if ((0, CommandClass_1.gotDeserializationOptions)(options)) {
            // TODO: Deserialize payload
            throw new safe_1.ZWaveError(`${this.constructor.name}: deserialization not implemented`, safe_1.ZWaveErrorCodes.Deserialization_NotImplemented);
        }
        else {
            this.notificationType = options.notificationType;
            this.notificationStatus = options.notificationStatus;
        }
    }
    serialize() {
        this.payload = Buffer.from([
            this.notificationType,
            this.notificationStatus ? 0xff : 0x00,
        ]);
        return super.serialize();
    }
    toLogEntry(applHost) {
        return {
            ...super.toLogEntry(applHost),
            message: {
                "notification type": applHost.configManager.getNotificationName(this.notificationType),
                status: this.notificationStatus,
            },
        };
    }
};
NotificationCCSet = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.NotificationCommand.Set),
    (0, CommandClassDecorators_1.useSupervision)()
], NotificationCCSet);
exports.NotificationCCSet = NotificationCCSet;
let NotificationCCReport = class NotificationCCReport extends NotificationCC {
    constructor(host, options) {
        super(host, options);
        if ((0, CommandClass_1.gotDeserializationOptions)(options)) {
            (0, safe_1.validatePayload)(this.payload.length >= 2);
            this.alarmType = this.payload[0];
            this.alarmLevel = this.payload[1];
            // V2..V3, reserved in V4+
            if ((this.version === 2 || this.version === 3) &&
                this.payload.length >= 3) {
                this.zensorNetSourceNodeId = this.payload[2];
            }
            // V2+ requires the alarm bytes to be zero. Manufacturers don't care though, so we don't enforce that.
            // Don't use the version to decide because we might discard notifications
            // before the interview is complete
            if (this.payload.length >= 7) {
                this.notificationStatus = this.payload[3];
                this.notificationType = this.payload[4];
                this.notificationEvent = this.payload[5];
                const containsSeqNum = !!(this.payload[6] & 128);
                const numEventParams = this.payload[6] & 0b11111;
                if (numEventParams > 0) {
                    (0, safe_1.validatePayload)(this.payload.length >= 7 + numEventParams);
                    this.eventParameters = Buffer.from(this.payload.slice(7, 7 + numEventParams));
                }
                if (containsSeqNum) {
                    (0, safe_1.validatePayload)(this.payload.length >= 7 + numEventParams + 1);
                    this.sequenceNumber = this.payload[7 + numEventParams];
                }
            }
            // Store the V1 alarm values if they exist
        }
        else {
            // Create a notification to send
            if ("alarmType" in options) {
                this.alarmType = options.alarmType;
                this.alarmLevel = options.alarmLevel;
                // Send a V1 command
                this.version = 1;
            }
            else {
                this.notificationType = options.notificationType;
                this.notificationStatus = true;
                this.notificationEvent = options.notificationEvent;
                this.eventParameters = options.eventParameters;
                this.sequenceNumber = options.sequenceNumber;
            }
        }
    }
    persistValues(applHost) {
        if (!super.persistValues(applHost))
            return false;
        // Check if we need to re-interpret the alarm values somehow
        if (this.alarmType != undefined &&
            this.alarmLevel != undefined &&
            this.alarmType !== 0) {
            if (this.version >= 2) {
                // Check if the device actually supports Notification CC, but chooses
                // to send Alarm frames instead (GH#1034)
                const supportedNotificationTypes = this.getValue(applHost, exports.NotificationCCValues.supportedNotificationTypes);
                if ((0, typeguards_1.isArray)(supportedNotificationTypes) &&
                    supportedNotificationTypes.includes(this.alarmType)) {
                    const supportedNotificationEvents = this.getValue(applHost, exports.NotificationCCValues.supportedNotificationEvents(this.alarmType));
                    if ((0, typeguards_1.isArray)(supportedNotificationEvents) &&
                        supportedNotificationEvents.includes(this.alarmLevel)) {
                        // This alarm frame corresponds to a valid notification event
                        applHost.controllerLog.logNode(this.nodeId, `treating V1 Alarm frame as Notification Report`);
                        this.notificationType = this.alarmType;
                        this.notificationEvent = this.alarmLevel;
                        this.alarmType = undefined;
                        this.alarmLevel = undefined;
                    }
                }
            }
            else {
                // V1 Alarm, check if there is a compat option to map this V1 report to a V2+ report
                const mapping = this.host.getDeviceConfig?.(this.nodeId)?.compat?.alarmMapping;
                const match = mapping?.find((m) => m.from.alarmType === this.alarmType &&
                    (m.from.alarmLevel == undefined ||
                        m.from.alarmLevel === this.alarmLevel));
                if (match) {
                    applHost.controllerLog.logNode(this.nodeId, `compat mapping found, treating V1 Alarm frame as Notification Report`);
                    this.notificationType = match.to.notificationType;
                    this.notificationEvent = match.to.notificationEvent;
                    if (match.to.eventParameters) {
                        this.eventParameters = {};
                        for (const [key, val] of Object.entries(match.to.eventParameters)) {
                            if (typeof val === "number") {
                                this.eventParameters[key] = val;
                            }
                            else if (val === "alarmLevel") {
                                this.eventParameters[key] = this.alarmLevel;
                            }
                        }
                    }
                    // After mapping we do not set the legacy V1 values to undefined
                    // Otherwise, adding a new mapping will be a breaking change
                }
            }
        }
        // Now we can interpret the event parameters and turn them into something useful
        this.parseEventParameters(applHost);
        if (this.alarmType != undefined) {
            const alarmTypeValue = exports.NotificationCCValues.alarmType;
            this.ensureMetadata(applHost, alarmTypeValue);
            this.setValue(applHost, alarmTypeValue, this.alarmType);
        }
        if (this.alarmLevel != undefined) {
            const alarmLevelValue = exports.NotificationCCValues.alarmLevel;
            this.ensureMetadata(applHost, alarmLevelValue);
            this.setValue(applHost, alarmLevelValue, this.alarmLevel);
        }
        return true;
    }
    toLogEntry(applHost) {
        let message = {};
        if (this.alarmType) {
            message = {
                "V1 alarm type": this.alarmType,
                "V1 alarm level": this.alarmLevel,
            };
        }
        let valueConfig;
        if (this.notificationType) {
            try {
                valueConfig = applHost.configManager
                    .lookupNotification(this.notificationType)
                    ?.lookupValue(this.notificationEvent);
            }
            catch {
                /* ignore */
            }
            if (valueConfig) {
                message = {
                    ...message,
                    "notification type": applHost.configManager.getNotificationName(this.notificationType),
                    "notification status": this.notificationStatus,
                    [`notification ${valueConfig.type}`]: valueConfig.label ??
                        `Unknown (${(0, safe_2.num2hex)(this.notificationEvent)})`,
                };
            }
            else if (this.notificationEvent === 0x00) {
                message = {
                    ...message,
                    "notification type": this.notificationType,
                    "notification status": this.notificationStatus,
                    "notification state": "idle",
                };
            }
            else {
                message = {
                    ...message,
                    "notification type": this.notificationType,
                    "notification status": this.notificationStatus,
                    "notification event": (0, safe_2.num2hex)(this.notificationEvent),
                };
            }
        }
        if (this.zensorNetSourceNodeId) {
            message["zensor net source node id"] = this.zensorNetSourceNodeId;
        }
        if (this.sequenceNumber != undefined) {
            message["sequence number"] = this.sequenceNumber;
        }
        if (this.eventParameters != undefined) {
            if (typeof this.eventParameters === "number") {
                // Try to look up the enum label
                let found = false;
                if (valueConfig?.parameter instanceof
                    config_1.NotificationParameterWithEnum) {
                    const label = valueConfig.parameter.values.get(this.eventParameters);
                    if (label) {
                        message["state parameters"] = label;
                        found = true;
                    }
                }
                if (!found) {
                    message["state parameters"] = (0, safe_2.num2hex)(this.eventParameters);
                }
            }
            else if (Buffer.isBuffer(this.eventParameters)) {
                message["event parameters"] = (0, safe_2.buffer2hex)(this.eventParameters);
            }
            else if (this.eventParameters instanceof safe_1.Duration) {
                message["event parameters"] = this.eventParameters.toString();
            }
            else {
                message["event parameters"] = Object.entries(this.eventParameters)
                    .map(([param, val]) => `\n  ${param}: ${(0, safe_2.num2hex)(val)}`)
                    .join("");
            }
        }
        return {
            ...super.toLogEntry(applHost),
            message,
        };
    }
    parseEventParameters(applHost) {
        // This only makes sense for V2+ notifications with a non-empty event parameters buffer
        if (this.notificationType == undefined ||
            this.notificationEvent == undefined ||
            !Buffer.isBuffer(this.eventParameters)) {
            return;
        }
        // Look up the received notification and value in the config
        const notificationConfig = applHost.configManager.lookupNotification(this.notificationType);
        if (!notificationConfig)
            return;
        const valueConfig = notificationConfig.lookupValue(this.notificationEvent);
        if (!valueConfig)
            return;
        // Parse the event parameters if possible
        if (valueConfig.parameter instanceof config_1.NotificationParameterWithDuration) {
            // The parameters contain a Duration
            this.eventParameters = safe_1.Duration.parseReport(this.eventParameters[0]);
        }
        else if (valueConfig.parameter instanceof
            config_1.NotificationParameterWithCommandClass) {
            // The parameters **should** contain a CC, however there might be some exceptions
            if (this.eventParameters.length === 1 &&
                notificationConfig.id === 0x06 &&
                (this.notificationEvent === 0x05 ||
                    this.notificationEvent === 0x06)) {
                // Access control -> Keypad Lock/Unlock operation
                // Some devices only send the User ID, not a complete CC payload
                this.eventParameters = {
                    userId: this.eventParameters[0],
                };
            }
            else {
                // Try to parse the event parameters - if this fails, we should still handle the notification report
                try {
                    // Convert CommandClass instances to a standardized object representation
                    const cc = CommandClass_1.CommandClass.from(this.host, {
                        data: this.eventParameters,
                        fromEncapsulation: true,
                        encapCC: this,
                    });
                    (0, safe_1.validatePayload)(!(cc instanceof CommandClass_1.InvalidCC));
                    if ((0, NotificationEventPayload_1.isNotificationEventPayload)(cc)) {
                        this.eventParameters =
                            cc.toNotificationEventParameters();
                    }
                    else {
                        // If a CC has no good toJSON() representation, we're only interested in the payload
                        let json = cc.toJSON();
                        if ("nodeId" in json &&
                            "ccId" in json &&
                            "payload" in json) {
                            json = (0, safe_2.pick)(json, ["payload"]);
                        }
                        this.eventParameters = json;
                    }
                }
                catch (e) {
                    if ((0, safe_1.isZWaveError)(e) &&
                        e.code ===
                            safe_1.ZWaveErrorCodes.PacketFormat_InvalidPayload &&
                        Buffer.isBuffer(this.eventParameters)) {
                        const ccId = CommandClass_1.CommandClass.getCommandClass(this.eventParameters);
                        const ccCommand = CommandClass_1.CommandClass.getCCCommand(this.eventParameters);
                        if (ccId === safe_1.CommandClasses["User Code"] &&
                            ccCommand === _Types_1.UserCodeCommand.Report &&
                            this.eventParameters.length >= 3) {
                            // Access control -> Keypad Lock/Unlock operation
                            // Some devices report the user code with truncated UserCode reports
                            this.eventParameters = {
                                userId: this.eventParameters[2],
                            };
                        }
                        else {
                            applHost.controllerLog.logNode(this.nodeId, `Failed to parse Notification CC event parameters, ignoring them...`, "error");
                        }
                    }
                    else {
                        // unexpected error
                        throw e;
                    }
                }
            }
        }
        else if (valueConfig.parameter instanceof config_1.NotificationParameterWithValue) {
            // The parameters contain a named value
            this.eventParameters = {
                [valueConfig.parameter.propertyName]: this.eventParameters.readUIntBE(0, this.eventParameters.length),
            };
        }
        else if (valueConfig.parameter instanceof config_1.NotificationParameterWithEnum) {
            // The parameters may contain an enum value
            this.eventParameters =
                this.eventParameters.length === 1
                    ? this.eventParameters[0]
                    : undefined;
        }
    }
    serialize() {
        if (this.version === 1) {
            if (this.alarmLevel == undefined || this.alarmType == undefined) {
                throw new safe_1.ZWaveError(`Notification CC V1 (Alarm CC) reports requires the alarm type and level to be set!`, safe_1.ZWaveErrorCodes.Argument_Invalid);
            }
            this.payload = Buffer.from([this.alarmType, this.alarmLevel]);
        }
        else {
            if (this.notificationType == undefined ||
                this.notificationEvent == undefined) {
                throw new safe_1.ZWaveError(`Notification CC reports requires the notification type and event to be set!`, safe_1.ZWaveErrorCodes.Argument_Invalid);
            }
            else if (this.eventParameters != undefined &&
                !Buffer.isBuffer(this.eventParameters)) {
                throw new safe_1.ZWaveError(`When sending Notification CC reports, the event parameters can only be buffers!`, safe_1.ZWaveErrorCodes.Argument_Invalid);
            }
            const controlByte = (this.sequenceNumber != undefined ? 128 : 0) |
                ((this.eventParameters?.length ?? 0) & 0b11111);
            this.payload = Buffer.from([
                0,
                0,
                0,
                0xff,
                this.notificationType,
                this.notificationEvent,
                controlByte,
            ]);
            if (this.eventParameters) {
                this.payload = Buffer.concat([
                    this.payload,
                    this.eventParameters,
                ]);
            }
            if (this.sequenceNumber != undefined) {
                this.payload = Buffer.concat([
                    this.payload,
                    Buffer.from([this.sequenceNumber]),
                ]);
            }
        }
        return super.serialize();
    }
};
NotificationCCReport = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.NotificationCommand.Report),
    (0, CommandClassDecorators_1.useSupervision)()
], NotificationCCReport);
exports.NotificationCCReport = NotificationCCReport;
let NotificationCCGet = class NotificationCCGet extends NotificationCC {
    constructor(host, options) {
        super(host, options);
        if ((0, CommandClass_1.gotDeserializationOptions)(options)) {
            (0, safe_1.validatePayload)(this.payload.length >= 1);
            this.alarmType = this.payload[0] || undefined;
            if (this.payload.length >= 2) {
                this.notificationType = this.payload[1] || undefined;
                if (this.payload.length >= 3 && this.notificationType != 0xff) {
                    this.notificationEvent = this.payload[2];
                }
            }
        }
        else {
            if ("alarmType" in options) {
                this.alarmType = options.alarmType;
            }
            else {
                this.notificationType = options.notificationType;
                this.notificationEvent = options.notificationEvent;
            }
        }
    }
    serialize() {
        const payload = [this.alarmType || 0];
        if (this.version >= 2 && this.notificationType != undefined) {
            payload.push(this.notificationType);
            if (this.version >= 3) {
                payload.push(this.notificationType === 0xff
                    ? 0x00
                    : this.notificationEvent || 0);
            }
        }
        this.payload = Buffer.from(payload);
        return super.serialize();
    }
    toLogEntry(applHost) {
        const message = {};
        if (this.alarmType != undefined) {
            message["V1 alarm type"] = this.alarmType;
        }
        if (this.notificationType != undefined) {
            message["notification type"] =
                applHost.configManager.getNotificationName(this.notificationType);
            if (this.notificationEvent != undefined) {
                message["notification event"] =
                    applHost.configManager
                        .lookupNotification(this.notificationType)
                        ?.events.get(this.notificationEvent)?.label ??
                        `Unknown (${(0, safe_2.num2hex)(this.notificationEvent)})`;
            }
        }
        return {
            ...super.toLogEntry(applHost),
            message,
        };
    }
};
NotificationCCGet = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.NotificationCommand.Get),
    (0, CommandClassDecorators_1.expectedCCResponse)(NotificationCCReport)
], NotificationCCGet);
exports.NotificationCCGet = NotificationCCGet;
let NotificationCCSupportedReport = class NotificationCCSupportedReport extends NotificationCC {
    constructor(host, options) {
        super(host, options);
        if ((0, CommandClass_1.gotDeserializationOptions)(options)) {
            (0, safe_1.validatePayload)(this.payload.length >= 1);
            this.supportsV1Alarm = !!(this.payload[0] & 128);
            const numBitMaskBytes = this.payload[0] & 31;
            (0, safe_1.validatePayload)(numBitMaskBytes > 0, this.payload.length >= 1 + numBitMaskBytes);
            const notificationBitMask = this.payload.slice(1, 1 + numBitMaskBytes);
            this.supportedNotificationTypes = (0, safe_1.parseBitMask)(notificationBitMask, 
            // bit 0 is ignored, but counting still starts at 1, so the first bit must have the value 0
            0);
        }
        else {
            this.supportsV1Alarm = options.supportsV1Alarm;
            this.supportedNotificationTypes =
                options.supportedNotificationTypes;
        }
    }
    serialize() {
        const bitMask = (0, safe_1.encodeBitMask)(this.supportedNotificationTypes, Math.max(...this.supportedNotificationTypes), 0);
        this.payload = Buffer.concat([
            Buffer.from([
                (this.supportsV1Alarm ? 128 : 0) | bitMask.length,
            ]),
            bitMask,
        ]);
        return super.serialize();
    }
    toLogEntry(applHost) {
        return {
            ...super.toLogEntry(applHost),
            message: {
                "supports V1 alarm": this.supportsV1Alarm,
                "supported notification types": this.supportedNotificationTypes
                    .map((t) => `\n· ${applHost.configManager.getNotificationName(t)}`)
                    .join(""),
            },
        };
    }
};
__decorate([
    (0, CommandClassDecorators_1.ccValue)(exports.NotificationCCValues.supportsV1Alarm)
], NotificationCCSupportedReport.prototype, "supportsV1Alarm", void 0);
__decorate([
    (0, CommandClassDecorators_1.ccValue)(exports.NotificationCCValues.supportedNotificationTypes)
], NotificationCCSupportedReport.prototype, "supportedNotificationTypes", void 0);
NotificationCCSupportedReport = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.NotificationCommand.SupportedReport)
], NotificationCCSupportedReport);
exports.NotificationCCSupportedReport = NotificationCCSupportedReport;
let NotificationCCSupportedGet = class NotificationCCSupportedGet extends NotificationCC {
};
NotificationCCSupportedGet = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.NotificationCommand.SupportedGet),
    (0, CommandClassDecorators_1.expectedCCResponse)(NotificationCCSupportedReport)
], NotificationCCSupportedGet);
exports.NotificationCCSupportedGet = NotificationCCSupportedGet;
let NotificationCCEventSupportedReport = class NotificationCCEventSupportedReport extends NotificationCC {
    constructor(host, options) {
        super(host, options);
        if ((0, CommandClass_1.gotDeserializationOptions)(options)) {
            (0, safe_1.validatePayload)(this.payload.length >= 1);
            this.notificationType = this.payload[0];
            const numBitMaskBytes = this.payload[1] & 31;
            if (numBitMaskBytes === 0) {
                // Notification type is not supported
                this.supportedEvents = [];
                return;
            }
            (0, safe_1.validatePayload)(this.payload.length >= 2 + numBitMaskBytes);
            const eventBitMask = this.payload.slice(2, 2 + numBitMaskBytes);
            this.supportedEvents = (0, safe_1.parseBitMask)(eventBitMask, 
            // In this mask, bit 0 is ignored, but counting still starts at 1, so the first bit must have the value 0
            0);
        }
        else {
            this.notificationType = options.notificationType;
            this.supportedEvents = options.supportedEvents;
        }
    }
    persistValues(applHost) {
        if (!super.persistValues(applHost))
            return false;
        // Store which events this notification supports
        this.setValue(applHost, exports.NotificationCCValues.supportedNotificationEvents(this.notificationType), this.supportedEvents);
        // For each event, predefine the value metadata
        const notificationConfig = applHost.configManager.lookupNotification(this.notificationType);
        if (!notificationConfig) {
            // This is an unknown notification
            this.setMetadata(applHost, exports.NotificationCCValues.unknownNotificationType(this.notificationType));
        }
        else {
            // This is a standardized notification
            let isFirst = true;
            for (const value of this.supportedEvents) {
                // Find out which property we need to update
                const valueConfig = notificationConfig.lookupValue(value);
                if (valueConfig?.type === "state") {
                    const notificationValue = exports.NotificationCCValues.notificationVariable(notificationConfig.name, valueConfig.variableName);
                    // After we've created the metadata initially, extend it
                    const metadata = getNotificationValueMetadata(isFirst
                        ? undefined
                        : this.getMetadata(applHost, notificationValue), notificationConfig, valueConfig);
                    this.setMetadata(applHost, notificationValue, metadata);
                    isFirst = false;
                }
            }
        }
        return true;
    }
    serialize() {
        this.payload = Buffer.from([this.notificationType, 0]);
        if (this.supportedEvents.length > 0) {
            const bitMask = (0, safe_1.encodeBitMask)(this.supportedEvents, Math.max(...this.supportedEvents), 0);
            this.payload[1] = bitMask.length;
            this.payload = Buffer.concat([this.payload, bitMask]);
        }
        return super.serialize();
    }
    toLogEntry(applHost) {
        const notification = applHost.configManager.lookupNotification(this.notificationType);
        return {
            ...super.toLogEntry(applHost),
            message: {
                "notification type": applHost.configManager.getNotificationName(this.notificationType),
                "supported events": this.supportedEvents
                    .map((e) => `\n· ${notification?.lookupValue(e)?.label ??
                    `Unknown (${(0, safe_2.num2hex)(e)})`}`)
                    .join(""),
            },
        };
    }
};
NotificationCCEventSupportedReport = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.NotificationCommand.EventSupportedReport)
], NotificationCCEventSupportedReport);
exports.NotificationCCEventSupportedReport = NotificationCCEventSupportedReport;
let NotificationCCEventSupportedGet = class NotificationCCEventSupportedGet extends NotificationCC {
    constructor(host, options) {
        super(host, options);
        if ((0, CommandClass_1.gotDeserializationOptions)(options)) {
            (0, safe_1.validatePayload)(this.payload.length >= 1);
            this.notificationType = this.payload[0];
        }
        else {
            this.notificationType = options.notificationType;
        }
    }
    serialize() {
        this.payload = Buffer.from([this.notificationType]);
        return super.serialize();
    }
    toLogEntry(applHost) {
        return {
            ...super.toLogEntry(applHost),
            message: {
                "notification type": applHost.configManager.getNotificationName(this.notificationType),
            },
        };
    }
};
NotificationCCEventSupportedGet = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.NotificationCommand.EventSupportedGet),
    (0, CommandClassDecorators_1.expectedCCResponse)(NotificationCCEventSupportedReport)
], NotificationCCEventSupportedGet);
exports.NotificationCCEventSupportedGet = NotificationCCEventSupportedGet;
//# sourceMappingURL=NotificationCC.js.map