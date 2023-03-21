"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var _a, _b;
Object.defineProperty(exports, "__esModule", { value: true });
exports.BasicCCGet = exports.BasicCCReport = exports.BasicCCSet = exports.BasicCC = exports.BasicCCAPI = exports.BasicCCValues = void 0;
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
exports.BasicCCValues = Object.freeze({
    ...Values_1.V.defineStaticCCValues(safe_1.CommandClasses.Basic, {
        ...Values_1.V.staticProperty("currentValue", {
            ...safe_1.ValueMetadata.ReadOnlyLevel,
            label: "Current value",
        }),
        ...Values_1.V.staticProperty("targetValue", {
            ...safe_1.ValueMetadata.UInt8,
            label: "Target value",
            forceCreation: true,
        }),
        ...Values_1.V.staticProperty("duration", {
            ...safe_1.ValueMetadata.ReadOnlyDuration,
            label: "Remaining duration",
            minVersion: 2,
        }),
        ...Values_1.V.staticProperty("restorePrevious", {
            ...safe_1.ValueMetadata.WriteOnlyBoolean,
            label: "Restore previous value",
        }),
        // TODO: This should really not be a static CC value, but depend on compat flags:
        ...Values_1.V.staticPropertyWithName("compatEvent", "event", {
            ...safe_1.ValueMetadata.ReadOnlyUInt8,
            label: "Event value",
        }, {
            stateful: false,
            autoCreate: (applHost, endpoint) => !!applHost.getDeviceConfig?.(endpoint.nodeId)?.compat
                ?.treatBasicSetAsEvent,
        }),
    }),
});
let BasicCCAPI = class BasicCCAPI extends API_1.CCAPI {
    constructor() {
        super(...arguments);
        this[_a] = async ({ property }, value) => {
            // Enable restoring the previous non-zero value
            if (property === "restorePrevious") {
                property = "targetValue";
                value = 255;
            }
            if (property !== "targetValue") {
                (0, API_1.throwUnsupportedProperty)(this.ccId, property);
            }
            if (typeof value !== "number") {
                (0, API_1.throwWrongValueType)(this.ccId, property, "number", typeof value);
            }
            const result = await this.set(value);
            // If the command did not fail, assume that it succeeded and update the currentValue accordingly
            // so UIs have immediate feedback
            const shouldUpdateOptimistically = 
            // For unsupervised commands, make the choice to update optimistically dependent on the driver options
            (!this.applHost.options.disableOptimisticValueUpdate &&
                result == undefined) ||
                // TODO: Consider delaying the optimistic update if the result is WORKING
                (0, safe_1.supervisedCommandSucceeded)(result);
            if (this.isSinglecast()) {
                // Only update currentValue for valid target values
                if (shouldUpdateOptimistically && value >= 0 && value <= 99) {
                    this.tryGetValueDB()?.setValue(exports.BasicCCValues.currentValue.endpoint(this.endpoint.index), value);
                }
                // Verify the current value after a delay, unless the command was supervised and successful
                if (!(0, safe_1.supervisedCommandSucceeded)(result)) {
                    // and verify the current value after a delay. We query currentValue instead of targetValue to make sure
                    // that unsolicited updates cancel the scheduled poll
                    if (property === "targetValue")
                        property = "currentValue";
                    this.schedulePoll({ property }, value);
                }
            }
            else if (this.isMulticast()) {
                // Only update currentValue for valid target values
                if (shouldUpdateOptimistically && value >= 0 && value <= 99) {
                    // Figure out which nodes were affected by this command
                    const affectedNodes = this.endpoint.node.physicalNodes.filter((node) => node
                        .getEndpoint(this.endpoint.index)
                        ?.supportsCC(this.ccId));
                    // and optimistically update the currentValue
                    for (const node of affectedNodes) {
                        this.applHost
                            .tryGetValueDB(node.id)
                            ?.setValue(exports.BasicCCValues.currentValue.endpoint(this.endpoint.index), value);
                    }
                }
                else if (value === 255) {
                    // We generally don't want to poll for multicasts because of how much traffic it can cause
                    // However, when setting the value 255 (ON), we don't know the actual state
                    // We query currentValue instead of targetValue to make sure that unsolicited updates cancel the scheduled poll
                    if (property === "targetValue")
                        property = "currentValue";
                    this.schedulePoll({ property }, undefined);
                }
            }
            return result;
        };
        this[_b] = async ({ property, }) => {
            switch (property) {
                case "currentValue":
                case "targetValue":
                case "duration":
                    return (await this.get())?.[property];
                default:
                    (0, API_1.throwUnsupportedProperty)(this.ccId, property);
            }
        };
    }
    supportsCommand(cmd) {
        switch (cmd) {
            case _Types_1.BasicCommand.Get:
                return this.isSinglecast();
            case _Types_1.BasicCommand.Set:
                return true;
        }
        return super.supportsCommand(cmd);
    }
    // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
    async get() {
        this.assertSupportsCommand(_Types_1.BasicCommand, _Types_1.BasicCommand.Get);
        const cc = new BasicCCGet(this.applHost, {
            nodeId: this.endpoint.nodeId,
            endpoint: this.endpoint.index,
        });
        const response = await this.applHost.sendCommand(cc, this.commandOptions);
        if (response) {
            this.tryGetValueDB()?.setValue(exports.BasicCCValues.currentValue.endpoint(this.endpoint.index), response.currentValue);
            return (0, safe_2.pick)(response, ["currentValue", "targetValue", "duration"]);
        }
    }
    async set(targetValue) {
        __assertType("targetValue", "number", __assertType__number.bind(void 0, targetValue));
        this.assertSupportsCommand(_Types_1.BasicCommand, _Types_1.BasicCommand.Set);
        const cc = new BasicCCSet(this.applHost, {
            nodeId: this.endpoint.nodeId,
            endpoint: this.endpoint.index,
            targetValue,
        });
        return this.applHost.sendCommand(cc, this.commandOptions);
    }
};
_a = API_1.SET_VALUE, _b = API_1.POLL_VALUE;
BasicCCAPI = __decorate([
    (0, CommandClassDecorators_1.API)(safe_1.CommandClasses.Basic)
], BasicCCAPI);
exports.BasicCCAPI = BasicCCAPI;
let BasicCC = class BasicCC extends CommandClass_1.CommandClass {
    async interview(applHost) {
        const node = this.getNode(applHost);
        const endpoint = this.getEndpoint(applHost);
        applHost.controllerLog.logNode(node.id, {
            endpoint: this.endpointIndex,
            message: `Interviewing ${this.ccName}...`,
            direction: "none",
        });
        // try to query the current state
        await this.refreshValues(applHost);
        // Remove Basic CC support when there was no response,
        // but only if the compat event shouldn't be used.
        if (!applHost.getDeviceConfig?.(node.id)?.compat
            ?.treatBasicSetAsEvent &&
            this.getValue(applHost, exports.BasicCCValues.currentValue) == undefined) {
            applHost.controllerLog.logNode(node.id, {
                endpoint: this.endpointIndex,
                message: "No response to Basic Get command, assuming the node does not support Basic CC...",
            });
            // SDS14223: A controlling node MUST conclude that the Basic Command Class is not supported by a node (or
            // endpoint) if no Basic Report is returned.
            endpoint.removeCC(safe_1.CommandClasses.Basic);
        }
        // Remember that the interview is complete
        this.setInterviewComplete(applHost, true);
    }
    async refreshValues(applHost) {
        const node = this.getNode(applHost);
        const endpoint = this.getEndpoint(applHost);
        const api = API_1.CCAPI.create(safe_1.CommandClasses.Basic, applHost, endpoint).withOptions({
            priority: safe_1.MessagePriority.NodeQuery,
        });
        // try to query the current state
        applHost.controllerLog.logNode(node.id, {
            endpoint: this.endpointIndex,
            message: "querying Basic CC state...",
            direction: "outbound",
        });
        const basicResponse = await api.get();
        if (basicResponse) {
            let logMessage = `received Basic CC state:
current value:      ${basicResponse.currentValue}`;
            if (basicResponse.targetValue != undefined) {
                logMessage += `
target value:       ${basicResponse.targetValue}
remaining duration: ${basicResponse.duration?.toString() ?? "undefined"}`;
            }
            applHost.controllerLog.logNode(node.id, {
                endpoint: this.endpointIndex,
                message: logMessage,
                direction: "inbound",
            });
        }
    }
};
BasicCC = __decorate([
    (0, CommandClassDecorators_1.commandClass)(safe_1.CommandClasses.Basic),
    (0, CommandClassDecorators_1.implementedVersion)(2) // Update tests in CommandClass.test.ts when changing this
    ,
    (0, CommandClassDecorators_1.ccValues)(exports.BasicCCValues)
], BasicCC);
exports.BasicCC = BasicCC;
let BasicCCSet = class BasicCCSet extends BasicCC {
    constructor(host, options) {
        super(host, options);
        if ((0, CommandClass_1.gotDeserializationOptions)(options)) {
            (0, safe_1.validatePayload)(this.payload.length >= 1);
            this.targetValue = this.payload[0];
        }
        else {
            this.targetValue = options.targetValue;
        }
    }
    serialize() {
        this.payload = Buffer.from([this.targetValue]);
        return super.serialize();
    }
    toLogEntry(applHost) {
        return {
            ...super.toLogEntry(applHost),
            message: { "target value": this.targetValue },
        };
    }
};
BasicCCSet = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.BasicCommand.Set),
    (0, CommandClassDecorators_1.useSupervision)()
], BasicCCSet);
exports.BasicCCSet = BasicCCSet;
let BasicCCReport = class BasicCCReport extends BasicCC {
    // @noCCValues See comment in the constructor
    constructor(host, options) {
        super(host, options);
        if ((0, CommandClass_1.gotDeserializationOptions)(options)) {
            (0, safe_1.validatePayload)(this.payload.length >= 1);
            this._currentValue = (0, safe_1.parseMaybeNumber)(this.payload[0]);
            if (this.version >= 2 && this.payload.length >= 3) {
                this.targetValue = (0, safe_1.parseNumber)(this.payload[1]);
                this.duration = safe_1.Duration.parseReport(this.payload[2]);
            }
            // Do not persist values here. We want to control when this is happening,
            // in case the report is mapped to another CC
        }
        else {
            this._currentValue = options.currentValue;
            if ("targetValue" in options) {
                this.targetValue = options.targetValue;
                this.duration = options.duration;
            }
        }
    }
    persistValues(applHost) {
        if (this.currentValue === safe_1.unknownNumber &&
            !applHost.options.preserveUnknownValues) {
            this._currentValue = undefined;
        }
        return super.persistValues(applHost);
    }
    get currentValue() {
        return this._currentValue;
    }
    serialize() {
        const payload = [
            typeof this.currentValue !== "number" ? 0xfe : this.currentValue,
        ];
        if (this.version >= 2 && this.targetValue && this.duration) {
            payload.push(this.targetValue, this.duration.serializeReport());
        }
        this.payload = Buffer.from(payload);
        return super.serialize();
    }
    toLogEntry(applHost) {
        const message = {
            "current value": this.currentValue,
        };
        if (this.targetValue != undefined) {
            message["target value"] = this.targetValue;
        }
        if (this.duration != undefined) {
            message.duration = this.duration.toString();
        }
        return {
            ...super.toLogEntry(applHost),
            message,
        };
    }
};
__decorate([
    (0, CommandClassDecorators_1.ccValue)(exports.BasicCCValues.currentValue)
], BasicCCReport.prototype, "currentValue", null);
__decorate([
    (0, CommandClassDecorators_1.ccValue)(exports.BasicCCValues.targetValue)
], BasicCCReport.prototype, "targetValue", void 0);
__decorate([
    (0, CommandClassDecorators_1.ccValue)(exports.BasicCCValues.duration)
], BasicCCReport.prototype, "duration", void 0);
BasicCCReport = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.BasicCommand.Report)
], BasicCCReport);
exports.BasicCCReport = BasicCCReport;
let BasicCCGet = class BasicCCGet extends BasicCC {
};
BasicCCGet = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.BasicCommand.Get),
    (0, CommandClassDecorators_1.expectedCCResponse)(BasicCCReport)
], BasicCCGet);
exports.BasicCCGet = BasicCCGet;
//# sourceMappingURL=BasicCC.js.map