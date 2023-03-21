"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DoorLockLoggingCCRecordGet = exports.DoorLockLoggingCCRecordReport = exports.DoorLockLoggingCCRecordsSupportedGet = exports.DoorLockLoggingCCRecordsSupportedReport = exports.DoorLockLoggingCC = exports.DoorLockLoggingCCAPI = exports.DoorLockLoggingCCValues = void 0;
function __assertType(argName, typeName, boundHasError) {
    const { ZWaveError, ZWaveErrorCodes } = require("@zwave-js/core");
    if (boundHasError()) {
        throw new ZWaveError(typeName ? `${argName} is not a ${typeName}` : `${argName} has the wrong type`, ZWaveErrorCodes.Argument_Invalid);
    }
}
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
const safe_1 = require("@zwave-js/core/safe");
const safe_2 = require("@zwave-js/shared/safe");
const API_1 = require("../lib/API");
const CommandClass_1 = require("../lib/CommandClass");
const CommandClassDecorators_1 = require("../lib/CommandClassDecorators");
const Values_1 = require("../lib/Values");
const _Types_1 = require("../lib/_Types");
const UserCodeCC_1 = require("./UserCodeCC");
function segmentsToDate(segments) {
    return new Date(segments.year, segments.month - 1, // JS months are 0-based.
    segments.day, segments.hour, segments.minute, segments.second);
}
const eventTypeLabel = {
    LockCode: "Locked via Access Code",
    UnlockCode: "Unlocked via Access Code",
    LockButton: "Locked via Lock Button",
    UnlockButton: "Unlocked via Unlock Button",
    LockCodeOutOfSchedule: "Out of Schedule Lock Attempt via Access Code",
    UnlockCodeOutOfSchedule: "Out of Schedule Unlock Attempt via Access Code",
    IllegalCode: "Illegal Access Code Entered",
    LockManual: "Manually Locked",
    UnlockManual: "Manually Unlocked",
    LockAuto: "Auto Locked",
    UnlockAuto: "Auto Unlocked",
    LockRemoteCode: "Locked via Remote Access Code",
    UnlockRemoteCode: "Unlocked via Remote Access Code",
    LockRemote: "Locked via Remote",
    UnlockRemote: "Unlocked via Remote",
    LockRemoteCodeOutOfSchedule: "Out of Schedule Lock Attempt via Remote Access Code",
    UnlockRemoteCodeOutOfSchedule: "Out of Schedule Unlock Attempt via Remote Access Code",
    RemoteIllegalCode: "Illegal Remote Access Code",
    LockManual2: "Manually Locked (2)",
    UnlockManual2: "Manually Unlocked (2)",
    LockSecured: "Lock Secured",
    LockUnsecured: "Lock Unsecured",
    UserCodeAdded: "User Code Added",
    UserCodeDeleted: "User Code Deleted",
    AllUserCodesDeleted: "All User Codes Deleted",
    MasterCodeChanged: "Master Code Changed",
    UserCodeChanged: "User Code Changed",
    LockReset: "Lock Reset",
    ConfigurationChanged: "Configuration Changed",
    LowBattery: "Low Battery",
    NewBattery: "New Battery Installed",
    Unknown: "Unknown",
};
const LATEST_RECORD_NUMBER_KEY = 0;
exports.DoorLockLoggingCCValues = Object.freeze({
    ...Values_1.V.defineStaticCCValues(safe_1.CommandClasses["Door Lock Logging"], {
        ...Values_1.V.staticProperty("recordsCount", undefined, { internal: true }),
    }),
});
let DoorLockLoggingCCAPI = class DoorLockLoggingCCAPI extends API_1.PhysicalCCAPI {
    supportsCommand(cmd) {
        switch (cmd) {
            case _Types_1.DoorLockLoggingCommand.RecordsSupportedGet:
            case _Types_1.DoorLockLoggingCommand.RecordsSupportedReport:
            case _Types_1.DoorLockLoggingCommand.RecordGet:
            case _Types_1.DoorLockLoggingCommand.RecordReport:
                return true;
        }
        return super.supportsCommand(cmd);
    }
    async getRecordsCount() {
        this.assertSupportsCommand(_Types_1.DoorLockLoggingCommand, _Types_1.DoorLockLoggingCommand.RecordsSupportedGet);
        const cc = new DoorLockLoggingCCRecordsSupportedGet(this.applHost, {
            nodeId: this.endpoint.nodeId,
            endpoint: this.endpoint.index,
        });
        const response = await this.applHost.sendCommand(cc, this.commandOptions);
        return response?.recordsCount;
    }
    /** Retrieves the specified audit record. Defaults to the latest one. */
    async getRecord(recordNumber = LATEST_RECORD_NUMBER_KEY) {
        __assertType("recordNumber", "(optional) number", __assertType__optional_number.bind(void 0, recordNumber));
        this.assertSupportsCommand(_Types_1.DoorLockLoggingCommand, _Types_1.DoorLockLoggingCommand.RecordGet);
        const cc = new DoorLockLoggingCCRecordGet(this.applHost, {
            nodeId: this.endpoint.nodeId,
            endpoint: this.endpoint.index,
            recordNumber,
        });
        const response = await this.applHost.sendCommand(cc, this.commandOptions);
        return response?.record;
    }
};
DoorLockLoggingCCAPI = __decorate([
    (0, CommandClassDecorators_1.API)(safe_1.CommandClasses["Door Lock Logging"])
], DoorLockLoggingCCAPI);
exports.DoorLockLoggingCCAPI = DoorLockLoggingCCAPI;
let DoorLockLoggingCC = class DoorLockLoggingCC extends CommandClass_1.CommandClass {
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
        const api = API_1.CCAPI.create(safe_1.CommandClasses["Door Lock Logging"], applHost, endpoint).withOptions({
            priority: safe_1.MessagePriority.NodeQuery,
        });
        applHost.controllerLog.logNode(node.id, {
            endpoint: this.endpointIndex,
            message: "querying supported number of records...",
            direction: "outbound",
        });
        const recordsCount = await api.getRecordsCount();
        if (!recordsCount) {
            applHost.controllerLog.logNode(node.id, {
                endpoint: this.endpointIndex,
                message: "Door Lock Logging records count query timed out, skipping interview...",
                level: "warn",
            });
            return;
        }
        const recordsCountLogMessage = `supports ${recordsCount} record${recordsCount === 1 ? "" : "s"}`;
        applHost.controllerLog.logNode(node.id, {
            endpoint: this.endpointIndex,
            message: recordsCountLogMessage,
            direction: "inbound",
        });
    }
};
DoorLockLoggingCC = __decorate([
    (0, CommandClassDecorators_1.commandClass)(safe_1.CommandClasses["Door Lock Logging"]),
    (0, CommandClassDecorators_1.implementedVersion)(1),
    (0, CommandClassDecorators_1.ccValues)(exports.DoorLockLoggingCCValues)
], DoorLockLoggingCC);
exports.DoorLockLoggingCC = DoorLockLoggingCC;
let DoorLockLoggingCCRecordsSupportedReport = class DoorLockLoggingCCRecordsSupportedReport extends DoorLockLoggingCC {
    constructor(host, options) {
        super(host, options);
        (0, safe_1.validatePayload)(this.payload.length >= 1);
        this.recordsCount = this.payload[0];
    }
    toLogEntry(applHost) {
        return {
            ...super.toLogEntry(applHost),
            message: {
                "supported no. of records": this.recordsCount,
            },
        };
    }
};
__decorate([
    (0, CommandClassDecorators_1.ccValue)(exports.DoorLockLoggingCCValues.recordsCount)
], DoorLockLoggingCCRecordsSupportedReport.prototype, "recordsCount", void 0);
DoorLockLoggingCCRecordsSupportedReport = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.DoorLockLoggingCommand.RecordsSupportedReport)
], DoorLockLoggingCCRecordsSupportedReport);
exports.DoorLockLoggingCCRecordsSupportedReport = DoorLockLoggingCCRecordsSupportedReport;
function eventTypeToLabel(eventType) {
    return (eventTypeLabel[_Types_1.DoorLockLoggingEventType[eventType]] ??
        `Unknown ${(0, safe_2.num2hex)(eventType)}`);
}
let DoorLockLoggingCCRecordsSupportedGet = class DoorLockLoggingCCRecordsSupportedGet extends DoorLockLoggingCC {
};
DoorLockLoggingCCRecordsSupportedGet = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.DoorLockLoggingCommand.RecordsSupportedGet),
    (0, CommandClassDecorators_1.expectedCCResponse)(DoorLockLoggingCCRecordsSupportedReport)
], DoorLockLoggingCCRecordsSupportedGet);
exports.DoorLockLoggingCCRecordsSupportedGet = DoorLockLoggingCCRecordsSupportedGet;
let DoorLockLoggingCCRecordReport = class DoorLockLoggingCCRecordReport extends DoorLockLoggingCC {
    constructor(host, options) {
        super(host, options);
        (0, safe_1.validatePayload)(this.payload.length >= 11);
        this.recordNumber = this.payload[0];
        const recordStatus = this.payload[5] >>> 5;
        if (recordStatus === _Types_1.DoorLockLoggingRecordStatus.Empty) {
            return;
        }
        else {
            const dateSegments = {
                year: this.payload.readUInt16BE(1),
                month: this.payload[3],
                day: this.payload[4],
                hour: this.payload[5] & 0b11111,
                minute: this.payload[6],
                second: this.payload[7],
            };
            const eventType = this.payload[8];
            const recordUserID = this.payload[9];
            const userCodeLength = this.payload[10];
            (0, safe_1.validatePayload)(userCodeLength <= 10, this.payload.length >= 11 + userCodeLength);
            const userCodeBuffer = this.payload.slice(11, 11 + userCodeLength);
            // See User Code CC for a detailed description. We try to parse the code as ASCII if possible
            // and fall back to a buffer otherwise.
            const userCodeString = userCodeBuffer.toString("utf8");
            const userCode = (0, safe_2.isPrintableASCII)(userCodeString)
                ? userCodeString
                : userCodeBuffer;
            this.record = {
                eventType: eventType,
                label: eventTypeToLabel(eventType),
                timestamp: segmentsToDate(dateSegments).toISOString(),
                userId: recordUserID,
                userCode,
            };
        }
    }
    toLogEntry(applHost) {
        let message;
        if (!this.record) {
            message = {
                "record #": `${this.recordNumber} (empty)`,
            };
        }
        else {
            message = {
                "record #": `${this.recordNumber}`,
                "event type": this.record.label,
                timestamp: this.record.timestamp,
            };
            if (this.record.userId) {
                message["user ID"] = this.record.userId;
            }
            if (this.record.userCode) {
                message["user code"] = (0, UserCodeCC_1.userCodeToLogString)(this.record.userCode);
            }
        }
        return {
            ...super.toLogEntry(applHost),
            message,
        };
    }
};
DoorLockLoggingCCRecordReport = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.DoorLockLoggingCommand.RecordReport)
], DoorLockLoggingCCRecordReport);
exports.DoorLockLoggingCCRecordReport = DoorLockLoggingCCRecordReport;
function testResponseForDoorLockLoggingRecordGet(sent, received) {
    return (sent.recordNumber === LATEST_RECORD_NUMBER_KEY ||
        sent.recordNumber === received.recordNumber);
}
let DoorLockLoggingCCRecordGet = class DoorLockLoggingCCRecordGet extends DoorLockLoggingCC {
    constructor(host, options) {
        super(host, options);
        if ((0, CommandClass_1.gotDeserializationOptions)(options)) {
            throw new safe_1.ZWaveError(`${this.constructor.name}: deserialization not implemented`, safe_1.ZWaveErrorCodes.Deserialization_NotImplemented);
        }
        else {
            this.recordNumber = options.recordNumber;
        }
    }
    serialize() {
        this.payload = Buffer.from([this.recordNumber]);
        return super.serialize();
    }
    toLogEntry(applHost) {
        return {
            ...super.toLogEntry(applHost),
            message: { "record number": this.recordNumber },
        };
    }
};
DoorLockLoggingCCRecordGet = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.DoorLockLoggingCommand.RecordGet),
    (0, CommandClassDecorators_1.expectedCCResponse)(DoorLockLoggingCCRecordReport, testResponseForDoorLockLoggingRecordGet)
], DoorLockLoggingCCRecordGet);
exports.DoorLockLoggingCCRecordGet = DoorLockLoggingCCRecordGet;
//# sourceMappingURL=DoorLockLoggingCC.js.map