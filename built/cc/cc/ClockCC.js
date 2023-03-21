"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClockCCGet = exports.ClockCCReport = exports.ClockCCSet = exports.ClockCC = exports.ClockCCAPI = void 0;
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
const __assertType__optional_Weekday = $o => {
    function su__1__2__3__4__5__6__7__8_eu($o) {
        return ![0, 1, 2, 3, 4, 5, 6, 7].includes($o) ? {} : null;
    }
    function optional_su__1__2__3__4__5__6__7__8_eu($o) {
        if ($o !== undefined) {
            const error = su__1__2__3__4__5__6__7__8_eu($o);
            if (error)
                return error;
        }
        return null;
    }
    return optional_su__1__2__3__4__5__6__7__8_eu($o);
};
const safe_1 = require("@zwave-js/core/safe");
const safe_2 = require("@zwave-js/shared/safe");
const strings_1 = require("alcalzone-shared/strings");
const API_1 = require("../lib/API");
const CommandClass_1 = require("../lib/CommandClass");
const CommandClassDecorators_1 = require("../lib/CommandClassDecorators");
const _Types_1 = require("../lib/_Types");
// @noSetValueAPI - This CC has no simple value to set
let ClockCCAPI = class ClockCCAPI extends API_1.CCAPI {
    supportsCommand(cmd) {
        switch (cmd) {
            case _Types_1.ClockCommand.Get:
                return this.isSinglecast();
            case _Types_1.ClockCommand.Set:
                return true; // This is mandatory
        }
        return super.supportsCommand(cmd);
    }
    // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
    async get() {
        this.assertSupportsCommand(_Types_1.ClockCommand, _Types_1.ClockCommand.Get);
        const cc = new ClockCCGet(this.applHost, {
            nodeId: this.endpoint.nodeId,
            endpoint: this.endpoint.index,
        });
        const response = await this.applHost.sendCommand(cc, this.commandOptions);
        if (response) {
            return (0, safe_2.pick)(response, ["weekday", "hour", "minute"]);
        }
    }
    async set(hour, minute, weekday) {
        __assertType("hour", "number", __assertType__number.bind(void 0, hour));
        __assertType("minute", "number", __assertType__number.bind(void 0, minute));
        __assertType("weekday", "(optional) Weekday", __assertType__optional_Weekday.bind(void 0, weekday));
        this.assertSupportsCommand(_Types_1.ClockCommand, _Types_1.ClockCommand.Set);
        const cc = new ClockCCSet(this.applHost, {
            nodeId: this.endpoint.nodeId,
            endpoint: this.endpoint.index,
            hour,
            minute,
            weekday: weekday ?? _Types_1.Weekday.Unknown,
        });
        return this.applHost.sendCommand(cc, this.commandOptions);
    }
};
ClockCCAPI = __decorate([
    (0, CommandClassDecorators_1.API)(safe_1.CommandClasses.Clock)
], ClockCCAPI);
exports.ClockCCAPI = ClockCCAPI;
let ClockCC = class ClockCC extends CommandClass_1.CommandClass {
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
        const api = API_1.CCAPI.create(safe_1.CommandClasses.Clock, applHost, endpoint).withOptions({
            priority: safe_1.MessagePriority.NodeQuery,
        });
        applHost.controllerLog.logNode(node.id, {
            message: "requesting current clock setting...",
            direction: "outbound",
        });
        const response = await api.get();
        if (response) {
            const logMessage = `received current clock setting: ${response.weekday !== _Types_1.Weekday.Unknown
                ? _Types_1.Weekday[response.weekday] + ", "
                : ""}${response.hour < 10 ? "0" : ""}${response.hour}:${response.minute < 10 ? "0" : ""}${response.minute}`;
            applHost.controllerLog.logNode(node.id, {
                message: logMessage,
                direction: "inbound",
            });
        }
    }
};
ClockCC = __decorate([
    (0, CommandClassDecorators_1.commandClass)(safe_1.CommandClasses.Clock),
    (0, CommandClassDecorators_1.implementedVersion)(1)
], ClockCC);
exports.ClockCC = ClockCC;
let ClockCCSet = class ClockCCSet extends ClockCC {
    constructor(host, options) {
        super(host, options);
        if ((0, CommandClass_1.gotDeserializationOptions)(options)) {
            // TODO: Deserialize payload
            throw new safe_1.ZWaveError(`${this.constructor.name}: deserialization not implemented`, safe_1.ZWaveErrorCodes.Deserialization_NotImplemented);
        }
        else {
            this.weekday = options.weekday;
            this.hour = options.hour;
            this.minute = options.minute;
        }
    }
    serialize() {
        this.payload = Buffer.from([
            ((this.weekday & 0b111) << 5) | (this.hour & 0b11111),
            this.minute,
        ]);
        return super.serialize();
    }
    toLogEntry(applHost) {
        return {
            ...super.toLogEntry(applHost),
            message: {
                "clock setting": `${(0, safe_2.getEnumMemberName)(_Types_1.Weekday, this.weekday)}, ${(0, strings_1.padStart)(this.hour.toString(), 2, "0")}:${(0, strings_1.padStart)(this.minute.toString(), 2, "0")}`,
            },
        };
    }
};
ClockCCSet = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.ClockCommand.Set),
    (0, CommandClassDecorators_1.useSupervision)()
], ClockCCSet);
exports.ClockCCSet = ClockCCSet;
let ClockCCReport = class ClockCCReport extends ClockCC {
    constructor(host, options) {
        super(host, options);
        (0, safe_1.validatePayload)(this.payload.length >= 2);
        this.weekday = this.payload[0] >>> 5;
        this.hour = this.payload[0] & 0b11111;
        this.minute = this.payload[1];
        (0, safe_1.validatePayload)(this.weekday <= _Types_1.Weekday.Sunday, this.hour <= 23, this.minute <= 59);
    }
    toLogEntry(applHost) {
        return {
            ...super.toLogEntry(applHost),
            message: {
                "clock setting": `${(0, safe_2.getEnumMemberName)(_Types_1.Weekday, this.weekday)}, ${(0, strings_1.padStart)(this.hour.toString(), 2, "0")}:${(0, strings_1.padStart)(this.minute.toString(), 2, "0")}`,
            },
        };
    }
};
ClockCCReport = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.ClockCommand.Report)
], ClockCCReport);
exports.ClockCCReport = ClockCCReport;
let ClockCCGet = class ClockCCGet extends ClockCC {
};
ClockCCGet = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.ClockCommand.Get),
    (0, CommandClassDecorators_1.expectedCCResponse)(ClockCCReport)
], ClockCCGet);
exports.ClockCCGet = ClockCCGet;
//# sourceMappingURL=ClockCC.js.map