"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var _a, _b;
Object.defineProperty(exports, "__esModule", { value: true });
exports.LockCCGet = exports.LockCCReport = exports.LockCCSet = exports.LockCC = exports.LockCCAPI = exports.LockCCValues = void 0;
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
const safe_1 = require("@zwave-js/core/safe");
const API_1 = require("../lib/API");
const CommandClass_1 = require("../lib/CommandClass");
const CommandClassDecorators_1 = require("../lib/CommandClassDecorators");
const Values_1 = require("../lib/Values");
const _Types_1 = require("../lib/_Types");
exports.LockCCValues = Object.freeze({
    ...Values_1.V.defineStaticCCValues(safe_1.CommandClasses.Lock, {
        ...Values_1.V.staticProperty("locked", {
            ...safe_1.ValueMetadata.Boolean,
            label: "Locked",
            description: "Whether the lock is locked",
        }),
    }),
});
let LockCCAPI = class LockCCAPI extends API_1.PhysicalCCAPI {
    constructor() {
        super(...arguments);
        this[_a] = async ({ property }, value) => {
            if (property !== "locked") {
                (0, API_1.throwUnsupportedProperty)(this.ccId, property);
            }
            if (typeof value !== "boolean") {
                (0, API_1.throwWrongValueType)(this.ccId, property, "boolean", typeof value);
            }
            const result = await this.set(value);
            // Verify the current value after a delay, unless the command was supervised and successful
            if (!(0, safe_1.supervisedCommandSucceeded)(result)) {
                this.schedulePoll({ property }, value);
            }
            return result;
        };
        this[_b] = async ({ property, }) => {
            if (property === "locked")
                return this.get();
            (0, API_1.throwUnsupportedProperty)(this.ccId, property);
        };
    }
    supportsCommand(cmd) {
        switch (cmd) {
            case _Types_1.LockCommand.Get:
            case _Types_1.LockCommand.Set:
                return true; // This is mandatory
        }
        return super.supportsCommand(cmd);
    }
    async get() {
        this.assertSupportsCommand(_Types_1.LockCommand, _Types_1.LockCommand.Get);
        const cc = new LockCCGet(this.applHost, {
            nodeId: this.endpoint.nodeId,
            endpoint: this.endpoint.index,
        });
        const response = await this.applHost.sendCommand(cc, this.commandOptions);
        return response?.locked;
    }
    /**
     * Locks or unlocks the lock
     * @param locked Whether the lock should be locked
     */
    async set(locked) {
        __assertType("locked", "boolean", __assertType__boolean.bind(void 0, locked));
        this.assertSupportsCommand(_Types_1.LockCommand, _Types_1.LockCommand.Set);
        const cc = new LockCCSet(this.applHost, {
            nodeId: this.endpoint.nodeId,
            endpoint: this.endpoint.index,
            locked,
        });
        return this.applHost.sendCommand(cc, this.commandOptions);
    }
};
_a = API_1.SET_VALUE;
_b = API_1.POLL_VALUE;
LockCCAPI = __decorate([
    (0, CommandClassDecorators_1.API)(safe_1.CommandClasses.Lock)
], LockCCAPI);
exports.LockCCAPI = LockCCAPI;
let LockCC = class LockCC extends CommandClass_1.CommandClass {
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
        const api = API_1.CCAPI.create(safe_1.CommandClasses.Lock, applHost, endpoint).withOptions({
            priority: safe_1.MessagePriority.NodeQuery,
        });
        applHost.controllerLog.logNode(node.id, {
            message: "requesting current lock state...",
            direction: "outbound",
        });
        const locked = await api.get();
        const logMessage = `the lock is ${locked ? "locked" : "unlocked"}`;
        applHost.controllerLog.logNode(node.id, {
            message: logMessage,
            direction: "inbound",
        });
    }
};
LockCC = __decorate([
    (0, CommandClassDecorators_1.commandClass)(safe_1.CommandClasses.Lock),
    (0, CommandClassDecorators_1.implementedVersion)(1),
    (0, CommandClassDecorators_1.ccValues)(exports.LockCCValues)
], LockCC);
exports.LockCC = LockCC;
let LockCCSet = class LockCCSet extends LockCC {
    constructor(host, options) {
        super(host, options);
        if ((0, CommandClass_1.gotDeserializationOptions)(options)) {
            // TODO: Deserialize payload
            throw new safe_1.ZWaveError(`${this.constructor.name}: deserialization not implemented`, safe_1.ZWaveErrorCodes.Deserialization_NotImplemented);
        }
        else {
            this.locked = options.locked;
        }
    }
    serialize() {
        this.payload = Buffer.from([this.locked ? 1 : 0]);
        return super.serialize();
    }
    toLogEntry(applHost) {
        return {
            ...super.toLogEntry(applHost),
            message: { locked: this.locked },
        };
    }
};
LockCCSet = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.LockCommand.Set),
    (0, CommandClassDecorators_1.useSupervision)()
], LockCCSet);
exports.LockCCSet = LockCCSet;
let LockCCReport = class LockCCReport extends LockCC {
    constructor(host, options) {
        super(host, options);
        (0, safe_1.validatePayload)(this.payload.length >= 1);
        this.locked = this.payload[0] === 1;
    }
    toLogEntry(applHost) {
        return {
            ...super.toLogEntry(applHost),
            message: { locked: this.locked },
        };
    }
};
__decorate([
    (0, CommandClassDecorators_1.ccValue)(exports.LockCCValues.locked)
], LockCCReport.prototype, "locked", void 0);
LockCCReport = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.LockCommand.Report)
], LockCCReport);
exports.LockCCReport = LockCCReport;
let LockCCGet = class LockCCGet extends LockCC {
};
LockCCGet = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.LockCommand.Get),
    (0, CommandClassDecorators_1.expectedCCResponse)(LockCCReport)
], LockCCGet);
exports.LockCCGet = LockCCGet;
//# sourceMappingURL=LockCC.js.map