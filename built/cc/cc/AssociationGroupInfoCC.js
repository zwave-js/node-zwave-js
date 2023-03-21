"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var AssociationGroupInfoCC_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AssociationGroupInfoCCCommandListGet = exports.AssociationGroupInfoCCCommandListReport = exports.AssociationGroupInfoCCInfoGet = exports.AssociationGroupInfoCCInfoReport = exports.AssociationGroupInfoCCNameGet = exports.AssociationGroupInfoCCNameReport = exports.AssociationGroupInfoCC = exports.AssociationGroupInfoCCAPI = exports.AssociationGroupInfoCCValues = void 0;
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
const safe_1 = require("@zwave-js/core/safe");
const safe_2 = require("@zwave-js/shared/safe");
const API_1 = require("../lib/API");
const CommandClass_1 = require("../lib/CommandClass");
const CommandClassDecorators_1 = require("../lib/CommandClassDecorators");
const Values_1 = require("../lib/Values");
const _Types_1 = require("../lib/_Types");
const AssociationCC_1 = require("./AssociationCC");
const MultiChannelAssociationCC_1 = require("./MultiChannelAssociationCC");
exports.AssociationGroupInfoCCValues = Object.freeze({
    // Defines values that do not depend on anything else
    ...Values_1.V.defineStaticCCValues(safe_1.CommandClasses["Association Group Information"], {
        ...Values_1.V.staticProperty("hasDynamicInfo", undefined, { internal: true }),
    }),
    // Defines values that depend on one or more arguments and need to be called as a function
    ...Values_1.V.defineDynamicCCValues(safe_1.CommandClasses["Association Group Information"], {
        ...Values_1.V.dynamicPropertyAndKeyWithName("groupName", "name", (groupId) => groupId, ({ property, propertyKey }) => property === "name" && typeof propertyKey === "number", undefined, { internal: true }),
        ...Values_1.V.dynamicPropertyAndKeyWithName("groupInfo", "info", (groupId) => groupId, ({ property, propertyKey }) => property === "info" && typeof propertyKey === "number", undefined, { internal: true }),
        ...Values_1.V.dynamicPropertyAndKeyWithName("commands", "issuedCommands", (groupId) => groupId, ({ property, propertyKey }) => property === "issuedCommands" &&
            typeof propertyKey === "number", undefined, { internal: true }),
    }),
});
// @noSetValueAPI This CC only has get-type commands
let AssociationGroupInfoCCAPI = class AssociationGroupInfoCCAPI extends API_1.PhysicalCCAPI {
    supportsCommand(cmd) {
        switch (cmd) {
            case _Types_1.AssociationGroupInfoCommand.NameGet:
            case _Types_1.AssociationGroupInfoCommand.InfoGet:
            case _Types_1.AssociationGroupInfoCommand.CommandListGet:
                return true; // This is mandatory
        }
        return super.supportsCommand(cmd);
    }
    async getGroupName(groupId) {
        __assertType("groupId", "number", __assertType__number.bind(void 0, groupId));
        this.assertSupportsCommand(_Types_1.AssociationGroupInfoCommand, _Types_1.AssociationGroupInfoCommand.NameGet);
        const cc = new AssociationGroupInfoCCNameGet(this.applHost, {
            nodeId: this.endpoint.nodeId,
            endpoint: this.endpoint.index,
            groupId,
        });
        const response = await this.applHost.sendCommand(cc, this.commandOptions);
        if (response)
            return response.name;
    }
    async getGroupInfo(groupId, refreshCache = false) {
        __assertType("groupId", "number", __assertType__number.bind(void 0, groupId));
        __assertType("refreshCache", "(optional) boolean", __assertType__optional_boolean.bind(void 0, refreshCache));
        this.assertSupportsCommand(_Types_1.AssociationGroupInfoCommand, _Types_1.AssociationGroupInfoCommand.InfoGet);
        const cc = new AssociationGroupInfoCCInfoGet(this.applHost, {
            nodeId: this.endpoint.nodeId,
            endpoint: this.endpoint.index,
            groupId,
            refreshCache,
        });
        const response = await this.applHost.sendCommand(cc, this.commandOptions);
        // SDS13782 says: If List Mode is set to 0, the Group Count field MUST be set to 1.
        // But that's not always the case. Apparently some endpoints return 0 groups
        // although they support AGI CC
        if (response && response.groups.length > 0) {
            const { groupId: _, ...info } = response.groups[0];
            return {
                hasDynamicInfo: response.hasDynamicInfo,
                ...info,
            };
        }
    }
    async getCommands(groupId, allowCache = true) {
        __assertType("groupId", "number", __assertType__number.bind(void 0, groupId));
        __assertType("allowCache", "(optional) boolean", __assertType__optional_boolean.bind(void 0, allowCache));
        this.assertSupportsCommand(_Types_1.AssociationGroupInfoCommand, _Types_1.AssociationGroupInfoCommand.CommandListGet);
        const cc = new AssociationGroupInfoCCCommandListGet(this.applHost, {
            nodeId: this.endpoint.nodeId,
            endpoint: this.endpoint.index,
            groupId,
            allowCache,
        });
        const response = await this.applHost.sendCommand(cc, this.commandOptions);
        if (response)
            return response.commands;
    }
};
AssociationGroupInfoCCAPI = __decorate([
    (0, CommandClassDecorators_1.API)(safe_1.CommandClasses["Association Group Information"])
], AssociationGroupInfoCCAPI);
exports.AssociationGroupInfoCCAPI = AssociationGroupInfoCCAPI;
let AssociationGroupInfoCC = AssociationGroupInfoCC_1 = class AssociationGroupInfoCC extends CommandClass_1.CommandClass {
    determineRequiredCCInterviews() {
        // AssociationCC must be interviewed after Z-Wave+ if that is supported
        return [
            ...super.determineRequiredCCInterviews(),
            safe_1.CommandClasses.Association,
            safe_1.CommandClasses["Multi Channel Association"],
        ];
    }
    /** Returns the name of an association group */
    static getGroupNameCached(applHost, endpoint, groupId) {
        return applHost
            .getValueDB(endpoint.nodeId)
            .getValue(exports.AssociationGroupInfoCCValues.groupName(groupId).endpoint(endpoint.index));
    }
    /** Returns the association profile for an association group */
    static getGroupProfileCached(applHost, endpoint, groupId) {
        return applHost.getValueDB(endpoint.nodeId).getValue(exports.AssociationGroupInfoCCValues.groupInfo(groupId).endpoint(endpoint.index))
            ?.profile;
    }
    /** Returns the dictionary of all commands issued by the given association group */
    static getIssuedCommandsCached(applHost, endpoint, groupId) {
        return applHost
            .getValueDB(endpoint.nodeId)
            .getValue(exports.AssociationGroupInfoCCValues.commands(groupId).endpoint(endpoint.index));
    }
    static findGroupsForIssuedCommand(applHost, endpoint, ccId, command) {
        const ret = [];
        const associationGroupCount = this.getAssociationGroupCountCached(applHost, endpoint);
        for (let groupId = 1; groupId <= associationGroupCount; groupId++) {
            // Scan the issued commands of all groups if there's a match
            const issuedCommands = this.getIssuedCommandsCached(applHost, endpoint, groupId);
            if (!issuedCommands)
                continue;
            if (issuedCommands.has(ccId) &&
                issuedCommands.get(ccId).includes(command)) {
                ret.push(groupId);
                continue;
            }
        }
        return ret;
    }
    static getAssociationGroupCountCached(applHost, endpoint) {
        // The association group count is either determined by the
        // Association CC or the Multi Channel Association CC
        return (
        // First query the Multi Channel Association CC
        (endpoint.supportsCC(safe_1.CommandClasses["Multi Channel Association"]) &&
            MultiChannelAssociationCC_1.MultiChannelAssociationCC.getGroupCountCached(applHost, endpoint)) ||
            // Then the Association CC
            (endpoint.supportsCC(safe_1.CommandClasses.Association) &&
                AssociationCC_1.AssociationCC.getGroupCountCached(applHost, endpoint)) ||
            // And fall back to 0
            0);
    }
    async interview(applHost) {
        const node = this.getNode(applHost);
        const endpoint = this.getEndpoint(applHost);
        const api = API_1.CCAPI.create(safe_1.CommandClasses["Association Group Information"], applHost, endpoint).withOptions({ priority: safe_1.MessagePriority.NodeQuery });
        applHost.controllerLog.logNode(node.id, {
            endpoint: this.endpointIndex,
            message: `Interviewing ${this.ccName}...`,
            direction: "none",
        });
        const associationGroupCount = AssociationGroupInfoCC_1.getAssociationGroupCountCached(applHost, endpoint);
        for (let groupId = 1; groupId <= associationGroupCount; groupId++) {
            // First get the group's name
            applHost.controllerLog.logNode(node.id, {
                endpoint: this.endpointIndex,
                message: `Association group #${groupId}: Querying name...`,
                direction: "outbound",
            });
            const name = await api.getGroupName(groupId);
            if (name) {
                const logMessage = `Association group #${groupId} has name "${name}"`;
                applHost.controllerLog.logNode(node.id, {
                    endpoint: this.endpointIndex,
                    message: logMessage,
                    direction: "inbound",
                });
            }
            // Then the command list
            applHost.controllerLog.logNode(node.id, {
                endpoint: this.endpointIndex,
                message: `Association group #${groupId}: Querying command list...`,
                direction: "outbound",
            });
            await api.getCommands(groupId);
            // Not sure how to log this
        }
        // Finally query each group for its information
        await this.refreshValues(applHost);
        // Remember that the interview is complete
        this.setInterviewComplete(applHost, true);
    }
    async refreshValues(applHost) {
        const node = this.getNode(applHost);
        const endpoint = this.getEndpoint(applHost);
        const api = API_1.CCAPI.create(safe_1.CommandClasses["Association Group Information"], applHost, endpoint).withOptions({ priority: safe_1.MessagePriority.NodeQuery });
        // Query the information for each group (this is the only thing that could be dynamic)
        const associationGroupCount = AssociationGroupInfoCC_1.getAssociationGroupCountCached(applHost, endpoint);
        const hasDynamicInfo = this.getValue(applHost, exports.AssociationGroupInfoCCValues.hasDynamicInfo);
        for (let groupId = 1; groupId <= associationGroupCount; groupId++) {
            // Then its information
            applHost.controllerLog.logNode(node.id, {
                endpoint: this.endpointIndex,
                message: `Association group #${groupId}: Querying info...`,
                direction: "outbound",
            });
            const info = await api.getGroupInfo(groupId, !!hasDynamicInfo);
            if (info) {
                const logMessage = `Received info for association group #${groupId}:
info is dynamic: ${info.hasDynamicInfo}
profile:         ${(0, safe_2.getEnumMemberName)(_Types_1.AssociationGroupInfoProfile, info.profile)}`;
                applHost.controllerLog.logNode(node.id, {
                    endpoint: this.endpointIndex,
                    message: logMessage,
                    direction: "inbound",
                });
            }
        }
    }
};
AssociationGroupInfoCC = AssociationGroupInfoCC_1 = __decorate([
    (0, CommandClassDecorators_1.commandClass)(safe_1.CommandClasses["Association Group Information"]),
    (0, CommandClassDecorators_1.implementedVersion)(3),
    (0, CommandClassDecorators_1.ccValues)(exports.AssociationGroupInfoCCValues)
], AssociationGroupInfoCC);
exports.AssociationGroupInfoCC = AssociationGroupInfoCC;
let AssociationGroupInfoCCNameReport = class AssociationGroupInfoCCNameReport extends AssociationGroupInfoCC {
    constructor(host, options) {
        super(host, options);
        (0, safe_1.validatePayload)(this.payload.length >= 2);
        this.groupId = this.payload[0];
        const nameLength = this.payload[1];
        (0, safe_1.validatePayload)(this.payload.length >= 2 + nameLength);
        // The specs don't allow 0-terminated string, but some devices use them
        // So we need to cut them off
        this.name = (0, safe_2.cpp2js)(this.payload.slice(2, 2 + nameLength).toString("utf8"));
    }
    persistValues(applHost) {
        if (!super.persistValues(applHost))
            return false;
        const valueDB = this.getValueDB(applHost);
        valueDB.setValue(exports.AssociationGroupInfoCCValues.groupName(this.groupId).endpoint(this.endpointIndex), this.name);
        return true;
    }
    toLogEntry(applHost) {
        return {
            ...super.toLogEntry(applHost),
            message: {
                "group id": this.groupId,
                name: this.name,
            },
        };
    }
};
AssociationGroupInfoCCNameReport = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.AssociationGroupInfoCommand.NameReport)
], AssociationGroupInfoCCNameReport);
exports.AssociationGroupInfoCCNameReport = AssociationGroupInfoCCNameReport;
let AssociationGroupInfoCCNameGet = class AssociationGroupInfoCCNameGet extends AssociationGroupInfoCC {
    constructor(host, options) {
        super(host, options);
        if ((0, CommandClass_1.gotDeserializationOptions)(options)) {
            // TODO: Deserialize payload
            throw new safe_1.ZWaveError(`${this.constructor.name}: deserialization not implemented`, safe_1.ZWaveErrorCodes.Deserialization_NotImplemented);
        }
        else {
            this.groupId = options.groupId;
        }
    }
    serialize() {
        this.payload = Buffer.from([this.groupId]);
        return super.serialize();
    }
    toLogEntry(applHost) {
        return {
            ...super.toLogEntry(applHost),
            message: { "group id": this.groupId },
        };
    }
};
AssociationGroupInfoCCNameGet = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.AssociationGroupInfoCommand.NameGet),
    (0, CommandClassDecorators_1.expectedCCResponse)(AssociationGroupInfoCCNameReport)
], AssociationGroupInfoCCNameGet);
exports.AssociationGroupInfoCCNameGet = AssociationGroupInfoCCNameGet;
let AssociationGroupInfoCCInfoReport = class AssociationGroupInfoCCInfoReport extends AssociationGroupInfoCC {
    constructor(host, options) {
        super(host, options);
        (0, safe_1.validatePayload)(this.payload.length >= 1);
        this.isListMode = !!(this.payload[0] & 128);
        this.hasDynamicInfo = !!(this.payload[0] & 64);
        const groupCount = this.payload[0] & 63;
        // each group requires 7 bytes of payload
        (0, safe_1.validatePayload)(this.payload.length >= 1 + groupCount * 7);
        const _groups = [];
        for (let i = 0; i < groupCount; i++) {
            const offset = 1 + i * 7;
            // Parse the payload
            const groupBytes = this.payload.slice(offset, offset + 7);
            const groupId = groupBytes[0];
            const mode = 0; //groupBytes[1];
            const profile = groupBytes.readUInt16BE(2);
            const eventCode = 0; // groupBytes.readUInt16BE(5);
            _groups.push({ groupId, mode, profile, eventCode });
        }
        this.groups = _groups;
    }
    persistValues(applHost) {
        if (!super.persistValues(applHost))
            return false;
        for (const group of this.groups) {
            const { groupId, mode, profile, eventCode } = group;
            this.setValue(applHost, exports.AssociationGroupInfoCCValues.groupInfo(groupId), {
                mode,
                profile,
                eventCode,
            });
        }
        return true;
    }
    toLogEntry(applHost) {
        return {
            ...super.toLogEntry(applHost),
            message: {
                "is list mode": this.isListMode,
                "has dynamic info": this.hasDynamicInfo,
                groups: `${this.groups
                    .map((g) => `
· Group #${g.groupId}
  mode:       ${g.mode}
  profile:    ${g.profile}
  event code: ${g.eventCode}`)
                    .join("")}`,
            },
        };
    }
};
__decorate([
    (0, CommandClassDecorators_1.ccValue)(exports.AssociationGroupInfoCCValues.hasDynamicInfo)
], AssociationGroupInfoCCInfoReport.prototype, "hasDynamicInfo", void 0);
AssociationGroupInfoCCInfoReport = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.AssociationGroupInfoCommand.InfoReport)
], AssociationGroupInfoCCInfoReport);
exports.AssociationGroupInfoCCInfoReport = AssociationGroupInfoCCInfoReport;
let AssociationGroupInfoCCInfoGet = class AssociationGroupInfoCCInfoGet extends AssociationGroupInfoCC {
    constructor(host, options) {
        super(host, options);
        if ((0, CommandClass_1.gotDeserializationOptions)(options)) {
            // TODO: Deserialize payload
            throw new safe_1.ZWaveError(`${this.constructor.name}: deserialization not implemented`, safe_1.ZWaveErrorCodes.Deserialization_NotImplemented);
        }
        else {
            this.refreshCache = options.refreshCache;
            if ("listMode" in options)
                this.listMode = options.listMode;
            if ("groupId" in options)
                this.groupId = options.groupId;
        }
    }
    serialize() {
        const isListMode = this.listMode === true;
        const optionByte = (this.refreshCache ? 128 : 0) |
            (isListMode ? 64 : 0);
        this.payload = Buffer.from([
            optionByte,
            isListMode ? 0 : this.groupId,
        ]);
        return super.serialize();
    }
    toLogEntry(applHost) {
        const message = {};
        if (this.groupId != undefined) {
            message["group id"] = this.groupId;
        }
        if (this.listMode != undefined) {
            message["list mode"] = this.listMode;
        }
        message["refresh cache"] = this.refreshCache;
        return {
            ...super.toLogEntry(applHost),
            message,
        };
    }
};
AssociationGroupInfoCCInfoGet = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.AssociationGroupInfoCommand.InfoGet),
    (0, CommandClassDecorators_1.expectedCCResponse)(AssociationGroupInfoCCInfoReport)
], AssociationGroupInfoCCInfoGet);
exports.AssociationGroupInfoCCInfoGet = AssociationGroupInfoCCInfoGet;
let AssociationGroupInfoCCCommandListReport = class AssociationGroupInfoCCCommandListReport extends AssociationGroupInfoCC {
    constructor(host, options) {
        super(host, options);
        (0, safe_1.validatePayload)(this.payload.length >= 2);
        this.groupId = this.payload[0];
        const listLength = this.payload[1];
        (0, safe_1.validatePayload)(this.payload.length >= 2 + listLength);
        const listBytes = this.payload.slice(2, 2 + listLength);
        // Parse all CC ids and commands
        let offset = 0;
        const commands = new Map();
        while (offset < listLength) {
            const { ccId, bytesRead } = (0, safe_1.parseCCId)(listBytes, offset);
            const command = listBytes[offset + bytesRead];
            if (!commands.has(ccId))
                commands.set(ccId, []);
            commands.get(ccId).push(command);
            offset += bytesRead + 1;
        }
        this.commands = commands;
    }
    toLogEntry(applHost) {
        return {
            ...super.toLogEntry(applHost),
            message: {
                "group id": this.groupId,
                commands: `${[...this.commands]
                    .map(([cc, cmds]) => {
                    return `\n· ${(0, safe_1.getCCName)(cc)}: ${cmds
                        .map((cmd) => (0, safe_2.num2hex)(cmd))
                        .join(", ")}`;
                })
                    .join("")}`,
            },
        };
    }
};
__decorate([
    (0, CommandClassDecorators_1.ccValue)(exports.AssociationGroupInfoCCValues.commands, (self) => [self.groupId])
], AssociationGroupInfoCCCommandListReport.prototype, "commands", void 0);
AssociationGroupInfoCCCommandListReport = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.AssociationGroupInfoCommand.CommandListReport)
], AssociationGroupInfoCCCommandListReport);
exports.AssociationGroupInfoCCCommandListReport = AssociationGroupInfoCCCommandListReport;
let AssociationGroupInfoCCCommandListGet = class AssociationGroupInfoCCCommandListGet extends AssociationGroupInfoCC {
    constructor(host, options) {
        super(host, options);
        if ((0, CommandClass_1.gotDeserializationOptions)(options)) {
            // TODO: Deserialize payload
            throw new safe_1.ZWaveError(`${this.constructor.name}: deserialization not implemented`, safe_1.ZWaveErrorCodes.Deserialization_NotImplemented);
        }
        else {
            this.allowCache = options.allowCache;
            this.groupId = options.groupId;
        }
    }
    serialize() {
        this.payload = Buffer.from([
            this.allowCache ? 128 : 0,
            this.groupId,
        ]);
        return super.serialize();
    }
    toLogEntry(applHost) {
        return {
            ...super.toLogEntry(applHost),
            message: {
                "group id": this.groupId,
                "allow cache": this.allowCache,
            },
        };
    }
};
AssociationGroupInfoCCCommandListGet = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.AssociationGroupInfoCommand.CommandListGet),
    (0, CommandClassDecorators_1.expectedCCResponse)(AssociationGroupInfoCCCommandListReport)
], AssociationGroupInfoCCCommandListGet);
exports.AssociationGroupInfoCCCommandListGet = AssociationGroupInfoCCCommandListGet;
//# sourceMappingURL=AssociationGroupInfoCC.js.map