"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClimateControlScheduleCCOverrideSet = exports.ClimateControlScheduleCCOverrideGet = exports.ClimateControlScheduleCCOverrideReport = exports.ClimateControlScheduleCCChangedGet = exports.ClimateControlScheduleCCChangedReport = exports.ClimateControlScheduleCCGet = exports.ClimateControlScheduleCCReport = exports.ClimateControlScheduleCCSet = exports.ClimateControlScheduleCC = exports.ClimateControlScheduleCCAPI = exports.ClimateControlScheduleCCValues = void 0;
function __assertType(argName, typeName, boundHasError) {
    const { ZWaveError, ZWaveErrorCodes } = require("@zwave-js/core");
    if (boundHasError()) {
        throw new ZWaveError(typeName ? `${argName} is not a ${typeName}` : `${argName} has the wrong type`, ZWaveErrorCodes.Argument_Invalid);
    }
}
const __assertType__Weekday = $o => {
    function su__1__2__3__4__5__6__7__8_eu($o) {
        return ![0, 1, 2, 3, 4, 5, 6, 7].includes($o) ? {} : null;
    }
    return su__1__2__3__4__5__6__7__8_eu($o);
};
const __assertType__sa__2_ea_2 = $o => {
    function _number($o) {
        return typeof $o !== "number" ? {} : null;
    }
    function _undefined($o) {
        return $o !== undefined ? {} : null;
    }
    function _6($o) {
        return $o !== "Unused" ? {} : null;
    }
    function _7($o) {
        return $o !== "Frost Protection" ? {} : null;
    }
    function _8($o) {
        return $o !== "Energy Saving" ? {} : null;
    }
    function su__undefined__number__6__7__8_eu($o) {
        const conditions = [_undefined, _number, _6, _7, _8];
        for (const condition of conditions) {
            const error = condition($o);
            if (!error)
                return null;
        }
        return {};
    }
    function _2($o) {
        if (typeof $o !== "object" || $o === null || Array.isArray($o))
            return {};
        if ("hour" in $o && $o["hour"] !== undefined) {
            const error = _number($o["hour"]);
            if (error)
                return error;
        }
        else
            return {};
        if ("minute" in $o && $o["minute"] !== undefined) {
            const error = _number($o["minute"]);
            if (error)
                return error;
        }
        else
            return {};
        if ("state" in $o && $o["state"] !== undefined) {
            const error = su__undefined__number__6__7__8_eu($o["state"]);
            if (error)
                return error;
        }
        else
            return {};
        return null;
    }
    function sa__2_ea_2($o) {
        if (!Array.isArray($o))
            return {};
        for (let i = 0; i < $o.length; i++) {
            const error = _2($o[i]);
            if (error)
                return error;
        }
        return null;
    }
    return sa__2_ea_2($o);
};
const __assertType__ScheduleOverrideType = $o => {
    function su__1__2__3_eu($o) {
        return ![0, 1, 2].includes($o) ? {} : null;
    }
    return su__1__2__3_eu($o);
};
const __assertType__SetbackState = $o => {
    function _number($o) {
        return typeof $o !== "number" ? {} : null;
    }
    function _2($o) {
        return $o !== "Unused" ? {} : null;
    }
    function _3($o) {
        return $o !== "Frost Protection" ? {} : null;
    }
    function _4($o) {
        return $o !== "Energy Saving" ? {} : null;
    }
    function su__number__2__3__4_eu($o) {
        const conditions = [_number, _2, _3, _4];
        for (const condition of conditions) {
            const error = condition($o);
            if (!error)
                return null;
        }
        return {};
    }
    return su__number__2__3__4_eu($o);
};
const safe_1 = require("@zwave-js/core/safe");
const safe_2 = require("@zwave-js/shared/safe");
const strings_1 = require("alcalzone-shared/strings");
const API_1 = require("../lib/API");
const CommandClass_1 = require("../lib/CommandClass");
const CommandClassDecorators_1 = require("../lib/CommandClassDecorators");
const serializers_1 = require("../lib/serializers");
const Values_1 = require("../lib/Values");
const _Types_1 = require("../lib/_Types");
exports.ClimateControlScheduleCCValues = Object.freeze({
    ...Values_1.V.defineStaticCCValues(safe_1.CommandClasses["Climate Control Schedule"], {
        ...Values_1.V.staticProperty("overrideType", {
            ...safe_1.ValueMetadata.Number,
            label: "Override type",
            states: (0, safe_1.enumValuesToMetadataStates)(_Types_1.ScheduleOverrideType),
        }),
        ...Values_1.V.staticProperty("overrideState", {
            ...safe_1.ValueMetadata.Number,
            label: "Override state",
            min: -12.8,
        }),
    }),
    ...Values_1.V.defineDynamicCCValues(safe_1.CommandClasses["Climate Control Schedule"], {
        ...Values_1.V.dynamicPropertyAndKeyWithName("schedule", "schedule", (weekday) => weekday, ({ property, propertyKey }) => property === "switchPoints" &&
            typeof propertyKey === "number" &&
            propertyKey >= _Types_1.Weekday.Monday &&
            propertyKey <= _Types_1.Weekday.Sunday, (weekday) => ({
            ...safe_1.ValueMetadata.Any,
            label: `Schedule (${(0, safe_2.getEnumMemberName)(_Types_1.Weekday, weekday)})`,
        })),
    }),
});
let ClimateControlScheduleCCAPI = class ClimateControlScheduleCCAPI extends API_1.CCAPI {
    supportsCommand(cmd) {
        switch (cmd) {
            case _Types_1.ClimateControlScheduleCommand.Set:
            case _Types_1.ClimateControlScheduleCommand.OverrideSet:
                return true; // mandatory
            case _Types_1.ClimateControlScheduleCommand.Get:
            case _Types_1.ClimateControlScheduleCommand.ChangedGet:
            case _Types_1.ClimateControlScheduleCommand.OverrideGet:
                return this.isSinglecast();
        }
        return super.supportsCommand(cmd);
    }
    async set(weekday, switchPoints) {
        __assertType("weekday", "Weekday", __assertType__Weekday.bind(void 0, weekday));
        __assertType("switchPoints", undefined, __assertType__sa__2_ea_2.bind(void 0, switchPoints));
        this.assertSupportsCommand(_Types_1.ClimateControlScheduleCommand, _Types_1.ClimateControlScheduleCommand.Set);
        const cc = new ClimateControlScheduleCCSet(this.applHost, {
            nodeId: this.endpoint.nodeId,
            endpoint: this.endpoint.index,
            weekday,
            switchPoints,
        });
        return this.applHost.sendCommand(cc, this.commandOptions);
    }
    async get(weekday) {
        __assertType("weekday", "Weekday", __assertType__Weekday.bind(void 0, weekday));
        this.assertSupportsCommand(_Types_1.ClimateControlScheduleCommand, _Types_1.ClimateControlScheduleCommand.Get);
        const cc = new ClimateControlScheduleCCGet(this.applHost, {
            nodeId: this.endpoint.nodeId,
            endpoint: this.endpoint.index,
            weekday,
        });
        const response = await this.applHost.sendCommand(cc, this.commandOptions);
        return response?.schedule;
    }
    async getChangeCounter() {
        this.assertSupportsCommand(_Types_1.ClimateControlScheduleCommand, _Types_1.ClimateControlScheduleCommand.ChangedGet);
        const cc = new ClimateControlScheduleCCChangedGet(this.applHost, {
            nodeId: this.endpoint.nodeId,
            endpoint: this.endpoint.index,
        });
        const response = await this.applHost.sendCommand(cc, this.commandOptions);
        return response?.changeCounter;
    }
    // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
    async getOverride() {
        this.assertSupportsCommand(_Types_1.ClimateControlScheduleCommand, _Types_1.ClimateControlScheduleCommand.OverrideGet);
        const cc = new ClimateControlScheduleCCOverrideGet(this.applHost, {
            nodeId: this.endpoint.nodeId,
            endpoint: this.endpoint.index,
        });
        const response = await this.applHost.sendCommand(cc, this.commandOptions);
        if (response) {
            return {
                type: response.overrideType,
                state: response.overrideState,
            };
        }
    }
    async setOverride(type, state) {
        __assertType("type", "ScheduleOverrideType", __assertType__ScheduleOverrideType.bind(void 0, type));
        __assertType("state", "SetbackState", __assertType__SetbackState.bind(void 0, state));
        this.assertSupportsCommand(_Types_1.ClimateControlScheduleCommand, _Types_1.ClimateControlScheduleCommand.OverrideSet);
        const cc = new ClimateControlScheduleCCOverrideSet(this.applHost, {
            nodeId: this.endpoint.nodeId,
            endpoint: this.endpoint.index,
            overrideType: type,
            overrideState: state,
        });
        return this.applHost.sendCommand(cc, this.commandOptions);
    }
};
ClimateControlScheduleCCAPI = __decorate([
    (0, CommandClassDecorators_1.API)(safe_1.CommandClasses["Climate Control Schedule"])
], ClimateControlScheduleCCAPI);
exports.ClimateControlScheduleCCAPI = ClimateControlScheduleCCAPI;
let ClimateControlScheduleCC = class ClimateControlScheduleCC extends CommandClass_1.CommandClass {
};
ClimateControlScheduleCC = __decorate([
    (0, CommandClassDecorators_1.commandClass)(safe_1.CommandClasses["Climate Control Schedule"]),
    (0, CommandClassDecorators_1.implementedVersion)(1),
    (0, CommandClassDecorators_1.ccValues)(exports.ClimateControlScheduleCCValues)
], ClimateControlScheduleCC);
exports.ClimateControlScheduleCC = ClimateControlScheduleCC;
let ClimateControlScheduleCCSet = class ClimateControlScheduleCCSet extends ClimateControlScheduleCC {
    constructor(host, options) {
        super(host, options);
        if ((0, CommandClass_1.gotDeserializationOptions)(options)) {
            throw new safe_1.ZWaveError(`${this.constructor.name}: deserialization not implemented`, safe_1.ZWaveErrorCodes.Deserialization_NotImplemented);
        }
        else {
            this.switchPoints = options.switchPoints;
            this.weekday = options.weekday;
        }
    }
    serialize() {
        // Make sure we have exactly 9 entries
        const allSwitchPoints = this.switchPoints.slice(0, 9); // maximum 9
        while (allSwitchPoints.length < 9) {
            allSwitchPoints.push({
                hour: 0,
                minute: 0,
                state: "Unused",
            });
        }
        this.payload = Buffer.concat([
            Buffer.from([this.weekday & 0b111]),
            ...allSwitchPoints.map((sp) => (0, serializers_1.encodeSwitchpoint)(sp)),
        ]);
        return super.serialize();
    }
    toLogEntry(applHost) {
        return {
            ...super.toLogEntry(applHost),
            message: {
                weekday: (0, safe_2.getEnumMemberName)(_Types_1.Weekday, this.weekday),
                switchpoints: `${this.switchPoints
                    .map((sp) => `
· ${(0, strings_1.padStart)(sp.hour.toString(), 2, "0")}:${(0, strings_1.padStart)(sp.minute.toString(), 2, "0")} --> ${sp.state}`)
                    .join("")}`,
            },
        };
    }
};
ClimateControlScheduleCCSet = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.ClimateControlScheduleCommand.Set),
    (0, CommandClassDecorators_1.useSupervision)()
], ClimateControlScheduleCCSet);
exports.ClimateControlScheduleCCSet = ClimateControlScheduleCCSet;
let ClimateControlScheduleCCReport = class ClimateControlScheduleCCReport extends ClimateControlScheduleCC {
    constructor(host, options) {
        super(host, options);
        (0, safe_1.validatePayload)(this.payload.length >= 28); // 1 + 9 * 3
        this.weekday = this.payload[0] & 0b111;
        const allSwitchpoints = [];
        for (let i = 0; i <= 8; i++) {
            allSwitchpoints.push((0, serializers_1.decodeSwitchpoint)(this.payload.slice(1 + 3 * i)));
        }
        this.schedule = allSwitchpoints.filter((sp) => sp.state !== "Unused");
    }
    toLogEntry(applHost) {
        return {
            ...super.toLogEntry(applHost),
            message: {
                weekday: (0, safe_2.getEnumMemberName)(_Types_1.Weekday, this.weekday),
                schedule: `${this.schedule
                    .map((sp) => `
· ${(0, strings_1.padStart)(sp.hour.toString(), 2, "0")}:${(0, strings_1.padStart)(sp.minute.toString(), 2, "0")} --> ${sp.state}`)
                    .join("")}`,
            },
        };
    }
};
__decorate([
    (0, CommandClassDecorators_1.ccValue)(exports.ClimateControlScheduleCCValues.schedule, (self) => [self.weekday])
], ClimateControlScheduleCCReport.prototype, "schedule", void 0);
ClimateControlScheduleCCReport = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.ClimateControlScheduleCommand.Report)
], ClimateControlScheduleCCReport);
exports.ClimateControlScheduleCCReport = ClimateControlScheduleCCReport;
let ClimateControlScheduleCCGet = class ClimateControlScheduleCCGet extends ClimateControlScheduleCC {
    constructor(host, options) {
        super(host, options);
        if ((0, CommandClass_1.gotDeserializationOptions)(options)) {
            throw new safe_1.ZWaveError(`${this.constructor.name}: deserialization not implemented`, safe_1.ZWaveErrorCodes.Deserialization_NotImplemented);
        }
        else {
            this.weekday = options.weekday;
        }
    }
    serialize() {
        this.payload = Buffer.from([this.weekday & 0b111]);
        return super.serialize();
    }
    toLogEntry(applHost) {
        return {
            ...super.toLogEntry(applHost),
            message: { weekday: (0, safe_2.getEnumMemberName)(_Types_1.Weekday, this.weekday) },
        };
    }
};
ClimateControlScheduleCCGet = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.ClimateControlScheduleCommand.Get),
    (0, CommandClassDecorators_1.expectedCCResponse)(ClimateControlScheduleCCReport)
], ClimateControlScheduleCCGet);
exports.ClimateControlScheduleCCGet = ClimateControlScheduleCCGet;
let ClimateControlScheduleCCChangedReport = class ClimateControlScheduleCCChangedReport extends ClimateControlScheduleCC {
    constructor(host, options) {
        super(host, options);
        (0, safe_1.validatePayload)(this.payload.length >= 1);
        this.changeCounter = this.payload[0];
    }
    toLogEntry(applHost) {
        return {
            ...super.toLogEntry(applHost),
            message: { "change counter": this.changeCounter },
        };
    }
};
ClimateControlScheduleCCChangedReport = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.ClimateControlScheduleCommand.ChangedReport)
], ClimateControlScheduleCCChangedReport);
exports.ClimateControlScheduleCCChangedReport = ClimateControlScheduleCCChangedReport;
let ClimateControlScheduleCCChangedGet = class ClimateControlScheduleCCChangedGet extends ClimateControlScheduleCC {
};
ClimateControlScheduleCCChangedGet = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.ClimateControlScheduleCommand.ChangedGet),
    (0, CommandClassDecorators_1.expectedCCResponse)(ClimateControlScheduleCCChangedReport)
], ClimateControlScheduleCCChangedGet);
exports.ClimateControlScheduleCCChangedGet = ClimateControlScheduleCCChangedGet;
let ClimateControlScheduleCCOverrideReport = class ClimateControlScheduleCCOverrideReport extends ClimateControlScheduleCC {
    constructor(host, options) {
        super(host, options);
        (0, safe_1.validatePayload)(this.payload.length >= 2);
        this.overrideType = this.payload[0] & 0b11;
        this.overrideState =
            (0, serializers_1.decodeSetbackState)(this.payload[1]) || this.payload[1];
    }
    toLogEntry(applHost) {
        return {
            ...super.toLogEntry(applHost),
            message: {
                "override type": (0, safe_2.getEnumMemberName)(_Types_1.ScheduleOverrideType, this.overrideType),
                "override state": this.overrideState,
            },
        };
    }
};
__decorate([
    (0, CommandClassDecorators_1.ccValue)(exports.ClimateControlScheduleCCValues.overrideType)
], ClimateControlScheduleCCOverrideReport.prototype, "overrideType", void 0);
__decorate([
    (0, CommandClassDecorators_1.ccValue)(exports.ClimateControlScheduleCCValues.overrideState)
], ClimateControlScheduleCCOverrideReport.prototype, "overrideState", void 0);
ClimateControlScheduleCCOverrideReport = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.ClimateControlScheduleCommand.OverrideReport)
], ClimateControlScheduleCCOverrideReport);
exports.ClimateControlScheduleCCOverrideReport = ClimateControlScheduleCCOverrideReport;
let ClimateControlScheduleCCOverrideGet = class ClimateControlScheduleCCOverrideGet extends ClimateControlScheduleCC {
};
ClimateControlScheduleCCOverrideGet = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.ClimateControlScheduleCommand.OverrideGet),
    (0, CommandClassDecorators_1.expectedCCResponse)(ClimateControlScheduleCCOverrideReport)
], ClimateControlScheduleCCOverrideGet);
exports.ClimateControlScheduleCCOverrideGet = ClimateControlScheduleCCOverrideGet;
let ClimateControlScheduleCCOverrideSet = class ClimateControlScheduleCCOverrideSet extends ClimateControlScheduleCC {
    constructor(host, options) {
        super(host, options);
        if ((0, CommandClass_1.gotDeserializationOptions)(options)) {
            throw new safe_1.ZWaveError(`${this.constructor.name}: deserialization not implemented`, safe_1.ZWaveErrorCodes.Deserialization_NotImplemented);
        }
        else {
            this.overrideType = options.overrideType;
            this.overrideState = options.overrideState;
        }
    }
    serialize() {
        this.payload = Buffer.from([
            this.overrideType & 0b11,
            (0, serializers_1.encodeSetbackState)(this.overrideState),
        ]);
        return super.serialize();
    }
    toLogEntry(applHost) {
        return {
            ...super.toLogEntry(applHost),
            message: {
                "override type": (0, safe_2.getEnumMemberName)(_Types_1.ScheduleOverrideType, this.overrideType),
                "override state": this.overrideState,
            },
        };
    }
};
ClimateControlScheduleCCOverrideSet = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.ClimateControlScheduleCommand.OverrideSet),
    (0, CommandClassDecorators_1.useSupervision)()
], ClimateControlScheduleCCOverrideSet);
exports.ClimateControlScheduleCCOverrideSet = ClimateControlScheduleCCOverrideSet;
//# sourceMappingURL=ClimateControlScheduleCC.js.map