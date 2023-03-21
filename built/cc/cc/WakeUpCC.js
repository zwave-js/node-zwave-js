"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var _a, _b;
Object.defineProperty(exports, "__esModule", { value: true });
exports.WakeUpCCIntervalCapabilitiesGet = exports.WakeUpCCIntervalCapabilitiesReport = exports.WakeUpCCNoMoreInformation = exports.WakeUpCCWakeUpNotification = exports.WakeUpCCIntervalGet = exports.WakeUpCCIntervalReport = exports.WakeUpCCIntervalSet = exports.WakeUpCC = exports.WakeUpCCAPI = exports.WakeUpCCValues = void 0;
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
exports.WakeUpCCValues = Object.freeze({
    ...Values_1.V.defineStaticCCValues(safe_1.CommandClasses["Wake Up"], {
        ...Values_1.V.staticProperty("controllerNodeId", {
            ...safe_1.ValueMetadata.ReadOnly,
            label: "Node ID of the controller",
        }, {
            supportsEndpoints: false,
        }),
        ...Values_1.V.staticProperty("wakeUpInterval", {
            ...safe_1.ValueMetadata.UInt24,
            label: "Wake Up interval",
        }, {
            supportsEndpoints: false,
        }),
        ...Values_1.V.staticProperty("wakeUpOnDemandSupported", undefined, {
            internal: true,
            supportsEndpoints: false,
            minVersion: 3,
        }),
    }),
});
let WakeUpCCAPI = class WakeUpCCAPI extends API_1.CCAPI {
    constructor() {
        super(...arguments);
        this[_a] = async ({ property }, value) => {
            if (property !== "wakeUpInterval") {
                (0, API_1.throwUnsupportedProperty)(this.ccId, property);
            }
            if (typeof value !== "number") {
                (0, API_1.throwWrongValueType)(this.ccId, property, "number", typeof value);
            }
            const result = await this.setInterval(value, this.applHost.ownNodeId ?? 1);
            // Verify the change after a short delay, unless the command was supervised and successful
            if (this.isSinglecast() && !(0, safe_1.supervisedCommandSucceeded)(result)) {
                this.schedulePoll({ property }, value, { transition: "fast" });
            }
            return result;
        };
        this[_b] = async ({ property, }) => {
            switch (property) {
                case "wakeUpInterval":
                    return (await this.getInterval())?.[property];
                default:
                    (0, API_1.throwUnsupportedProperty)(this.ccId, property);
            }
        };
    }
    supportsCommand(cmd) {
        switch (cmd) {
            case _Types_1.WakeUpCommand.IntervalGet:
                return this.isSinglecast();
            case _Types_1.WakeUpCommand.IntervalSet:
            case _Types_1.WakeUpCommand.NoMoreInformation:
                return true; // This is mandatory
            case _Types_1.WakeUpCommand.IntervalCapabilitiesGet:
                return this.version >= 2 && this.isSinglecast();
        }
        return super.supportsCommand(cmd);
    }
    // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
    async getInterval() {
        this.assertSupportsCommand(_Types_1.WakeUpCommand, _Types_1.WakeUpCommand.IntervalGet);
        const cc = new WakeUpCCIntervalGet(this.applHost, {
            nodeId: this.endpoint.nodeId,
            endpoint: this.endpoint.index,
        });
        const response = await this.applHost.sendCommand(cc, this.commandOptions);
        if (response) {
            return (0, safe_2.pick)(response, ["wakeUpInterval", "controllerNodeId"]);
        }
    }
    // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
    async getIntervalCapabilities() {
        this.assertSupportsCommand(_Types_1.WakeUpCommand, _Types_1.WakeUpCommand.IntervalCapabilitiesGet);
        const cc = new WakeUpCCIntervalCapabilitiesGet(this.applHost, {
            nodeId: this.endpoint.nodeId,
            endpoint: this.endpoint.index,
        });
        const response = await this.applHost.sendCommand(cc, this.commandOptions);
        if (response) {
            return (0, safe_2.pick)(response, [
                "defaultWakeUpInterval",
                "minWakeUpInterval",
                "maxWakeUpInterval",
                "wakeUpIntervalSteps",
                "wakeUpOnDemandSupported",
            ]);
        }
    }
    async setInterval(wakeUpInterval, controllerNodeId) {
        __assertType("wakeUpInterval", "number", __assertType__number.bind(void 0, wakeUpInterval));
        __assertType("controllerNodeId", "number", __assertType__number.bind(void 0, controllerNodeId));
        this.assertSupportsCommand(_Types_1.WakeUpCommand, _Types_1.WakeUpCommand.IntervalSet);
        const cc = new WakeUpCCIntervalSet(this.applHost, {
            nodeId: this.endpoint.nodeId,
            endpoint: this.endpoint.index,
            wakeUpInterval,
            controllerNodeId,
        });
        return this.applHost.sendCommand(cc, this.commandOptions);
    }
    async sendNoMoreInformation() {
        this.assertSupportsCommand(_Types_1.WakeUpCommand, _Types_1.WakeUpCommand.NoMoreInformation);
        const cc = new WakeUpCCNoMoreInformation(this.applHost, {
            nodeId: this.endpoint.nodeId,
            endpoint: this.endpoint.index,
        });
        await this.applHost.sendCommand(cc, {
            ...this.commandOptions,
            // This command must be sent as part of the wake up queue
            priority: safe_1.MessagePriority.WakeUp,
            // Don't try to resend this - if we get no response, the node is most likely asleep
            maxSendAttempts: 1,
            // Also we don't want to wait for an ACK because this can lock up the network for seconds
            // if the target node is asleep and doesn't respond to the command
            transmitOptions: safe_1.TransmitOptions.DEFAULT_NOACK,
        });
    }
};
_a = API_1.SET_VALUE, _b = API_1.POLL_VALUE;
WakeUpCCAPI = __decorate([
    (0, CommandClassDecorators_1.API)(safe_1.CommandClasses["Wake Up"])
], WakeUpCCAPI);
exports.WakeUpCCAPI = WakeUpCCAPI;
let WakeUpCC = class WakeUpCC extends CommandClass_1.CommandClass {
    async interview(applHost) {
        const node = this.getNode(applHost);
        const endpoint = this.getEndpoint(applHost);
        const api = API_1.CCAPI.create(safe_1.CommandClasses["Wake Up"], applHost, endpoint).withOptions({
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
        if (applHost.isControllerNode(node.id)) {
            applHost.controllerLog.logNode(node.id, `skipping wakeup configuration for the controller`);
        }
        else if (node.isFrequentListening) {
            applHost.controllerLog.logNode(node.id, `skipping wakeup configuration for frequent listening device`);
        }
        else {
            // Retrieve the allowed wake up intervals and wake on demand support if possible
            if (this.version >= 2) {
                applHost.controllerLog.logNode(node.id, {
                    endpoint: this.endpointIndex,
                    message: "retrieving wakeup capabilities from the device...",
                    direction: "outbound",
                });
                const wakeupCaps = await api.getIntervalCapabilities();
                if (wakeupCaps) {
                    const logMessage = `received wakeup capabilities:
default wakeup interval: ${wakeupCaps.defaultWakeUpInterval} seconds
minimum wakeup interval: ${wakeupCaps.minWakeUpInterval} seconds
maximum wakeup interval: ${wakeupCaps.maxWakeUpInterval} seconds
wakeup interval steps:   ${wakeupCaps.wakeUpIntervalSteps} seconds
wakeup on demand supported: ${wakeupCaps.wakeUpOnDemandSupported}`;
                    applHost.controllerLog.logNode(node.id, {
                        endpoint: this.endpointIndex,
                        message: logMessage,
                        direction: "inbound",
                    });
                }
                else {
                    hadCriticalTimeout = true;
                }
            }
            // SDS14223 prescribes a IntervalSet followed by a check
            // We have no intention of changing the interval (maybe some time in the future)
            // So for now get the current interval and just set the controller ID
            applHost.controllerLog.logNode(node.id, {
                endpoint: this.endpointIndex,
                message: "retrieving wakeup interval from the device...",
                direction: "outbound",
            });
            const wakeupResp = await api.getInterval();
            if (wakeupResp) {
                const logMessage = `received wakeup configuration:
wakeup interval: ${wakeupResp.wakeUpInterval} seconds
controller node: ${wakeupResp.controllerNodeId}`;
                applHost.controllerLog.logNode(node.id, {
                    endpoint: this.endpointIndex,
                    message: logMessage,
                    direction: "inbound",
                });
                const ownNodeId = applHost.ownNodeId;
                // Only change the destination if necessary
                if (wakeupResp.controllerNodeId !== ownNodeId) {
                    applHost.controllerLog.logNode(node.id, {
                        endpoint: this.endpointIndex,
                        message: "configuring wakeup destination node",
                        direction: "outbound",
                    });
                    await api.setInterval(wakeupResp.wakeUpInterval, ownNodeId);
                    this.setValue(applHost, exports.WakeUpCCValues.controllerNodeId, ownNodeId);
                    applHost.controllerLog.logNode(node.id, "wakeup destination node changed!");
                }
            }
            else {
                // TODO: Change destination as the first thing during bootstrapping a node
                // and make it non-critical here
                hadCriticalTimeout = true;
            }
        }
        // Remember that the interview is complete
        if (!hadCriticalTimeout)
            this.setInterviewComplete(applHost, true);
    }
};
WakeUpCC = __decorate([
    (0, CommandClassDecorators_1.commandClass)(safe_1.CommandClasses["Wake Up"]),
    (0, CommandClassDecorators_1.implementedVersion)(3),
    (0, CommandClassDecorators_1.ccValues)(exports.WakeUpCCValues)
], WakeUpCC);
exports.WakeUpCC = WakeUpCC;
let WakeUpCCIntervalSet = class WakeUpCCIntervalSet extends WakeUpCC {
    constructor(host, options) {
        super(host, options);
        if ((0, CommandClass_1.gotDeserializationOptions)(options)) {
            // TODO: Deserialize payload
            // This error is used to test the applHost!
            // When implementing this branch, update the corresponding applHost test
            throw new safe_1.ZWaveError(`${this.constructor.name}: deserialization not implemented`, safe_1.ZWaveErrorCodes.Deserialization_NotImplemented);
        }
        else {
            this.wakeUpInterval = options.wakeUpInterval;
            this.controllerNodeId = options.controllerNodeId;
        }
    }
    serialize() {
        this.payload = Buffer.from([
            0,
            0,
            0,
            this.controllerNodeId,
        ]);
        this.payload.writeUIntBE(this.wakeUpInterval, 0, 3);
        return super.serialize();
    }
    toLogEntry(applHost) {
        return {
            ...super.toLogEntry(applHost),
            message: {
                "wake-up interval": `${this.wakeUpInterval} seconds`,
                "controller node id": this.controllerNodeId,
            },
        };
    }
};
WakeUpCCIntervalSet = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.WakeUpCommand.IntervalSet),
    (0, CommandClassDecorators_1.useSupervision)()
], WakeUpCCIntervalSet);
exports.WakeUpCCIntervalSet = WakeUpCCIntervalSet;
let WakeUpCCIntervalReport = class WakeUpCCIntervalReport extends WakeUpCC {
    constructor(host, options) {
        super(host, options);
        (0, safe_1.validatePayload)(this.payload.length >= 4);
        this.wakeUpInterval = this.payload.readUIntBE(0, 3);
        this.controllerNodeId = this.payload[3];
    }
    toLogEntry(applHost) {
        return {
            ...super.toLogEntry(applHost),
            message: {
                "wake-up interval": `${this.wakeUpInterval} seconds`,
                "controller node id": this.controllerNodeId,
            },
        };
    }
};
__decorate([
    (0, CommandClassDecorators_1.ccValue)(exports.WakeUpCCValues.wakeUpInterval)
], WakeUpCCIntervalReport.prototype, "wakeUpInterval", void 0);
__decorate([
    (0, CommandClassDecorators_1.ccValue)(exports.WakeUpCCValues.controllerNodeId)
], WakeUpCCIntervalReport.prototype, "controllerNodeId", void 0);
WakeUpCCIntervalReport = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.WakeUpCommand.IntervalReport)
], WakeUpCCIntervalReport);
exports.WakeUpCCIntervalReport = WakeUpCCIntervalReport;
let WakeUpCCIntervalGet = class WakeUpCCIntervalGet extends WakeUpCC {
};
WakeUpCCIntervalGet = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.WakeUpCommand.IntervalGet),
    (0, CommandClassDecorators_1.expectedCCResponse)(WakeUpCCIntervalReport)
], WakeUpCCIntervalGet);
exports.WakeUpCCIntervalGet = WakeUpCCIntervalGet;
let WakeUpCCWakeUpNotification = class WakeUpCCWakeUpNotification extends WakeUpCC {
};
WakeUpCCWakeUpNotification = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.WakeUpCommand.WakeUpNotification)
], WakeUpCCWakeUpNotification);
exports.WakeUpCCWakeUpNotification = WakeUpCCWakeUpNotification;
let WakeUpCCNoMoreInformation = class WakeUpCCNoMoreInformation extends WakeUpCC {
};
WakeUpCCNoMoreInformation = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.WakeUpCommand.NoMoreInformation)
], WakeUpCCNoMoreInformation);
exports.WakeUpCCNoMoreInformation = WakeUpCCNoMoreInformation;
let WakeUpCCIntervalCapabilitiesReport = class WakeUpCCIntervalCapabilitiesReport extends WakeUpCC {
    constructor(host, options) {
        super(host, options);
        (0, safe_1.validatePayload)(this.payload.length >= 12);
        this.minWakeUpInterval = this.payload.readUIntBE(0, 3);
        this.maxWakeUpInterval = this.payload.readUIntBE(3, 3);
        this.defaultWakeUpInterval = this.payload.readUIntBE(6, 3);
        this.wakeUpIntervalSteps = this.payload.readUIntBE(9, 3);
        // Get 'Wake Up on Demand Support' if node supports V3 and sends 13th byte
        if (this.version >= 3 && this.payload.length >= 13) {
            this.wakeUpOnDemandSupported = !!(this.payload[12] & 0b1);
        }
        else {
            this.wakeUpOnDemandSupported = false;
        }
    }
    persistValues(applHost) {
        if (!super.persistValues(applHost))
            return false;
        const valueDB = this.getValueDB(applHost);
        // Store the received information as metadata for the wake up interval
        valueDB.setMetadata({
            commandClass: this.ccId,
            endpoint: this.endpointIndex,
            property: "wakeUpInterval",
        }, {
            ...safe_1.ValueMetadata.WriteOnlyUInt24,
            min: this.minWakeUpInterval,
            max: this.maxWakeUpInterval,
            steps: this.wakeUpIntervalSteps,
            default: this.defaultWakeUpInterval,
        });
        // Store wakeUpOnDemandSupported in valueDB
        return true;
    }
    toLogEntry(applHost) {
        return {
            ...super.toLogEntry(applHost),
            message: {
                "default interval": `${this.defaultWakeUpInterval} seconds`,
                "minimum interval": `${this.minWakeUpInterval} seconds`,
                "maximum interval": `${this.maxWakeUpInterval} seconds`,
                "interval steps": `${this.wakeUpIntervalSteps} seconds`,
                "wake up on demand supported": `${this.wakeUpOnDemandSupported}`,
            },
        };
    }
};
__decorate([
    (0, CommandClassDecorators_1.ccValue)(exports.WakeUpCCValues.wakeUpOnDemandSupported)
], WakeUpCCIntervalCapabilitiesReport.prototype, "wakeUpOnDemandSupported", void 0);
WakeUpCCIntervalCapabilitiesReport = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.WakeUpCommand.IntervalCapabilitiesReport)
], WakeUpCCIntervalCapabilitiesReport);
exports.WakeUpCCIntervalCapabilitiesReport = WakeUpCCIntervalCapabilitiesReport;
let WakeUpCCIntervalCapabilitiesGet = class WakeUpCCIntervalCapabilitiesGet extends WakeUpCC {
};
WakeUpCCIntervalCapabilitiesGet = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.WakeUpCommand.IntervalCapabilitiesGet),
    (0, CommandClassDecorators_1.expectedCCResponse)(WakeUpCCIntervalCapabilitiesReport)
], WakeUpCCIntervalCapabilitiesGet);
exports.WakeUpCCIntervalCapabilitiesGet = WakeUpCCIntervalCapabilitiesGet;
//# sourceMappingURL=WakeUpCC.js.map