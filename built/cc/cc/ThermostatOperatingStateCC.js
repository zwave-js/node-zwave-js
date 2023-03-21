"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ThermostatOperatingStateCCGet = exports.ThermostatOperatingStateCCReport = exports.ThermostatOperatingStateCC = exports.ThermostatOperatingStateCCAPI = exports.ThermostatOperatingStateCCValues = void 0;
const safe_1 = require("@zwave-js/core/safe");
const safe_2 = require("@zwave-js/shared/safe");
const API_1 = require("../lib/API");
const CommandClass_1 = require("../lib/CommandClass");
const CommandClassDecorators_1 = require("../lib/CommandClassDecorators");
const Values_1 = require("../lib/Values");
const _Types_1 = require("../lib/_Types");
exports.ThermostatOperatingStateCCValues = Object.freeze({
    ...Values_1.V.defineStaticCCValues(safe_1.CommandClasses["Thermostat Operating State"], {
        ...Values_1.V.staticPropertyWithName("operatingState", "state", {
            ...safe_1.ValueMetadata.ReadOnlyUInt8,
            label: "Operating state",
            states: (0, safe_1.enumValuesToMetadataStates)(_Types_1.ThermostatOperatingState),
        }),
    }),
});
// @noSetValueAPI This CC is read-only
let ThermostatOperatingStateCCAPI = class ThermostatOperatingStateCCAPI extends API_1.PhysicalCCAPI {
    constructor() {
        super(...arguments);
        this[_a] = async ({ property, }) => {
            switch (property) {
                case "state":
                    return this.get();
                default:
                    (0, API_1.throwUnsupportedProperty)(this.ccId, property);
            }
        };
    }
    supportsCommand(cmd) {
        switch (cmd) {
            case _Types_1.ThermostatOperatingStateCommand.Get:
                return true; // This is mandatory
        }
        return super.supportsCommand(cmd);
    }
    async get() {
        this.assertSupportsCommand(_Types_1.ThermostatOperatingStateCommand, _Types_1.ThermostatOperatingStateCommand.Get);
        const cc = new ThermostatOperatingStateCCGet(this.applHost, {
            nodeId: this.endpoint.nodeId,
            endpoint: this.endpoint.index,
        });
        const response = await this.applHost.sendCommand(cc, this.commandOptions);
        return response?.state;
    }
};
_a = API_1.POLL_VALUE;
ThermostatOperatingStateCCAPI = __decorate([
    (0, CommandClassDecorators_1.API)(safe_1.CommandClasses["Thermostat Operating State"])
], ThermostatOperatingStateCCAPI);
exports.ThermostatOperatingStateCCAPI = ThermostatOperatingStateCCAPI;
let ThermostatOperatingStateCC = class ThermostatOperatingStateCC extends CommandClass_1.CommandClass {
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
        const api = API_1.CCAPI.create(safe_1.CommandClasses["Thermostat Operating State"], applHost, endpoint).withOptions({
            priority: safe_1.MessagePriority.NodeQuery,
        });
        // Query the current state
        applHost.controllerLog.logNode(node.id, {
            endpoint: this.endpointIndex,
            message: "querying thermostat operating state...",
            direction: "outbound",
        });
        const state = await api.get();
        if (state) {
            applHost.controllerLog.logNode(node.id, {
                endpoint: this.endpointIndex,
                message: `received current thermostat operating state: ${(0, safe_2.getEnumMemberName)(_Types_1.ThermostatOperatingState, state)}`,
                direction: "inbound",
            });
        }
    }
};
ThermostatOperatingStateCC = __decorate([
    (0, CommandClassDecorators_1.commandClass)(safe_1.CommandClasses["Thermostat Operating State"]),
    (0, CommandClassDecorators_1.implementedVersion)(2),
    (0, CommandClassDecorators_1.ccValues)(exports.ThermostatOperatingStateCCValues)
], ThermostatOperatingStateCC);
exports.ThermostatOperatingStateCC = ThermostatOperatingStateCC;
let ThermostatOperatingStateCCReport = class ThermostatOperatingStateCCReport extends ThermostatOperatingStateCC {
    constructor(host, options) {
        super(host, options);
        (0, safe_1.validatePayload)(this.payload.length >= 1);
        this.state = this.payload[0];
    }
    toLogEntry(applHost) {
        return {
            ...super.toLogEntry(applHost),
            message: {
                state: (0, safe_2.getEnumMemberName)(_Types_1.ThermostatOperatingState, this.state),
            },
        };
    }
};
__decorate([
    (0, CommandClassDecorators_1.ccValue)(exports.ThermostatOperatingStateCCValues.operatingState)
], ThermostatOperatingStateCCReport.prototype, "state", void 0);
ThermostatOperatingStateCCReport = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.ThermostatOperatingStateCommand.Report)
], ThermostatOperatingStateCCReport);
exports.ThermostatOperatingStateCCReport = ThermostatOperatingStateCCReport;
let ThermostatOperatingStateCCGet = class ThermostatOperatingStateCCGet extends ThermostatOperatingStateCC {
};
ThermostatOperatingStateCCGet = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.ThermostatOperatingStateCommand.Get),
    (0, CommandClassDecorators_1.expectedCCResponse)(ThermostatOperatingStateCCReport)
], ThermostatOperatingStateCCGet);
exports.ThermostatOperatingStateCCGet = ThermostatOperatingStateCCGet;
//# sourceMappingURL=ThermostatOperatingStateCC.js.map