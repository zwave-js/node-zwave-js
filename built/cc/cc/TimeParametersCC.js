"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var _a, _b;
Object.defineProperty(exports, "__esModule", { value: true });
exports.TimeParametersCCSet = exports.TimeParametersCCGet = exports.TimeParametersCCReport = exports.TimeParametersCC = exports.TimeParametersCCAPI = exports.TimeParametersCCValues = void 0;
function __assertType(argName, typeName, boundHasError) {
    const { ZWaveError, ZWaveErrorCodes } = require("@zwave-js/core");
    if (boundHasError()) {
        throw new ZWaveError(typeName ? `${argName} is not a ${typeName}` : `${argName} has the wrong type`, ZWaveErrorCodes.Argument_Invalid);
    }
}
const __assertType__Date = $o => {
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
    return _date($o);
};
const core_1 = require("@zwave-js/core");
const API_1 = require("../lib/API");
const CommandClass_1 = require("../lib/CommandClass");
const CommandClassDecorators_1 = require("../lib/CommandClassDecorators");
const Values_1 = require("../lib/Values");
const _Types_1 = require("../lib/_Types");
exports.TimeParametersCCValues = Object.freeze({
    ...Values_1.V.defineStaticCCValues(core_1.CommandClasses["Time Parameters"], {
        ...Values_1.V.staticProperty("dateAndTime", {
            ...core_1.ValueMetadata.Any,
            label: "Date and Time",
        }),
    }),
});
/**
 * Determines if the node expects local time instead of UTC.
 */
function shouldUseLocalTime(endpoint) {
    // GH#311 Some nodes have no way to determine the time zone offset,
    // so they need to interpret the set time as local time instead of UTC.
    //
    // This is the case when they both
    // 1. DON'T control TimeCC V1, so they cannot request the local time
    // 2. DON'T support TimeCC V2, so the controller cannot specify the timezone offset
    // Incidentally, this is also true when they don't support TimeCC at all
    const ccVersion = endpoint.getCCVersion(core_1.CommandClasses.Time);
    if (ccVersion >= 1 && endpoint.controlsCC(core_1.CommandClasses.Time))
        return false;
    if (ccVersion >= 2 && endpoint.supportsCC(core_1.CommandClasses.Time))
        return false;
    return true;
}
function segmentsToDate(segments, local) {
    if (local) {
        return new Date(segments.year, segments.month - 1, segments.day, segments.hour, segments.minute, segments.second);
    }
    else {
        return new Date(Date.UTC(segments.year, segments.month - 1, segments.day, segments.hour, segments.minute, segments.second));
    }
}
function dateToSegments(date, local) {
    return {
        year: date[`get${local ? "" : "UTC"}FullYear`](),
        month: date[`get${local ? "" : "UTC"}Month`]() + 1,
        day: date[`get${local ? "" : "UTC"}Date`](),
        hour: date[`get${local ? "" : "UTC"}Hours`](),
        minute: date[`get${local ? "" : "UTC"}Minutes`](),
        second: date[`get${local ? "" : "UTC"}Seconds`](),
    };
}
let TimeParametersCCAPI = class TimeParametersCCAPI extends API_1.CCAPI {
    constructor() {
        super(...arguments);
        this[_a] = async ({ property }, value) => {
            if (property !== "dateAndTime") {
                (0, API_1.throwUnsupportedProperty)(this.ccId, property);
            }
            if (!(value instanceof Date)) {
                (0, API_1.throwWrongValueType)(this.ccId, property, "date", typeof value);
            }
            return this.set(value);
        };
        this[_b] = async ({ property, }) => {
            switch (property) {
                case "dateAndTime":
                    return this.get();
                default:
                    (0, API_1.throwUnsupportedProperty)(this.ccId, property);
            }
        };
    }
    supportsCommand(cmd) {
        switch (cmd) {
            case _Types_1.TimeParametersCommand.Get:
                return this.isSinglecast();
            case _Types_1.TimeParametersCommand.Set:
                return true; // This is mandatory
        }
        return super.supportsCommand(cmd);
    }
    async get() {
        this.assertSupportsCommand(_Types_1.TimeParametersCommand, _Types_1.TimeParametersCommand.Get);
        const cc = new TimeParametersCCGet(this.applHost, {
            nodeId: this.endpoint.nodeId,
            endpoint: this.endpoint.index,
        });
        const response = await this.applHost.sendCommand(cc, this.commandOptions);
        return response?.dateAndTime;
    }
    async set(dateAndTime) {
        __assertType("dateAndTime", "Date", __assertType__Date.bind(void 0, dateAndTime));
        this.assertSupportsCommand(_Types_1.TimeParametersCommand, _Types_1.TimeParametersCommand.Set);
        const useLocalTime = this.endpoint.virtual
            ? shouldUseLocalTime(this.endpoint.node.physicalNodes[0].getEndpoint(this.endpoint.index))
            : shouldUseLocalTime(this.endpoint);
        const cc = new TimeParametersCCSet(this.applHost, {
            nodeId: this.endpoint.nodeId,
            endpoint: this.endpoint.index,
            dateAndTime,
            useLocalTime,
        });
        return this.applHost.sendCommand(cc, this.commandOptions);
    }
};
_a = API_1.SET_VALUE, _b = API_1.POLL_VALUE;
TimeParametersCCAPI = __decorate([
    (0, CommandClassDecorators_1.API)(core_1.CommandClasses["Time Parameters"])
], TimeParametersCCAPI);
exports.TimeParametersCCAPI = TimeParametersCCAPI;
let TimeParametersCC = class TimeParametersCC extends CommandClass_1.CommandClass {
    async interview(applHost) {
        const node = this.getNode(applHost);
        const endpoint = this.getEndpoint(applHost);
        const api = API_1.CCAPI.create(core_1.CommandClasses["Time Parameters"], applHost, endpoint).withOptions({
            priority: core_1.MessagePriority.NodeQuery,
        });
        applHost.controllerLog.logNode(node.id, {
            endpoint: this.endpointIndex,
            message: `Interviewing ${this.ccName}...`,
            direction: "none",
        });
        // Synchronize the node's time
        applHost.controllerLog.logNode(node.id, {
            endpoint: this.endpointIndex,
            message: "setting current time...",
            direction: "outbound",
        });
        await api.set(new Date());
        // Remember that the interview is complete
        this.setInterviewComplete(applHost, true);
    }
};
TimeParametersCC = __decorate([
    (0, CommandClassDecorators_1.commandClass)(core_1.CommandClasses["Time Parameters"]),
    (0, CommandClassDecorators_1.implementedVersion)(1),
    (0, CommandClassDecorators_1.ccValues)(exports.TimeParametersCCValues)
], TimeParametersCC);
exports.TimeParametersCC = TimeParametersCC;
let TimeParametersCCReport = class TimeParametersCCReport extends TimeParametersCC {
    constructor(host, options) {
        super(host, options);
        (0, core_1.validatePayload)(this.payload.length >= 7);
        const dateSegments = {
            year: this.payload.readUInt16BE(0),
            month: this.payload[2],
            day: this.payload[3],
            hour: this.payload[4],
            minute: this.payload[5],
            second: this.payload[6],
        };
        this._dateAndTime = segmentsToDate(dateSegments, 
        // Assume we can use UTC and correct this assumption in persistValues
        false);
    }
    persistValues(applHost) {
        // If necessary, fix the date and time before persisting it
        const local = shouldUseLocalTime(applHost.nodes
            .get(this.nodeId)
            .getEndpoint(this.endpointIndex));
        if (local) {
            // The initial assumption was incorrect, re-interpret the time
            const segments = dateToSegments(this.dateAndTime, false);
            this._dateAndTime = segmentsToDate(segments, local);
        }
        return super.persistValues(applHost);
    }
    get dateAndTime() {
        return this._dateAndTime;
    }
    toLogEntry(applHost) {
        return {
            ...super.toLogEntry(applHost),
            message: {
                "date and time": (0, core_1.formatDate)(this.dateAndTime, "YYYY-MM-DD HH:mm:ss"),
            },
        };
    }
};
__decorate([
    (0, CommandClassDecorators_1.ccValue)(exports.TimeParametersCCValues.dateAndTime)
], TimeParametersCCReport.prototype, "dateAndTime", null);
TimeParametersCCReport = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.TimeParametersCommand.Report)
], TimeParametersCCReport);
exports.TimeParametersCCReport = TimeParametersCCReport;
let TimeParametersCCGet = class TimeParametersCCGet extends TimeParametersCC {
};
TimeParametersCCGet = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.TimeParametersCommand.Get),
    (0, CommandClassDecorators_1.expectedCCResponse)(TimeParametersCCReport)
], TimeParametersCCGet);
exports.TimeParametersCCGet = TimeParametersCCGet;
let TimeParametersCCSet = class TimeParametersCCSet extends TimeParametersCC {
    constructor(host, options) {
        super(host, options);
        if ((0, CommandClass_1.gotDeserializationOptions)(options)) {
            (0, core_1.validatePayload)(this.payload.length >= 7);
            const dateSegments = {
                year: this.payload.readUInt16BE(0),
                month: this.payload[2],
                day: this.payload[3],
                hour: this.payload[4],
                minute: this.payload[5],
                second: this.payload[6],
            };
            (0, core_1.validatePayload)(dateSegments.month >= 1 && dateSegments.month <= 12, dateSegments.day >= 1 && dateSegments.day <= 31, dateSegments.hour >= 0 && dateSegments.hour <= 23, dateSegments.minute >= 0 && dateSegments.minute <= 59, dateSegments.second >= 0 && dateSegments.second <= 59);
            this.dateAndTime = segmentsToDate(dateSegments, 
            // Assume we can use UTC and correct this assumption in persistValues
            false);
        }
        else {
            this.dateAndTime = options.dateAndTime;
            this.useLocalTime = options.useLocalTime;
        }
    }
    persistValues(applHost) {
        // We do not actually persist anything here, but we need access to the node
        // in order to interpret the date segments correctly
        const local = shouldUseLocalTime(applHost.nodes
            .get(this.nodeId)
            .getEndpoint(this.endpointIndex));
        if (local) {
            // The initial assumption was incorrect, re-interpret the time
            const segments = dateToSegments(this.dateAndTime, false);
            this.dateAndTime = segmentsToDate(segments, local);
        }
        return super.persistValues(applHost);
    }
    serialize() {
        const dateSegments = dateToSegments(this.dateAndTime, !!this.useLocalTime);
        this.payload = Buffer.from([
            // 2 bytes placeholder for year
            0,
            0,
            dateSegments.month,
            dateSegments.day,
            dateSegments.hour,
            dateSegments.minute,
            dateSegments.second,
        ]);
        this.payload.writeUInt16BE(dateSegments.year, 0);
        return super.serialize();
    }
    toLogEntry(applHost) {
        return {
            ...super.toLogEntry(applHost),
            message: {
                "date and time": (0, core_1.formatDate)(this.dateAndTime, "YYYY-MM-DD HH:mm:ss"),
            },
        };
    }
};
TimeParametersCCSet = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.TimeParametersCommand.Set),
    (0, CommandClassDecorators_1.useSupervision)()
], TimeParametersCCSet);
exports.TimeParametersCCSet = TimeParametersCCSet;
//# sourceMappingURL=TimeParametersCC.js.map