"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ScheduleEntryLockCCDailyRepeatingScheduleGet = exports.ScheduleEntryLockCCDailyRepeatingScheduleReport = exports.ScheduleEntryLockCCDailyRepeatingScheduleSet = exports.ScheduleEntryLockCCTimeOffsetGet = exports.ScheduleEntryLockCCTimeOffsetReport = exports.ScheduleEntryLockCCTimeOffsetSet = exports.ScheduleEntryLockCCYearDayScheduleGet = exports.ScheduleEntryLockCCYearDayScheduleReport = exports.ScheduleEntryLockCCYearDayScheduleSet = exports.ScheduleEntryLockCCWeekDayScheduleGet = exports.ScheduleEntryLockCCWeekDayScheduleReport = exports.ScheduleEntryLockCCWeekDayScheduleSet = exports.ScheduleEntryLockCCSupportedGet = exports.ScheduleEntryLockCCSupportedReport = exports.ScheduleEntryLockCCEnableAllSet = exports.ScheduleEntryLockCCEnableSet = exports.ScheduleEntryLockCC = exports.ScheduleEntryLockCCAPI = exports.ScheduleEntryLockCCValues = void 0;
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
const __assertType__optional_number = $o => {
    function _number($o) {
        return typeof $o !== "number" ? {} : null;
    }
    function optional__number($o) {
        if ($o !== undefined) {
            const error = _number($o);
            if (error)
                return error;
        }
        return null;
    }
    return optional__number($o);
};
const __assertType__ScheduleEntryLockSlotId = $o => {
    function _number($o) {
        return typeof $o !== "number" ? {} : null;
    }
    function _0($o) {
        if (typeof $o !== "object" || $o === null || Array.isArray($o))
            return {};
        if ("userId" in $o && $o["userId"] !== undefined) {
            const error = _number($o["userId"]);
            if (error)
                return error;
        }
        else
            return {};
        if ("slotId" in $o && $o["slotId"] !== undefined) {
            const error = _number($o["slotId"]);
            if (error)
                return error;
        }
        else
            return {};
        return null;
    }
    return _0($o);
};
const __assertType__optional_ScheduleEntryLockWeekDaySchedule = $o => {
    function su__2__3__4__5__6__7__8_eu($o) {
        return ![0, 1, 2, 3, 4, 5, 6].includes($o) ? {} : null;
    }
    function _number($o) {
        return typeof $o !== "number" ? {} : null;
    }
    function _0($o) {
        if (typeof $o !== "object" || $o === null || Array.isArray($o))
            return {};
        if ("weekday" in $o && $o["weekday"] !== undefined) {
            const error = su__2__3__4__5__6__7__8_eu($o["weekday"]);
            if (error)
                return error;
        }
        else
            return {};
        if ("startHour" in $o && $o["startHour"] !== undefined) {
            const error = _number($o["startHour"]);
            if (error)
                return error;
        }
        else
            return {};
        if ("startMinute" in $o && $o["startMinute"] !== undefined) {
            const error = _number($o["startMinute"]);
            if (error)
                return error;
        }
        else
            return {};
        if ("stopHour" in $o && $o["stopHour"] !== undefined) {
            const error = _number($o["stopHour"]);
            if (error)
                return error;
        }
        else
            return {};
        if ("stopMinute" in $o && $o["stopMinute"] !== undefined) {
            const error = _number($o["stopMinute"]);
            if (error)
                return error;
        }
        else
            return {};
        return null;
    }
    function optional__0($o) {
        if ($o !== undefined) {
            const error = _0($o);
            if (error)
                return error;
        }
        return null;
    }
    return optional__0($o);
};
const __assertType__optional_ScheduleEntryLockYearDaySchedule = $o => {
    function _number($o) {
        return typeof $o !== "number" ? {} : null;
    }
    function _0($o) {
        if (typeof $o !== "object" || $o === null || Array.isArray($o))
            return {};
        if ("startYear" in $o && $o["startYear"] !== undefined) {
            const error = _number($o["startYear"]);
            if (error)
                return error;
        }
        else
            return {};
        if ("startMonth" in $o && $o["startMonth"] !== undefined) {
            const error = _number($o["startMonth"]);
            if (error)
                return error;
        }
        else
            return {};
        if ("startDay" in $o && $o["startDay"] !== undefined) {
            const error = _number($o["startDay"]);
            if (error)
                return error;
        }
        else
            return {};
        if ("startHour" in $o && $o["startHour"] !== undefined) {
            const error = _number($o["startHour"]);
            if (error)
                return error;
        }
        else
            return {};
        if ("startMinute" in $o && $o["startMinute"] !== undefined) {
            const error = _number($o["startMinute"]);
            if (error)
                return error;
        }
        else
            return {};
        if ("stopYear" in $o && $o["stopYear"] !== undefined) {
            const error = _number($o["stopYear"]);
            if (error)
                return error;
        }
        else
            return {};
        if ("stopMonth" in $o && $o["stopMonth"] !== undefined) {
            const error = _number($o["stopMonth"]);
            if (error)
                return error;
        }
        else
            return {};
        if ("stopDay" in $o && $o["stopDay"] !== undefined) {
            const error = _number($o["stopDay"]);
            if (error)
                return error;
        }
        else
            return {};
        if ("stopHour" in $o && $o["stopHour"] !== undefined) {
            const error = _number($o["stopHour"]);
            if (error)
                return error;
        }
        else
            return {};
        if ("stopMinute" in $o && $o["stopMinute"] !== undefined) {
            const error = _number($o["stopMinute"]);
            if (error)
                return error;
        }
        else
            return {};
        return null;
    }
    function optional__0($o) {
        if ($o !== undefined) {
            const error = _0($o);
            if (error)
                return error;
        }
        return null;
    }
    return optional__0($o);
};
const __assertType__optional_ScheduleEntryLockDailyRepeatingSchedule = $o => {
    function su__4__5__6__7__8__9__10_eu($o) {
        return ![0, 1, 2, 3, 4, 5, 6].includes($o) ? {} : null;
    }
    function sa_su__4__5__6__7__8__9__10_eu_ea_3($o) {
        if (!Array.isArray($o))
            return {};
        for (let i = 0; i < $o.length; i++) {
            const error = su__4__5__6__7__8__9__10_eu($o[i]);
            if (error)
                return error;
        }
        return null;
    }
    function _number($o) {
        return typeof $o !== "number" ? {} : null;
    }
    function _0($o) {
        if (typeof $o !== "object" || $o === null || Array.isArray($o))
            return {};
        if ("weekdays" in $o && $o["weekdays"] !== undefined) {
            const error = sa_su__4__5__6__7__8__9__10_eu_ea_3($o["weekdays"]);
            if (error)
                return error;
        }
        else
            return {};
        if ("startHour" in $o && $o["startHour"] !== undefined) {
            const error = _number($o["startHour"]);
            if (error)
                return error;
        }
        else
            return {};
        if ("startMinute" in $o && $o["startMinute"] !== undefined) {
            const error = _number($o["startMinute"]);
            if (error)
                return error;
        }
        else
            return {};
        if ("durationHour" in $o && $o["durationHour"] !== undefined) {
            const error = _number($o["durationHour"]);
            if (error)
                return error;
        }
        else
            return {};
        if ("durationMinute" in $o && $o["durationMinute"] !== undefined) {
            const error = _number($o["durationMinute"]);
            if (error)
                return error;
        }
        else
            return {};
        return null;
    }
    function optional__0($o) {
        if ($o !== undefined) {
            const error = _0($o);
            if (error)
                return error;
        }
        return null;
    }
    return optional__0($o);
};
const __assertType__Timezone = $o => {
    function _number($o) {
        return typeof $o !== "number" ? {} : null;
    }
    function _0($o) {
        if (typeof $o !== "object" || $o === null || Array.isArray($o))
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
const shared_1 = require("@zwave-js/shared");
const API_1 = require("../lib/API");
const CommandClass_1 = require("../lib/CommandClass");
const CommandClassDecorators_1 = require("../lib/CommandClassDecorators");
const serializers_1 = require("../lib/serializers");
const Values_1 = require("../lib/Values");
const _Types_1 = require("../lib/_Types");
exports.ScheduleEntryLockCCValues = Object.freeze({
    ...Values_1.V.defineStaticCCValues(core_1.CommandClasses["Schedule Entry Lock"], {
        ...Values_1.V.staticProperty("numWeekDaySlots", undefined, { internal: true }),
        ...Values_1.V.staticProperty("numYearDaySlots", undefined, { internal: true }),
        ...Values_1.V.staticProperty("numDailyRepeatingSlots", undefined, {
            internal: true,
        }),
    }),
});
let ScheduleEntryLockCCAPI = class ScheduleEntryLockCCAPI extends API_1.CCAPI {
    supportsCommand(cmd) {
        switch (cmd) {
            case _Types_1.ScheduleEntryLockCommand.EnableSet:
            case _Types_1.ScheduleEntryLockCommand.EnableAllSet:
            case _Types_1.ScheduleEntryLockCommand.WeekDayScheduleSet:
            case _Types_1.ScheduleEntryLockCommand.WeekDayScheduleGet:
            case _Types_1.ScheduleEntryLockCommand.YearDayScheduleSet:
            case _Types_1.ScheduleEntryLockCommand.YearDayScheduleGet:
            case _Types_1.ScheduleEntryLockCommand.SupportedGet:
                return true; // V1
            case _Types_1.ScheduleEntryLockCommand.TimeOffsetSet:
            case _Types_1.ScheduleEntryLockCommand.TimeOffsetGet:
                return this.version >= 2;
            case _Types_1.ScheduleEntryLockCommand.DailyRepeatingScheduleSet:
            case _Types_1.ScheduleEntryLockCommand.DailyRepeatingScheduleGet:
                return this.version >= 3;
        }
        return super.supportsCommand(cmd);
    }
    /**
     * Enables or disables schedules. If a user ID is given, that user's
     * schedules will be enabled or disabled. If no user ID is given, all schedules
     * will be affected.
     */
    async setEnabled(enabled, userId) {
        __assertType("enabled", "boolean", __assertType__boolean.bind(void 0, enabled));
        __assertType("userId", "(optional) number", __assertType__optional_number.bind(void 0, userId));
        if (userId != undefined) {
            this.assertSupportsCommand(_Types_1.ScheduleEntryLockCommand, _Types_1.ScheduleEntryLockCommand.EnableSet);
            const cc = new ScheduleEntryLockCCEnableSet(this.applHost, {
                nodeId: this.endpoint.nodeId,
                endpoint: this.endpoint.index,
                userId,
                enabled,
            });
            return this.applHost.sendCommand(cc, this.commandOptions);
        }
        else {
            this.assertSupportsCommand(_Types_1.ScheduleEntryLockCommand, _Types_1.ScheduleEntryLockCommand.EnableAllSet);
            const cc = new ScheduleEntryLockCCEnableAllSet(this.applHost, {
                nodeId: this.endpoint.nodeId,
                endpoint: this.endpoint.index,
                enabled,
            });
            return this.applHost.sendCommand(cc, this.commandOptions);
        }
    }
    // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
    async getNumSlots() {
        this.assertSupportsCommand(_Types_1.ScheduleEntryLockCommand, _Types_1.ScheduleEntryLockCommand.SupportedGet);
        const cc = new ScheduleEntryLockCCSupportedGet(this.applHost, {
            nodeId: this.endpoint.nodeId,
            endpoint: this.endpoint.index,
        });
        const result = await this.applHost.sendCommand(cc, this.commandOptions);
        if (result) {
            return (0, shared_1.pick)(result, [
                "numWeekDaySlots",
                "numYearDaySlots",
                "numDailyRepeatingSlots",
            ]);
        }
    }
    async setWeekDaySchedule(slot, schedule) {
        __assertType("slot", "ScheduleEntryLockSlotId", __assertType__ScheduleEntryLockSlotId.bind(void 0, slot));
        __assertType("schedule", "(optional) ScheduleEntryLockWeekDaySchedule", __assertType__optional_ScheduleEntryLockWeekDaySchedule.bind(void 0, schedule));
        this.assertSupportsCommand(_Types_1.ScheduleEntryLockCommand, _Types_1.ScheduleEntryLockCommand.WeekDayScheduleSet);
        if (this.isSinglecast()) {
            const numSlots = ScheduleEntryLockCC.getNumWeekDaySlotsCached(this.applHost, this.endpoint);
            if (slot.slotId < 1 || slot.slotId > numSlots) {
                throw new core_1.ZWaveError(`The schedule slot # must be between 1 and the number of supported day-of-week slots ${numSlots}.`, core_1.ZWaveErrorCodes.Argument_Invalid);
            }
        }
        const cc = new ScheduleEntryLockCCWeekDayScheduleSet(this.applHost, {
            nodeId: this.endpoint.nodeId,
            endpoint: this.endpoint.index,
            ...slot,
            ...(schedule
                ? {
                    action: _Types_1.ScheduleEntryLockSetAction.Set,
                    ...schedule,
                }
                : {
                    action: _Types_1.ScheduleEntryLockSetAction.Erase,
                }),
        });
        return this.applHost.sendCommand(cc, this.commandOptions);
    }
    async getWeekDaySchedule(slot) {
        __assertType("slot", "ScheduleEntryLockSlotId", __assertType__ScheduleEntryLockSlotId.bind(void 0, slot));
        this.assertSupportsCommand(_Types_1.ScheduleEntryLockCommand, _Types_1.ScheduleEntryLockCommand.WeekDayScheduleSet);
        const cc = new ScheduleEntryLockCCWeekDayScheduleGet(this.applHost, {
            nodeId: this.endpoint.nodeId,
            endpoint: this.endpoint.index,
            ...slot,
        });
        const result = await this.applHost.sendCommand(cc, this.commandOptions);
        if (result?.weekday != undefined) {
            return {
                weekday: result.weekday,
                startHour: result.startHour,
                startMinute: result.startMinute,
                stopHour: result.stopHour,
                stopMinute: result.stopMinute,
            };
        }
    }
    async setYearDaySchedule(slot, schedule) {
        __assertType("slot", "ScheduleEntryLockSlotId", __assertType__ScheduleEntryLockSlotId.bind(void 0, slot));
        __assertType("schedule", "(optional) ScheduleEntryLockYearDaySchedule", __assertType__optional_ScheduleEntryLockYearDaySchedule.bind(void 0, schedule));
        this.assertSupportsCommand(_Types_1.ScheduleEntryLockCommand, _Types_1.ScheduleEntryLockCommand.YearDayScheduleSet);
        if (this.isSinglecast()) {
            const numSlots = ScheduleEntryLockCC.getNumYearDaySlotsCached(this.applHost, this.endpoint);
            if (slot.slotId < 1 || slot.slotId > numSlots) {
                throw new core_1.ZWaveError(`The schedule slot # must be between 1 and the number of supported day-of-year slots ${numSlots}.`, core_1.ZWaveErrorCodes.Argument_Invalid);
            }
        }
        const cc = new ScheduleEntryLockCCYearDayScheduleSet(this.applHost, {
            nodeId: this.endpoint.nodeId,
            endpoint: this.endpoint.index,
            ...slot,
            ...(schedule
                ? {
                    action: _Types_1.ScheduleEntryLockSetAction.Set,
                    ...schedule,
                }
                : {
                    action: _Types_1.ScheduleEntryLockSetAction.Erase,
                }),
        });
        return this.applHost.sendCommand(cc, this.commandOptions);
    }
    async getYearDaySchedule(slot) {
        __assertType("slot", "ScheduleEntryLockSlotId", __assertType__ScheduleEntryLockSlotId.bind(void 0, slot));
        this.assertSupportsCommand(_Types_1.ScheduleEntryLockCommand, _Types_1.ScheduleEntryLockCommand.YearDayScheduleSet);
        const cc = new ScheduleEntryLockCCYearDayScheduleGet(this.applHost, {
            nodeId: this.endpoint.nodeId,
            endpoint: this.endpoint.index,
            ...slot,
        });
        const result = await this.applHost.sendCommand(cc, this.commandOptions);
        if (result?.startYear != undefined) {
            return {
                startYear: result.startYear,
                startMonth: result.startMonth,
                startDay: result.startDay,
                startHour: result.startHour,
                startMinute: result.startMinute,
                stopYear: result.stopYear,
                stopMonth: result.stopMonth,
                stopDay: result.stopDay,
                stopHour: result.stopHour,
                stopMinute: result.stopMinute,
            };
        }
    }
    async setDailyRepeatingSchedule(slot, schedule) {
        __assertType("slot", "ScheduleEntryLockSlotId", __assertType__ScheduleEntryLockSlotId.bind(void 0, slot));
        __assertType("schedule", "(optional) ScheduleEntryLockDailyRepeatingSchedule", __assertType__optional_ScheduleEntryLockDailyRepeatingSchedule.bind(void 0, schedule));
        this.assertSupportsCommand(_Types_1.ScheduleEntryLockCommand, _Types_1.ScheduleEntryLockCommand.DailyRepeatingScheduleSet);
        if (this.isSinglecast()) {
            const numSlots = ScheduleEntryLockCC.getNumDailyRepeatingSlotsCached(this.applHost, this.endpoint);
            if (slot.slotId < 1 || slot.slotId > numSlots) {
                throw new core_1.ZWaveError(`The schedule slot # must be between 1 and the number of supported daily repeating slots ${numSlots}.`, core_1.ZWaveErrorCodes.Argument_Invalid);
            }
        }
        const cc = new ScheduleEntryLockCCDailyRepeatingScheduleSet(this.applHost, {
            nodeId: this.endpoint.nodeId,
            endpoint: this.endpoint.index,
            ...slot,
            ...(schedule
                ? {
                    action: _Types_1.ScheduleEntryLockSetAction.Set,
                    ...schedule,
                }
                : {
                    action: _Types_1.ScheduleEntryLockSetAction.Erase,
                }),
        });
        return this.applHost.sendCommand(cc, this.commandOptions);
    }
    async getDailyRepeatingSchedule(slot) {
        __assertType("slot", "ScheduleEntryLockSlotId", __assertType__ScheduleEntryLockSlotId.bind(void 0, slot));
        this.assertSupportsCommand(_Types_1.ScheduleEntryLockCommand, _Types_1.ScheduleEntryLockCommand.DailyRepeatingScheduleSet);
        const cc = new ScheduleEntryLockCCDailyRepeatingScheduleGet(this.applHost, {
            nodeId: this.endpoint.nodeId,
            endpoint: this.endpoint.index,
            ...slot,
        });
        const result = await this.applHost.sendCommand(cc, this.commandOptions);
        if (result?.weekdays != undefined) {
            return {
                weekdays: result.weekdays,
                startHour: result.startHour,
                startMinute: result.startMinute,
                durationHour: result.durationHour,
                durationMinute: result.durationMinute,
            };
        }
    }
    async getTimezone() {
        this.assertSupportsCommand(_Types_1.ScheduleEntryLockCommand, _Types_1.ScheduleEntryLockCommand.TimeOffsetGet);
        const cc = new ScheduleEntryLockCCTimeOffsetGet(this.applHost, {
            nodeId: this.endpoint.nodeId,
            endpoint: this.endpoint.index,
        });
        const result = await this.applHost.sendCommand(cc, this.commandOptions);
        if (result) {
            return (0, shared_1.pick)(result, ["standardOffset", "dstOffset"]);
        }
    }
    async setTimezone(timezone) {
        __assertType("timezone", "Timezone", __assertType__Timezone.bind(void 0, timezone));
        this.assertSupportsCommand(_Types_1.ScheduleEntryLockCommand, _Types_1.ScheduleEntryLockCommand.TimeOffsetSet);
        const cc = new ScheduleEntryLockCCTimeOffsetSet(this.applHost, {
            nodeId: this.endpoint.nodeId,
            endpoint: this.endpoint.index,
            ...timezone,
        });
        return this.applHost.sendCommand(cc, this.commandOptions);
    }
};
ScheduleEntryLockCCAPI = __decorate([
    (0, CommandClassDecorators_1.API)(core_1.CommandClasses["Schedule Entry Lock"])
], ScheduleEntryLockCCAPI);
exports.ScheduleEntryLockCCAPI = ScheduleEntryLockCCAPI;
let ScheduleEntryLockCC = class ScheduleEntryLockCC extends CommandClass_1.CommandClass {
    async interview(applHost) {
        const node = this.getNode(applHost);
        const endpoint = this.getEndpoint(applHost);
        const api = API_1.CCAPI.create(core_1.CommandClasses["Schedule Entry Lock"], applHost, endpoint).withOptions({
            priority: core_1.MessagePriority.NodeQuery,
        });
        applHost.controllerLog.logNode(node.id, {
            endpoint: this.endpointIndex,
            message: `Interviewing ${this.ccName}...`,
            direction: "none",
        });
        applHost.controllerLog.logNode(node.id, {
            endpoint: this.endpointIndex,
            message: "Querying supported number of schedule slots...",
            direction: "outbound",
        });
        const slotsResp = await api.getNumSlots();
        if (slotsResp) {
            let logMessage = `received supported number of schedule slots:
day of week:     ${slotsResp.numWeekDaySlots}
day of year:     ${slotsResp.numYearDaySlots}`;
            if (slotsResp.numDailyRepeatingSlots != undefined) {
                logMessage += `
daily repeating: ${slotsResp.numDailyRepeatingSlots}`;
            }
            applHost.controllerLog.logNode(node.id, {
                endpoint: this.endpointIndex,
                message: logMessage,
                direction: "inbound",
            });
        }
        // If the timezone is not configured with the Time CC, do it here
        if (api.supportsCommand(_Types_1.ScheduleEntryLockCommand.TimeOffsetSet) &&
            (!endpoint.supportsCC(core_1.CommandClasses.Time) ||
                endpoint.getCCVersion(core_1.CommandClasses.Time) < 2)) {
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
    /**
     * Returns the number of supported day-of-week slots.
     * This only works AFTER the interview process
     */
    static getNumWeekDaySlotsCached(applHost, endpoint) {
        return (applHost
            .getValueDB(endpoint.nodeId)
            .getValue(exports.ScheduleEntryLockCCValues.numWeekDaySlots.endpoint(endpoint.index)) || 0);
    }
    /**
     * Returns the number of supported day-of-year slots.
     * This only works AFTER the interview process
     */
    static getNumYearDaySlotsCached(applHost, endpoint) {
        return (applHost
            .getValueDB(endpoint.nodeId)
            .getValue(exports.ScheduleEntryLockCCValues.numYearDaySlots.endpoint(endpoint.index)) || 0);
    }
    /**
     * Returns the number of supported daily-repeating slots.
     * This only works AFTER the interview process
     */
    static getNumDailyRepeatingSlotsCached(applHost, endpoint) {
        return (applHost
            .getValueDB(endpoint.nodeId)
            .getValue(exports.ScheduleEntryLockCCValues.numDailyRepeatingSlots.endpoint(endpoint.index)) || 0);
    }
};
ScheduleEntryLockCC = __decorate([
    (0, CommandClassDecorators_1.commandClass)(core_1.CommandClasses["Schedule Entry Lock"]),
    (0, CommandClassDecorators_1.implementedVersion)(3),
    (0, CommandClassDecorators_1.ccValues)(exports.ScheduleEntryLockCCValues)
], ScheduleEntryLockCC);
exports.ScheduleEntryLockCC = ScheduleEntryLockCC;
let ScheduleEntryLockCCEnableSet = class ScheduleEntryLockCCEnableSet extends ScheduleEntryLockCC {
    constructor(host, options) {
        super(host, options);
        if ((0, CommandClass_1.gotDeserializationOptions)(options)) {
            (0, core_1.validatePayload)(this.payload.length >= 2);
            this.userId = this.payload[0];
            this.enabled = this.payload[1] === 0x01;
        }
        else {
            this.userId = options.userId;
            this.enabled = options.enabled;
        }
    }
    serialize() {
        this.payload = Buffer.from([this.userId, this.enabled ? 0x01 : 0x00]);
        return super.serialize();
    }
    toLogEntry(applHost) {
        return {
            ...super.toLogEntry(applHost),
            message: {
                "user ID": this.userId,
                action: this.enabled ? "enable" : "disable",
            },
        };
    }
};
ScheduleEntryLockCCEnableSet = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.ScheduleEntryLockCommand.EnableSet),
    (0, CommandClassDecorators_1.useSupervision)()
], ScheduleEntryLockCCEnableSet);
exports.ScheduleEntryLockCCEnableSet = ScheduleEntryLockCCEnableSet;
let ScheduleEntryLockCCEnableAllSet = class ScheduleEntryLockCCEnableAllSet extends ScheduleEntryLockCC {
    constructor(host, options) {
        super(host, options);
        if ((0, CommandClass_1.gotDeserializationOptions)(options)) {
            (0, core_1.validatePayload)(this.payload.length >= 1);
            this.enabled = this.payload[0] === 0x01;
        }
        else {
            this.enabled = options.enabled;
        }
    }
    serialize() {
        this.payload = Buffer.from([this.enabled ? 0x01 : 0x00]);
        return super.serialize();
    }
    toLogEntry(applHost) {
        return {
            ...super.toLogEntry(applHost),
            message: {
                action: this.enabled ? "enable all" : "disable all",
            },
        };
    }
};
ScheduleEntryLockCCEnableAllSet = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.ScheduleEntryLockCommand.EnableAllSet),
    (0, CommandClassDecorators_1.useSupervision)()
], ScheduleEntryLockCCEnableAllSet);
exports.ScheduleEntryLockCCEnableAllSet = ScheduleEntryLockCCEnableAllSet;
let ScheduleEntryLockCCSupportedReport = class ScheduleEntryLockCCSupportedReport extends ScheduleEntryLockCC {
    constructor(host, options) {
        super(host, options);
        if ((0, CommandClass_1.gotDeserializationOptions)(options)) {
            (0, core_1.validatePayload)(this.payload.length >= 2);
            this.numWeekDaySlots = this.payload[0];
            this.numYearDaySlots = this.payload[1];
            if (this.payload.length >= 3) {
                this.numDailyRepeatingSlots = this.payload[2];
            }
        }
        else {
            this.numWeekDaySlots = options.numWeekDaySlots;
            this.numYearDaySlots = options.numYearDaySlots;
            this.numDailyRepeatingSlots = options.numDailyRepeatingSlots;
        }
    }
    serialize() {
        this.payload = Buffer.from([
            this.numWeekDaySlots,
            this.numYearDaySlots,
        ]);
        if (this.version >= 3 && this.numDailyRepeatingSlots != undefined) {
            this.payload = Buffer.concat([
                this.payload,
                Buffer.from([this.numDailyRepeatingSlots]),
            ]);
        }
        return super.serialize();
    }
    toLogEntry(applHost) {
        const message = {
            "no. of weekday schedule slots": this.numWeekDaySlots,
            "no. of day-of-year schedule slots": this.numYearDaySlots,
        };
        if (this.numDailyRepeatingSlots != undefined) {
            message["no. of daily repeating schedule slots"] =
                this.numDailyRepeatingSlots;
        }
        return {
            ...super.toLogEntry(applHost),
            message,
        };
    }
};
__decorate([
    (0, CommandClassDecorators_1.ccValue)(exports.ScheduleEntryLockCCValues.numWeekDaySlots)
], ScheduleEntryLockCCSupportedReport.prototype, "numWeekDaySlots", void 0);
__decorate([
    (0, CommandClassDecorators_1.ccValue)(exports.ScheduleEntryLockCCValues.numYearDaySlots)
], ScheduleEntryLockCCSupportedReport.prototype, "numYearDaySlots", void 0);
__decorate([
    (0, CommandClassDecorators_1.ccValue)(exports.ScheduleEntryLockCCValues.numDailyRepeatingSlots)
], ScheduleEntryLockCCSupportedReport.prototype, "numDailyRepeatingSlots", void 0);
ScheduleEntryLockCCSupportedReport = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.ScheduleEntryLockCommand.SupportedReport)
], ScheduleEntryLockCCSupportedReport);
exports.ScheduleEntryLockCCSupportedReport = ScheduleEntryLockCCSupportedReport;
let ScheduleEntryLockCCSupportedGet = class ScheduleEntryLockCCSupportedGet extends ScheduleEntryLockCC {
};
ScheduleEntryLockCCSupportedGet = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.ScheduleEntryLockCommand.SupportedGet),
    (0, CommandClassDecorators_1.expectedCCResponse)(ScheduleEntryLockCCSupportedReport)
], ScheduleEntryLockCCSupportedGet);
exports.ScheduleEntryLockCCSupportedGet = ScheduleEntryLockCCSupportedGet;
let ScheduleEntryLockCCWeekDayScheduleSet = class ScheduleEntryLockCCWeekDayScheduleSet extends ScheduleEntryLockCC {
    constructor(host, options) {
        super(host, options);
        if ((0, CommandClass_1.gotDeserializationOptions)(options)) {
            (0, core_1.validatePayload)(this.payload.length >= 3);
            this.action = this.payload[0];
            (0, core_1.validatePayload)(this.action === _Types_1.ScheduleEntryLockSetAction.Set ||
                this.action === _Types_1.ScheduleEntryLockSetAction.Erase);
            this.userId = this.payload[1];
            this.slotId = this.payload[2];
            if (this.action === _Types_1.ScheduleEntryLockSetAction.Set) {
                (0, core_1.validatePayload)(this.payload.length >= 8);
                this.weekday = this.payload[3];
                this.startHour = this.payload[4];
                this.startMinute = this.payload[5];
                this.stopHour = this.payload[6];
                this.stopMinute = this.payload[7];
            }
        }
        else {
            this.userId = options.userId;
            this.slotId = options.slotId;
            this.action = options.action;
            if (options.action === _Types_1.ScheduleEntryLockSetAction.Set) {
                this.weekday = options.weekday;
                this.startHour = options.startHour;
                this.startMinute = options.startMinute;
                this.stopHour = options.stopHour;
                this.stopMinute = options.stopMinute;
            }
        }
    }
    serialize() {
        this.payload = Buffer.from([
            this.action,
            this.userId,
            this.slotId,
            // The report should have these fields set to 0xff
            // if the slot is erased. The specs don't mention anything
            // for the Set command, so we just assume the same is okay
            this.weekday ?? 0xff,
            this.startHour ?? 0xff,
            this.startMinute ?? 0xff,
            this.stopHour ?? 0xff,
            this.stopMinute ?? 0xff,
        ]);
        return super.serialize();
    }
    toLogEntry(applHost) {
        let message;
        if (this.action === _Types_1.ScheduleEntryLockSetAction.Erase) {
            message = {
                "user ID": this.userId,
                "slot #": this.slotId,
                action: "erase",
            };
        }
        else {
            message = {
                "user ID": this.userId,
                "slot #": this.slotId,
                action: "set",
                weekday: (0, shared_1.getEnumMemberName)(_Types_1.ScheduleEntryLockWeekday, this.weekday),
                "start time": (0, shared_1.formatTime)(this.startHour ?? 0, this.startMinute ?? 0),
                "end time": (0, shared_1.formatTime)(this.stopHour ?? 0, this.stopMinute ?? 0),
            };
        }
        return {
            ...super.toLogEntry(applHost),
            message,
        };
    }
};
ScheduleEntryLockCCWeekDayScheduleSet = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.ScheduleEntryLockCommand.WeekDayScheduleSet),
    (0, CommandClassDecorators_1.useSupervision)()
], ScheduleEntryLockCCWeekDayScheduleSet);
exports.ScheduleEntryLockCCWeekDayScheduleSet = ScheduleEntryLockCCWeekDayScheduleSet;
let ScheduleEntryLockCCWeekDayScheduleReport = class ScheduleEntryLockCCWeekDayScheduleReport extends ScheduleEntryLockCC {
    constructor(host, options) {
        super(host, options);
        if ((0, CommandClass_1.gotDeserializationOptions)(options)) {
            (0, core_1.validatePayload)(this.payload.length >= 2);
            this.userId = this.payload[0];
            this.slotId = this.payload[1];
            if (this.payload.length >= 7) {
                if (this.payload[2] !== 0xff) {
                    this.weekday = this.payload[2];
                }
                if (this.payload[3] !== 0xff) {
                    this.startHour = this.payload[3];
                }
                if (this.payload[4] !== 0xff) {
                    this.startMinute = this.payload[4];
                }
                if (this.payload[5] !== 0xff) {
                    this.stopHour = this.payload[5];
                }
                if (this.payload[6] !== 0xff) {
                    this.stopMinute = this.payload[6];
                }
            }
        }
        else {
            this.userId = options.userId;
            this.slotId = options.slotId;
            this.weekday = options.weekday;
            this.startHour = options.startHour;
            this.startMinute = options.startMinute;
            this.stopHour = options.stopHour;
            this.stopMinute = options.stopMinute;
        }
    }
    serialize() {
        this.payload = Buffer.from([
            this.userId,
            this.slotId,
            this.weekday ?? 0xff,
            this.startHour ?? 0xff,
            this.startMinute ?? 0xff,
            this.stopHour ?? 0xff,
            this.stopMinute ?? 0xff,
        ]);
        return super.serialize();
    }
    toLogEntry(applHost) {
        let message;
        if (this.weekday == undefined) {
            message = {
                "user ID": this.userId,
                "slot #": this.slotId,
                schedule: "(empty)",
            };
        }
        else {
            message = {
                "user ID": this.userId,
                "slot #": this.slotId,
                weekday: (0, shared_1.getEnumMemberName)(_Types_1.ScheduleEntryLockWeekday, this.weekday),
                "start time": (0, shared_1.formatTime)(this.startHour ?? 0, this.startMinute ?? 0),
                "end time": (0, shared_1.formatTime)(this.stopHour ?? 0, this.stopMinute ?? 0),
            };
        }
        return {
            ...super.toLogEntry(applHost),
            message,
        };
    }
};
ScheduleEntryLockCCWeekDayScheduleReport = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.ScheduleEntryLockCommand.WeekDayScheduleReport)
], ScheduleEntryLockCCWeekDayScheduleReport);
exports.ScheduleEntryLockCCWeekDayScheduleReport = ScheduleEntryLockCCWeekDayScheduleReport;
let ScheduleEntryLockCCWeekDayScheduleGet = class ScheduleEntryLockCCWeekDayScheduleGet extends ScheduleEntryLockCC {
    constructor(host, options) {
        super(host, options);
        if ((0, CommandClass_1.gotDeserializationOptions)(options)) {
            (0, core_1.validatePayload)(this.payload.length >= 2);
            this.userId = this.payload[0];
            this.slotId = this.payload[1];
        }
        else {
            this.userId = options.userId;
            this.slotId = options.slotId;
        }
    }
    serialize() {
        this.payload = Buffer.from([this.userId, this.slotId]);
        return super.serialize();
    }
    toLogEntry(applHost) {
        return {
            ...super.toLogEntry(applHost),
            message: {
                "user ID": this.userId,
                "slot #": this.slotId,
            },
        };
    }
};
ScheduleEntryLockCCWeekDayScheduleGet = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.ScheduleEntryLockCommand.WeekDayScheduleGet),
    (0, CommandClassDecorators_1.expectedCCResponse)(ScheduleEntryLockCCWeekDayScheduleReport)
], ScheduleEntryLockCCWeekDayScheduleGet);
exports.ScheduleEntryLockCCWeekDayScheduleGet = ScheduleEntryLockCCWeekDayScheduleGet;
let ScheduleEntryLockCCYearDayScheduleSet = class ScheduleEntryLockCCYearDayScheduleSet extends ScheduleEntryLockCC {
    constructor(host, options) {
        super(host, options);
        if ((0, CommandClass_1.gotDeserializationOptions)(options)) {
            (0, core_1.validatePayload)(this.payload.length >= 3);
            this.action = this.payload[0];
            (0, core_1.validatePayload)(this.action === _Types_1.ScheduleEntryLockSetAction.Set ||
                this.action === _Types_1.ScheduleEntryLockSetAction.Erase);
            this.userId = this.payload[1];
            this.slotId = this.payload[2];
            if (this.action === _Types_1.ScheduleEntryLockSetAction.Set) {
                (0, core_1.validatePayload)(this.payload.length >= 13);
                this.startYear = this.payload[3];
                this.startMonth = this.payload[4];
                this.startDay = this.payload[5];
                this.startHour = this.payload[6];
                this.startMinute = this.payload[7];
                this.stopYear = this.payload[8];
                this.stopMonth = this.payload[9];
                this.stopDay = this.payload[10];
                this.stopHour = this.payload[11];
                this.stopMinute = this.payload[12];
            }
        }
        else {
            this.userId = options.userId;
            this.slotId = options.slotId;
            this.action = options.action;
            if (options.action === _Types_1.ScheduleEntryLockSetAction.Set) {
                this.startYear = options.startYear;
                this.startMonth = options.startMonth;
                this.startDay = options.startDay;
                this.startHour = options.startHour;
                this.startMinute = options.startMinute;
                this.stopYear = options.stopYear;
                this.stopMonth = options.stopMonth;
                this.stopDay = options.stopDay;
                this.stopHour = options.stopHour;
                this.stopMinute = options.stopMinute;
            }
        }
    }
    serialize() {
        this.payload = Buffer.from([
            this.action,
            this.userId,
            this.slotId,
            // The report should have these fields set to 0xff
            // if the slot is erased. The specs don't mention anything
            // for the Set command, so we just assume the same is okay
            this.startYear ?? 0xff,
            this.startMonth ?? 0xff,
            this.startDay ?? 0xff,
            this.startHour ?? 0xff,
            this.startMinute ?? 0xff,
            this.stopYear ?? 0xff,
            this.stopMonth ?? 0xff,
            this.stopDay ?? 0xff,
            this.stopHour ?? 0xff,
            this.stopMinute ?? 0xff,
        ]);
        return super.serialize();
    }
    toLogEntry(applHost) {
        let message;
        if (this.action === _Types_1.ScheduleEntryLockSetAction.Erase) {
            message = {
                "user ID": this.userId,
                "slot #": this.slotId,
                action: "erase",
            };
        }
        else {
            message = {
                "user ID": this.userId,
                "slot #": this.slotId,
                action: "set",
                "start date": `${(0, shared_1.formatDate)(this.startYear ?? 0, this.startMonth ?? 0, this.startDay ?? 0)} ${(0, shared_1.formatTime)(this.startHour ?? 0, this.startMinute ?? 0)}`,
                "end date": `${(0, shared_1.formatDate)(this.stopYear ?? 0, this.stopMonth ?? 0, this.stopDay ?? 0)} ${(0, shared_1.formatTime)(this.stopHour ?? 0, this.stopMinute ?? 0)}`,
            };
        }
        return {
            ...super.toLogEntry(applHost),
            message,
        };
    }
};
ScheduleEntryLockCCYearDayScheduleSet = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.ScheduleEntryLockCommand.YearDayScheduleSet),
    (0, CommandClassDecorators_1.useSupervision)()
], ScheduleEntryLockCCYearDayScheduleSet);
exports.ScheduleEntryLockCCYearDayScheduleSet = ScheduleEntryLockCCYearDayScheduleSet;
let ScheduleEntryLockCCYearDayScheduleReport = class ScheduleEntryLockCCYearDayScheduleReport extends ScheduleEntryLockCC {
    constructor(host, options) {
        super(host, options);
        if ((0, CommandClass_1.gotDeserializationOptions)(options)) {
            (0, core_1.validatePayload)(this.payload.length >= 2);
            this.userId = this.payload[0];
            this.slotId = this.payload[1];
            if (this.payload.length >= 12) {
                if (this.payload[2] !== 0xff) {
                    this.startYear = this.payload[2];
                }
                if (this.payload[3] !== 0xff) {
                    this.startMonth = this.payload[3];
                }
                if (this.payload[4] !== 0xff) {
                    this.startDay = this.payload[4];
                }
                if (this.payload[5] !== 0xff) {
                    this.startHour = this.payload[5];
                }
                if (this.payload[6] !== 0xff) {
                    this.startMinute = this.payload[6];
                }
                if (this.payload[7] !== 0xff) {
                    this.stopYear = this.payload[7];
                }
                if (this.payload[8] !== 0xff) {
                    this.stopMonth = this.payload[8];
                }
                if (this.payload[9] !== 0xff) {
                    this.stopDay = this.payload[9];
                }
                if (this.payload[10] !== 0xff) {
                    this.stopHour = this.payload[10];
                }
                if (this.payload[11] !== 0xff) {
                    this.stopMinute = this.payload[11];
                }
            }
        }
        else {
            this.userId = options.userId;
            this.slotId = options.slotId;
            this.startYear = options.startYear;
            this.startMonth = options.startMonth;
            this.startDay = options.startDay;
            this.startHour = options.startHour;
            this.startMinute = options.startMinute;
            this.stopYear = options.stopYear;
            this.stopMonth = options.stopMonth;
            this.stopDay = options.stopDay;
            this.stopHour = options.stopHour;
            this.stopMinute = options.stopMinute;
        }
    }
    serialize() {
        this.payload = Buffer.from([
            this.userId,
            this.slotId,
            this.startYear ?? 0xff,
            this.startMonth ?? 0xff,
            this.startDay ?? 0xff,
            this.startHour ?? 0xff,
            this.startMinute ?? 0xff,
            this.stopYear ?? 0xff,
            this.stopMonth ?? 0xff,
            this.stopDay ?? 0xff,
            this.stopHour ?? 0xff,
            this.stopMinute ?? 0xff,
        ]);
        return super.serialize();
    }
    toLogEntry(applHost) {
        let message;
        if (this.startYear !== undefined) {
            message = {
                "user ID": this.userId,
                "slot #": this.slotId,
                schedule: "(empty)",
            };
        }
        else {
            message = {
                "user ID": this.userId,
                "slot #": this.slotId,
                action: "set",
                "start date": `${(0, shared_1.formatDate)(this.startYear ?? 0, this.startMonth ?? 0, this.startDay ?? 0)} ${(0, shared_1.formatTime)(this.startHour ?? 0, this.startMinute ?? 0)}`,
                "end date": `${(0, shared_1.formatDate)(this.stopYear ?? 0, this.stopMonth ?? 0, this.stopDay ?? 0)} ${(0, shared_1.formatTime)(this.stopHour ?? 0, this.stopMinute ?? 0)}`,
            };
        }
        return {
            ...super.toLogEntry(applHost),
            message,
        };
    }
};
ScheduleEntryLockCCYearDayScheduleReport = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.ScheduleEntryLockCommand.YearDayScheduleReport)
], ScheduleEntryLockCCYearDayScheduleReport);
exports.ScheduleEntryLockCCYearDayScheduleReport = ScheduleEntryLockCCYearDayScheduleReport;
let ScheduleEntryLockCCYearDayScheduleGet = class ScheduleEntryLockCCYearDayScheduleGet extends ScheduleEntryLockCC {
    constructor(host, options) {
        super(host, options);
        if ((0, CommandClass_1.gotDeserializationOptions)(options)) {
            (0, core_1.validatePayload)(this.payload.length >= 2);
            this.userId = this.payload[0];
            this.slotId = this.payload[1];
        }
        else {
            this.userId = options.userId;
            this.slotId = options.slotId;
        }
    }
    serialize() {
        this.payload = Buffer.from([this.userId, this.slotId]);
        return super.serialize();
    }
    toLogEntry(applHost) {
        return {
            ...super.toLogEntry(applHost),
            message: {
                "user ID": this.userId,
                "slot #": this.slotId,
            },
        };
    }
};
ScheduleEntryLockCCYearDayScheduleGet = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.ScheduleEntryLockCommand.YearDayScheduleGet),
    (0, CommandClassDecorators_1.expectedCCResponse)(ScheduleEntryLockCCYearDayScheduleReport)
], ScheduleEntryLockCCYearDayScheduleGet);
exports.ScheduleEntryLockCCYearDayScheduleGet = ScheduleEntryLockCCYearDayScheduleGet;
let ScheduleEntryLockCCTimeOffsetSet = class ScheduleEntryLockCCTimeOffsetSet extends ScheduleEntryLockCC {
    constructor(host, options) {
        super(host, options);
        if ((0, CommandClass_1.gotDeserializationOptions)(options)) {
            const { standardOffset, dstOffset } = (0, serializers_1.parseTimezone)(this.payload);
            this.standardOffset = standardOffset;
            this.dstOffset = dstOffset;
        }
        else {
            this.standardOffset = options.standardOffset;
            this.dstOffset = options.dstOffset;
        }
    }
    serialize() {
        this.payload = (0, serializers_1.encodeTimezone)({
            standardOffset: this.standardOffset,
            dstOffset: this.dstOffset,
        });
        return super.serialize();
    }
    toLogEntry(applHost) {
        return {
            ...super.toLogEntry(applHost),
            message: {
                "standard time offset": `${this.standardOffset} minutes`,
                "DST offset": `${this.dstOffset} minutes`,
            },
        };
    }
};
ScheduleEntryLockCCTimeOffsetSet = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.ScheduleEntryLockCommand.TimeOffsetSet),
    (0, CommandClassDecorators_1.useSupervision)()
], ScheduleEntryLockCCTimeOffsetSet);
exports.ScheduleEntryLockCCTimeOffsetSet = ScheduleEntryLockCCTimeOffsetSet;
let ScheduleEntryLockCCTimeOffsetReport = class ScheduleEntryLockCCTimeOffsetReport extends ScheduleEntryLockCC {
    constructor(host, options) {
        super(host, options);
        if ((0, CommandClass_1.gotDeserializationOptions)(options)) {
            const { standardOffset, dstOffset } = (0, serializers_1.parseTimezone)(this.payload);
            this.standardOffset = standardOffset;
            this.dstOffset = dstOffset;
        }
        else {
            this.standardOffset = options.standardOffset;
            this.dstOffset = options.dstOffset;
        }
    }
    serialize() {
        this.payload = (0, serializers_1.encodeTimezone)({
            standardOffset: this.standardOffset,
            dstOffset: this.dstOffset,
        });
        return super.serialize();
    }
    toLogEntry(applHost) {
        return {
            ...super.toLogEntry(applHost),
            message: {
                "standard time offset": `${this.standardOffset} minutes`,
                "DST offset": `${this.dstOffset} minutes`,
            },
        };
    }
};
ScheduleEntryLockCCTimeOffsetReport = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.ScheduleEntryLockCommand.TimeOffsetReport)
], ScheduleEntryLockCCTimeOffsetReport);
exports.ScheduleEntryLockCCTimeOffsetReport = ScheduleEntryLockCCTimeOffsetReport;
let ScheduleEntryLockCCTimeOffsetGet = class ScheduleEntryLockCCTimeOffsetGet extends ScheduleEntryLockCC {
};
ScheduleEntryLockCCTimeOffsetGet = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.ScheduleEntryLockCommand.TimeOffsetGet),
    (0, CommandClassDecorators_1.expectedCCResponse)(ScheduleEntryLockCCTimeOffsetReport)
], ScheduleEntryLockCCTimeOffsetGet);
exports.ScheduleEntryLockCCTimeOffsetGet = ScheduleEntryLockCCTimeOffsetGet;
let ScheduleEntryLockCCDailyRepeatingScheduleSet = class ScheduleEntryLockCCDailyRepeatingScheduleSet extends ScheduleEntryLockCC {
    constructor(host, options) {
        super(host, options);
        if ((0, CommandClass_1.gotDeserializationOptions)(options)) {
            (0, core_1.validatePayload)(this.payload.length >= 3);
            this.action = this.payload[0];
            (0, core_1.validatePayload)(this.action === _Types_1.ScheduleEntryLockSetAction.Set ||
                this.action === _Types_1.ScheduleEntryLockSetAction.Erase);
            this.userId = this.payload[1];
            this.slotId = this.payload[2];
            if (this.action === _Types_1.ScheduleEntryLockSetAction.Set) {
                (0, core_1.validatePayload)(this.payload.length >= 8);
                this.weekdays = (0, core_1.parseBitMask)(this.payload.slice(3, 4), _Types_1.ScheduleEntryLockWeekday.Sunday);
                this.startHour = this.payload[4];
                this.startMinute = this.payload[5];
                this.durationHour = this.payload[6];
                this.durationMinute = this.payload[7];
            }
        }
        else {
            this.userId = options.userId;
            this.slotId = options.slotId;
            this.action = options.action;
            if (options.action === _Types_1.ScheduleEntryLockSetAction.Set) {
                this.weekdays = options.weekdays;
                this.startHour = options.startHour;
                this.startMinute = options.startMinute;
                this.durationHour = options.durationHour;
                this.durationMinute = options.durationMinute;
            }
        }
    }
    serialize() {
        this.payload = Buffer.from([this.action, this.userId, this.slotId]);
        if (this.action === _Types_1.ScheduleEntryLockSetAction.Set) {
            this.payload = Buffer.concat([
                this.payload,
                (0, core_1.encodeBitMask)(this.weekdays, _Types_1.ScheduleEntryLockWeekday.Saturday, _Types_1.ScheduleEntryLockWeekday.Sunday),
                Buffer.from([
                    this.startHour,
                    this.startMinute,
                    this.durationHour,
                    this.durationMinute,
                ]),
            ]);
        }
        else {
            // Not sure if this is correct
            this.payload = Buffer.concat([this.payload, Buffer.alloc(5, 0xff)]);
        }
        return super.serialize();
    }
    toLogEntry(applHost) {
        let message;
        if (this.action === _Types_1.ScheduleEntryLockSetAction.Erase) {
            message = {
                "user ID": this.userId,
                "slot #": this.slotId,
                action: "erase",
            };
        }
        else {
            message = {
                "user ID": this.userId,
                "slot #": this.slotId,
                action: "set",
                weekdays: this.weekdays.map((w) => (0, shared_1.getEnumMemberName)(_Types_1.ScheduleEntryLockWeekday, w)).join(", "),
                "start time": (0, shared_1.formatTime)(this.startHour ?? 0, this.startMinute ?? 0),
                duration: (0, shared_1.formatTime)(this.durationHour ?? 0, this.durationMinute ?? 0),
            };
        }
        return {
            ...super.toLogEntry(applHost),
            message,
        };
    }
};
ScheduleEntryLockCCDailyRepeatingScheduleSet = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.ScheduleEntryLockCommand.DailyRepeatingScheduleSet),
    (0, CommandClassDecorators_1.useSupervision)()
], ScheduleEntryLockCCDailyRepeatingScheduleSet);
exports.ScheduleEntryLockCCDailyRepeatingScheduleSet = ScheduleEntryLockCCDailyRepeatingScheduleSet;
let ScheduleEntryLockCCDailyRepeatingScheduleReport = class ScheduleEntryLockCCDailyRepeatingScheduleReport extends ScheduleEntryLockCC {
    constructor(host, options) {
        super(host, options);
        if ((0, CommandClass_1.gotDeserializationOptions)(options)) {
            (0, core_1.validatePayload)(this.payload.length >= 2);
            this.userId = this.payload[0];
            this.slotId = this.payload[1];
            if (this.payload.length >= 7) {
                this.weekdays = (0, core_1.parseBitMask)(this.payload.slice(2, 3), _Types_1.ScheduleEntryLockWeekday.Sunday);
                this.startHour = this.payload[3];
                this.startMinute = this.payload[4];
                this.durationHour = this.payload[5];
                this.durationMinute = this.payload[6];
            }
        }
        else {
            this.userId = options.userId;
            this.slotId = options.slotId;
            this.weekdays = options.weekdays;
            this.startHour = options.startHour;
            this.startMinute = options.startMinute;
            this.durationHour = options.durationHour;
            this.durationMinute = options.durationMinute;
        }
    }
    serialize() {
        this.payload = Buffer.from([this.userId, this.slotId]);
        if (this.weekdays) {
            this.payload = Buffer.concat([
                this.payload,
                (0, core_1.encodeBitMask)(this.weekdays, _Types_1.ScheduleEntryLockWeekday.Saturday, _Types_1.ScheduleEntryLockWeekday.Sunday),
                Buffer.from([
                    this.startHour,
                    this.startMinute,
                    this.durationHour,
                    this.durationMinute,
                ]),
            ]);
        }
        else {
            // Not sure if this is correct
            this.payload = Buffer.concat([this.payload, Buffer.alloc(5, 0xff)]);
        }
        return super.serialize();
    }
    toLogEntry(applHost) {
        let message;
        if (!this.weekdays) {
            message = {
                "user ID": this.userId,
                "slot #": this.slotId,
                schedule: "(empty)",
            };
        }
        else {
            message = {
                "user ID": this.userId,
                "slot #": this.slotId,
                action: "set",
                weekdays: this.weekdays
                    .map((w) => (0, shared_1.getEnumMemberName)(_Types_1.ScheduleEntryLockWeekday, w))
                    .join(", "),
                "start time": (0, shared_1.formatTime)(this.startHour ?? 0, this.startMinute ?? 0),
                duration: (0, shared_1.formatTime)(this.durationHour ?? 0, this.durationMinute ?? 0),
            };
        }
        return {
            ...super.toLogEntry(applHost),
            message,
        };
    }
};
ScheduleEntryLockCCDailyRepeatingScheduleReport = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.ScheduleEntryLockCommand.DailyRepeatingScheduleReport)
], ScheduleEntryLockCCDailyRepeatingScheduleReport);
exports.ScheduleEntryLockCCDailyRepeatingScheduleReport = ScheduleEntryLockCCDailyRepeatingScheduleReport;
let ScheduleEntryLockCCDailyRepeatingScheduleGet = class ScheduleEntryLockCCDailyRepeatingScheduleGet extends ScheduleEntryLockCC {
    constructor(host, options) {
        super(host, options);
        if ((0, CommandClass_1.gotDeserializationOptions)(options)) {
            (0, core_1.validatePayload)(this.payload.length >= 2);
            this.userId = this.payload[0];
            this.slotId = this.payload[1];
        }
        else {
            this.userId = options.userId;
            this.slotId = options.slotId;
        }
    }
    serialize() {
        this.payload = Buffer.from([this.userId, this.slotId]);
        return super.serialize();
    }
    toLogEntry(applHost) {
        return {
            ...super.toLogEntry(applHost),
            message: {
                "user ID": this.userId,
                "slot #": this.slotId,
            },
        };
    }
};
ScheduleEntryLockCCDailyRepeatingScheduleGet = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.ScheduleEntryLockCommand.DailyRepeatingScheduleGet),
    (0, CommandClassDecorators_1.expectedCCResponse)(ScheduleEntryLockCCDailyRepeatingScheduleReport)
], ScheduleEntryLockCCDailyRepeatingScheduleGet);
exports.ScheduleEntryLockCCDailyRepeatingScheduleGet = ScheduleEntryLockCCDailyRepeatingScheduleGet;
//# sourceMappingURL=ScheduleEntryLockCC.js.map