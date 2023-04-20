"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var _a, _b;
Object.defineProperty(exports, "__esModule", { value: true });
exports.EntryControlCCConfigurationSet = exports.EntryControlCCConfigurationGet = exports.EntryControlCCConfigurationReport = exports.EntryControlCCEventSupportedGet = exports.EntryControlCCEventSupportedReport = exports.EntryControlCCKeySupportedGet = exports.EntryControlCCKeySupportedReport = exports.EntryControlCCNotification = exports.EntryControlCC = exports.EntryControlCCAPI = exports.EntryControlCCValues = void 0;
function __assertType(argName, typeName, boundHasError) {
    const { ZWaveError, ZWaveErrorCodes } = require("@zwave-js/core");
    if (boundHasError()) {
        throw new ZWaveError(typeName ? `${argName} is not a ${typeName}` : `${argName} has the wrong type`, ZWaveErrorCodes.Argument_Invalid);
    }
}
const __assertType__number = $o => {
    function _number($o) {
        return typeof $o !== "number" ? {} : null;
    }
    return _number($o);
};
const safe_1 = require("@zwave-js/core/safe");
const safe_2 = require("@zwave-js/shared/safe");
const API_1 = require("../lib/API");
const CommandClass_1 = require("../lib/CommandClass");
const CommandClassDecorators_1 = require("../lib/CommandClassDecorators");
const Values_1 = require("../lib/Values");
const _Types_1 = require("../lib/_Types");
exports.EntryControlCCValues = Object.freeze({
    ...Values_1.V.defineStaticCCValues(safe_1.CommandClasses["Entry Control"], {
        ...Values_1.V.staticProperty("keyCacheSize", {
            ...safe_1.ValueMetadata.UInt8,
            label: "Key cache size",
            description: "Number of character that must be stored before sending",
            min: 1,
            max: 32,
        }),
        ...Values_1.V.staticProperty("keyCacheTimeout", {
            ...safe_1.ValueMetadata.UInt8,
            label: "Key cache timeout",
            unit: "seconds",
            description: "How long the key cache must wait for additional characters",
            min: 1,
            max: 10,
        }),
        ...Values_1.V.staticProperty("supportedDataTypes", undefined, {
            internal: true,
        }),
        ...Values_1.V.staticProperty("supportedEventTypes", undefined, {
            internal: true,
        }),
        ...Values_1.V.staticProperty("supportedKeys", undefined, {
            internal: true,
        }),
    }),
});
let EntryControlCCAPI = class EntryControlCCAPI extends API_1.CCAPI {
    constructor() {
        super(...arguments);
        this[_a] = async ({ property }, value) => {
            if (property !== "keyCacheSize" && property !== "keyCacheTimeout") {
                (0, API_1.throwUnsupportedProperty)(this.ccId, property);
            }
            if (typeof value !== "number") {
                (0, API_1.throwWrongValueType)(this.ccId, property, "number", typeof value);
            }
            let keyCacheSize = value;
            let keyCacheTimeout = 2;
            if (property === "keyCacheTimeout") {
                keyCacheTimeout = value;
                const oldKeyCacheSize = this.tryGetValueDB()?.getValue(exports.EntryControlCCValues.keyCacheSize.endpoint(this.endpoint.index));
                if (oldKeyCacheSize == undefined) {
                    throw new safe_1.ZWaveError(`The "keyCacheTimeout" property cannot be changed before the key cache size is known!`, safe_1.ZWaveErrorCodes.Argument_Invalid);
                }
                keyCacheSize = oldKeyCacheSize;
            }
            const result = await this.setConfiguration(keyCacheSize, keyCacheTimeout);
            // Verify the change after a short delay, unless the command was supervised and successful
            if (this.isSinglecast() && !(0, safe_1.supervisedCommandSucceeded)(result)) {
                this.schedulePoll({ property }, value, { transition: "fast" });
            }
            return result;
        };
        this[_b] = async ({ property, }) => {
            switch (property) {
                case "keyCacheSize":
                case "keyCacheTimeout":
                    return (await this.getConfiguration())?.[property];
            }
            (0, API_1.throwUnsupportedProperty)(this.ccId, property);
        };
    }
    supportsCommand(cmd) {
        switch (cmd) {
            case _Types_1.EntryControlCommand.KeySupportedGet:
            case _Types_1.EntryControlCommand.EventSupportedGet:
            case _Types_1.EntryControlCommand.ConfigurationGet:
                return this.isSinglecast();
            case _Types_1.EntryControlCommand.ConfigurationSet:
                return true;
        }
        return super.supportsCommand(cmd);
    }
    // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
    async getSupportedKeys() {
        this.assertSupportsCommand(_Types_1.EntryControlCommand, _Types_1.EntryControlCommand.KeySupportedGet);
        const cc = new EntryControlCCKeySupportedGet(this.applHost, {
            nodeId: this.endpoint.nodeId,
            endpoint: this.endpoint.index,
        });
        const response = await this.applHost.sendCommand(cc, this.commandOptions);
        return response?.supportedKeys;
    }
    // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
    async getEventCapabilities() {
        this.assertSupportsCommand(_Types_1.EntryControlCommand, _Types_1.EntryControlCommand.EventSupportedGet);
        const cc = new EntryControlCCEventSupportedGet(this.applHost, {
            nodeId: this.endpoint.nodeId,
            endpoint: this.endpoint.index,
        });
        const response = await this.applHost.sendCommand(cc, this.commandOptions);
        if (response) {
            return (0, safe_2.pick)(response, [
                "supportedDataTypes",
                "supportedEventTypes",
                "minKeyCacheSize",
                "maxKeyCacheSize",
                "minKeyCacheTimeout",
                "maxKeyCacheTimeout",
            ]);
        }
    }
    // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
    async getConfiguration() {
        this.assertSupportsCommand(_Types_1.EntryControlCommand, _Types_1.EntryControlCommand.ConfigurationGet);
        const cc = new EntryControlCCConfigurationGet(this.applHost, {
            nodeId: this.endpoint.nodeId,
            endpoint: this.endpoint.index,
        });
        const response = await this.applHost.sendCommand(cc, this.commandOptions);
        if (response) {
            return (0, safe_2.pick)(response, ["keyCacheSize", "keyCacheTimeout"]);
        }
    }
    async setConfiguration(keyCacheSize, keyCacheTimeout) {
        __assertType("keyCacheSize", "number", __assertType__number.bind(void 0, keyCacheSize));
        __assertType("keyCacheTimeout", "number", __assertType__number.bind(void 0, keyCacheTimeout));
        this.assertSupportsCommand(_Types_1.EntryControlCommand, _Types_1.EntryControlCommand.ConfigurationGet);
        const cc = new EntryControlCCConfigurationSet(this.applHost, {
            nodeId: this.endpoint.nodeId,
            endpoint: this.endpoint.index,
            keyCacheSize,
            keyCacheTimeout,
        });
        return this.applHost.sendCommand(cc, this.commandOptions);
    }
};
_a = API_1.SET_VALUE;
_b = API_1.POLL_VALUE;
EntryControlCCAPI = __decorate([
    (0, CommandClassDecorators_1.API)(safe_1.CommandClasses["Entry Control"])
], EntryControlCCAPI);
exports.EntryControlCCAPI = EntryControlCCAPI;
let EntryControlCC = class EntryControlCC extends CommandClass_1.CommandClass {
    async interview(applHost) {
        const node = this.getNode(applHost);
        const endpoint = this.getEndpoint(applHost);
        const api = API_1.CCAPI.create(safe_1.CommandClasses["Entry Control"], applHost, endpoint).withOptions({
            priority: safe_1.MessagePriority.NodeQuery,
        });
        applHost.controllerLog.logNode(node.id, {
            endpoint: this.endpointIndex,
            message: `Interviewing ${this.ccName}...`,
            direction: "none",
        });
        applHost.controllerLog.logNode(node.id, {
            endpoint: this.endpointIndex,
            message: "requesting entry control supported keys...",
            direction: "outbound",
        });
        const supportedKeys = await api.getSupportedKeys();
        if (supportedKeys) {
            applHost.controllerLog.logNode(node.id, {
                endpoint: this.endpointIndex,
                message: `received entry control supported keys: ${supportedKeys.toString()}`,
                direction: "inbound",
            });
        }
        applHost.controllerLog.logNode(node.id, {
            endpoint: this.endpointIndex,
            message: "requesting entry control supported events...",
            direction: "outbound",
        });
        const eventCapabilities = await api.getEventCapabilities();
        if (eventCapabilities) {
            applHost.controllerLog.logNode(node.id, {
                endpoint: this.endpointIndex,
                message: `received entry control supported keys:
data types:            ${eventCapabilities.supportedDataTypes
                    .map((e) => _Types_1.EntryControlDataTypes[e])
                    .toString()}
event types:           ${eventCapabilities.supportedEventTypes
                    .map((e) => _Types_1.EntryControlEventTypes[e])
                    .toString()}
min key cache size:    ${eventCapabilities.minKeyCacheSize}
max key cache size:    ${eventCapabilities.maxKeyCacheSize}
min key cache timeout: ${eventCapabilities.minKeyCacheTimeout} seconds
max key cache timeout: ${eventCapabilities.maxKeyCacheTimeout} seconds`,
                direction: "inbound",
            });
        }
        await this.refreshValues(applHost);
        // Remember that the interview is complete
        this.setInterviewComplete(applHost, true);
    }
    async refreshValues(applHost) {
        const node = this.getNode(applHost);
        const endpoint = this.getEndpoint(applHost);
        const api = API_1.CCAPI.create(safe_1.CommandClasses["Entry Control"], applHost, endpoint).withOptions({
            priority: safe_1.MessagePriority.NodeQuery,
        });
        applHost.controllerLog.logNode(node.id, {
            endpoint: this.endpointIndex,
            message: "requesting entry control configuration...",
            direction: "outbound",
        });
        const conf = await api.getConfiguration();
        if (conf) {
            applHost.controllerLog.logNode(node.id, {
                endpoint: this.endpointIndex,
                message: `received entry control configuration:
key cache size:    ${conf.keyCacheSize}
key cache timeout: ${conf.keyCacheTimeout} seconds`,
                direction: "inbound",
            });
        }
    }
};
EntryControlCC = __decorate([
    (0, CommandClassDecorators_1.commandClass)(safe_1.CommandClasses["Entry Control"]),
    (0, CommandClassDecorators_1.implementedVersion)(1),
    (0, CommandClassDecorators_1.ccValues)(exports.EntryControlCCValues)
], EntryControlCC);
exports.EntryControlCC = EntryControlCC;
let EntryControlCCNotification = class EntryControlCCNotification extends EntryControlCC {
    constructor(host, options) {
        super(host, options);
        (0, safe_1.validatePayload)(this.payload.length >= 4);
        this.sequenceNumber = this.payload[0];
        this.dataType = this.payload[1] & 0b11;
        this.eventType = this.payload[2];
        const eventDataLength = this.payload[3];
        (0, safe_1.validatePayload)(eventDataLength >= 0 && eventDataLength <= 32);
        const offset = 4;
        (0, safe_1.validatePayload)(this.payload.length >= offset + eventDataLength);
        if (eventDataLength > 0) {
            // We shouldn't need to check this, since the specs are pretty clear which format to expect.
            // But as always - manufacturers don't care and send ASCII data with 0 bytes...
            // We also need to disable the strict validation for some devices to make them work
            const noStrictValidation = !!this.host.getDeviceConfig?.(this.nodeId)?.compat?.disableStrictEntryControlDataValidation;
            const eventData = Buffer.from(this.payload.slice(offset, offset + eventDataLength));
            switch (this.dataType) {
                case _Types_1.EntryControlDataTypes.Raw:
                    // RAW 1 to 32 bytes of arbitrary binary data
                    if (!noStrictValidation) {
                        (0, safe_1.validatePayload)(eventDataLength >= 1 && eventDataLength <= 32);
                    }
                    this.eventData = eventData;
                    break;
                case _Types_1.EntryControlDataTypes.ASCII:
                    // ASCII 1 to 32 ASCII encoded characters. ASCII codes MUST be in the value range 0x00-0xF7.
                    // The string MUST be padded with the value 0xFF to fit 16 byte blocks when sent in a notification.
                    if (!noStrictValidation) {
                        (0, safe_1.validatePayload)(eventDataLength === 16 || eventDataLength === 32);
                    }
                    // Using toString("ascii") converts the padding bytes 0xff to 0x7f
                    this.eventData = eventData.toString("ascii");
                    if (!noStrictValidation) {
                        (0, safe_1.validatePayload)(/^[\u0000-\u007f]+[\u007f]*$/.test(this.eventData));
                    }
                    // Trim padding
                    this.eventData = this.eventData.replace(/[\u007f]*$/, "");
                    break;
                case _Types_1.EntryControlDataTypes.MD5:
                    // MD5 16 byte binary data encoded as a MD5 hash value.
                    if (!noStrictValidation) {
                        (0, safe_1.validatePayload)(eventDataLength === 16);
                    }
                    this.eventData = eventData;
                    break;
            }
        }
        else {
            this.dataType = _Types_1.EntryControlDataTypes.None;
        }
    }
    toLogEntry(applHost) {
        const message = {
            "sequence number": this.sequenceNumber,
            "data type": this.dataType,
            "event type": this.eventType,
        };
        if (this.eventData) {
            switch (this.eventType) {
                case _Types_1.EntryControlEventTypes.CachedKeys:
                case _Types_1.EntryControlEventTypes.Enter:
                    // The event data is likely the user's PIN code, hide it from logs
                    message["event data"] = "*".repeat(this.eventData.length);
                    break;
                default:
                    message["event data"] =
                        typeof this.eventData === "string"
                            ? this.eventData
                            : (0, safe_2.buffer2hex)(this.eventData);
            }
        }
        return {
            ...super.toLogEntry(applHost),
            message,
        };
    }
};
EntryControlCCNotification = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.EntryControlCommand.Notification)
], EntryControlCCNotification);
exports.EntryControlCCNotification = EntryControlCCNotification;
let EntryControlCCKeySupportedReport = class EntryControlCCKeySupportedReport extends EntryControlCC {
    constructor(host, options) {
        super(host, options);
        (0, safe_1.validatePayload)(this.payload.length >= 1);
        const length = this.payload[0];
        (0, safe_1.validatePayload)(this.payload.length >= 1 + length);
        this.supportedKeys = (0, safe_1.parseBitMask)(this.payload.slice(1, 1 + length), 0);
    }
    toLogEntry(applHost) {
        return {
            ...super.toLogEntry(applHost),
            message: { "supported keys": this.supportedKeys.toString() },
        };
    }
};
__decorate([
    (0, CommandClassDecorators_1.ccValue)(exports.EntryControlCCValues.supportedKeys)
], EntryControlCCKeySupportedReport.prototype, "supportedKeys", void 0);
EntryControlCCKeySupportedReport = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.EntryControlCommand.KeySupportedReport)
], EntryControlCCKeySupportedReport);
exports.EntryControlCCKeySupportedReport = EntryControlCCKeySupportedReport;
let EntryControlCCKeySupportedGet = class EntryControlCCKeySupportedGet extends EntryControlCC {
};
EntryControlCCKeySupportedGet = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.EntryControlCommand.KeySupportedGet),
    (0, CommandClassDecorators_1.expectedCCResponse)(EntryControlCCKeySupportedReport)
], EntryControlCCKeySupportedGet);
exports.EntryControlCCKeySupportedGet = EntryControlCCKeySupportedGet;
let EntryControlCCEventSupportedReport = class EntryControlCCEventSupportedReport extends EntryControlCC {
    constructor(host, options) {
        super(host, options);
        (0, safe_1.validatePayload)(this.payload.length >= 1);
        const dataTypeLength = this.payload[0] & 0b11;
        let offset = 1;
        (0, safe_1.validatePayload)(this.payload.length >= offset + dataTypeLength);
        this.supportedDataTypes = (0, safe_1.parseBitMask)(this.payload.slice(offset, offset + dataTypeLength), _Types_1.EntryControlDataTypes.None);
        offset += dataTypeLength;
        (0, safe_1.validatePayload)(this.payload.length >= offset + 1);
        const eventTypeLength = this.payload[offset] & 0b11111;
        offset += 1;
        (0, safe_1.validatePayload)(this.payload.length >= offset + eventTypeLength);
        this.supportedEventTypes = (0, safe_1.parseBitMask)(this.payload.slice(offset, offset + eventTypeLength), _Types_1.EntryControlEventTypes.Caching);
        offset += eventTypeLength;
        (0, safe_1.validatePayload)(this.payload.length >= offset + 4);
        this.minKeyCacheSize = this.payload[offset];
        (0, safe_1.validatePayload)(this.minKeyCacheSize >= 1 && this.minKeyCacheSize <= 32);
        this.maxKeyCacheSize = this.payload[offset + 1];
        (0, safe_1.validatePayload)(this.maxKeyCacheSize >= this.minKeyCacheSize &&
            this.maxKeyCacheSize <= 32);
        this.minKeyCacheTimeout = this.payload[offset + 2];
        this.maxKeyCacheTimeout = this.payload[offset + 3];
    }
    persistValues(applHost) {
        if (!super.persistValues(applHost))
            return false;
        // Store min/max cache size and timeout as metadata
        const keyCacheSizeValue = exports.EntryControlCCValues.keyCacheSize;
        this.setMetadata(applHost, keyCacheSizeValue, {
            ...keyCacheSizeValue.meta,
            min: this.minKeyCacheSize,
            max: this.maxKeyCacheSize,
        });
        const keyCacheTimeoutValue = exports.EntryControlCCValues.keyCacheTimeout;
        this.setMetadata(applHost, keyCacheTimeoutValue, {
            ...keyCacheTimeoutValue.meta,
            min: this.minKeyCacheTimeout,
            max: this.maxKeyCacheTimeout,
        });
        return true;
    }
    toLogEntry(applHost) {
        return {
            ...super.toLogEntry(applHost),
            message: {
                "supported data types": this.supportedDataTypes
                    .map((dt) => _Types_1.EntryControlDataTypes[dt])
                    .toString(),
                "supported event types": this.supportedEventTypes
                    .map((et) => _Types_1.EntryControlEventTypes[et])
                    .toString(),
                "min key cache size": this.minKeyCacheSize,
                "max key cache size": this.maxKeyCacheSize,
                "min key cache timeout": this.minKeyCacheTimeout,
                "max key cache timeout": this.maxKeyCacheTimeout,
            },
        };
    }
};
__decorate([
    (0, CommandClassDecorators_1.ccValue)(exports.EntryControlCCValues.supportedDataTypes)
], EntryControlCCEventSupportedReport.prototype, "supportedDataTypes", void 0);
__decorate([
    (0, CommandClassDecorators_1.ccValue)(exports.EntryControlCCValues.supportedEventTypes)
], EntryControlCCEventSupportedReport.prototype, "supportedEventTypes", void 0);
EntryControlCCEventSupportedReport = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.EntryControlCommand.EventSupportedReport)
], EntryControlCCEventSupportedReport);
exports.EntryControlCCEventSupportedReport = EntryControlCCEventSupportedReport;
let EntryControlCCEventSupportedGet = class EntryControlCCEventSupportedGet extends EntryControlCC {
};
EntryControlCCEventSupportedGet = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.EntryControlCommand.EventSupportedGet),
    (0, CommandClassDecorators_1.expectedCCResponse)(EntryControlCCEventSupportedReport)
], EntryControlCCEventSupportedGet);
exports.EntryControlCCEventSupportedGet = EntryControlCCEventSupportedGet;
let EntryControlCCConfigurationReport = class EntryControlCCConfigurationReport extends EntryControlCC {
    constructor(host, options) {
        super(host, options);
        (0, safe_1.validatePayload)(this.payload.length >= 2);
        this.keyCacheSize = this.payload[0];
        (0, safe_1.validatePayload)(this.keyCacheSize >= 1 && this.keyCacheSize <= 32);
        this.keyCacheTimeout = this.payload[1];
    }
    toLogEntry(applHost) {
        return {
            ...super.toLogEntry(applHost),
            message: {
                "key cache size": this.keyCacheSize,
                "key cache timeout": this.keyCacheTimeout,
            },
        };
    }
};
__decorate([
    (0, CommandClassDecorators_1.ccValue)(exports.EntryControlCCValues.keyCacheSize)
], EntryControlCCConfigurationReport.prototype, "keyCacheSize", void 0);
__decorate([
    (0, CommandClassDecorators_1.ccValue)(exports.EntryControlCCValues.keyCacheTimeout)
], EntryControlCCConfigurationReport.prototype, "keyCacheTimeout", void 0);
EntryControlCCConfigurationReport = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.EntryControlCommand.ConfigurationReport)
], EntryControlCCConfigurationReport);
exports.EntryControlCCConfigurationReport = EntryControlCCConfigurationReport;
let EntryControlCCConfigurationGet = class EntryControlCCConfigurationGet extends EntryControlCC {
};
EntryControlCCConfigurationGet = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.EntryControlCommand.ConfigurationGet),
    (0, CommandClassDecorators_1.expectedCCResponse)(EntryControlCCConfigurationReport)
], EntryControlCCConfigurationGet);
exports.EntryControlCCConfigurationGet = EntryControlCCConfigurationGet;
let EntryControlCCConfigurationSet = class EntryControlCCConfigurationSet extends EntryControlCC {
    constructor(host, options) {
        super(host, options);
        if ((0, CommandClass_1.gotDeserializationOptions)(options)) {
            // TODO: Deserialize payload
            throw new safe_1.ZWaveError(`${this.constructor.name}: deserialization not implemented`, safe_1.ZWaveErrorCodes.Deserialization_NotImplemented);
        }
        else {
            this.keyCacheSize = options.keyCacheSize;
            this.keyCacheTimeout = options.keyCacheTimeout;
        }
    }
    serialize() {
        this.payload = Buffer.from([this.keyCacheSize, this.keyCacheTimeout]);
        return super.serialize();
    }
    toLogEntry(applHost) {
        return {
            ...super.toLogEntry(applHost),
            message: {
                "key cache size": this.keyCacheSize,
                "key cache timeout": this.keyCacheTimeout,
            },
        };
    }
};
EntryControlCCConfigurationSet = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.EntryControlCommand.ConfigurationSet),
    (0, CommandClassDecorators_1.useSupervision)()
], EntryControlCCConfigurationSet);
exports.EntryControlCCConfigurationSet = EntryControlCCConfigurationSet;
//# sourceMappingURL=EntryControlCC.js.map