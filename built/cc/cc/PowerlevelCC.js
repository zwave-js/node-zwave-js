"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PowerlevelCCTestNodeGet = exports.PowerlevelCCTestNodeReport = exports.PowerlevelCCTestNodeSet = exports.PowerlevelCCGet = exports.PowerlevelCCReport = exports.PowerlevelCCSet = exports.PowerlevelCC = exports.PowerlevelCCAPI = void 0;
function __assertType(argName, typeName, boundHasError) {
    const { ZWaveError, ZWaveErrorCodes } = require("@zwave-js/core");
    if (boundHasError()) {
        throw new ZWaveError(typeName ? `${argName} is not a ${typeName}` : `${argName} has the wrong type`, ZWaveErrorCodes.Argument_Invalid);
    }
}
const __assertType__Powerlevel = $o => {
    function su__1__2__3__4__5__6__7__8__9__10_eu($o) {
        return ![0, 1, 2, 3, 4, 5, 6, 7, 8, 9].includes($o) ? {} : null;
    }
    return su__1__2__3__4__5__6__7__8__9__10_eu($o);
};
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
const _Types_1 = require("../lib/_Types");
let PowerlevelCCAPI = class PowerlevelCCAPI extends API_1.PhysicalCCAPI {
    supportsCommand(cmd) {
        switch (cmd) {
            case _Types_1.PowerlevelCommand.Get:
            case _Types_1.PowerlevelCommand.TestNodeGet:
                return this.isSinglecast();
            case _Types_1.PowerlevelCommand.Set:
            case _Types_1.PowerlevelCommand.TestNodeSet:
                return true;
        }
        return super.supportsCommand(cmd);
    }
    async setNormalPowerlevel() {
        this.assertSupportsCommand(_Types_1.PowerlevelCommand, _Types_1.PowerlevelCommand.Set);
        const cc = new PowerlevelCCSet(this.applHost, {
            nodeId: this.endpoint.nodeId,
            endpoint: this.endpoint.index,
            powerlevel: _Types_1.Powerlevel["Normal Power"],
        });
        return this.applHost.sendCommand(cc, this.commandOptions);
    }
    async setCustomPowerlevel(powerlevel, timeout) {
        __assertType("powerlevel", "Powerlevel", __assertType__Powerlevel.bind(void 0, powerlevel));
        __assertType("timeout", "number", __assertType__number.bind(void 0, timeout));
        this.assertSupportsCommand(_Types_1.PowerlevelCommand, _Types_1.PowerlevelCommand.Set);
        const cc = new PowerlevelCCSet(this.applHost, {
            nodeId: this.endpoint.nodeId,
            endpoint: this.endpoint.index,
            powerlevel,
            timeout,
        });
        return this.applHost.sendCommand(cc, this.commandOptions);
    }
    async getPowerlevel() {
        this.assertSupportsCommand(_Types_1.PowerlevelCommand, _Types_1.PowerlevelCommand.Get);
        const cc = new PowerlevelCCGet(this.applHost, {
            nodeId: this.endpoint.nodeId,
            endpoint: this.endpoint.index,
        });
        const response = await this.applHost.sendCommand(cc, this.commandOptions);
        if (response) {
            return (0, safe_2.pick)(response, ["powerlevel", "timeout"]);
        }
    }
    async startNodeTest(testNodeId, powerlevel, testFrameCount) {
        __assertType("testNodeId", "number", __assertType__number.bind(void 0, testNodeId));
        __assertType("powerlevel", "Powerlevel", __assertType__Powerlevel.bind(void 0, powerlevel));
        __assertType("testFrameCount", "number", __assertType__number.bind(void 0, testFrameCount));
        this.assertSupportsCommand(_Types_1.PowerlevelCommand, _Types_1.PowerlevelCommand.TestNodeSet);
        if (testNodeId === this.endpoint.nodeId) {
            throw new safe_1.ZWaveError(`For a powerlevel test, the test node ID must different from the source node ID.`, safe_1.ZWaveErrorCodes.Argument_Invalid);
        }
        const testNode = this.applHost.nodes.getOrThrow(testNodeId);
        if (testNode.isFrequentListening) {
            throw new safe_1.ZWaveError(`Node ${testNodeId} is FLiRS and therefore cannot be used for a powerlevel test.`, safe_1.ZWaveErrorCodes.PowerlevelCC_UnsupportedTestNode);
        }
        if (testNode.canSleep && testNode.status !== safe_1.NodeStatus.Awake) {
            throw new safe_1.ZWaveError(`Node ${testNodeId} is not awake and therefore cannot be used for a powerlevel test.`, safe_1.ZWaveErrorCodes.PowerlevelCC_UnsupportedTestNode);
        }
        const cc = new PowerlevelCCTestNodeSet(this.applHost, {
            nodeId: this.endpoint.nodeId,
            endpoint: this.endpoint.index,
            testNodeId,
            powerlevel,
            testFrameCount,
        });
        return this.applHost.sendCommand(cc, this.commandOptions);
    }
    async getNodeTestStatus() {
        this.assertSupportsCommand(_Types_1.PowerlevelCommand, _Types_1.PowerlevelCommand.TestNodeGet);
        const cc = new PowerlevelCCTestNodeGet(this.applHost, {
            nodeId: this.endpoint.nodeId,
            endpoint: this.endpoint.index,
        });
        const response = await this.applHost.sendCommand(cc, this.commandOptions);
        if (response) {
            return (0, safe_2.pick)(response, [
                "testNodeId",
                "status",
                "acknowledgedFrames",
            ]);
        }
    }
};
PowerlevelCCAPI = __decorate([
    (0, CommandClassDecorators_1.API)(safe_1.CommandClasses.Powerlevel)
], PowerlevelCCAPI);
exports.PowerlevelCCAPI = PowerlevelCCAPI;
let PowerlevelCC = class PowerlevelCC extends CommandClass_1.CommandClass {
};
PowerlevelCC = __decorate([
    (0, CommandClassDecorators_1.commandClass)(safe_1.CommandClasses.Powerlevel),
    (0, CommandClassDecorators_1.implementedVersion)(1)
], PowerlevelCC);
exports.PowerlevelCC = PowerlevelCC;
let PowerlevelCCSet = class PowerlevelCCSet extends PowerlevelCC {
    constructor(host, options) {
        super(host, options);
        if ((0, CommandClass_1.gotDeserializationOptions)(options)) {
            // TODO: Deserialize payload
            throw new safe_1.ZWaveError(`${this.constructor.name}: deserialization not implemented`, safe_1.ZWaveErrorCodes.Deserialization_NotImplemented);
        }
        else {
            this.powerlevel = options.powerlevel;
            if (options.powerlevel !== _Types_1.Powerlevel["Normal Power"]) {
                if (options.timeout < 1 || options.timeout > 255) {
                    throw new safe_1.ZWaveError(`The timeout parameter must be between 1 and 255.`, safe_1.ZWaveErrorCodes.Argument_Invalid);
                }
                this.timeout = options.timeout;
            }
        }
    }
    serialize() {
        this.payload = Buffer.from([this.powerlevel, this.timeout ?? 0x00]);
        return super.serialize();
    }
    toLogEntry(applHost) {
        const message = {
            "power level": (0, safe_2.getEnumMemberName)(_Types_1.Powerlevel, this.powerlevel),
        };
        if (this.timeout != undefined) {
            message.timeout = `${this.timeout} s`;
        }
        return {
            ...super.toLogEntry(applHost),
            message,
        };
    }
};
PowerlevelCCSet = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.PowerlevelCommand.Set),
    (0, CommandClassDecorators_1.useSupervision)()
], PowerlevelCCSet);
exports.PowerlevelCCSet = PowerlevelCCSet;
let PowerlevelCCReport = class PowerlevelCCReport extends PowerlevelCC {
    constructor(host, options) {
        super(host, options);
        this.powerlevel = this.payload[0];
        if (this.powerlevel !== _Types_1.Powerlevel["Normal Power"]) {
            this.timeout = this.payload[1];
        }
    }
    toLogEntry(applHost) {
        const message = {
            "power level": (0, safe_2.getEnumMemberName)(_Types_1.Powerlevel, this.powerlevel),
        };
        if (this.timeout != undefined) {
            message.timeout = `${this.timeout} s`;
        }
        return {
            ...super.toLogEntry(applHost),
            message,
        };
    }
};
PowerlevelCCReport = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.PowerlevelCommand.Report)
], PowerlevelCCReport);
exports.PowerlevelCCReport = PowerlevelCCReport;
let PowerlevelCCGet = class PowerlevelCCGet extends PowerlevelCC {
};
PowerlevelCCGet = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.PowerlevelCommand.Get),
    (0, CommandClassDecorators_1.expectedCCResponse)(PowerlevelCCReport)
], PowerlevelCCGet);
exports.PowerlevelCCGet = PowerlevelCCGet;
let PowerlevelCCTestNodeSet = class PowerlevelCCTestNodeSet extends PowerlevelCC {
    constructor(host, options) {
        super(host, options);
        if ((0, CommandClass_1.gotDeserializationOptions)(options)) {
            // TODO: Deserialize payload
            throw new safe_1.ZWaveError(`${this.constructor.name}: deserialization not implemented`, safe_1.ZWaveErrorCodes.Deserialization_NotImplemented);
        }
        else {
            this.testNodeId = options.testNodeId;
            this.powerlevel = options.powerlevel;
            this.testFrameCount = options.testFrameCount;
        }
    }
    serialize() {
        this.payload = Buffer.from([this.testNodeId, this.powerlevel, 0, 0]);
        this.payload.writeUInt16BE(this.testFrameCount, 2);
        return super.serialize();
    }
    toLogEntry(applHost) {
        return {
            ...super.toLogEntry(applHost),
            message: {
                "test node id": this.testNodeId,
                "power level": (0, safe_2.getEnumMemberName)(_Types_1.Powerlevel, this.powerlevel),
                "test frame count": this.testFrameCount,
            },
        };
    }
};
PowerlevelCCTestNodeSet = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.PowerlevelCommand.TestNodeSet),
    (0, CommandClassDecorators_1.useSupervision)()
], PowerlevelCCTestNodeSet);
exports.PowerlevelCCTestNodeSet = PowerlevelCCTestNodeSet;
let PowerlevelCCTestNodeReport = class PowerlevelCCTestNodeReport extends PowerlevelCC {
    constructor(host, options) {
        super(host, options);
        (0, safe_1.validatePayload)(this.payload.length >= 4);
        this.testNodeId = this.payload[0];
        this.status = this.payload[1];
        this.acknowledgedFrames = this.payload.readUInt16BE(2);
    }
    toLogEntry(applHost) {
        return {
            ...super.toLogEntry(applHost),
            message: {
                "test node id": this.testNodeId,
                status: (0, safe_2.getEnumMemberName)(_Types_1.PowerlevelTestStatus, this.status),
                "acknowledged frames": this.acknowledgedFrames,
            },
        };
    }
};
PowerlevelCCTestNodeReport = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.PowerlevelCommand.TestNodeReport)
], PowerlevelCCTestNodeReport);
exports.PowerlevelCCTestNodeReport = PowerlevelCCTestNodeReport;
let PowerlevelCCTestNodeGet = class PowerlevelCCTestNodeGet extends PowerlevelCC {
};
PowerlevelCCTestNodeGet = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.PowerlevelCommand.TestNodeGet),
    (0, CommandClassDecorators_1.expectedCCResponse)(PowerlevelCCTestNodeReport)
], PowerlevelCCTestNodeGet);
exports.PowerlevelCCTestNodeGet = PowerlevelCCTestNodeGet;
//# sourceMappingURL=PowerlevelCC.js.map