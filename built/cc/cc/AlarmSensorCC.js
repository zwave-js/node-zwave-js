"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AlarmSensorCCSupportedGet = exports.AlarmSensorCCSupportedReport = exports.AlarmSensorCCGet = exports.AlarmSensorCCReport = exports.AlarmSensorCC = exports.AlarmSensorCCAPI = exports.AlarmSensorCCValues = void 0;
function __assertType(argName, typeName, boundHasError) {
    const { ZWaveError, ZWaveErrorCodes } = require("@zwave-js/core");
    if (boundHasError()) {
        throw new ZWaveError(typeName ? `${argName} is not a ${typeName}` : `${argName} has the wrong type`, ZWaveErrorCodes.Argument_Invalid);
    }
}
const __assertType__optional_AlarmSensorType = $o => {
    function su__1__2__3__4__5__6__7_eu($o) {
        return ![0, 1, 2, 3, 4, 5, 255].includes($o) ? {} : null;
    }
    function optional_su__1__2__3__4__5__6__7_eu($o) {
        if ($o !== undefined) {
            const error = su__1__2__3__4__5__6__7_eu($o);
            if (error)
                return error;
        }
        return null;
    }
    return optional_su__1__2__3__4__5__6__7_eu($o);
};
const safe_1 = require("@zwave-js/core/safe");
const safe_2 = require("@zwave-js/shared/safe");
const API_1 = require("../lib/API");
const CommandClass_1 = require("../lib/CommandClass");
const CommandClassDecorators_1 = require("../lib/CommandClassDecorators");
const Values_1 = require("../lib/Values");
const _Types_1 = require("../lib/_Types");
exports.AlarmSensorCCValues = Object.freeze({
    ...Values_1.V.defineDynamicCCValues(safe_1.CommandClasses["Alarm Sensor"], {
        ...Values_1.V.dynamicPropertyAndKeyWithName("state", "state", (sensorType) => sensorType, ({ property, propertyKey }) => property === "state" && typeof propertyKey === "number", (sensorType) => {
            const alarmName = (0, safe_2.getEnumMemberName)(_Types_1.AlarmSensorType, sensorType);
            return {
                ...safe_1.ValueMetadata.ReadOnlyBoolean,
                label: `${alarmName} state`,
                description: "Whether the alarm is active",
                ccSpecific: { sensorType },
            };
        }),
        ...Values_1.V.dynamicPropertyAndKeyWithName("severity", "severity", (sensorType) => sensorType, ({ property, propertyKey }) => property === "severity" && typeof propertyKey === "number", (sensorType) => {
            const alarmName = (0, safe_2.getEnumMemberName)(_Types_1.AlarmSensorType, sensorType);
            return {
                ...safe_1.ValueMetadata.ReadOnlyNumber,
                min: 1,
                max: 100,
                unit: "%",
                label: `${alarmName} severity`,
                ccSpecific: { sensorType },
            };
        }),
        ...Values_1.V.dynamicPropertyAndKeyWithName("duration", "duration", (sensorType) => sensorType, ({ property, propertyKey }) => property === "duration" && typeof propertyKey === "number", (sensorType) => {
            const alarmName = (0, safe_2.getEnumMemberName)(_Types_1.AlarmSensorType, sensorType);
            return {
                ...safe_1.ValueMetadata.ReadOnlyNumber,
                unit: "s",
                label: `${alarmName} duration`,
                description: "For how long the alarm should be active",
                ccSpecific: { sensorType },
            };
        }),
    }),
    ...Values_1.V.defineStaticCCValues(safe_1.CommandClasses["Alarm Sensor"], {
        ...Values_1.V.staticProperty("supportedSensorTypes", undefined, {
            internal: true,
        }),
    }),
});
// @noSetValueAPI This CC is read-only
let AlarmSensorCCAPI = class AlarmSensorCCAPI extends API_1.PhysicalCCAPI {
    supportsCommand(cmd) {
        switch (cmd) {
            case _Types_1.AlarmSensorCommand.Get:
            case _Types_1.AlarmSensorCommand.SupportedGet:
                return true; // This is mandatory
        }
        return super.supportsCommand(cmd);
    }
    /**
     * Retrieves the current value from this sensor
     * @param sensorType The (optional) sensor type to retrieve the value for
     */
    async get(sensorType) {
        __assertType("sensorType", "(optional) AlarmSensorType", __assertType__optional_AlarmSensorType.bind(void 0, sensorType));
        this.assertSupportsCommand(_Types_1.AlarmSensorCommand, _Types_1.AlarmSensorCommand.Get);
        const cc = new AlarmSensorCCGet(this.applHost, {
            nodeId: this.endpoint.nodeId,
            endpoint: this.endpoint.index,
            sensorType,
        });
        const response = await this.applHost.sendCommand(cc, this.commandOptions);
        if (response)
            return (0, safe_2.pick)(response, ["state", "severity", "duration"]);
    }
    // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
    async getSupportedSensorTypes() {
        this.assertSupportsCommand(_Types_1.AlarmSensorCommand, _Types_1.AlarmSensorCommand.SupportedGet);
        const cc = new AlarmSensorCCSupportedGet(this.applHost, {
            nodeId: this.endpoint.nodeId,
            endpoint: this.endpoint.index,
        });
        const response = await this.applHost.sendCommand(cc, this.commandOptions);
        if (response)
            return response.supportedSensorTypes;
    }
};
AlarmSensorCCAPI = __decorate([
    (0, CommandClassDecorators_1.API)(safe_1.CommandClasses["Alarm Sensor"])
], AlarmSensorCCAPI);
exports.AlarmSensorCCAPI = AlarmSensorCCAPI;
let AlarmSensorCC = class AlarmSensorCC extends CommandClass_1.CommandClass {
    async interview(applHost) {
        const node = this.getNode(applHost);
        const endpoint = this.getEndpoint(applHost);
        // Skip the interview in favor of Notification CC if possible
        if (endpoint.supportsCC(safe_1.CommandClasses.Notification)) {
            applHost.controllerLog.logNode(node.id, {
                endpoint: this.endpointIndex,
                message: `${this.constructor.name}: skipping interview because Notification CC is supported...`,
                direction: "none",
            });
            this.setInterviewComplete(applHost, true);
            return;
        }
        const api = API_1.CCAPI.create(safe_1.CommandClasses["Alarm Sensor"], applHost, endpoint).withOptions({
            priority: safe_1.MessagePriority.NodeQuery,
        });
        applHost.controllerLog.logNode(node.id, {
            endpoint: this.endpointIndex,
            message: `Interviewing ${this.ccName}...`,
            direction: "none",
        });
        // Find out which sensor types this sensor supports
        applHost.controllerLog.logNode(node.id, {
            endpoint: this.endpointIndex,
            message: "querying supported sensor types...",
            direction: "outbound",
        });
        const supportedSensorTypes = await api.getSupportedSensorTypes();
        if (supportedSensorTypes) {
            const logMessage = `received supported sensor types: ${supportedSensorTypes
                .map((type) => (0, safe_2.getEnumMemberName)(_Types_1.AlarmSensorType, type))
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
        // Query (all of) the sensor's current value(s)
        await this.refreshValues(applHost);
        // Remember that the interview is complete
        this.setInterviewComplete(applHost, true);
    }
    async refreshValues(applHost) {
        const node = this.getNode(applHost);
        const endpoint = this.getEndpoint(applHost);
        const api = API_1.CCAPI.create(safe_1.CommandClasses["Alarm Sensor"], applHost, endpoint).withOptions({
            priority: safe_1.MessagePriority.NodeQuery,
        });
        const supportedSensorTypes = this.getValue(applHost, exports.AlarmSensorCCValues.supportedSensorTypes) ??
            [];
        // Always query (all of) the sensor's current value(s)
        for (const type of supportedSensorTypes) {
            // Some devices report invalid sensor types, but the CC API checks
            // for valid values and throws otherwise.
            if (!(0, safe_2.isEnumMember)(_Types_1.AlarmSensorType, type))
                continue;
            const sensorName = (0, safe_2.getEnumMemberName)(_Types_1.AlarmSensorType, type);
            applHost.controllerLog.logNode(node.id, {
                endpoint: this.endpointIndex,
                message: `querying current value for ${sensorName}...`,
                direction: "outbound",
            });
            const currentValue = await api.get(type);
            if (currentValue) {
                let message = `received current value for ${sensorName}: 
state:    ${currentValue.state}`;
                if (currentValue.severity != undefined) {
                    message += `
severity: ${currentValue.severity}`;
                }
                if (currentValue.duration != undefined) {
                    message += `
duration: ${currentValue.duration}`;
                }
                applHost.controllerLog.logNode(node.id, {
                    endpoint: this.endpointIndex,
                    message,
                    direction: "inbound",
                });
            }
        }
    }
    createMetadataForSensorType(applHost, sensorType) {
        const stateValue = exports.AlarmSensorCCValues.state(sensorType);
        const severityValue = exports.AlarmSensorCCValues.severity(sensorType);
        const durationValue = exports.AlarmSensorCCValues.duration(sensorType);
        // Always create metadata if it does not exist
        this.ensureMetadata(applHost, stateValue);
        this.ensureMetadata(applHost, severityValue);
        this.ensureMetadata(applHost, durationValue);
    }
};
AlarmSensorCC = __decorate([
    (0, CommandClassDecorators_1.commandClass)(safe_1.CommandClasses["Alarm Sensor"]),
    (0, CommandClassDecorators_1.implementedVersion)(1),
    (0, CommandClassDecorators_1.ccValues)(exports.AlarmSensorCCValues)
], AlarmSensorCC);
exports.AlarmSensorCC = AlarmSensorCC;
let AlarmSensorCCReport = class AlarmSensorCCReport extends AlarmSensorCC {
    constructor(host, options) {
        super(host, options);
        (0, safe_1.validatePayload)(this.payload.length >= 5, this.payload[1] !== 0xff);
        // Alarm Sensor reports may be forwarded by a different node, in this case
        // (and only then!) the payload contains the original node ID
        const sourceNodeId = this.payload[0];
        if (sourceNodeId !== 0) {
            this.nodeId = sourceNodeId;
        }
        this.sensorType = this.payload[1];
        // Any positive value gets interpreted as alarm
        this.state = this.payload[2] > 0;
        // Severity only ranges from 1 to 100
        if (this.payload[2] > 0 && this.payload[2] <= 0x64) {
            this.severity = this.payload[2];
        }
        // ignore zero durations
        this.duration = this.payload.readUInt16BE(3) || undefined;
    }
    toLogEntry(applHost) {
        const message = {
            "sensor type": (0, safe_2.getEnumMemberName)(_Types_1.AlarmSensorType, this.sensorType),
            "alarm state": this.state,
        };
        if (this.severity != undefined) {
            message.severity = this.severity;
        }
        if (this.duration != undefined) {
            message.duration = `${this.duration} seconds`;
        }
        return {
            ...super.toLogEntry(applHost),
            message,
        };
    }
    persistValues(applHost) {
        if (!super.persistValues(applHost))
            return false;
        // Create metadata if it does not exist
        this.createMetadataForSensorType(applHost, this.sensorType);
        const stateValue = exports.AlarmSensorCCValues.state(this.sensorType);
        const severityValue = exports.AlarmSensorCCValues.severity(this.sensorType);
        const durationValue = exports.AlarmSensorCCValues.duration(this.sensorType);
        this.setValue(applHost, stateValue, this.state);
        this.setValue(applHost, severityValue, this.severity);
        this.setValue(applHost, durationValue, this.duration);
        return true;
    }
};
AlarmSensorCCReport = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.AlarmSensorCommand.Report)
], AlarmSensorCCReport);
exports.AlarmSensorCCReport = AlarmSensorCCReport;
function testResponseForAlarmSensorGet(sent, received) {
    // We expect a Alarm Sensor Report that matches the requested sensor type (if a type was requested)
    return (sent.sensorType === _Types_1.AlarmSensorType.Any ||
        received.sensorType === sent.sensorType);
}
let AlarmSensorCCGet = class AlarmSensorCCGet extends AlarmSensorCC {
    constructor(host, options) {
        super(host, options);
        if ((0, CommandClass_1.gotDeserializationOptions)(options)) {
            // TODO: Deserialize payload
            throw new safe_1.ZWaveError(`${this.constructor.name}: deserialization not implemented`, safe_1.ZWaveErrorCodes.Deserialization_NotImplemented);
        }
        else {
            this.sensorType = options.sensorType ?? _Types_1.AlarmSensorType.Any;
        }
    }
    serialize() {
        this.payload = Buffer.from([this.sensorType]);
        return super.serialize();
    }
    toLogEntry(applHost) {
        return {
            ...super.toLogEntry(applHost),
            message: {
                "sensor type": (0, safe_2.getEnumMemberName)(_Types_1.AlarmSensorType, this.sensorType),
            },
        };
    }
};
AlarmSensorCCGet = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.AlarmSensorCommand.Get),
    (0, CommandClassDecorators_1.expectedCCResponse)(AlarmSensorCCReport, testResponseForAlarmSensorGet)
], AlarmSensorCCGet);
exports.AlarmSensorCCGet = AlarmSensorCCGet;
let AlarmSensorCCSupportedReport = class AlarmSensorCCSupportedReport extends AlarmSensorCC {
    constructor(host, options) {
        super(host, options);
        (0, safe_1.validatePayload)(this.payload.length >= 1);
        const bitMaskLength = this.payload[0];
        (0, safe_1.validatePayload)(this.payload.length >= 1 + bitMaskLength);
        this._supportedSensorTypes = (0, safe_1.parseBitMask)(this.payload.slice(1, 1 + bitMaskLength), _Types_1.AlarmSensorType["General Purpose"]);
    }
    get supportedSensorTypes() {
        return this._supportedSensorTypes;
    }
    persistValues(applHost) {
        if (!super.persistValues(applHost))
            return false;
        // Create metadata for each sensor type
        for (const type of this._supportedSensorTypes) {
            this.createMetadataForSensorType(applHost, type);
        }
        return true;
    }
    toLogEntry(applHost) {
        return {
            ...super.toLogEntry(applHost),
            message: {
                "supported sensor types": this._supportedSensorTypes
                    .map((t) => (0, safe_2.getEnumMemberName)(_Types_1.AlarmSensorType, t))
                    .join(", "),
            },
        };
    }
};
__decorate([
    (0, CommandClassDecorators_1.ccValue)(exports.AlarmSensorCCValues.supportedSensorTypes)
], AlarmSensorCCSupportedReport.prototype, "supportedSensorTypes", null);
AlarmSensorCCSupportedReport = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.AlarmSensorCommand.SupportedReport)
], AlarmSensorCCSupportedReport);
exports.AlarmSensorCCSupportedReport = AlarmSensorCCSupportedReport;
let AlarmSensorCCSupportedGet = class AlarmSensorCCSupportedGet extends AlarmSensorCC {
};
AlarmSensorCCSupportedGet = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.AlarmSensorCommand.SupportedGet),
    (0, CommandClassDecorators_1.expectedCCResponse)(AlarmSensorCCSupportedReport)
], AlarmSensorCCSupportedGet);
exports.AlarmSensorCCSupportedGet = AlarmSensorCCSupportedGet;
//# sourceMappingURL=AlarmSensorCC.js.map