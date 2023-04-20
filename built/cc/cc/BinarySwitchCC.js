"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var _a, _b;
Object.defineProperty(exports, "__esModule", { value: true });
exports.BinarySwitchCCGet = exports.BinarySwitchCCReport = exports.BinarySwitchCCSet = exports.BinarySwitchCC = exports.BinarySwitchCCAPI = exports.BinarySwitchCCValues = void 0;
function __assertType(argName, typeName, boundHasError) {
    const { ZWaveError, ZWaveErrorCodes } = require("@zwave-js/core");
    if (boundHasError()) {
        throw new ZWaveError(typeName ? `${argName} is not a ${typeName}` : `${argName} has the wrong type`, ZWaveErrorCodes.Argument_Invalid);
    }
}
const __assertType__boolean = $o => {
    function _boolean($o) {
        return typeof $o !== "boolean" ? {} : null;
    }
    return _boolean($o);
};
const __assertType__optional_su__string__2_eu = $o => {
    function _string($o) {
        return typeof $o !== "string" ? {} : null;
    }
    function _2($o) {
        return !($o instanceof require("@zwave-js/core/safe").Duration) ? {} : null;
    }
    function su__string__2_eu($o) {
        const conditions = [_string, _2];
        for (const condition of conditions) {
            const error = condition($o);
            if (!error)
                return null;
        }
        return {};
    }
    function optional_su__string__2_eu($o) {
        if ($o !== undefined) {
            const error = su__string__2_eu($o);
            if (error)
                return error;
        }
        return null;
    }
    return optional_su__string__2_eu($o);
};
const safe_1 = require("@zwave-js/core/safe");
const API_1 = require("../lib/API");
const CommandClass_1 = require("../lib/CommandClass");
const CommandClassDecorators_1 = require("../lib/CommandClassDecorators");
const Values_1 = require("../lib/Values");
const _Types_1 = require("../lib/_Types");
exports.BinarySwitchCCValues = Object.freeze({
    ...Values_1.V.defineStaticCCValues(safe_1.CommandClasses["Binary Switch"], {
        ...Values_1.V.staticProperty("currentValue", {
            ...safe_1.ValueMetadata.ReadOnlyBoolean,
            label: "Current value",
        }),
        ...Values_1.V.staticProperty("targetValue", {
            ...safe_1.ValueMetadata.Boolean,
            label: "Target value",
            valueChangeOptions: ["transitionDuration"],
        }),
        ...Values_1.V.staticProperty("duration", {
            ...safe_1.ValueMetadata.ReadOnlyDuration,
            label: "Remaining duration",
        }, { minVersion: 2 }),
    }),
});
let BinarySwitchCCAPI = class BinarySwitchCCAPI extends API_1.CCAPI {
    constructor() {
        super(...arguments);
        this[_a] = async ({ property }, value, options) => {
            if (property !== "targetValue") {
                (0, API_1.throwUnsupportedProperty)(this.ccId, property);
            }
            if (typeof value !== "boolean") {
                (0, API_1.throwWrongValueType)(this.ccId, property, "boolean", typeof value);
            }
            const duration = safe_1.Duration.from(options?.transitionDuration);
            const result = await this.set(value, duration);
            // If the command did not fail, assume that it succeeded and update the currentValue accordingly
            // so UIs have immediate feedback
            const shouldUpdateOptimistically = 
            // For unsupervised commands, make the choice to update optimistically dependent on the driver options
            (!this.applHost.options.disableOptimisticValueUpdate &&
                result == undefined) ||
                // TODO: Consider delaying the optimistic update if the result is WORKING
                (0, safe_1.supervisedCommandSucceeded)(result);
            const currentValueValueId = exports.BinarySwitchCCValues.currentValue.endpoint(this.endpoint.index);
            if (this.isSinglecast()) {
                if (shouldUpdateOptimistically) {
                    this.tryGetValueDB()?.setValue(currentValueValueId, value);
                }
                // Verify the current value after a delay, unless the command was supervised and successful
                if (!(0, safe_1.supervisedCommandSucceeded)(result)) {
                    // We query currentValue instead of targetValue to make sure that unsolicited updates cancel the scheduled poll
                    if (property === "targetValue")
                        property = "currentValue";
                    this.schedulePoll({ property }, value, {
                        duration,
                        // on/off "transitions" are usually fast
                        transition: "fast",
                    });
                }
            }
            else if (this.isMulticast()) {
                if (shouldUpdateOptimistically) {
                    // Figure out which nodes were affected by this command
                    const affectedNodes = this.endpoint.node.physicalNodes.filter((node) => node
                        .getEndpoint(this.endpoint.index)
                        ?.supportsCC(this.ccId));
                    // and optimistically update the currentValue
                    for (const node of affectedNodes) {
                        this.applHost
                            .tryGetValueDB(node.id)
                            ?.setValue(currentValueValueId, value);
                    }
                }
                // For multicasts, do not schedule a refresh - this could cause a LOT of traffic
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
            case _Types_1.BinarySwitchCommand.Get:
                return this.isSinglecast();
            case _Types_1.BinarySwitchCommand.Set:
                return true;
        }
        return super.supportsCommand(cmd);
    }
    // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
    async get() {
        this.assertSupportsCommand(_Types_1.BinarySwitchCommand, _Types_1.BinarySwitchCommand.Get);
        const cc = new BinarySwitchCCGet(this.applHost, {
            nodeId: this.endpoint.nodeId,
            endpoint: this.endpoint.index,
        });
        const response = await this.applHost.sendCommand(cc, this.commandOptions);
        if (response) {
            return {
                // interpret unknown values as false
                currentValue: response.currentValue || false,
                targetValue: response.targetValue,
                duration: response.duration,
            };
        }
    }
    /**
     * Sets the switch to the given value
     * @param targetValue The target value to set
     * @param duration The duration after which the target value should be reached. Can be a Duration instance or a user-friendly duration string like `"1m17s"`. Only supported in V2 and above.
     */
    async set(targetValue, duration) {
        __assertType("targetValue", "boolean", __assertType__boolean.bind(void 0, targetValue));
        __assertType("duration", undefined, __assertType__optional_su__string__2_eu.bind(void 0, duration));
        this.assertSupportsCommand(_Types_1.BinarySwitchCommand, _Types_1.BinarySwitchCommand.Set);
        const cc = new BinarySwitchCCSet(this.applHost, {
            nodeId: this.endpoint.nodeId,
            endpoint: this.endpoint.index,
            targetValue,
            duration,
        });
        return this.applHost.sendCommand(cc, this.commandOptions);
    }
};
_a = API_1.SET_VALUE;
_b = API_1.POLL_VALUE;
BinarySwitchCCAPI = __decorate([
    (0, CommandClassDecorators_1.API)(safe_1.CommandClasses["Binary Switch"])
], BinarySwitchCCAPI);
exports.BinarySwitchCCAPI = BinarySwitchCCAPI;
let BinarySwitchCC = class BinarySwitchCC extends CommandClass_1.CommandClass {
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
        const api = API_1.CCAPI.create(safe_1.CommandClasses["Binary Switch"], applHost, endpoint).withOptions({
            priority: safe_1.MessagePriority.NodeQuery,
        });
        // Query the current state
        applHost.controllerLog.logNode(node.id, {
            endpoint: this.endpointIndex,
            message: "querying Binary Switch state...",
            direction: "outbound",
        });
        const resp = await api.get();
        if (resp) {
            let logMessage = `received Binary Switch state:
current value:      ${resp.currentValue}`;
            if (resp.targetValue != undefined) {
                logMessage += `
target value:       ${resp.targetValue}
remaining duration: ${resp.duration?.toString() ?? "undefined"}`;
            }
            applHost.controllerLog.logNode(node.id, {
                endpoint: this.endpointIndex,
                message: logMessage,
                direction: "inbound",
            });
        }
    }
    setMappedBasicValue(applHost, value) {
        this.setValue(applHost, exports.BinarySwitchCCValues.currentValue, value > 0);
        return true;
    }
};
BinarySwitchCC = __decorate([
    (0, CommandClassDecorators_1.commandClass)(safe_1.CommandClasses["Binary Switch"]),
    (0, CommandClassDecorators_1.implementedVersion)(2),
    (0, CommandClassDecorators_1.ccValues)(exports.BinarySwitchCCValues)
], BinarySwitchCC);
exports.BinarySwitchCC = BinarySwitchCC;
let BinarySwitchCCSet = class BinarySwitchCCSet extends BinarySwitchCC {
    constructor(host, options) {
        super(host, options);
        if ((0, CommandClass_1.gotDeserializationOptions)(options)) {
            (0, safe_1.validatePayload)(this.payload.length >= 1);
            this.targetValue = !!this.payload[0];
            if (this.payload.length >= 2) {
                this.duration = safe_1.Duration.parseSet(this.payload[1]);
            }
        }
        else {
            this.targetValue = options.targetValue;
            this.duration = safe_1.Duration.from(options.duration);
        }
    }
    serialize() {
        const payload = [this.targetValue ? 0xff : 0x00];
        if (this.version >= 2 && this.duration) {
            payload.push(this.duration.serializeSet());
        }
        this.payload = Buffer.from(payload);
        return super.serialize();
    }
    toLogEntry(applHost) {
        const message = {
            "target value": this.targetValue,
        };
        if (this.duration != undefined) {
            message.duration = this.duration.toString();
        }
        return {
            ...super.toLogEntry(applHost),
            message,
        };
    }
};
BinarySwitchCCSet = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.BinarySwitchCommand.Set),
    (0, CommandClassDecorators_1.useSupervision)()
], BinarySwitchCCSet);
exports.BinarySwitchCCSet = BinarySwitchCCSet;
let BinarySwitchCCReport = class BinarySwitchCCReport extends BinarySwitchCC {
    constructor(host, options) {
        super(host, options);
        if ((0, CommandClass_1.gotDeserializationOptions)(options)) {
            (0, safe_1.validatePayload)(this.payload.length >= 1);
            this.currentValue = (0, safe_1.parseMaybeBoolean)(this.payload[0]);
            if (this.version >= 2 && this.payload.length >= 3) {
                // V2
                this.targetValue = (0, safe_1.parseBoolean)(this.payload[1]);
                this.duration = safe_1.Duration.parseReport(this.payload[2]);
            }
        }
        else {
            this.currentValue = options.currentValue;
            this.targetValue = options.targetValue;
            this.duration = safe_1.Duration.from(options.duration);
        }
    }
    serialize() {
        this.payload = Buffer.from([
            (0, safe_1.encodeMaybeBoolean)(this.currentValue ?? safe_1.unknownBoolean),
        ]);
        if (this.targetValue != undefined) {
            this.payload = Buffer.concat([
                this.payload,
                Buffer.from([
                    (0, safe_1.encodeBoolean)(this.targetValue),
                    (this.duration ?? new safe_1.Duration(0, "default")).serializeReport(),
                ]),
            ]);
        }
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
    (0, CommandClassDecorators_1.ccValue)(exports.BinarySwitchCCValues.currentValue)
], BinarySwitchCCReport.prototype, "currentValue", void 0);
__decorate([
    (0, CommandClassDecorators_1.ccValue)(exports.BinarySwitchCCValues.targetValue)
], BinarySwitchCCReport.prototype, "targetValue", void 0);
__decorate([
    (0, CommandClassDecorators_1.ccValue)(exports.BinarySwitchCCValues.duration)
], BinarySwitchCCReport.prototype, "duration", void 0);
BinarySwitchCCReport = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.BinarySwitchCommand.Report)
], BinarySwitchCCReport);
exports.BinarySwitchCCReport = BinarySwitchCCReport;
let BinarySwitchCCGet = class BinarySwitchCCGet extends BinarySwitchCC {
};
BinarySwitchCCGet = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.BinarySwitchCommand.Get),
    (0, CommandClassDecorators_1.expectedCCResponse)(BinarySwitchCCReport)
], BinarySwitchCCGet);
exports.BinarySwitchCCGet = BinarySwitchCCGet;
//# sourceMappingURL=BinarySwitchCC.js.map