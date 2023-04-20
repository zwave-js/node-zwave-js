"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var _a, _b;
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserCodeCCExtendedUserCodeGet = exports.UserCodeCCExtendedUserCodeReport = exports.UserCodeCCExtendedUserCodeSet = exports.UserCodeCCUserCodeChecksumGet = exports.UserCodeCCUserCodeChecksumReport = exports.UserCodeCCMasterCodeGet = exports.UserCodeCCMasterCodeReport = exports.UserCodeCCMasterCodeSet = exports.UserCodeCCKeypadModeGet = exports.UserCodeCCKeypadModeReport = exports.UserCodeCCKeypadModeSet = exports.UserCodeCCCapabilitiesGet = exports.UserCodeCCCapabilitiesReport = exports.UserCodeCCUsersNumberGet = exports.UserCodeCCUsersNumberReport = exports.UserCodeCCGet = exports.UserCodeCCReport = exports.UserCodeCCSet = exports.UserCodeCC = exports.UserCodeCCAPI = exports.userCodeToLogString = exports.UserCodeCCValues = void 0;
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
const __assertType__optional_boolean = $o => {
    function _boolean($o) {
        return typeof $o !== "boolean" ? {} : null;
    }
    function optional__boolean($o) {
        if ($o !== undefined) {
            const error = _boolean($o);
            if (error)
                return error;
        }
        return null;
    }
    return optional__boolean($o);
};
const __assertType__su__1__2__3__4_eu = $o => {
    function _1($o) {
        return $o !== 1 ? {} : null;
    }
    function _2($o) {
        return $o !== 2 ? {} : null;
    }
    function _3($o) {
        return $o !== 3 ? {} : null;
    }
    function _4($o) {
        return $o !== 4 ? {} : null;
    }
    function su__1__2__3__4_eu($o) {
        const conditions = [_1, _2, _3, _4];
        for (const condition of conditions) {
            const error = condition($o);
            if (!error)
                return null;
        }
        return {};
    }
    return su__1__2__3__4_eu($o);
};
const __assertType__su__string__buffer_eu = $o => {
    function _string($o) {
        return typeof $o !== "string" ? {} : null;
    }
    function _buffer($o) {
        return !Buffer.isBuffer($o) ? {} : null;
    }
    function su__string__buffer_eu($o) {
        const conditions = [_string, _buffer];
        for (const condition of conditions) {
            const error = condition($o);
            if (!error)
                return null;
        }
        return {};
    }
    return su__string__buffer_eu($o);
};
const __assertType__sa_su__3__4__5_eu_ea_2 = $o => {
    function _6($o) {
        return $o !== 0 ? {} : null;
    }
    function _7($o) {
        return $o !== 0 ? {} : null;
    }
    function _undefined($o) {
        return $o !== undefined ? {} : null;
    }
    function _3($o) {
        if (typeof $o !== "object" || $o === null || Array.isArray($o))
            return {};
        if ("userId" in $o && $o["userId"] !== undefined) {
            const error = _6($o["userId"]);
            if (error)
                return error;
        }
        else
            return {};
        if ("userIdStatus" in $o && $o["userIdStatus"] !== undefined) {
            const error = _7($o["userIdStatus"]);
            if (error)
                return error;
        }
        else
            return {};
        if ("userCode" in $o && $o["userCode"] !== undefined) {
            const error = _undefined($o["userCode"]);
            if (error)
                return error;
        }
        return null;
    }
    function _number($o) {
        return typeof $o !== "number" ? {} : null;
    }
    function _4($o) {
        if (typeof $o !== "object" || $o === null || Array.isArray($o))
            return {};
        if ("userId" in $o && $o["userId"] !== undefined) {
            const error = _number($o["userId"]);
            if (error)
                return error;
        }
        else
            return {};
        if ("userIdStatus" in $o && $o["userIdStatus"] !== undefined) {
            const error = _7($o["userIdStatus"]);
            if (error)
                return error;
        }
        else
            return {};
        if ("userCode" in $o && $o["userCode"] !== undefined) {
            const error = _undefined($o["userCode"]);
            if (error)
                return error;
        }
        return null;
    }
    function _9($o) {
        return $o !== 1 ? {} : null;
    }
    function _10($o) {
        return $o !== 2 ? {} : null;
    }
    function _11($o) {
        return $o !== 3 ? {} : null;
    }
    function _12($o) {
        return $o !== 4 ? {} : null;
    }
    function su__9__10__11__12_eu($o) {
        const conditions = [_9, _10, _11, _12];
        for (const condition of conditions) {
            const error = condition($o);
            if (!error)
                return null;
        }
        return {};
    }
    function _string($o) {
        return typeof $o !== "string" ? {} : null;
    }
    function _buffer($o) {
        return !Buffer.isBuffer($o) ? {} : null;
    }
    function su__string__buffer_eu($o) {
        const conditions = [_string, _buffer];
        for (const condition of conditions) {
            const error = condition($o);
            if (!error)
                return null;
        }
        return {};
    }
    function _5($o) {
        if (typeof $o !== "object" || $o === null || Array.isArray($o))
            return {};
        if ("userId" in $o && $o["userId"] !== undefined) {
            const error = _number($o["userId"]);
            if (error)
                return error;
        }
        else
            return {};
        if ("userIdStatus" in $o && $o["userIdStatus"] !== undefined) {
            const error = su__9__10__11__12_eu($o["userIdStatus"]);
            if (error)
                return error;
        }
        else
            return {};
        if ("userCode" in $o && $o["userCode"] !== undefined) {
            const error = su__string__buffer_eu($o["userCode"]);
            if (error)
                return error;
        }
        else
            return {};
        return null;
    }
    function su__3__4__5_eu($o) {
        const conditions = [_3, _4, _5];
        for (const condition of conditions) {
            const error = condition($o);
            if (!error)
                return null;
        }
        return {};
    }
    function sa_su__3__4__5_eu_ea_2($o) {
        if (!Array.isArray($o))
            return {};
        for (let i = 0; i < $o.length; i++) {
            const error = su__3__4__5_eu($o[i]);
            if (error)
                return error;
        }
        return null;
    }
    return sa_su__3__4__5_eu_ea_2($o);
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
const __assertType__KeypadMode = $o => {
    function su__1__2__3__4_eu($o) {
        return ![0, 1, 2, 3].includes($o) ? {} : null;
    }
    return su__1__2__3__4_eu($o);
};
const __assertType__string = $o => {
    function _string($o) {
        return typeof $o !== "string" ? {} : null;
    }
    return _string($o);
};
const safe_1 = require("@zwave-js/core/safe");
const safe_2 = require("@zwave-js/shared/safe");
const API_1 = require("../lib/API");
const CommandClass_1 = require("../lib/CommandClass");
const CommandClassDecorators_1 = require("../lib/CommandClassDecorators");
const Values_1 = require("../lib/Values");
const _Types_1 = require("../lib/_Types");
exports.UserCodeCCValues = Object.freeze({
    ...Values_1.V.defineStaticCCValues(safe_1.CommandClasses["User Code"], {
        ...Values_1.V.staticProperty("supportedUsers", undefined, { internal: true }),
        ...Values_1.V.staticProperty("supportsMasterCode", undefined, {
            internal: true,
        }),
        ...Values_1.V.staticProperty("supportsMasterCodeDeactivation", undefined, {
            internal: true,
        }),
        ...Values_1.V.staticProperty("supportsUserCodeChecksum", undefined, {
            internal: true,
        }),
        ...Values_1.V.staticProperty("supportsMultipleUserCodeReport", undefined, {
            internal: true,
        }),
        ...Values_1.V.staticProperty("supportsMultipleUserCodeSet", undefined, {
            internal: true,
        }),
        ...Values_1.V.staticProperty("supportedUserIDStatuses", undefined, {
            internal: true,
        }),
        ...Values_1.V.staticProperty("supportedKeypadModes", undefined, {
            internal: true,
        }),
        ...Values_1.V.staticProperty("supportedASCIIChars", undefined, {
            internal: true,
        }),
        ...Values_1.V.staticProperty("userCodeChecksum", undefined, { internal: true }),
        ...Values_1.V.staticProperty("keypadMode", {
            ...safe_1.ValueMetadata.ReadOnlyNumber,
            label: "Keypad Mode",
        }, { minVersion: 2 }),
        ...Values_1.V.staticProperty("masterCode", {
            ...safe_1.ValueMetadata.String,
            label: "Master Code",
            minLength: 4,
            maxLength: 10,
        }, {
            minVersion: 2,
            secret: true,
        }),
    }),
    ...Values_1.V.defineDynamicCCValues(safe_1.CommandClasses["User Code"], {
        ...Values_1.V.dynamicPropertyAndKeyWithName("userIdStatus", "userIdStatus", (userId) => userId, ({ property, propertyKey }) => property === "userIdStatus" && typeof propertyKey === "number", (userId) => ({
            ...safe_1.ValueMetadata.Number,
            label: `User ID status (${userId})`,
        })),
        ...Values_1.V.dynamicPropertyAndKeyWithName("userCode", "userCode", (userId) => userId, ({ property, propertyKey }) => property === "userCode" && typeof propertyKey === "number", 
        // The user code metadata is dynamically created
        undefined, { secret: true }),
    }),
});
function parseExtendedUserCode(payload) {
    (0, safe_1.validatePayload)(payload.length >= 4);
    const userId = payload.readUInt16BE(0);
    const status = payload[2];
    const codeLength = payload[3] & 0b1111;
    (0, safe_1.validatePayload)(payload.length >= 4 + codeLength);
    const code = payload.slice(4, 4 + codeLength).toString("ascii");
    return {
        code: {
            userId,
            userIdStatus: status,
            userCode: code,
        },
        bytesRead: 4 + codeLength,
    };
}
function validateCode(code, supportedChars) {
    if (code.length < 4 || code.length > 10)
        return false;
    return [...code].every((char) => supportedChars.includes(char));
}
function setUserCodeMetadata(applHost, userId, userCode) {
    const statusValue = exports.UserCodeCCValues.userIdStatus(userId);
    const codeValue = exports.UserCodeCCValues.userCode(userId);
    const supportedUserIDStatuses = this.getValue(applHost, exports.UserCodeCCValues.supportedUserIDStatuses) ??
        (this.version === 1
            ? [
                _Types_1.UserIDStatus.Available,
                _Types_1.UserIDStatus.Enabled,
                _Types_1.UserIDStatus.Disabled,
            ]
            : [
                _Types_1.UserIDStatus.Available,
                _Types_1.UserIDStatus.Enabled,
                _Types_1.UserIDStatus.Disabled,
                _Types_1.UserIDStatus.Messaging,
                _Types_1.UserIDStatus.PassageMode,
            ]);
    this.ensureMetadata(applHost, statusValue, {
        ...statusValue.meta,
        states: (0, safe_1.enumValuesToMetadataStates)(_Types_1.UserIDStatus, supportedUserIDStatuses),
    });
    const codeMetadata = {
        ...(Buffer.isBuffer(userCode)
            ? safe_1.ValueMetadata.Buffer
            : safe_1.ValueMetadata.String),
        minLength: 4,
        maxLength: 10,
        label: `User Code (${userId})`,
    };
    if (this.getMetadata(applHost, codeValue)?.type !== codeMetadata.type) {
        this.setMetadata(applHost, codeValue, codeMetadata);
    }
}
function persistUserCode(applHost, userId, userIdStatus, userCode) {
    const statusValue = exports.UserCodeCCValues.userIdStatus(userId);
    const codeValue = exports.UserCodeCCValues.userCode(userId);
    // Check if this code is supported
    if (userIdStatus === _Types_1.UserIDStatus.StatusNotAvailable) {
        // It is not, remove all values if any exist
        this.removeValue(applHost, statusValue);
        this.removeValue(applHost, codeValue);
        this.removeMetadata(applHost, statusValue);
        this.removeMetadata(applHost, codeValue);
    }
    else {
        // Always create metadata in case it does not exist
        setUserCodeMetadata.call(this, applHost, userId, userCode);
        this.setValue(applHost, statusValue, userIdStatus);
        this.setValue(applHost, codeValue, userCode);
    }
    return true;
}
/** Formats a user code in a way that's safe to print in public logs */
function userCodeToLogString(userCode) {
    if (userCode === "")
        return "(empty)";
    return "*".repeat(userCode.length);
}
exports.userCodeToLogString = userCodeToLogString;
let UserCodeCCAPI = class UserCodeCCAPI extends API_1.PhysicalCCAPI {
    constructor() {
        super(...arguments);
        this[_a] = async ({ property, propertyKey }, value) => {
            let result;
            if (property === "keypadMode") {
                if (typeof value !== "number") {
                    (0, API_1.throwWrongValueType)(this.ccId, property, "number", typeof value);
                }
                result = await this.setKeypadMode(value);
            }
            else if (property === "masterCode") {
                if (typeof value !== "string") {
                    (0, API_1.throwWrongValueType)(this.ccId, property, "string", typeof value);
                }
                result = await this.setMasterCode(value);
            }
            else if (property === "userIdStatus") {
                if (propertyKey == undefined) {
                    (0, API_1.throwMissingPropertyKey)(this.ccId, property);
                }
                else if (typeof propertyKey !== "number") {
                    (0, API_1.throwUnsupportedPropertyKey)(this.ccId, property, propertyKey);
                }
                if (typeof value !== "number") {
                    (0, API_1.throwWrongValueType)(this.ccId, property, "number", typeof value);
                }
                if (value === _Types_1.UserIDStatus.Available) {
                    // Clear Code
                    result = await this.clear(propertyKey);
                }
                else {
                    // We need to set the user code along with the status
                    const userCode = this.getValueDB().getValue(exports.UserCodeCCValues.userCode(propertyKey).endpoint(this.endpoint.index));
                    result = await this.set(propertyKey, value, userCode);
                }
            }
            else if (property === "userCode") {
                if (propertyKey == undefined) {
                    (0, API_1.throwMissingPropertyKey)(this.ccId, property);
                }
                else if (typeof propertyKey !== "number") {
                    (0, API_1.throwUnsupportedPropertyKey)(this.ccId, property, propertyKey);
                }
                if (typeof value !== "string" && !Buffer.isBuffer(value)) {
                    (0, API_1.throwWrongValueType)(this.ccId, property, "string or Buffer", typeof value);
                }
                // We need to set the user id status along with the code
                let userIdStatus = this.getValueDB().getValue(exports.UserCodeCCValues.userIdStatus(propertyKey).endpoint(this.endpoint.index));
                if (userIdStatus === _Types_1.UserIDStatus.Available ||
                    userIdStatus == undefined) {
                    userIdStatus = _Types_1.UserIDStatus.Enabled;
                }
                result = await this.set(propertyKey, userIdStatus, value);
            }
            else {
                (0, API_1.throwUnsupportedProperty)(this.ccId, property);
            }
            // Verify the change after a short delay, unless the command was supervised and successful
            if (this.isSinglecast() && !(0, safe_1.supervisedCommandSucceeded)(result)) {
                this.schedulePoll({ property, propertyKey }, value, {
                    transition: "fast",
                });
            }
            return result;
        };
        this[_b] = async ({ property, propertyKey, }) => {
            switch (property) {
                case "keypadMode":
                    return this.getKeypadMode();
                case "masterCode":
                    return this.getMasterCode();
                case "userIdStatus":
                case "userCode": {
                    if (propertyKey == undefined) {
                        (0, API_1.throwMissingPropertyKey)(this.ccId, property);
                    }
                    else if (typeof propertyKey !== "number") {
                        (0, API_1.throwUnsupportedPropertyKey)(this.ccId, property, propertyKey);
                    }
                    return (await this.get(propertyKey))?.[property];
                }
                default:
                    (0, API_1.throwUnsupportedProperty)(this.ccId, property);
            }
        };
    }
    supportsCommand(cmd) {
        switch (cmd) {
            case _Types_1.UserCodeCommand.Get:
            case _Types_1.UserCodeCommand.Set:
            case _Types_1.UserCodeCommand.UsersNumberGet:
                return true; // This is mandatory
            case _Types_1.UserCodeCommand.CapabilitiesGet:
            case _Types_1.UserCodeCommand.KeypadModeSet:
            case _Types_1.UserCodeCommand.KeypadModeGet:
            case _Types_1.UserCodeCommand.ExtendedUserCodeSet:
            case _Types_1.UserCodeCommand.ExtendedUserCodeGet:
                return this.version >= 2;
            case _Types_1.UserCodeCommand.MasterCodeSet:
            case _Types_1.UserCodeCommand.MasterCodeGet: {
                if (this.version < 2)
                    return false;
                return (this.tryGetValueDB()?.getValue(exports.UserCodeCCValues.supportsMasterCode.endpoint(this.endpoint.index)) ?? safe_1.unknownBoolean);
            }
            case _Types_1.UserCodeCommand.UserCodeChecksumGet: {
                if (this.version < 2)
                    return false;
                return (this.tryGetValueDB()?.getValue(exports.UserCodeCCValues.supportsUserCodeChecksum.endpoint(this.endpoint.index)) ?? safe_1.unknownBoolean);
            }
        }
        return super.supportsCommand(cmd);
    }
    async getUsersCount() {
        this.assertSupportsCommand(_Types_1.UserCodeCommand, _Types_1.UserCodeCommand.UsersNumberGet);
        const cc = new UserCodeCCUsersNumberGet(this.applHost, {
            nodeId: this.endpoint.nodeId,
            endpoint: this.endpoint.index,
        });
        const response = await this.applHost.sendCommand(cc, this.commandOptions);
        return response?.supportedUsers;
    }
    async get(userId, multiple = false) {
        __assertType("userId", "number", __assertType__number.bind(void 0, userId));
        __assertType("multiple", "(optional) boolean", __assertType__optional_boolean.bind(void 0, multiple));
        if (userId > 255 || multiple) {
            this.assertSupportsCommand(_Types_1.UserCodeCommand, _Types_1.UserCodeCommand.ExtendedUserCodeGet);
            const cc = new UserCodeCCExtendedUserCodeGet(this.applHost, {
                nodeId: this.endpoint.nodeId,
                endpoint: this.endpoint.index,
                userId,
                reportMore: multiple,
            });
            const response = await this.applHost.sendCommand(cc, this.commandOptions);
            if (!response) {
                return;
            }
            else if (multiple) {
                return (0, safe_2.pick)(response, ["userCodes", "nextUserId"]);
            }
            else {
                return (0, safe_2.pick)(response.userCodes[0], [
                    "userIdStatus",
                    "userCode",
                ]);
            }
        }
        else {
            this.assertSupportsCommand(_Types_1.UserCodeCommand, _Types_1.UserCodeCommand.Get);
            const cc = new UserCodeCCGet(this.applHost, {
                nodeId: this.endpoint.nodeId,
                endpoint: this.endpoint.index,
                userId,
            });
            const response = await this.applHost.sendCommand(cc, this.commandOptions);
            if (response)
                return (0, safe_2.pick)(response, ["userIdStatus", "userCode"]);
        }
    }
    /** Configures a single user code */
    async set(userId, userIdStatus, userCode) {
        __assertType("userId", "number", __assertType__number.bind(void 0, userId));
        __assertType("userIdStatus", undefined, __assertType__su__1__2__3__4_eu.bind(void 0, userIdStatus));
        __assertType("userCode", undefined, __assertType__su__string__buffer_eu.bind(void 0, userCode));
        if (this.version > 1 || userId > 255) {
            return this.setMany([{ userId, userIdStatus, userCode }]);
        }
        this.assertSupportsCommand(_Types_1.UserCodeCommand, _Types_1.UserCodeCommand.Set);
        const numUsers = UserCodeCC.getSupportedUsersCached(this.applHost, this.endpoint);
        if (numUsers != undefined && userId > numUsers) {
            throw new safe_1.ZWaveError(`The user ID must be between 0 and the number of supported users ${numUsers}.`, safe_1.ZWaveErrorCodes.Argument_Invalid);
        }
        const cc = new UserCodeCCSet(this.applHost, {
            nodeId: this.endpoint.nodeId,
            endpoint: this.endpoint.index,
            userId,
            userIdStatus,
            userCode,
        });
        return this.applHost.sendCommand(cc, this.commandOptions);
    }
    /** Configures multiple user codes */
    async setMany(codes) {
        __assertType("codes", undefined, __assertType__sa_su__3__4__5_eu_ea_2.bind(void 0, codes));
        this.assertSupportsCommand(_Types_1.UserCodeCommand, _Types_1.UserCodeCommand.ExtendedUserCodeSet);
        const numUsers = UserCodeCC.getSupportedUsersCached(this.applHost, this.endpoint);
        const supportedStatuses = UserCodeCC.getSupportedUserIDStatusesCached(this.applHost, this.endpoint);
        const supportedASCIIChars = UserCodeCC.getSupportedASCIICharsCached(this.applHost, this.endpoint);
        const supportsMultipleUserCodeSet = UserCodeCC.supportsMultipleUserCodeSetCached(this.applHost, this.endpoint) ?? false;
        // Validate options
        if (numUsers != undefined) {
            if (codes.some((code) => code.userId < 0 || code.userId > numUsers)) {
                throw new safe_1.ZWaveError(`All User IDs must be between 0 and the number of supported users ${numUsers}.`, safe_1.ZWaveErrorCodes.Argument_Invalid);
            }
        }
        else {
            if (codes.some((code) => code.userId < 0)) {
                throw new safe_1.ZWaveError(`All User IDs must be greater than 0.`, safe_1.ZWaveErrorCodes.Argument_Invalid);
            }
        }
        if (codes.some((code) => code.userId === 0) && codes.length > 1) {
            throw new safe_1.ZWaveError(`If user ID 0 is used, only one code may be set`, safe_1.ZWaveErrorCodes.Argument_Invalid);
        }
        else if (codes.some((code) => code.userId === 0 &&
            code.userIdStatus !== _Types_1.UserIDStatus.Available)) {
            throw new safe_1.ZWaveError(`User ID 0 may only be used to clear all user codes`, safe_1.ZWaveErrorCodes.Argument_Invalid);
        }
        else if (codes.length > 1 && !supportsMultipleUserCodeSet) {
            throw new safe_1.ZWaveError(`The node does not support setting multiple user codes at once`, safe_1.ZWaveErrorCodes.Argument_Invalid);
        }
        for (const code of codes) {
            if (supportedStatuses != undefined &&
                !supportedStatuses.includes(code.userIdStatus)) {
                throw new safe_1.ZWaveError(`The user ID status ${(0, safe_2.getEnumMemberName)(_Types_1.UserIDStatus, code.userIdStatus)} is not supported by the node`, safe_1.ZWaveErrorCodes.Argument_Invalid);
            }
            else if (code.userIdStatus === _Types_1.UserIDStatus.Available) {
                code.userCode = undefined;
            }
            else if (supportedASCIIChars) {
                if (!validateCode(code.userCode.toString("ascii"), supportedASCIIChars)) {
                    throw new safe_1.ZWaveError(`The user code must consist of 4 to 10 of the following characters: ${supportedASCIIChars}`, safe_1.ZWaveErrorCodes.Argument_Invalid);
                }
            }
        }
        const cc = new UserCodeCCExtendedUserCodeSet(this.applHost, {
            nodeId: this.endpoint.nodeId,
            endpoint: this.endpoint.index,
            userCodes: codes,
        });
        return this.applHost.sendCommand(cc, this.commandOptions);
    }
    /**
     * Clears one or all user code
     * @param userId The user code to clear. If none or 0 is given, all codes are cleared
     */
    async clear(userId = 0) {
        __assertType("userId", "(optional) number", __assertType__optional_number.bind(void 0, userId));
        if (this.version > 1 || userId > 255) {
            return this.setMany([
                { userId, userIdStatus: _Types_1.UserIDStatus.Available },
            ]);
        }
        else {
            this.assertSupportsCommand(_Types_1.UserCodeCommand, _Types_1.UserCodeCommand.Set);
            const numUsers = UserCodeCC.getSupportedUsersCached(this.applHost, this.endpoint);
            if (numUsers != undefined && userId > numUsers) {
                throw new safe_1.ZWaveError(`The user ID must be between 0 and the number of supported users ${numUsers}.`, safe_1.ZWaveErrorCodes.Argument_Invalid);
            }
            const cc = new UserCodeCCSet(this.applHost, {
                nodeId: this.endpoint.nodeId,
                endpoint: this.endpoint.index,
                userId,
                userIdStatus: _Types_1.UserIDStatus.Available,
            });
            return this.applHost.sendCommand(cc, this.commandOptions);
        }
    }
    // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
    async getCapabilities() {
        this.assertSupportsCommand(_Types_1.UserCodeCommand, _Types_1.UserCodeCommand.CapabilitiesGet);
        const cc = new UserCodeCCCapabilitiesGet(this.applHost, {
            nodeId: this.endpoint.nodeId,
            endpoint: this.endpoint.index,
        });
        const response = await this.applHost.sendCommand(cc, this.commandOptions);
        if (response) {
            return (0, safe_2.pick)(response, [
                "supportsMasterCode",
                "supportsMasterCodeDeactivation",
                "supportsUserCodeChecksum",
                "supportsMultipleUserCodeReport",
                "supportsMultipleUserCodeSet",
                "supportedUserIDStatuses",
                "supportedKeypadModes",
                "supportedASCIIChars",
            ]);
        }
    }
    async getKeypadMode() {
        this.assertSupportsCommand(_Types_1.UserCodeCommand, _Types_1.UserCodeCommand.KeypadModeGet);
        const cc = new UserCodeCCKeypadModeGet(this.applHost, {
            nodeId: this.endpoint.nodeId,
            endpoint: this.endpoint.index,
        });
        const response = await this.applHost.sendCommand(cc, this.commandOptions);
        return response?.keypadMode;
    }
    async setKeypadMode(keypadMode) {
        __assertType("keypadMode", "KeypadMode", __assertType__KeypadMode.bind(void 0, keypadMode));
        this.assertSupportsCommand(_Types_1.UserCodeCommand, _Types_1.UserCodeCommand.KeypadModeSet);
        const supportedModes = UserCodeCC.getSupportedKeypadModesCached(this.applHost, this.endpoint);
        if (!supportedModes) {
            throw new safe_1.ZWaveError(`The keypad mode can only be set after the interview is complete!`, safe_1.ZWaveErrorCodes.Argument_Invalid);
        }
        else if (!supportedModes.includes(keypadMode)) {
            throw new safe_1.ZWaveError(`The keypad mode ${(0, safe_2.getEnumMemberName)(_Types_1.KeypadMode, keypadMode)} is not supported by the node!`, safe_1.ZWaveErrorCodes.Argument_Invalid);
        }
        const cc = new UserCodeCCKeypadModeSet(this.applHost, {
            nodeId: this.endpoint.nodeId,
            endpoint: this.endpoint.index,
            keypadMode,
        });
        return this.applHost.sendCommand(cc, this.commandOptions);
    }
    async getMasterCode() {
        this.assertSupportsCommand(_Types_1.UserCodeCommand, _Types_1.UserCodeCommand.MasterCodeGet);
        const cc = new UserCodeCCMasterCodeGet(this.applHost, {
            nodeId: this.endpoint.nodeId,
            endpoint: this.endpoint.index,
        });
        const response = await this.applHost.sendCommand(cc, this.commandOptions);
        return response?.masterCode;
    }
    async setMasterCode(masterCode) {
        __assertType("masterCode", "string", __assertType__string.bind(void 0, masterCode));
        this.assertSupportsCommand(_Types_1.UserCodeCommand, _Types_1.UserCodeCommand.MasterCodeSet);
        const supportedASCIIChars = UserCodeCC.getSupportedASCIICharsCached(this.applHost, this.endpoint);
        if (!supportedASCIIChars) {
            throw new safe_1.ZWaveError(`The master code can only be set after the interview is complete!`, safe_1.ZWaveErrorCodes.Argument_Invalid);
        }
        // Validate the code
        if (!masterCode) {
            const supportsDeactivation = UserCodeCC.supportsMasterCodeDeactivationCached(this.applHost, this.endpoint);
            if (!supportsDeactivation) {
                throw new safe_1.ZWaveError(`The node does not support deactivating the master code!`, safe_1.ZWaveErrorCodes.Argument_Invalid);
            }
        }
        else if (!validateCode(masterCode, supportedASCIIChars)) {
            throw new safe_1.ZWaveError(`The master code must consist of 4 to 10 of the following characters: ${supportedASCIIChars}`, safe_1.ZWaveErrorCodes.Argument_Invalid);
        }
        const cc = new UserCodeCCMasterCodeSet(this.applHost, {
            nodeId: this.endpoint.nodeId,
            endpoint: this.endpoint.index,
            masterCode,
        });
        return this.applHost.sendCommand(cc, this.commandOptions);
    }
    async getUserCodeChecksum() {
        this.assertSupportsCommand(_Types_1.UserCodeCommand, _Types_1.UserCodeCommand.UserCodeChecksumGet);
        const cc = new UserCodeCCUserCodeChecksumGet(this.applHost, {
            nodeId: this.endpoint.nodeId,
            endpoint: this.endpoint.index,
        });
        const response = await this.applHost.sendCommand(cc, this.commandOptions);
        return response?.userCodeChecksum;
    }
};
_a = API_1.SET_VALUE;
_b = API_1.POLL_VALUE;
UserCodeCCAPI = __decorate([
    (0, CommandClassDecorators_1.API)(safe_1.CommandClasses["User Code"])
], UserCodeCCAPI);
exports.UserCodeCCAPI = UserCodeCCAPI;
let UserCodeCC = class UserCodeCC extends CommandClass_1.CommandClass {
    async interview(applHost) {
        const node = this.getNode(applHost);
        const endpoint = this.getEndpoint(applHost);
        const api = API_1.CCAPI.create(safe_1.CommandClasses["User Code"], applHost, endpoint).withOptions({
            priority: safe_1.MessagePriority.NodeQuery,
        });
        applHost.controllerLog.logNode(node.id, {
            endpoint: this.endpointIndex,
            message: `Interviewing ${this.ccName}...`,
            direction: "none",
        });
        // Query capabilities first to determine what needs to be done when refreshing
        if (this.version >= 2) {
            applHost.controllerLog.logNode(node.id, {
                message: "querying capabilities...",
                direction: "outbound",
            });
            const caps = await api.getCapabilities();
            if (!caps) {
                applHost.controllerLog.logNode(node.id, {
                    endpoint: this.endpointIndex,
                    message: "User Code capabilities query timed out, skipping interview...",
                    level: "warn",
                });
                return;
            }
        }
        applHost.controllerLog.logNode(node.id, {
            message: "querying number of user codes...",
            direction: "outbound",
        });
        const supportedUsers = await api.getUsersCount();
        if (supportedUsers == undefined) {
            applHost.controllerLog.logNode(node.id, {
                endpoint: this.endpointIndex,
                message: "Querying number of user codes timed out, skipping interview...",
                level: "warn",
            });
            return;
        }
        for (let userId = 1; userId <= supportedUsers; userId++) {
            setUserCodeMetadata.call(this, applHost, userId);
        }
        // Synchronize user codes and settings
        if (applHost.options.interview?.queryAllUserCodes) {
            await this.refreshValues(applHost);
        }
        // Remember that the interview is complete
        this.setInterviewComplete(applHost, true);
    }
    async refreshValues(applHost) {
        const node = this.getNode(applHost);
        const endpoint = this.getEndpoint(applHost);
        const api = API_1.CCAPI.create(safe_1.CommandClasses["User Code"], applHost, endpoint).withOptions({
            priority: safe_1.MessagePriority.NodeQuery,
        });
        const supportsMasterCode = this.getValue(applHost, exports.UserCodeCCValues.supportsMasterCode) ??
            false;
        const supportsUserCodeChecksum = this.getValue(applHost, exports.UserCodeCCValues.supportsUserCodeChecksum) ?? false;
        const supportedKeypadModes = this.getValue(applHost, exports.UserCodeCCValues.supportedKeypadModes) ??
            [];
        const supportedUsers = this.getValue(applHost, exports.UserCodeCCValues.supportedUsers) ?? 0;
        const supportsMultipleUserCodeReport = !!this.getValue(applHost, exports.UserCodeCCValues.supportsMultipleUserCodeReport);
        // Check for changed values and codes
        if (this.version >= 2) {
            if (supportsMasterCode) {
                applHost.controllerLog.logNode(node.id, {
                    message: "querying master code...",
                    direction: "outbound",
                });
                await api.getMasterCode();
            }
            if (supportedKeypadModes.length > 1) {
                applHost.controllerLog.logNode(node.id, {
                    message: "querying active keypad mode...",
                    direction: "outbound",
                });
                await api.getKeypadMode();
            }
            const storedUserCodeChecksum = this.getValue(applHost, exports.UserCodeCCValues.userCodeChecksum) ?? 0;
            let currentUserCodeChecksum = 0;
            if (supportsUserCodeChecksum) {
                applHost.controllerLog.logNode(node.id, {
                    message: "retrieving current user code checksum...",
                    direction: "outbound",
                });
                currentUserCodeChecksum = await api.getUserCodeChecksum();
            }
            if (!supportsUserCodeChecksum ||
                currentUserCodeChecksum !== storedUserCodeChecksum) {
                applHost.controllerLog.logNode(node.id, {
                    message: "checksum changed or is not supported, querying all user codes...",
                    direction: "outbound",
                });
                if (supportsMultipleUserCodeReport) {
                    // Query the user codes in bulk
                    let nextUserId = 1;
                    while (nextUserId > 0 && nextUserId <= supportedUsers) {
                        const response = await api.get(nextUserId, true);
                        if (response) {
                            nextUserId = response.nextUserId;
                        }
                        else {
                            applHost.controllerLog.logNode(node.id, {
                                endpoint: this.endpointIndex,
                                message: `Querying user code #${nextUserId} timed out, skipping the remaining interview...`,
                                level: "warn",
                            });
                            break;
                        }
                    }
                }
                else {
                    // Query one user code at a time
                    for (let userId = 1; userId <= supportedUsers; userId++) {
                        await api.get(userId);
                    }
                }
            }
        }
        else {
            // V1
            applHost.controllerLog.logNode(node.id, {
                message: "querying all user codes...",
                direction: "outbound",
            });
            for (let userId = 1; userId <= supportedUsers; userId++) {
                await api.get(userId);
            }
        }
    }
    /**
     * Returns the number of supported users.
     * This only works AFTER the interview process
     */
    static getSupportedUsersCached(applHost, endpoint) {
        return applHost
            .getValueDB(endpoint.nodeId)
            .getValue(exports.UserCodeCCValues.supportedUsers.endpoint(endpoint.index));
    }
    /**
     * Returns the supported keypad modes.
     * This only works AFTER the interview process
     */
    static getSupportedKeypadModesCached(applHost, endpoint) {
        return applHost
            .getValueDB(endpoint.nodeId)
            .getValue(exports.UserCodeCCValues.supportedKeypadModes.endpoint(endpoint.index));
    }
    /**
     * Returns the supported user ID statuses.
     * This only works AFTER the interview process
     */
    static getSupportedUserIDStatusesCached(applHost, endpoint) {
        return applHost
            .getValueDB(endpoint.nodeId)
            .getValue(exports.UserCodeCCValues.supportedUserIDStatuses.endpoint(endpoint.index));
    }
    /**
     * Returns the supported ASCII characters.
     * This only works AFTER the interview process
     */
    static getSupportedASCIICharsCached(applHost, endpoint) {
        return applHost
            .getValueDB(endpoint.nodeId)
            .getValue(exports.UserCodeCCValues.supportedASCIIChars.endpoint(endpoint.index));
    }
    /**
     * Returns whether deactivating the master code is supported.
     * This only works AFTER the interview process
     */
    static supportsMasterCodeDeactivationCached(applHost, endpoint) {
        return !!applHost
            .getValueDB(endpoint.nodeId)
            .getValue(exports.UserCodeCCValues.supportsMasterCodeDeactivation.endpoint(endpoint.index));
    }
    /**
     * Returns whether setting multiple user codes at once is supported.
     * This only works AFTER the interview process
     */
    static supportsMultipleUserCodeSetCached(applHost, endpoint) {
        return !!applHost
            .getValueDB(endpoint.nodeId)
            .getValue(exports.UserCodeCCValues.supportsMultipleUserCodeSet.endpoint(endpoint.index));
    }
};
UserCodeCC = __decorate([
    (0, CommandClassDecorators_1.commandClass)(safe_1.CommandClasses["User Code"]),
    (0, CommandClassDecorators_1.implementedVersion)(2),
    (0, CommandClassDecorators_1.ccValues)(exports.UserCodeCCValues)
], UserCodeCC);
exports.UserCodeCC = UserCodeCC;
let UserCodeCCSet = class UserCodeCCSet extends UserCodeCC {
    constructor(host, options) {
        super(host, options);
        if ((0, CommandClass_1.gotDeserializationOptions)(options)) {
            // TODO: Deserialize payload
            throw new safe_1.ZWaveError(`${this.constructor.name}: deserialization not implemented`, safe_1.ZWaveErrorCodes.Deserialization_NotImplemented);
        }
        else {
            this.userId = options.userId;
            this.userIdStatus = options.userIdStatus;
            // Validate options
            if (this.userId < 0) {
                throw new safe_1.ZWaveError(`${this.constructor.name}: The user ID must be between greater than 0.`, safe_1.ZWaveErrorCodes.Argument_Invalid);
            }
            else if (this.userId === 0 &&
                this.userIdStatus !== _Types_1.UserIDStatus.Available) {
                throw new safe_1.ZWaveError(`${this.constructor.name}: User ID 0 may only be used to clear all user codes`, safe_1.ZWaveErrorCodes.Argument_Invalid);
            }
            else if (this.userIdStatus === _Types_1.UserIDStatus.Available) {
                this.userCode = "\0".repeat(4);
            }
            else {
                this.userCode = options.userCode;
                // Specs say ASCII 0-9, manufacturers don't care :)
                if (this.userCode.length < 4 || this.userCode.length > 10) {
                    throw new safe_1.ZWaveError(`${this.constructor.name}: The user code must have a length of 4 to 10 ${typeof this.userCode === "string"
                        ? "characters"
                        : "bytes"}`, safe_1.ZWaveErrorCodes.Argument_Invalid);
                }
            }
        }
    }
    serialize() {
        this.payload = Buffer.concat([
            Buffer.from([this.userId, this.userIdStatus]),
            typeof this.userCode === "string"
                ? Buffer.from(this.userCode, "ascii")
                : this.userCode,
        ]);
        return super.serialize();
    }
    toLogEntry(applHost) {
        return {
            ...super.toLogEntry(applHost),
            message: {
                "user id": this.userId,
                "id status": (0, safe_2.getEnumMemberName)(_Types_1.UserIDStatus, this.userIdStatus),
                "user code": userCodeToLogString(this.userCode),
            },
        };
    }
};
UserCodeCCSet = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.UserCodeCommand.Set),
    (0, CommandClassDecorators_1.useSupervision)()
], UserCodeCCSet);
exports.UserCodeCCSet = UserCodeCCSet;
let UserCodeCCReport = class UserCodeCCReport extends UserCodeCC {
    constructor(host, options) {
        super(host, options);
        (0, safe_1.validatePayload)(this.payload.length >= 2);
        this.userId = this.payload[0];
        this.userIdStatus = this.payload[1];
        if (this.payload.length === 2 &&
            (this.userIdStatus === _Types_1.UserIDStatus.Available ||
                this.userIdStatus === _Types_1.UserIDStatus.StatusNotAvailable)) {
            // The user code is not set or not available and this report contains no user code
            this.userCode = "";
        }
        else {
            // The specs require the user code to be at least 4 digits
            (0, safe_1.validatePayload)(this.payload.length >= 6);
            let userCodeBuffer = this.payload.slice(2);
            // Specs say infer user code from payload length, manufacturers send zero-padded strings
            while (userCodeBuffer[userCodeBuffer.length - 1] === 0) {
                userCodeBuffer = userCodeBuffer.slice(0, -1);
            }
            // Specs say ASCII 0-9, manufacturers don't care :)
            // Thus we check if the code is printable using ASCII, if not keep it as a Buffer
            const userCodeString = userCodeBuffer.toString("utf8");
            if ((0, safe_2.isPrintableASCII)(userCodeString)) {
                this.userCode = userCodeString;
            }
            else if (this.version === 1 &&
                (0, safe_2.isPrintableASCIIWithNewlines)(userCodeString)) {
                // Ignore leading and trailing newlines in V1 reports if the rest is ASCII
                this.userCode = userCodeString
                    .replace(/^[\r\n]*/, "")
                    .replace(/[\r\n]*$/, "");
            }
            else {
                this.userCode = userCodeBuffer;
            }
        }
    }
    persistValues(applHost) {
        if (!super.persistValues(applHost))
            return false;
        persistUserCode.call(this, applHost, this.userId, this.userIdStatus, this.userCode);
        return true;
    }
    toLogEntry(applHost) {
        return {
            ...super.toLogEntry(applHost),
            message: {
                "user id": this.userId,
                "id status": (0, safe_2.getEnumMemberName)(_Types_1.UserIDStatus, this.userIdStatus),
                "user code": userCodeToLogString(this.userCode),
            },
        };
    }
    // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
    toNotificationEventParameters() {
        return { userId: this.userId };
    }
};
UserCodeCCReport = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.UserCodeCommand.Report)
], UserCodeCCReport);
exports.UserCodeCCReport = UserCodeCCReport;
let UserCodeCCGet = class UserCodeCCGet extends UserCodeCC {
    constructor(host, options) {
        super(host, options);
        if ((0, CommandClass_1.gotDeserializationOptions)(options)) {
            // TODO: Deserialize payload
            throw new safe_1.ZWaveError(`${this.constructor.name}: deserialization not implemented`, safe_1.ZWaveErrorCodes.Deserialization_NotImplemented);
        }
        else {
            this.userId = options.userId;
        }
    }
    serialize() {
        this.payload = Buffer.from([this.userId]);
        return super.serialize();
    }
    toLogEntry(applHost) {
        return {
            ...super.toLogEntry(applHost),
            message: { "user id": this.userId },
        };
    }
};
UserCodeCCGet = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.UserCodeCommand.Get),
    (0, CommandClassDecorators_1.expectedCCResponse)(UserCodeCCReport)
], UserCodeCCGet);
exports.UserCodeCCGet = UserCodeCCGet;
let UserCodeCCUsersNumberReport = class UserCodeCCUsersNumberReport extends UserCodeCC {
    constructor(host, options) {
        super(host, options);
        (0, safe_1.validatePayload)(this.payload.length >= 1);
        if (this.payload.length >= 3) {
            // V2+
            this.supportedUsers = this.payload.readUInt16BE(1);
        }
        else {
            // V1
            this.supportedUsers = this.payload[0];
        }
    }
    toLogEntry(applHost) {
        return {
            ...super.toLogEntry(applHost),
            message: { "supported users": this.supportedUsers },
        };
    }
};
__decorate([
    (0, CommandClassDecorators_1.ccValue)(exports.UserCodeCCValues.supportedUsers)
], UserCodeCCUsersNumberReport.prototype, "supportedUsers", void 0);
UserCodeCCUsersNumberReport = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.UserCodeCommand.UsersNumberReport)
], UserCodeCCUsersNumberReport);
exports.UserCodeCCUsersNumberReport = UserCodeCCUsersNumberReport;
let UserCodeCCUsersNumberGet = class UserCodeCCUsersNumberGet extends UserCodeCC {
};
UserCodeCCUsersNumberGet = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.UserCodeCommand.UsersNumberGet),
    (0, CommandClassDecorators_1.expectedCCResponse)(UserCodeCCUsersNumberReport)
], UserCodeCCUsersNumberGet);
exports.UserCodeCCUsersNumberGet = UserCodeCCUsersNumberGet;
let UserCodeCCCapabilitiesReport = class UserCodeCCCapabilitiesReport extends UserCodeCC {
    constructor(host, options) {
        super(host, options);
        let offset = 0;
        (0, safe_1.validatePayload)(this.payload.length >= offset + 1);
        this.supportsMasterCode = !!(this.payload[offset] & 128);
        this.supportsMasterCodeDeactivation = !!(this.payload[offset] & 64);
        const statusBitMaskLength = this.payload[offset] & 31;
        offset += 1;
        (0, safe_1.validatePayload)(this.payload.length >= offset + statusBitMaskLength + 1);
        this.supportedUserIDStatuses = (0, safe_1.parseBitMask)(this.payload.slice(offset, offset + statusBitMaskLength), _Types_1.UserIDStatus.Available);
        offset += statusBitMaskLength;
        this.supportsUserCodeChecksum = !!(this.payload[offset] & 128);
        this.supportsMultipleUserCodeReport = !!(this.payload[offset] & 64);
        this.supportsMultipleUserCodeSet = !!(this.payload[offset] & 32);
        const keypadModesBitMaskLength = this.payload[offset] & 31;
        offset += 1;
        (0, safe_1.validatePayload)(this.payload.length >= offset + keypadModesBitMaskLength + 1);
        this.supportedKeypadModes = (0, safe_1.parseBitMask)(this.payload.slice(offset, offset + keypadModesBitMaskLength), _Types_1.KeypadMode.Normal);
        offset += keypadModesBitMaskLength;
        const keysBitMaskLength = this.payload[offset] & 31;
        offset += 1;
        (0, safe_1.validatePayload)(this.payload.length >= offset + keysBitMaskLength);
        this.supportedASCIIChars = Buffer.from((0, safe_1.parseBitMask)(this.payload.slice(offset, offset + keysBitMaskLength), 0)).toString("ascii");
    }
    toLogEntry(applHost) {
        return {
            ...super.toLogEntry(applHost),
            message: {
                "supports master code": this.supportsMasterCode,
                "supports master code deactivation": this.supportsMasterCodeDeactivation,
                "supports user code checksum": this.supportsUserCodeChecksum,
                "supports multiple codes in report": this.supportsMultipleUserCodeReport,
                "supports multiple codes in set": this.supportsMultipleUserCodeSet,
                "supported user id statuses": this.supportedUserIDStatuses
                    .map((status) => `\n· ${(0, safe_2.getEnumMemberName)(_Types_1.UserIDStatus, status)}`)
                    .join(""),
                "supported keypad modes": this.supportedKeypadModes
                    .map((mode) => `\n· ${(0, safe_2.getEnumMemberName)(_Types_1.KeypadMode, mode)}`)
                    .join(""),
                "supported ASCII chars": this.supportedASCIIChars,
            },
        };
    }
};
__decorate([
    (0, CommandClassDecorators_1.ccValue)(exports.UserCodeCCValues.supportsMasterCode)
], UserCodeCCCapabilitiesReport.prototype, "supportsMasterCode", void 0);
__decorate([
    (0, CommandClassDecorators_1.ccValue)(exports.UserCodeCCValues.supportsMasterCodeDeactivation)
], UserCodeCCCapabilitiesReport.prototype, "supportsMasterCodeDeactivation", void 0);
__decorate([
    (0, CommandClassDecorators_1.ccValue)(exports.UserCodeCCValues.supportsUserCodeChecksum)
], UserCodeCCCapabilitiesReport.prototype, "supportsUserCodeChecksum", void 0);
__decorate([
    (0, CommandClassDecorators_1.ccValue)(exports.UserCodeCCValues.supportsMultipleUserCodeReport)
], UserCodeCCCapabilitiesReport.prototype, "supportsMultipleUserCodeReport", void 0);
__decorate([
    (0, CommandClassDecorators_1.ccValue)(exports.UserCodeCCValues.supportsMultipleUserCodeSet)
], UserCodeCCCapabilitiesReport.prototype, "supportsMultipleUserCodeSet", void 0);
__decorate([
    (0, CommandClassDecorators_1.ccValue)(exports.UserCodeCCValues.supportedUserIDStatuses)
], UserCodeCCCapabilitiesReport.prototype, "supportedUserIDStatuses", void 0);
__decorate([
    (0, CommandClassDecorators_1.ccValue)(exports.UserCodeCCValues.supportedKeypadModes)
], UserCodeCCCapabilitiesReport.prototype, "supportedKeypadModes", void 0);
__decorate([
    (0, CommandClassDecorators_1.ccValue)(exports.UserCodeCCValues.supportedASCIIChars)
], UserCodeCCCapabilitiesReport.prototype, "supportedASCIIChars", void 0);
UserCodeCCCapabilitiesReport = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.UserCodeCommand.CapabilitiesReport)
], UserCodeCCCapabilitiesReport);
exports.UserCodeCCCapabilitiesReport = UserCodeCCCapabilitiesReport;
let UserCodeCCCapabilitiesGet = class UserCodeCCCapabilitiesGet extends UserCodeCC {
};
UserCodeCCCapabilitiesGet = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.UserCodeCommand.CapabilitiesGet),
    (0, CommandClassDecorators_1.expectedCCResponse)(UserCodeCCCapabilitiesReport)
], UserCodeCCCapabilitiesGet);
exports.UserCodeCCCapabilitiesGet = UserCodeCCCapabilitiesGet;
let UserCodeCCKeypadModeSet = class UserCodeCCKeypadModeSet extends UserCodeCC {
    constructor(host, options) {
        super(host, options);
        if ((0, CommandClass_1.gotDeserializationOptions)(options)) {
            // TODO: Deserialize payload
            throw new safe_1.ZWaveError(`${this.constructor.name}: deserialization not implemented`, safe_1.ZWaveErrorCodes.Deserialization_NotImplemented);
        }
        else {
            this.keypadMode = options.keypadMode;
        }
    }
    serialize() {
        this.payload = Buffer.from([this.keypadMode]);
        return super.serialize();
    }
    toLogEntry(applHost) {
        return {
            ...super.toLogEntry(applHost),
            message: { mode: (0, safe_2.getEnumMemberName)(_Types_1.KeypadMode, this.keypadMode) },
        };
    }
};
UserCodeCCKeypadModeSet = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.UserCodeCommand.KeypadModeSet),
    (0, CommandClassDecorators_1.useSupervision)()
], UserCodeCCKeypadModeSet);
exports.UserCodeCCKeypadModeSet = UserCodeCCKeypadModeSet;
let UserCodeCCKeypadModeReport = class UserCodeCCKeypadModeReport extends UserCodeCC {
    constructor(host, options) {
        super(host, options);
        (0, safe_1.validatePayload)(this.payload.length >= 1);
        this.keypadMode = this.payload[0];
    }
    persistValues(applHost) {
        if (!super.persistValues(applHost))
            return false;
        // Update the keypad modes metadata
        const supportedKeypadModes = this.getValue(applHost, exports.UserCodeCCValues.supportedKeypadModes) ?? [this.keypadMode];
        const keypadModeValue = exports.UserCodeCCValues.keypadMode;
        this.setMetadata(applHost, keypadModeValue, {
            ...keypadModeValue.meta,
            states: (0, safe_1.enumValuesToMetadataStates)(_Types_1.KeypadMode, supportedKeypadModes),
        });
        return true;
    }
    toLogEntry(applHost) {
        return {
            ...super.toLogEntry(applHost),
            message: {
                keypadMode: (0, safe_2.getEnumMemberName)(_Types_1.KeypadMode, this.keypadMode),
            },
        };
    }
};
__decorate([
    (0, CommandClassDecorators_1.ccValue)(exports.UserCodeCCValues.keypadMode)
], UserCodeCCKeypadModeReport.prototype, "keypadMode", void 0);
UserCodeCCKeypadModeReport = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.UserCodeCommand.KeypadModeReport)
], UserCodeCCKeypadModeReport);
exports.UserCodeCCKeypadModeReport = UserCodeCCKeypadModeReport;
let UserCodeCCKeypadModeGet = class UserCodeCCKeypadModeGet extends UserCodeCC {
};
UserCodeCCKeypadModeGet = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.UserCodeCommand.KeypadModeGet),
    (0, CommandClassDecorators_1.expectedCCResponse)(UserCodeCCKeypadModeReport)
], UserCodeCCKeypadModeGet);
exports.UserCodeCCKeypadModeGet = UserCodeCCKeypadModeGet;
let UserCodeCCMasterCodeSet = class UserCodeCCMasterCodeSet extends UserCodeCC {
    constructor(host, options) {
        super(host, options);
        if ((0, CommandClass_1.gotDeserializationOptions)(options)) {
            // TODO: Deserialize payload
            throw new safe_1.ZWaveError(`${this.constructor.name}: deserialization not implemented`, safe_1.ZWaveErrorCodes.Deserialization_NotImplemented);
        }
        else {
            this.masterCode = options.masterCode;
        }
    }
    serialize() {
        this.payload = Buffer.concat([
            Buffer.from([this.masterCode.length & 0b11111]),
            Buffer.from(this.masterCode, "ascii"),
        ]);
        return super.serialize();
    }
    toLogEntry(applHost) {
        return {
            ...super.toLogEntry(applHost),
            message: { "master code": userCodeToLogString(this.masterCode) },
        };
    }
};
UserCodeCCMasterCodeSet = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.UserCodeCommand.MasterCodeSet),
    (0, CommandClassDecorators_1.useSupervision)()
], UserCodeCCMasterCodeSet);
exports.UserCodeCCMasterCodeSet = UserCodeCCMasterCodeSet;
let UserCodeCCMasterCodeReport = class UserCodeCCMasterCodeReport extends UserCodeCC {
    constructor(host, options) {
        super(host, options);
        (0, safe_1.validatePayload)(this.payload.length >= 1);
        const codeLength = this.payload[0] & 0b1111;
        (0, safe_1.validatePayload)(this.payload.length >= 1 + codeLength);
        this.masterCode = this.payload
            .slice(1, 1 + codeLength)
            .toString("ascii");
    }
    toLogEntry(applHost) {
        return {
            ...super.toLogEntry(applHost),
            message: { "master code": userCodeToLogString(this.masterCode) },
        };
    }
};
__decorate([
    (0, CommandClassDecorators_1.ccValue)(exports.UserCodeCCValues.masterCode)
], UserCodeCCMasterCodeReport.prototype, "masterCode", void 0);
UserCodeCCMasterCodeReport = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.UserCodeCommand.MasterCodeReport)
], UserCodeCCMasterCodeReport);
exports.UserCodeCCMasterCodeReport = UserCodeCCMasterCodeReport;
let UserCodeCCMasterCodeGet = class UserCodeCCMasterCodeGet extends UserCodeCC {
};
UserCodeCCMasterCodeGet = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.UserCodeCommand.MasterCodeGet),
    (0, CommandClassDecorators_1.expectedCCResponse)(UserCodeCCMasterCodeReport)
], UserCodeCCMasterCodeGet);
exports.UserCodeCCMasterCodeGet = UserCodeCCMasterCodeGet;
let UserCodeCCUserCodeChecksumReport = class UserCodeCCUserCodeChecksumReport extends UserCodeCC {
    constructor(host, options) {
        super(host, options);
        (0, safe_1.validatePayload)(this.payload.length >= 2);
        this.userCodeChecksum = this.payload.readUInt16BE(0);
    }
    toLogEntry(applHost) {
        return {
            ...super.toLogEntry(applHost),
            message: { "user code checksum": (0, safe_2.num2hex)(this.userCodeChecksum) },
        };
    }
};
__decorate([
    (0, CommandClassDecorators_1.ccValue)(exports.UserCodeCCValues.userCodeChecksum)
], UserCodeCCUserCodeChecksumReport.prototype, "userCodeChecksum", void 0);
UserCodeCCUserCodeChecksumReport = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.UserCodeCommand.UserCodeChecksumReport)
], UserCodeCCUserCodeChecksumReport);
exports.UserCodeCCUserCodeChecksumReport = UserCodeCCUserCodeChecksumReport;
let UserCodeCCUserCodeChecksumGet = class UserCodeCCUserCodeChecksumGet extends UserCodeCC {
};
UserCodeCCUserCodeChecksumGet = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.UserCodeCommand.UserCodeChecksumGet),
    (0, CommandClassDecorators_1.expectedCCResponse)(UserCodeCCUserCodeChecksumReport)
], UserCodeCCUserCodeChecksumGet);
exports.UserCodeCCUserCodeChecksumGet = UserCodeCCUserCodeChecksumGet;
let UserCodeCCExtendedUserCodeSet = class UserCodeCCExtendedUserCodeSet extends UserCodeCC {
    constructor(host, options) {
        super(host, options);
        if ((0, CommandClass_1.gotDeserializationOptions)(options)) {
            // TODO: Deserialize payload
            throw new safe_1.ZWaveError(`${this.constructor.name}: deserialization not implemented`, safe_1.ZWaveErrorCodes.Deserialization_NotImplemented);
        }
        else {
            this.userCodes = options.userCodes;
        }
    }
    serialize() {
        const userCodeBuffers = this.userCodes.map((code) => {
            const ret = Buffer.concat([
                Buffer.from([
                    0,
                    0,
                    code.userIdStatus,
                    code.userCode?.length ?? 0,
                ]),
                Buffer.isBuffer(code.userCode)
                    ? code.userCode
                    : Buffer.from(code.userCode ?? "", "ascii"),
            ]);
            ret.writeUInt16BE(code.userId, 0);
            return ret;
        });
        this.payload = Buffer.concat([
            Buffer.from([this.userCodes.length]),
            ...userCodeBuffers,
        ]);
        return super.serialize();
    }
    toLogEntry(applHost) {
        const message = {};
        for (const { userId, userIdStatus, userCode } of this.userCodes) {
            message[`code #${userId}`] = `${userCodeToLogString(userCode ?? "")} (status: ${(0, safe_2.getEnumMemberName)(_Types_1.UserIDStatus, userIdStatus)})`;
        }
        return {
            ...super.toLogEntry(applHost),
            message,
        };
    }
};
UserCodeCCExtendedUserCodeSet = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.UserCodeCommand.ExtendedUserCodeSet),
    (0, CommandClassDecorators_1.useSupervision)()
], UserCodeCCExtendedUserCodeSet);
exports.UserCodeCCExtendedUserCodeSet = UserCodeCCExtendedUserCodeSet;
let UserCodeCCExtendedUserCodeReport = class UserCodeCCExtendedUserCodeReport extends UserCodeCC {
    constructor(host, options) {
        super(host, options);
        (0, safe_1.validatePayload)(this.payload.length >= 1);
        const numCodes = this.payload[0];
        let offset = 1;
        const userCodes = [];
        // parse each user code
        for (let i = 0; i < numCodes; i++) {
            const { code, bytesRead } = parseExtendedUserCode(this.payload.slice(offset));
            userCodes.push(code);
            offset += bytesRead;
        }
        this.userCodes = userCodes;
        (0, safe_1.validatePayload)(this.payload.length >= offset + 2);
        this.nextUserId = this.payload.readUInt16BE(offset);
    }
    persistValues(applHost) {
        if (!super.persistValues(applHost))
            return false;
        for (const { userId, userIdStatus, userCode } of this.userCodes) {
            persistUserCode.call(this, applHost, userId, userIdStatus, userCode);
        }
        return true;
    }
    toLogEntry(applHost) {
        const message = {};
        for (const { userId, userIdStatus, userCode } of this.userCodes) {
            message[`code #${userId}`] = `${userCodeToLogString(userCode)} (status: ${(0, safe_2.getEnumMemberName)(_Types_1.UserIDStatus, userIdStatus)})`;
        }
        message["next user id"] = this.nextUserId;
        return {
            ...super.toLogEntry(applHost),
            message,
        };
    }
};
UserCodeCCExtendedUserCodeReport = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.UserCodeCommand.ExtendedUserCodeReport)
], UserCodeCCExtendedUserCodeReport);
exports.UserCodeCCExtendedUserCodeReport = UserCodeCCExtendedUserCodeReport;
let UserCodeCCExtendedUserCodeGet = class UserCodeCCExtendedUserCodeGet extends UserCodeCC {
    constructor(host, options) {
        super(host, options);
        if ((0, CommandClass_1.gotDeserializationOptions)(options)) {
            // TODO: Deserialize payload
            throw new safe_1.ZWaveError(`${this.constructor.name}: deserialization not implemented`, safe_1.ZWaveErrorCodes.Deserialization_NotImplemented);
        }
        else {
            this.userId = options.userId;
            this.reportMore = !!options.reportMore;
        }
    }
    serialize() {
        this.payload = Buffer.from([0, 0, this.reportMore ? 1 : 0]);
        this.payload.writeUInt16BE(this.userId, 0);
        return super.serialize();
    }
    toLogEntry(applHost) {
        return {
            ...super.toLogEntry(applHost),
            message: {
                "user id": this.userId,
                "report more": this.reportMore,
            },
        };
    }
};
UserCodeCCExtendedUserCodeGet = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.UserCodeCommand.ExtendedUserCodeGet),
    (0, CommandClassDecorators_1.expectedCCResponse)(UserCodeCCExtendedUserCodeReport)
], UserCodeCCExtendedUserCodeGet);
exports.UserCodeCCExtendedUserCodeGet = UserCodeCCExtendedUserCodeGet;
//# sourceMappingURL=UserCodeCC.js.map