"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.BinarySensorCCSupportedGet = exports.BinarySensorCCSupportedReport = exports.BinarySensorCCGet = exports.BinarySensorCCReport = exports.BinarySensorCC = exports.BinarySensorCCAPI = exports.BinarySensorCCValues = void 0;
function __assertType(argName, typeName, boundHasError) {
    const { ZWaveError, ZWaveErrorCodes } = require("@zwave-js/core");
    if (boundHasError()) {
        throw new ZWaveError(typeName ? `${argName} is not a ${typeName}` : `${argName} has the wrong type`, ZWaveErrorCodes.Argument_Invalid);
    }
}
const __assertType__optional_BinarySensorType = $o => {
    function su__1__2__3__4__5__6__7__8__9__10__11__12__13__14_eu($o) {
        return ![1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 255].includes($o) ? {} : null;
    }
    function optional_su__1__2__3__4__5__6__7__8__9__10__11__12__13__14_eu($o) {
        if ($o !== undefined) {
            const error = su__1__2__3__4__5__6__7__8__9__10__11__12__13__14_eu($o);
            if (error)
                return error;
        }
        return null;
    }
    return optional_su__1__2__3__4__5__6__7__8__9__10__11__12__13__14_eu($o);
};
const safe_1 = require("@zwave-js/core/safe");
const safe_2 = require("@zwave-js/shared/safe");
const API_1 = require("../lib/API");
const CommandClass_1 = require("../lib/CommandClass");
const CommandClassDecorators_1 = require("../lib/CommandClassDecorators");
const Values_1 = require("../lib/Values");
const _Types_1 = require("../lib/_Types");
exports.BinarySensorCCValues = Object.freeze({
    ...Values_1.V.defineStaticCCValues(safe_1.CommandClasses["Binary Sensor"], {
        ...Values_1.V.staticProperty("supportedSensorTypes", undefined, {
            internal: true,
        }),
    }),
    ...Values_1.V.defineDynamicCCValues(safe_1.CommandClasses["Binary Sensor"], {
        ...Values_1.V.dynamicPropertyWithName("state", 
        /* property */ (sensorType) => (0, safe_2.getEnumMemberName)(_Types_1.BinarySensorType, sensorType), ({ property }) => typeof property === "string" && property in _Types_1.BinarySensorType, 
        /* meta */ (sensorType) => ({
            ...safe_1.ValueMetadata.ReadOnlyBoolean,
            label: `Sensor state (${(0, safe_2.getEnumMemberName)(_Types_1.BinarySensorType, sensorType)})`,
            ccSpecific: { sensorType },
        })),
    }),
});
// @noSetValueAPI This CC is read-only
let BinarySensorCCAPI = class BinarySensorCCAPI extends API_1.PhysicalCCAPI {
    constructor() {
        super(...arguments);
        this[_a] = async ({ property, }) => {
            if (typeof property === "string") {
                const sensorType = _Types_1.BinarySensorType[property];
                if (sensorType)
                    return this.get(sensorType);
            }
            (0, API_1.throwUnsupportedProperty)(this.ccId, property);
        };
    }
    supportsCommand(cmd) {
        switch (cmd) {
            case _Types_1.BinarySensorCommand.Get:
                return true; // This is mandatory
            case _Types_1.BinarySensorCommand.SupportedGet:
                return this.version >= 2;
        }
        return super.supportsCommand(cmd);
    }
    /**
     * Retrieves the current value from this sensor
     * @param sensorType The (optional) sensor type to retrieve the value for
     */
    async get(sensorType) {
        __assertType("sensorType", "(optional) BinarySensorType", __assertType__optional_BinarySensorType.bind(void 0, sensorType));
        this.assertSupportsCommand(_Types_1.BinarySensorCommand, _Types_1.BinarySensorCommand.Get);
        const cc = new BinarySensorCCGet(this.applHost, {
            nodeId: this.endpoint.nodeId,
            endpoint: this.endpoint.index,
            sensorType,
        });
        const response = await this.applHost.sendCommand(cc, this.commandOptions);
        // We don't want to repeat the sensor type
        return response?.value;
    }
    // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
    async getSupportedSensorTypes() {
        this.assertSupportsCommand(_Types_1.BinarySensorCommand, _Types_1.BinarySensorCommand.SupportedGet);
        const cc = new BinarySensorCCSupportedGet(this.applHost, {
            nodeId: this.endpoint.nodeId,
            endpoint: this.endpoint.index,
        });
        const response = await this.applHost.sendCommand(cc, this.commandOptions);
        // We don't want to repeat the sensor type
        return response?.supportedSensorTypes;
    }
};
_a = API_1.POLL_VALUE;
BinarySensorCCAPI = __decorate([
    (0, CommandClassDecorators_1.API)(safe_1.CommandClasses["Binary Sensor"])
], BinarySensorCCAPI);
exports.BinarySensorCCAPI = BinarySensorCCAPI;
let BinarySensorCC = class BinarySensorCC extends CommandClass_1.CommandClass {
    async interview(applHost) {
        const node = this.getNode(applHost);
        const endpoint = this.getEndpoint(applHost);
        const api = API_1.CCAPI.create(safe_1.CommandClasses["Binary Sensor"], applHost, endpoint).withOptions({
            priority: safe_1.MessagePriority.NodeQuery,
        });
        applHost.controllerLog.logNode(node.id, {
            endpoint: this.endpointIndex,
            message: `Interviewing ${this.ccName}...`,
            direction: "none",
        });
        // Find out which sensor types this sensor supports
        if (this.version >= 2) {
            applHost.controllerLog.logNode(node.id, {
                endpoint: this.endpointIndex,
                message: "querying supported sensor types...",
                direction: "outbound",
            });
            const supportedSensorTypes = await api.getSupportedSensorTypes();
            if (supportedSensorTypes) {
                const logMessage = `received supported sensor types: ${supportedSensorTypes
                    .map((type) => (0, safe_2.getEnumMemberName)(_Types_1.BinarySensorType, type))
                    .map((name) => `\n· ${name}`)
                    .join("")}`;
                applHost.controllerLog.logNode(node.id, {
                    endpoint: this.endpointIndex,
                    message: logMessage,
                    direction: "inbound",
                });
            }
            else {
                applHost.controllerLog.logNode(node.id, {
                    endpoint: this.endpointIndex,
                    message: "Querying supported sensor types timed out, skipping interview...",
                    level: "warn",
                });
                return;
            }
        }
        await this.refreshValues(applHost);
        // Remember that the interview is complete
        this.setInterviewComplete(applHost, true);
    }
    async refreshValues(applHost) {
        const node = this.getNode(applHost);
        const endpoint = this.getEndpoint(applHost);
        const api = API_1.CCAPI.create(safe_1.CommandClasses["Binary Sensor"], applHost, endpoint).withOptions({
            priority: safe_1.MessagePriority.NodeQuery,
        });
        // Query (all of) the sensor's current value(s)
        if (this.version === 1) {
            applHost.controllerLog.logNode(node.id, {
                endpoint: this.endpointIndex,
                message: "querying current value...",
                direction: "outbound",
            });
            const currentValue = await api.get();
            if (currentValue != undefined) {
                applHost.controllerLog.logNode(node.id, {
                    endpoint: this.endpointIndex,
                    message: `received current value: ${currentValue}`,
                    direction: "inbound",
                });
            }
        }
        else {
            const supportedSensorTypes = this.getValue(applHost, exports.BinarySensorCCValues.supportedSensorTypes) ?? [];
            for (const type of supportedSensorTypes) {
                // Some devices report invalid sensor types, but the CC API checks
                // for valid values and throws otherwise.
                if (!(0, safe_2.isEnumMember)(_Types_1.BinarySensorType, type))
                    continue;
                const sensorName = (0, safe_2.getEnumMemberName)(_Types_1.BinarySensorType, type);
                applHost.controllerLog.logNode(node.id, {
                    endpoint: this.endpointIndex,
                    message: `querying current value for ${sensorName}...`,
                    direction: "outbound",
                });
                const currentValue = await api.get(type);
                if (currentValue != undefined) {
                    applHost.controllerLog.logNode(node.id, {
                        endpoint: this.endpointIndex,
                        message: `received current value for ${sensorName}: ${currentValue}`,
                        direction: "inbound",
                    });
                }
            }
        }
    }
    setMappedBasicValue(applHost, value) {
        this.setValue(applHost, exports.BinarySensorCCValues.state(_Types_1.BinarySensorType.Any), value > 0);
        return true;
    }
};
BinarySensorCC = __decorate([
    (0, CommandClassDecorators_1.commandClass)(safe_1.CommandClasses["Binary Sensor"]),
    (0, CommandClassDecorators_1.implementedVersion)(2),
    (0, CommandClassDecorators_1.ccValues)(exports.BinarySensorCCValues)
], BinarySensorCC);
exports.BinarySensorCC = BinarySensorCC;
let BinarySensorCCReport = class BinarySensorCCReport extends BinarySensorCC {
    constructor(host, options) {
        super(host, options);
        (0, safe_1.validatePayload)(this.payload.length >= 1);
        this._value = this.payload[0] === 0xff;
        this._type = _Types_1.BinarySensorType.Any;
        if (this.version >= 2 && this.payload.length >= 2) {
            this._type = this.payload[1];
        }
    }
    persistValues(applHost) {
        if (!super.persistValues(applHost))
            return false;
        const binarySensorValue = exports.BinarySensorCCValues.state(this._type);
        this.setMetadata(applHost, binarySensorValue, binarySensorValue.meta);
        this.setValue(applHost, binarySensorValue, this._value);
        return true;
    }
    get type() {
        return this._type;
    }
    get value() {
        return this._value;
    }
    toLogEntry(applHost) {
        return {
            ...super.toLogEntry(applHost),
            message: {
                type: (0, safe_2.getEnumMemberName)(_Types_1.BinarySensorType, this._type),
                value: this._value,
            },
        };
    }
};
BinarySensorCCReport = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.BinarySensorCommand.Report)
], BinarySensorCCReport);
exports.BinarySensorCCReport = BinarySensorCCReport;
function testResponseForBinarySensorGet(sent, received) {
    // We expect a Binary Sensor Report that matches the requested sensor type (if a type was requested)
    return (sent.sensorType == undefined ||
        sent.sensorType === _Types_1.BinarySensorType.Any ||
        received.type === sent.sensorType);
}
let BinarySensorCCGet = class BinarySensorCCGet extends BinarySensorCC {
    constructor(host, options) {
        super(host, options);
        if ((0, CommandClass_1.gotDeserializationOptions)(options)) {
            throw new safe_1.ZWaveError(`${this.constructor.name}: deserialization not implemented`, safe_1.ZWaveErrorCodes.Deserialization_NotImplemented);
        }
        else {
            this.sensorType = options.sensorType;
        }
    }
    serialize() {
        if (this.version >= 2 && this.sensorType != undefined) {
            this.payload = Buffer.from([this.sensorType]);
        }
        return super.serialize();
    }
    toLogEntry(applHost) {
        return {
            ...super.toLogEntry(applHost),
            message: {
                type: (0, safe_2.getEnumMemberName)(_Types_1.BinarySensorType, this.sensorType ?? _Types_1.BinarySensorType.Any),
            },
        };
    }
};
BinarySensorCCGet = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.BinarySensorCommand.Get),
    (0, CommandClassDecorators_1.expectedCCResponse)(BinarySensorCCReport, testResponseForBinarySensorGet)
], BinarySensorCCGet);
exports.BinarySensorCCGet = BinarySensorCCGet;
let BinarySensorCCSupportedReport = class BinarySensorCCSupportedReport extends BinarySensorCC {
    constructor(host, options) {
        super(host, options);
        (0, safe_1.validatePayload)(this.payload.length >= 1);
        // The enumeration starts at 1, but the first (reserved) bit is included
        // in the report
        this.supportedSensorTypes = (0, safe_1.parseBitMask)(this.payload, 0).filter((t) => t !== 0);
    }
    toLogEntry(applHost) {
        return {
            ...super.toLogEntry(applHost),
            message: {
                "supported types": this.supportedSensorTypes
                    .map((type) => (0, safe_2.getEnumMemberName)(_Types_1.BinarySensorType, type))
                    .join(", "),
            },
        };
    }
};
__decorate([
    (0, CommandClassDecorators_1.ccValue)(exports.BinarySensorCCValues.supportedSensorTypes)
], BinarySensorCCSupportedReport.prototype, "supportedSensorTypes", void 0);
BinarySensorCCSupportedReport = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.BinarySensorCommand.SupportedReport)
], BinarySensorCCSupportedReport);
exports.BinarySensorCCSupportedReport = BinarySensorCCSupportedReport;
let BinarySensorCCSupportedGet = class BinarySensorCCSupportedGet extends BinarySensorCC {
};
BinarySensorCCSupportedGet = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.BinarySensorCommand.SupportedGet),
    (0, CommandClassDecorators_1.expectedCCResponse)(BinarySensorCCSupportedReport)
], BinarySensorCCSupportedGet);
exports.BinarySensorCCSupportedGet = BinarySensorCCSupportedGet;
//# sourceMappingURL=BinarySensorCC.js.map