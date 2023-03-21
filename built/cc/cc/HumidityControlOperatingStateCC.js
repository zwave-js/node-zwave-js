"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.HumidityControlOperatingStateCCGet = exports.HumidityControlOperatingStateCCReport = exports.HumidityControlOperatingStateCC = exports.HumidityControlOperatingStateCCAPI = exports.HumidityControlOperatingStateCCValues = void 0;
const safe_1 = require("@zwave-js/core/safe");
const safe_2 = require("@zwave-js/shared/safe");
const API_1 = require("../lib/API");
const CommandClass_1 = require("../lib/CommandClass");
const CommandClassDecorators_1 = require("../lib/CommandClassDecorators");
const Values_1 = require("../lib/Values");
const _Types_1 = require("../lib/_Types");
exports.HumidityControlOperatingStateCCValues = Object.freeze({
    ...Values_1.V.defineStaticCCValues(safe_1.CommandClasses["Humidity Control Operating State"], {
        ...Values_1.V.staticProperty("state", {
            ...safe_1.ValueMetadata.ReadOnlyUInt8,
            states: (0, safe_1.enumValuesToMetadataStates)(_Types_1.HumidityControlOperatingState),
            label: "Humidity control operating state",
        }),
    }),
});
let HumidityControlOperatingStateCCAPI = class HumidityControlOperatingStateCCAPI extends API_1.CCAPI {
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
            case _Types_1.HumidityControlOperatingStateCommand.Get:
                return this.isSinglecast();
        }
        return super.supportsCommand(cmd);
    }
    async get() {
        this.assertSupportsCommand(_Types_1.HumidityControlOperatingStateCommand, _Types_1.HumidityControlOperatingStateCommand.Get);
        const cc = new HumidityControlOperatingStateCCGet(this.applHost, {
            nodeId: this.endpoint.nodeId,
            endpoint: this.endpoint.index,
        });
        const response = await this.applHost.sendCommand(cc, this.commandOptions);
        if (response) {
            return response?.state;
        }
    }
};
_a = API_1.POLL_VALUE;
HumidityControlOperatingStateCCAPI = __decorate([
    (0, CommandClassDecorators_1.API)(safe_1.CommandClasses["Humidity Control Operating State"])
], HumidityControlOperatingStateCCAPI);
exports.HumidityControlOperatingStateCCAPI = HumidityControlOperatingStateCCAPI;
let HumidityControlOperatingStateCC = class HumidityControlOperatingStateCC extends CommandClass_1.CommandClass {
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
        const api = API_1.CCAPI.create(safe_1.CommandClasses["Humidity Control Operating State"], applHost, endpoint).withOptions({
            priority: safe_1.MessagePriority.NodeQuery,
        });
        // Query the current status
        applHost.controllerLog.logNode(node.id, {
            endpoint: this.endpointIndex,
            message: "querying current humidity control operating state...",
            direction: "outbound",
        });
        const currentStatus = await api.get();
        if (currentStatus) {
            applHost.controllerLog.logNode(node.id, {
                endpoint: this.endpointIndex,
                message: "received current humidity control operating state: " +
                    (0, safe_2.getEnumMemberName)(_Types_1.HumidityControlOperatingState, currentStatus),
                direction: "inbound",
            });
        }
    }
};
HumidityControlOperatingStateCC = __decorate([
    (0, CommandClassDecorators_1.commandClass)(safe_1.CommandClasses["Humidity Control Operating State"]),
    (0, CommandClassDecorators_1.implementedVersion)(1),
    (0, CommandClassDecorators_1.ccValues)(exports.HumidityControlOperatingStateCCValues)
], HumidityControlOperatingStateCC);
exports.HumidityControlOperatingStateCC = HumidityControlOperatingStateCC;
let HumidityControlOperatingStateCCReport = class HumidityControlOperatingStateCCReport extends HumidityControlOperatingStateCC {
    constructor(host, options) {
        super(host, options);
        (0, safe_1.validatePayload)(this.payload.length >= 1);
        this.state = this.payload[0] & 0b1111;
    }
    toLogEntry(applHost) {
        return {
            ...super.toLogEntry(applHost),
            message: {
                state: (0, safe_2.getEnumMemberName)(_Types_1.HumidityControlOperatingState, this.state),
            },
        };
    }
};
__decorate([
    (0, CommandClassDecorators_1.ccValue)(exports.HumidityControlOperatingStateCCValues.state)
], HumidityControlOperatingStateCCReport.prototype, "state", void 0);
HumidityControlOperatingStateCCReport = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.HumidityControlOperatingStateCommand.Report)
], HumidityControlOperatingStateCCReport);
exports.HumidityControlOperatingStateCCReport = HumidityControlOperatingStateCCReport;
let HumidityControlOperatingStateCCGet = class HumidityControlOperatingStateCCGet extends HumidityControlOperatingStateCC {
};
HumidityControlOperatingStateCCGet = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.HumidityControlOperatingStateCommand.Get),
    (0, CommandClassDecorators_1.expectedCCResponse)(HumidityControlOperatingStateCCReport)
], HumidityControlOperatingStateCCGet);
exports.HumidityControlOperatingStateCCGet = HumidityControlOperatingStateCCGet;
//# sourceMappingURL=HumidityControlOperatingStateCC.js.map