"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TimeCCTimeOffsetGet = exports.TimeCCTimeOffsetReport = exports.TimeCCTimeOffsetSet = exports.TimeCCDateGet = exports.TimeCCDateReport = exports.TimeCCTimeGet = exports.TimeCCTimeReport = exports.TimeCC = exports.TimeCCAPI = void 0;
function __assertType(argName, typeName, boundHasError) {
    const { ZWaveError, ZWaveErrorCodes } = require("@zwave-js/core");
    if (boundHasError()) {
        throw new ZWaveError(typeName ? `${argName} is not a ${typeName}` : `${argName} has the wrong type`, ZWaveErrorCodes.Argument_Invalid);
    }
}
const __assertType__DSTInfo = $o => {
    function _date($o) {
        let nativeDateObject;
        if (typeof global === "undefined")
            nativeDateObject = window.Date;
        else
            nativeDateObject = global.Date;
        if (!($o instanceof nativeDateObject))
            return {};
        else
            return null;
    }
    function _number($o) {
        return typeof $o !== "number" ? {} : null;
    }
    function _0($o) {
        if (typeof $o !== "object" || $o === null || Array.isArray($o))
            return {};
        if ("startDate" in $o && $o["startDate"] !== undefined) {
            const error = _date($o["startDate"]);
            if (error)
                return error;
        }
        else
            return {};
        if ("endDate" in $o && $o["endDate"] !== undefined) {
            const error = _date($o["endDate"]);
            if (error)
                return error;
        }
        else
            return {};
        if ("standardOffset" in $o && $o["standardOffset"] !== undefined) {
            const error = _number($o["standardOffset"]);
            if (error)
                return error;
        }
        else
            return {};
        if ("dstOffset" in $o && $o["dstOffset"] !== undefined) {
            const error = _number($o["dstOffset"]);
            if (error)
                return error;
        }
        else
            return {};
        return null;
    }
    return _0($o);
};
const core_1 = require("@zwave-js/core");
const safe_1 = require("@zwave-js/shared/safe");
const strings_1 = require("alcalzone-shared/strings");
const API_1 = require("../lib/API");
const CommandClass_1 = require("../lib/CommandClass");
const CommandClassDecorators_1 = require("../lib/CommandClassDecorators");
const serializers_1 = require("../lib/serializers");
const _Types_1 = require("../lib/_Types");
// @noSetValueAPI
// Only the timezone information can be set and that accepts a non-primitive value
let TimeCCAPI = class TimeCCAPI extends API_1.CCAPI {
    supportsCommand(cmd) {
        switch (cmd) {
            case _Types_1.TimeCommand.TimeGet:
            case _Types_1.TimeCommand.TimeReport:
            case _Types_1.TimeCommand.DateGet:
            case _Types_1.TimeCommand.DateReport:
                return this.isSinglecast(); // "mandatory"
            case _Types_1.TimeCommand.TimeOffsetGet:
            case _Types_1.TimeCommand.TimeOffsetReport:
                return this.version >= 2 && this.isSinglecast();
            case _Types_1.TimeCommand.TimeOffsetSet:
                return this.version >= 2;
        }
        return super.supportsCommand(cmd);
    }
    // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
    async getTime() {
        this.assertSupportsCommand(_Types_1.TimeCommand, _Types_1.TimeCommand.TimeGet);
        const cc = new TimeCCTimeGet(this.applHost, {
            nodeId: this.endpoint.nodeId,
            endpoint: this.endpoint.index,
        });
        const response = await this.applHost.sendCommand(cc, this.commandOptions);
        if (response) {
            return (0, safe_1.pick)(response, ["hour", "minute", "second"]);
        }
    }
    async reportTime(hour, minute, second) {
        this.assertSupportsCommand(_Types_1.TimeCommand, _Types_1.TimeCommand.TimeReport);
        const cc = new TimeCCTimeReport(this.applHost, {
            nodeId: this.endpoint.nodeId,
            endpoint: this.endpoint.index,
            hour,
            minute,
            second,
        });
        return this.applHost.sendCommand(cc, this.commandOptions);
    }
    // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
    async getDate() {
        this.assertSupportsCommand(_Types_1.TimeCommand, _Types_1.TimeCommand.DateGet);
        const cc = new TimeCCDateGet(this.applHost, {
            nodeId: this.endpoint.nodeId,
            endpoint: this.endpoint.index,
        });
        const response = await this.applHost.sendCommand(cc, this.commandOptions);
        if (response) {
            return (0, safe_1.pick)(response, ["day", "month", "year"]);
        }
    }
    async reportDate(year, month, day) {
        this.assertSupportsCommand(_Types_1.TimeCommand, _Types_1.TimeCommand.DateReport);
        const cc = new TimeCCDateReport(this.applHost, {
            nodeId: this.endpoint.nodeId,
            endpoint: this.endpoint.index,
            year,
            month,
            day,
        });
        return this.applHost.sendCommand(cc, this.commandOptions);
    }
    async setTimezone(timezone) {
        __assertType("timezone", "DSTInfo", __assertType__DSTInfo.bind(void 0, timezone));
        this.assertSupportsCommand(_Types_1.TimeCommand, _Types_1.TimeCommand.TimeOffsetSet);
        const cc = new TimeCCTimeOffsetSet(this.applHost, {
            nodeId: this.endpoint.nodeId,
            endpoint: this.endpoint.index,
            standardOffset: timezone.standardOffset,
            dstOffset: timezone.dstOffset,
            dstStart: timezone.startDate,
            dstEnd: timezone.endDate,
        });
        return this.applHost.sendCommand(cc, this.commandOptions);
    }
    async getTimezone() {
        this.assertSupportsCommand(_Types_1.TimeCommand, _Types_1.TimeCommand.TimeOffsetGet);
        const cc = new TimeCCTimeOffsetGet(this.applHost, {
            nodeId: this.endpoint.nodeId,
            endpoint: this.endpoint.index,
        });
        const response = await this.applHost.sendCommand(cc, this.commandOptions);
        if (response) {
            return {
                standardOffset: response.standardOffset,
                dstOffset: response.dstOffset,
                startDate: response.dstStartDate,
                endDate: response.dstEndDate,
            };
        }
    }
    async reportTimezone(timezone) {
        __assertType("timezone", "DSTInfo", __assertType__DSTInfo.bind(void 0, timezone));
        this.assertSupportsCommand(_Types_1.TimeCommand, _Types_1.TimeCommand.TimeOffsetReport);
        const cc = new TimeCCTimeOffsetReport(this.applHost, {
            nodeId: this.endpoint.nodeId,
            endpoint: this.endpoint.index,
            standardOffset: timezone.standardOffset,
            dstOffset: timezone.dstOffset,
            dstStart: timezone.startDate,
            dstEnd: timezone.endDate,
        });
        return this.applHost.sendCommand(cc, this.commandOptions);
    }
};
TimeCCAPI = __decorate([
    (0, CommandClassDecorators_1.API)(core_1.CommandClasses.Time)
], TimeCCAPI);
exports.TimeCCAPI = TimeCCAPI;
let TimeCC = class TimeCC extends CommandClass_1.CommandClass {
    async interview(applHost) {
        const node = this.getNode(applHost);
        const endpoint = this.getEndpoint(applHost);
        const api = API_1.CCAPI.create(core_1.CommandClasses.Time, applHost, endpoint).withOptions({
            priority: core_1.MessagePriority.NodeQuery,
        });
        applHost.controllerLog.logNode(node.id, {
            endpoint: this.endpointIndex,
            message: `Interviewing ${this.ccName}...`,
            direction: "none",
        });
        // Synchronize the slave's time
        if (api.version >= 2) {
            applHost.controllerLog.logNode(node.id, {
                endpoint: this.endpointIndex,
                message: "setting timezone information...",
                direction: "outbound",
            });
            // Set the correct timezone on this node
            const timezone = (0, core_1.getDSTInfo)();
            await api.setTimezone(timezone);
        }
        // Remember that the interview is complete
        this.setInterviewComplete(applHost, true);
    }
};
TimeCC = __decorate([
    (0, CommandClassDecorators_1.commandClass)(core_1.CommandClasses.Time),
    (0, CommandClassDecorators_1.implementedVersion)(2)
], TimeCC);
exports.TimeCC = TimeCC;
let TimeCCTimeReport = class TimeCCTimeReport extends TimeCC {
    constructor(host, options) {
        super(host, options);
        if ((0, CommandClass_1.gotDeserializationOptions)(options)) {
            (0, core_1.validatePayload)(this.payload.length >= 3);
            this.hour = this.payload[0] & 0b11111;
            (0, core_1.validatePayload)(this.hour >= 0, this.hour <= 23);
            this.minute = this.payload[1];
            (0, core_1.validatePayload)(this.minute >= 0, this.minute <= 59);
            this.second = this.payload[2];
            (0, core_1.validatePayload)(this.second >= 0, this.second <= 59);
        }
        else {
            this.hour = options.hour;
            this.minute = options.minute;
            this.second = options.second;
        }
    }
    serialize() {
        this.payload = Buffer.from([
            this.hour & 0b11111,
            this.minute,
            this.second,
        ]);
        return super.serialize();
    }
    toLogEntry(applHost) {
        return {
            ...super.toLogEntry(applHost),
            message: {
                time: `${(0, strings_1.padStart)(this.hour.toString(), 2, "0")}:${(0, strings_1.padStart)(this.minute.toString(), 2, "0")}:${(0, strings_1.padStart)(this.second.toString(), 2, "0")}`,
            },
        };
    }
};
TimeCCTimeReport = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.TimeCommand.TimeReport),
    (0, CommandClassDecorators_1.useSupervision)()
], TimeCCTimeReport);
exports.TimeCCTimeReport = TimeCCTimeReport;
let TimeCCTimeGet = class TimeCCTimeGet extends TimeCC {
};
TimeCCTimeGet = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.TimeCommand.TimeGet),
    (0, CommandClassDecorators_1.expectedCCResponse)(TimeCCTimeReport)
], TimeCCTimeGet);
exports.TimeCCTimeGet = TimeCCTimeGet;
let TimeCCDateReport = class TimeCCDateReport extends TimeCC {
    constructor(host, options) {
        super(host, options);
        if ((0, CommandClass_1.gotDeserializationOptions)(options)) {
            (0, core_1.validatePayload)(this.payload.length >= 4);
            this.year = this.payload.readUInt16BE(0);
            this.month = this.payload[2];
            this.day = this.payload[3];
        }
        else {
            this.year = options.year;
            this.month = options.month;
            this.day = options.day;
        }
    }
    serialize() {
        this.payload = Buffer.from([
            // 2 bytes placeholder for year
            0,
            0,
            this.month,
            this.day,
        ]);
        this.payload.writeUInt16BE(this.year, 0);
        return super.serialize();
    }
    toLogEntry(applHost) {
        return {
            ...super.toLogEntry(applHost),
            message: {
                date: `${(0, strings_1.padStart)(this.year.toString(), 4, "0")}-${(0, strings_1.padStart)(this.month.toString(), 2, "0")}-${(0, strings_1.padStart)(this.day.toString(), 2, "0")}`,
            },
        };
    }
};
TimeCCDateReport = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.TimeCommand.DateReport),
    (0, CommandClassDecorators_1.useSupervision)()
], TimeCCDateReport);
exports.TimeCCDateReport = TimeCCDateReport;
let TimeCCDateGet = class TimeCCDateGet extends TimeCC {
};
TimeCCDateGet = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.TimeCommand.DateGet),
    (0, CommandClassDecorators_1.expectedCCResponse)(TimeCCDateReport)
], TimeCCDateGet);
exports.TimeCCDateGet = TimeCCDateGet;
let TimeCCTimeOffsetSet = class TimeCCTimeOffsetSet extends TimeCC {
    constructor(host, options) {
        super(host, options);
        if ((0, CommandClass_1.gotDeserializationOptions)(options)) {
            // TODO: Deserialize payload
            throw new core_1.ZWaveError(`${this.constructor.name}: deserialization not implemented`, core_1.ZWaveErrorCodes.Deserialization_NotImplemented);
        }
        else {
            this.standardOffset = options.standardOffset;
            this.dstOffset = options.dstOffset;
            this.dstStartDate = options.dstStart;
            this.dstEndDate = options.dstEnd;
        }
    }
    serialize() {
        this.payload = Buffer.concat([
            (0, serializers_1.encodeTimezone)({
                standardOffset: this.standardOffset,
                dstOffset: this.dstOffset,
            }),
            Buffer.from([
                this.dstStartDate.getUTCMonth() + 1,
                this.dstStartDate.getUTCDate(),
                this.dstStartDate.getUTCHours(),
                this.dstEndDate.getUTCMonth() + 1,
                this.dstEndDate.getUTCDate(),
                this.dstEndDate.getUTCHours(),
            ]),
        ]);
        return super.serialize();
    }
    toLogEntry(applHost) {
        return {
            ...super.toLogEntry(applHost),
            message: {
                "standard time offset": `${this.standardOffset} minutes`,
                "DST offset": `${this.dstOffset} minutes`,
                "DST start date": (0, core_1.formatDate)(this.dstStartDate, "YYYY-MM-DD"),
                "DST end date": (0, core_1.formatDate)(this.dstEndDate, "YYYY-MM-DD"),
            },
        };
    }
};
TimeCCTimeOffsetSet = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.TimeCommand.TimeOffsetSet),
    (0, CommandClassDecorators_1.useSupervision)()
], TimeCCTimeOffsetSet);
exports.TimeCCTimeOffsetSet = TimeCCTimeOffsetSet;
let TimeCCTimeOffsetReport = class TimeCCTimeOffsetReport extends TimeCC {
    constructor(host, options) {
        super(host, options);
        if ((0, CommandClass_1.gotDeserializationOptions)(options)) {
            (0, core_1.validatePayload)(this.payload.length >= 9);
            const { standardOffset, dstOffset } = (0, serializers_1.parseTimezone)(this.payload);
            this.standardOffset = standardOffset;
            this.dstOffset = dstOffset;
            const currentYear = new Date().getUTCFullYear();
            this.dstStartDate = new Date(Date.UTC(currentYear, this.payload[3] - 1, this.payload[4], this.payload[5]));
            this.dstEndDate = new Date(Date.UTC(currentYear, this.payload[6] - 1, this.payload[7], this.payload[8]));
        }
        else {
            this.standardOffset = options.standardOffset;
            this.dstOffset = options.dstOffset;
            this.dstStartDate = options.dstStart;
            this.dstEndDate = options.dstEnd;
        }
    }
    serialize() {
        this.payload = Buffer.concat([
            (0, serializers_1.encodeTimezone)({
                standardOffset: this.standardOffset,
                dstOffset: this.dstOffset,
            }),
            Buffer.from([
                this.dstStartDate.getUTCMonth() + 1,
                this.dstStartDate.getUTCDate(),
                this.dstStartDate.getUTCHours(),
                this.dstEndDate.getUTCMonth() + 1,
                this.dstEndDate.getUTCDate(),
                this.dstEndDate.getUTCHours(),
            ]),
        ]);
        return super.serialize();
    }
    toLogEntry(applHost) {
        return {
            ...super.toLogEntry(applHost),
            message: {
                "standard time offset": `${this.standardOffset} minutes`,
                "DST offset": `${this.dstOffset} minutes`,
                "DST start date": (0, core_1.formatDate)(this.dstStartDate, "YYYY-MM-DD"),
                "DST end date": (0, core_1.formatDate)(this.dstEndDate, "YYYY-MM-DD"),
            },
        };
    }
};
TimeCCTimeOffsetReport = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.TimeCommand.TimeOffsetReport),
    (0, CommandClassDecorators_1.useSupervision)()
], TimeCCTimeOffsetReport);
exports.TimeCCTimeOffsetReport = TimeCCTimeOffsetReport;
let TimeCCTimeOffsetGet = class TimeCCTimeOffsetGet extends TimeCC {
};
TimeCCTimeOffsetGet = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.TimeCommand.TimeOffsetGet),
    (0, CommandClassDecorators_1.expectedCCResponse)(TimeCCTimeOffsetReport)
], TimeCCTimeOffsetGet);
exports.TimeCCTimeOffsetGet = TimeCCTimeOffsetGet;
//# sourceMappingURL=TimeCC.js.map