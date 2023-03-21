"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ThermostatSetbackCCGet = exports.ThermostatSetbackCCReport = exports.ThermostatSetbackCCSet = exports.ThermostatSetbackCC = exports.ThermostatSetbackCCAPI = exports.ThermostatSetbackCCValues = void 0;
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
const __assertType__SetbackState = $o => {
    function _number($o) {
        return typeof $o !== "number" ? {} : null;
    }
    function _2($o) {
        return $o !== "Unused" ? {} : null;
    }
    function _3($o) {
        return $o !== "Frost Protection" ? {} : null;
    }
    function _4($o) {
        return $o !== "Energy Saving" ? {} : null;
    }
    function su__number__2__3__4_eu($o) {
        const conditions = [_number, _2, _3, _4];
        for (const condition of conditions) {
            const error = condition($o);
            if (!error)
                return null;
        }
        return {};
    }
    return su__number__2__3__4_eu($o);
};
const safe_1 = require("@zwave-js/core/safe");
const safe_2 = require("@zwave-js/shared/safe");
const API_1 = require("../lib/API");
const CommandClass_1 = require("../lib/CommandClass");
const CommandClassDecorators_1 = require("../lib/CommandClassDecorators");
const serializers_1 = require("../lib/serializers");
const Values_1 = require("../lib/Values");
const _Types_1 = require("../lib/_Types");
exports.ThermostatSetbackCCValues = Object.freeze({
    ...Values_1.V.defineStaticCCValues(safe_1.CommandClasses["Thermostat Setback"], {
        ...Values_1.V.staticProperty("setbackType", {
            // TODO: This should be a value list
            ...safe_1.ValueMetadata.Any,
            label: "Setback type",
        }),
        ...Values_1.V.staticProperty("setbackState", {
            ...safe_1.ValueMetadata.Int8,
            min: -12.8,
            max: 12,
            label: "Setback state",
        }),
    }),
});
// @noSetValueAPI
// The setback state consist of two values that must be set together
let ThermostatSetbackCCAPI = class ThermostatSetbackCCAPI extends API_1.CCAPI {
    constructor() {
        super(...arguments);
        this[_a] = async ({ property, }) => {
            switch (property) {
                case "setbackType":
                case "setbackState":
                    return (await this.get())?.[property];
                default:
                    (0, API_1.throwUnsupportedProperty)(this.ccId, property);
            }
        };
    }
    supportsCommand(cmd) {
        switch (cmd) {
            case _Types_1.ThermostatSetbackCommand.Get:
                return this.isSinglecast();
            case _Types_1.ThermostatSetbackCommand.Set:
                return true; // This is mandatory
        }
        return super.supportsCommand(cmd);
    }
    // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
    async get() {
        this.assertSupportsCommand(_Types_1.ThermostatSetbackCommand, _Types_1.ThermostatSetbackCommand.Get);
        const cc = new ThermostatSetbackCCGet(this.applHost, {
            nodeId: this.endpoint.nodeId,
            endpoint: this.endpoint.index,
        });
        const response = await this.applHost.sendCommand(cc, this.commandOptions);
        if (response) {
            return (0, safe_2.pick)(response, ["setbackType", "setbackState"]);
        }
    }
    async set(setbackType, setbackState) {
        __assertType("setbackType", "SetbackType", __assertType__number.bind(void 0, setbackType));
        __assertType("setbackState", "SetbackState", __assertType__SetbackState.bind(void 0, setbackState));
        this.assertSupportsCommand(_Types_1.ThermostatSetbackCommand, _Types_1.ThermostatSetbackCommand.Get);
        const cc = new ThermostatSetbackCCSet(this.applHost, {
            nodeId: this.endpoint.nodeId,
            endpoint: this.endpoint.index,
            setbackType,
            setbackState,
        });
        return this.applHost.sendCommand(cc, this.commandOptions);
    }
};
_a = API_1.POLL_VALUE;
ThermostatSetbackCCAPI = __decorate([
    (0, CommandClassDecorators_1.API)(safe_1.CommandClasses["Thermostat Setback"])
], ThermostatSetbackCCAPI);
exports.ThermostatSetbackCCAPI = ThermostatSetbackCCAPI;
let ThermostatSetbackCC = class ThermostatSetbackCC extends CommandClass_1.CommandClass {
    async interview(applHost) {
        const node = this.getNode(applHost);
        applHost.controllerLog.logNode(node.id, {
            endpoint: this.endpointIndex,
            message: `Interviewing ${this.ccName}...`,
            direction: "none",
        });
        await this.refreshValues(applHost);
        // Remember that the interview is complete
        this.setInterviewComplete(applHost, true);
    }
    async refreshValues(applHost) {
        const node = this.getNode(applHost);
        const endpoint = this.getEndpoint(applHost);
        const api = API_1.CCAPI.create(safe_1.CommandClasses["Thermostat Setback"], applHost, endpoint).withOptions({
            priority: safe_1.MessagePriority.NodeQuery,
        });
        // Query the thermostat state
        applHost.controllerLog.logNode(node.id, {
            endpoint: this.endpointIndex,
            message: "querying the current thermostat state...",
            direction: "outbound",
        });
        const setbackResp = await api.get();
        if (setbackResp) {
            const logMessage = `received current state:
setback type:  ${(0, safe_2.getEnumMemberName)(_Types_1.SetbackType, setbackResp.setbackType)}
setback state: ${setbackResp.setbackState}`;
            applHost.controllerLog.logNode(node.id, {
                endpoint: this.endpointIndex,
                message: logMessage,
                direction: "inbound",
            });
        }
    }
};
ThermostatSetbackCC = __decorate([
    (0, CommandClassDecorators_1.commandClass)(safe_1.CommandClasses["Thermostat Setback"]),
    (0, CommandClassDecorators_1.implementedVersion)(1),
    (0, CommandClassDecorators_1.ccValues)(exports.ThermostatSetbackCCValues)
], ThermostatSetbackCC);
exports.ThermostatSetbackCC = ThermostatSetbackCC;
let ThermostatSetbackCCSet = class ThermostatSetbackCCSet extends ThermostatSetbackCC {
    constructor(host, options) {
        super(host, options);
        if ((0, CommandClass_1.gotDeserializationOptions)(options)) {
            // TODO: Deserialize payload
            throw new safe_1.ZWaveError(`${this.constructor.name}: deserialization not implemented`, safe_1.ZWaveErrorCodes.Deserialization_NotImplemented);
        }
        else {
            this.setbackType = options.setbackType;
            this.setbackState = options.setbackState;
        }
    }
    serialize() {
        this.payload = Buffer.from([
            this.setbackType & 0b11,
            (0, serializers_1.encodeSetbackState)(this.setbackState),
        ]);
        return super.serialize();
    }
    toLogEntry(applHost) {
        return {
            ...super.toLogEntry(applHost),
            message: {
                "setback type": (0, safe_2.getEnumMemberName)(_Types_1.SetbackType, this.setbackType),
                "setback state": this.setbackState,
            },
        };
    }
};
ThermostatSetbackCCSet = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.ThermostatSetbackCommand.Set),
    (0, CommandClassDecorators_1.useSupervision)()
], ThermostatSetbackCCSet);
exports.ThermostatSetbackCCSet = ThermostatSetbackCCSet;
let ThermostatSetbackCCReport = class ThermostatSetbackCCReport extends ThermostatSetbackCC {
    constructor(host, options) {
        super(host, options);
        (0, safe_1.validatePayload)(this.payload.length >= 2);
        this.setbackType = this.payload[0] & 0b11;
        // If we receive an unknown setback state, return the raw value
        this.setbackState =
            (0, serializers_1.decodeSetbackState)(this.payload[1]) || this.payload[1];
    }
    toLogEntry(applHost) {
        return {
            ...super.toLogEntry(applHost),
            message: {
                "setback type": (0, safe_2.getEnumMemberName)(_Types_1.SetbackType, this.setbackType),
                "setback state": this.setbackState,
            },
        };
    }
};
__decorate([
    (0, CommandClassDecorators_1.ccValue)(exports.ThermostatSetbackCCValues.setbackType)
], ThermostatSetbackCCReport.prototype, "setbackType", void 0);
__decorate([
    (0, CommandClassDecorators_1.ccValue)(exports.ThermostatSetbackCCValues.setbackState)
    /** The offset from the setpoint in 0.1 Kelvin or a special mode */
], ThermostatSetbackCCReport.prototype, "setbackState", void 0);
ThermostatSetbackCCReport = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.ThermostatSetbackCommand.Report)
], ThermostatSetbackCCReport);
exports.ThermostatSetbackCCReport = ThermostatSetbackCCReport;
let ThermostatSetbackCCGet = class ThermostatSetbackCCGet extends ThermostatSetbackCC {
};
ThermostatSetbackCCGet = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.ThermostatSetbackCommand.Get),
    (0, CommandClassDecorators_1.expectedCCResponse)(ThermostatSetbackCCReport)
], ThermostatSetbackCCGet);
exports.ThermostatSetbackCCGet = ThermostatSetbackCCGet;
//# sourceMappingURL=ThermostatSetbackCC.js.map