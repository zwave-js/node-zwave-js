"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var AssociationCC_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AssociationCCSupportedGroupingsGet = exports.AssociationCCSupportedGroupingsReport = exports.AssociationCCGet = exports.AssociationCCReport = exports.AssociationCCRemove = exports.AssociationCCSet = exports.AssociationCC = exports.AssociationCCAPI = exports.getLifelineGroupIds = exports.AssociationCCValues = void 0;
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
const __assertType__sa__number_ea_2 = $o => {
    function _number($o) {
        return typeof $o !== "number" ? {} : null;
    }
    function sa__number_ea_2($o) {
        if (!Array.isArray($o))
            return {};
        for (let i = 0; i < $o.length; i++) {
            const error = _number($o[i]);
            if (error)
                return error;
        }
        return null;
    }
    return sa__number_ea_2($o);
};
const __assertType__AssociationCCRemoveOptions = $o => {
    function _number($o) {
        return typeof $o !== "number" ? {} : null;
    }
    function sa__number_ea_3($o) {
        if (!Array.isArray($o))
            return {};
        for (let i = 0; i < $o.length; i++) {
            const error = _number($o[i]);
            if (error)
                return error;
        }
        return null;
    }
    function _0($o) {
        if (typeof $o !== "object" || $o === null || Array.isArray($o))
            return {};
        if ("groupId" in $o && $o["groupId"] !== undefined) {
            const error = _number($o["groupId"]);
            if (error)
                return error;
        }
        if ("nodeIds" in $o && $o["nodeIds"] !== undefined) {
            const error = sa__number_ea_3($o["nodeIds"]);
            if (error)
                return error;
        }
        return null;
    }
    return _0($o);
};
const safe_1 = require("@zwave-js/core/safe");
const arrays_1 = require("alcalzone-shared/arrays");
const API_1 = require("../lib/API");
const CommandClass_1 = require("../lib/CommandClass");
const CommandClassDecorators_1 = require("../lib/CommandClassDecorators");
const ccUtils = __importStar(require("../lib/utils"));
const Values_1 = require("../lib/Values");
const _Types_1 = require("../lib/_Types");
exports.AssociationCCValues = Object.freeze({
    ...Values_1.V.defineStaticCCValues(safe_1.CommandClasses.Association, {
        /** Whether the node has a lifeline association */
        ...Values_1.V.staticProperty("hasLifeline", undefined, { internal: true }),
        /** How many association groups the node has */
        ...Values_1.V.staticProperty("groupCount", undefined, { internal: true }),
    }),
    ...Values_1.V.defineDynamicCCValues(safe_1.CommandClasses.Association, {
        /** The maximum number of nodes in an association group */
        ...Values_1.V.dynamicPropertyAndKeyWithName("maxNodes", "maxNodes", (groupId) => groupId, ({ property, propertyKey }) => property === "maxNodes" && typeof propertyKey === "number", undefined, { internal: true }),
        /** The node IDs currently belonging to an association group */
        ...Values_1.V.dynamicPropertyAndKeyWithName("nodeIds", "nodeIds", (groupId) => groupId, ({ property, propertyKey }) => property === "nodeIds" && typeof propertyKey === "number", undefined, { internal: true }),
    }),
});
function getLifelineGroupIds(applHost, endpoint) {
    // For now only support this for the root endpoint - i.e. node
    if (endpoint.index > 0)
        return [];
    const node = endpoint;
    // Some nodes define multiple lifeline groups, so we need to assign us to
    // all of them
    const lifelineGroups = [];
    // If the target node supports Z-Wave+ info that means the lifeline MUST be group #1
    if (endpoint.supportsCC(safe_1.CommandClasses["Z-Wave Plus Info"])) {
        lifelineGroups.push(1);
    }
    // We have a device config file that tells us which (additional) association to assign
    let associations;
    const deviceConfig = applHost.getDeviceConfig?.(node.id);
    if (endpoint.index === 0) {
        // The root endpoint's associations may be configured separately or as part of "endpoints"
        associations =
            deviceConfig?.associations ??
                deviceConfig?.endpoints?.get(0)?.associations;
    }
    else {
        // The other endpoints can only have a configuration as part of "endpoints"
        associations = deviceConfig?.endpoints?.get(endpoint.index)?.associations;
    }
    if (associations?.size) {
        lifelineGroups.push(...[...associations.values()]
            .filter((a) => a.isLifeline)
            .map((a) => a.groupId));
    }
    return (0, arrays_1.distinct)(lifelineGroups).sort();
}
exports.getLifelineGroupIds = getLifelineGroupIds;
// @noSetValueAPI
let AssociationCCAPI = class AssociationCCAPI extends API_1.PhysicalCCAPI {
    supportsCommand(cmd) {
        switch (cmd) {
            case _Types_1.AssociationCommand.Get:
            case _Types_1.AssociationCommand.Set:
            case _Types_1.AssociationCommand.Remove:
            case _Types_1.AssociationCommand.SupportedGroupingsGet:
                return true; // This is mandatory
            // Not implemented:
            // case AssociationCommand.SpecificGroupGet:
            // return this.version >= 2;
        }
        return super.supportsCommand(cmd);
    }
    /**
     * Returns the number of association groups a node supports.
     * Association groups are consecutive, starting at 1.
     */
    async getGroupCount() {
        this.assertSupportsCommand(_Types_1.AssociationCommand, _Types_1.AssociationCommand.SupportedGroupingsGet);
        const cc = new AssociationCCSupportedGroupingsGet(this.applHost, {
            nodeId: this.endpoint.nodeId,
            endpoint: this.endpoint.index,
        });
        const response = await this.applHost.sendCommand(cc, this.commandOptions);
        if (response)
            return response.groupCount;
    }
    /**
     * Returns information about an association group.
     */
    async getGroup(groupId) {
        __assertType("groupId", "number", __assertType__number.bind(void 0, groupId));
        this.assertSupportsCommand(_Types_1.AssociationCommand, _Types_1.AssociationCommand.Get);
        const cc = new AssociationCCGet(this.applHost, {
            nodeId: this.endpoint.nodeId,
            endpoint: this.endpoint.index,
            groupId,
        });
        const response = await this.applHost.sendCommand(cc, this.commandOptions);
        if (response) {
            return {
                maxNodes: response.maxNodes,
                nodeIds: response.nodeIds,
            };
        }
    }
    /**
     * Adds new nodes to an association group
     */
    async addNodeIds(groupId, ...nodeIds) {
        __assertType("groupId", "number", __assertType__number.bind(void 0, groupId));
        __assertType("nodeIds", undefined, __assertType__sa__number_ea_2.bind(void 0, nodeIds));
        this.assertSupportsCommand(_Types_1.AssociationCommand, _Types_1.AssociationCommand.Set);
        const cc = new AssociationCCSet(this.applHost, {
            nodeId: this.endpoint.nodeId,
            endpoint: this.endpoint.index,
            groupId,
            nodeIds,
        });
        return this.applHost.sendCommand(cc, this.commandOptions);
    }
    /**
     * Removes nodes from an association group
     */
    async removeNodeIds(options) {
        __assertType("options", "AssociationCCRemoveOptions", __assertType__AssociationCCRemoveOptions.bind(void 0, options));
        this.assertSupportsCommand(_Types_1.AssociationCommand, _Types_1.AssociationCommand.Remove);
        const cc = new AssociationCCRemove(this.applHost, {
            nodeId: this.endpoint.nodeId,
            endpoint: this.endpoint.index,
            ...options,
        });
        return this.applHost.sendCommand(cc, this.commandOptions);
    }
    /**
     * Removes nodes from all association groups
     */
    async removeNodeIdsFromAllGroups(nodeIds) {
        __assertType("nodeIds", undefined, __assertType__sa__number_ea_2.bind(void 0, nodeIds));
        this.assertSupportsCommand(_Types_1.AssociationCommand, _Types_1.AssociationCommand.Remove);
        if (this.version >= 2) {
            // The node supports bulk removal
            return this.removeNodeIds({ nodeIds, groupId: 0 });
        }
        else {
            // We have to remove the node manually from all groups
            const groupCount = this.tryGetValueDB()?.getValue(exports.AssociationCCValues.groupCount.endpoint(this.endpoint.index)) ?? 0;
            for (let groupId = 1; groupId <= groupCount; groupId++) {
                // TODO: evaluate intermediate supervision results
                await this.removeNodeIds({ nodeIds, groupId });
            }
        }
    }
};
AssociationCCAPI = __decorate([
    (0, CommandClassDecorators_1.API)(safe_1.CommandClasses.Association)
], AssociationCCAPI);
exports.AssociationCCAPI = AssociationCCAPI;
let AssociationCC = AssociationCC_1 = class AssociationCC extends CommandClass_1.CommandClass {
    determineRequiredCCInterviews() {
        // AssociationCC must be interviewed after Z-Wave+ if that is supported
        return [
            ...super.determineRequiredCCInterviews(),
            safe_1.CommandClasses["Z-Wave Plus Info"],
            // We need information about endpoints to correctly configure the lifeline associations
            safe_1.CommandClasses["Multi Channel"],
        ];
    }
    /**
     * Returns the number of association groups reported by the node/endpoint.
     * This only works AFTER the interview process
     */
    static getGroupCountCached(applHost, endpoint) {
        return (applHost
            .getValueDB(endpoint.nodeId)
            .getValue(exports.AssociationCCValues.groupCount.endpoint(endpoint.index)) || 0);
    }
    /**
     * Returns the number of nodes an association group supports.
     * This only works AFTER the interview process
     */
    static getMaxNodesCached(applHost, endpoint, groupId) {
        return (applHost
            .getValueDB(endpoint.nodeId)
            .getValue(exports.AssociationCCValues.maxNodes(groupId).endpoint(endpoint.index)) ??
            // If the information is not available, fall back to the configuration file if possible
            // This can happen on some legacy devices which have "hidden" association groups
            applHost
                .getDeviceConfig?.(endpoint.nodeId)
                ?.getAssociationConfigForEndpoint(endpoint.index, groupId)
                ?.maxNodes ??
            0);
    }
    /**
     * Returns all the destinations of all association groups reported by the node/endpoint.
     * This only works AFTER the interview process
     */
    static getAllDestinationsCached(applHost, endpoint) {
        const ret = new Map();
        const groupCount = this.getGroupCountCached(applHost, endpoint);
        const valueDB = applHost.getValueDB(endpoint.nodeId);
        for (let i = 1; i <= groupCount; i++) {
            // Add all root destinations
            const nodes = valueDB.getValue(exports.AssociationCCValues.nodeIds(i).endpoint(endpoint.index)) ?? [];
            ret.set(i, 
            // Filter out duplicates
            (0, arrays_1.distinct)(nodes).map((nodeId) => ({ nodeId })));
        }
        return ret;
    }
    async interview(applHost) {
        const node = this.getNode(applHost);
        const endpoint = this.getEndpoint(applHost);
        const api = API_1.CCAPI.create(safe_1.CommandClasses.Association, applHost, endpoint).withOptions({
            priority: safe_1.MessagePriority.NodeQuery,
        });
        applHost.controllerLog.logNode(node.id, {
            endpoint: this.endpointIndex,
            message: `Interviewing ${this.ccName}...`,
            direction: "none",
        });
        // Even if Multi Channel Association is supported, we still need to query the number of
        // normal association groups since some devices report more association groups than
        // multi channel association groups
        // Find out how many groups are supported
        applHost.controllerLog.logNode(node.id, {
            endpoint: this.endpointIndex,
            message: "querying number of association groups...",
            direction: "outbound",
        });
        const groupCount = await api.getGroupCount();
        if (groupCount != undefined) {
            applHost.controllerLog.logNode(node.id, {
                endpoint: this.endpointIndex,
                message: `supports ${groupCount} association groups`,
                direction: "inbound",
            });
        }
        else {
            applHost.controllerLog.logNode(node.id, {
                endpoint: this.endpointIndex,
                message: "Querying association groups timed out, skipping interview...",
                level: "warn",
            });
            return;
        }
        // Query each association group for its members
        await this.refreshValues(applHost);
        // Skip the remaining Association CC interview in favor of Multi Channel Association if possible
        if (endpoint.supportsCC(safe_1.CommandClasses["Multi Channel Association"])) {
            applHost.controllerLog.logNode(node.id, {
                endpoint: this.endpointIndex,
                message: `${this.constructor.name}: delaying configuration of lifeline associations until after Multi Channel Association interview...`,
                direction: "none",
            });
            this.setInterviewComplete(applHost, true);
            return;
        }
        // And set up lifeline associations
        await ccUtils.configureLifelineAssociations(applHost, endpoint);
        // Remember that the interview is complete
        this.setInterviewComplete(applHost, true);
    }
    async refreshValues(applHost) {
        const node = this.getNode(applHost);
        const endpoint = this.getEndpoint(applHost);
        const api = API_1.CCAPI.create(safe_1.CommandClasses.Association, applHost, endpoint).withOptions({
            priority: safe_1.MessagePriority.NodeQuery,
        });
        const groupCount = AssociationCC_1.getGroupCountCached(applHost, endpoint);
        // Query each association group
        for (let groupId = 1; groupId <= groupCount; groupId++) {
            applHost.controllerLog.logNode(node.id, {
                endpoint: this.endpointIndex,
                message: `querying association group #${groupId}...`,
                direction: "outbound",
            });
            const group = await api.getGroup(groupId);
            if (group != undefined) {
                const logMessage = `received information for association group #${groupId}:
maximum # of nodes: ${group.maxNodes}
currently assigned nodes: ${group.nodeIds.map(String).join(", ")}`;
                applHost.controllerLog.logNode(node.id, {
                    endpoint: this.endpointIndex,
                    message: logMessage,
                    direction: "inbound",
                });
            }
        }
    }
};
AssociationCC = AssociationCC_1 = __decorate([
    (0, CommandClassDecorators_1.commandClass)(safe_1.CommandClasses.Association),
    (0, CommandClassDecorators_1.implementedVersion)(3),
    (0, CommandClassDecorators_1.ccValues)(exports.AssociationCCValues)
], AssociationCC);
exports.AssociationCC = AssociationCC;
let AssociationCCSet = class AssociationCCSet extends AssociationCC {
    constructor(host, options) {
        super(host, options);
        if ((0, CommandClass_1.gotDeserializationOptions)(options)) {
            // TODO: Deserialize payload
            throw new safe_1.ZWaveError(`${this.constructor.name}: deserialization not implemented`, safe_1.ZWaveErrorCodes.Deserialization_NotImplemented);
        }
        else {
            if (options.groupId < 1) {
                throw new safe_1.ZWaveError("The group id must be positive!", safe_1.ZWaveErrorCodes.Argument_Invalid);
            }
            if (options.nodeIds.some((n) => n < 1 || n > safe_1.MAX_NODES)) {
                throw new safe_1.ZWaveError(`All node IDs must be between 1 and ${safe_1.MAX_NODES}!`, safe_1.ZWaveErrorCodes.Argument_Invalid);
            }
            this.groupId = options.groupId;
            this.nodeIds = options.nodeIds;
        }
    }
    serialize() {
        this.payload = Buffer.from([this.groupId, ...this.nodeIds]);
        return super.serialize();
    }
    toLogEntry(applHost) {
        const message = {
            "group id": this.groupId || "all groups",
            "node ids": this.nodeIds.length
                ? this.nodeIds.join(", ")
                : "all nodes",
        };
        return {
            ...super.toLogEntry(applHost),
            message,
        };
    }
};
AssociationCCSet = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.AssociationCommand.Set),
    (0, CommandClassDecorators_1.useSupervision)()
], AssociationCCSet);
exports.AssociationCCSet = AssociationCCSet;
let AssociationCCRemove = class AssociationCCRemove extends AssociationCC {
    constructor(host, options) {
        super(host, options);
        if ((0, CommandClass_1.gotDeserializationOptions)(options)) {
            // TODO: Deserialize payload
            throw new safe_1.ZWaveError(`${this.constructor.name}: deserialization not implemented`, safe_1.ZWaveErrorCodes.Deserialization_NotImplemented);
        }
        else {
            // Validate options
            if (!options.groupId) {
                if (this.version === 1) {
                    throw new safe_1.ZWaveError(`Node ${this.nodeId} only supports AssociationCC V1 which requires the group Id to be set`, safe_1.ZWaveErrorCodes.Argument_Invalid);
                }
            }
            else if (options.groupId < 0) {
                throw new safe_1.ZWaveError("The group id must be positive!", safe_1.ZWaveErrorCodes.Argument_Invalid);
            }
            // When removing associations, we allow invalid node IDs.
            // See GH#3606 - it is possible that those exist.
            this.groupId = options.groupId;
            this.nodeIds = options.nodeIds;
        }
    }
    serialize() {
        this.payload = Buffer.from([
            this.groupId || 0,
            ...(this.nodeIds || []),
        ]);
        return super.serialize();
    }
    toLogEntry(applHost) {
        const message = {
            "group id": this.groupId || "all groups",
            "node ids": this.nodeIds && this.nodeIds.length
                ? this.nodeIds.join(", ")
                : "all nodes",
        };
        return {
            ...super.toLogEntry(applHost),
            message,
        };
    }
};
AssociationCCRemove = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.AssociationCommand.Remove),
    (0, CommandClassDecorators_1.useSupervision)()
], AssociationCCRemove);
exports.AssociationCCRemove = AssociationCCRemove;
let AssociationCCReport = class AssociationCCReport extends AssociationCC {
    constructor(host, options) {
        super(host, options);
        (0, safe_1.validatePayload)(this.payload.length >= 3);
        this._groupId = this.payload[0];
        this._maxNodes = this.payload[1];
        this._reportsToFollow = this.payload[2];
        this._nodeIds = [...this.payload.slice(3)];
    }
    get groupId() {
        return this._groupId;
    }
    get maxNodes() {
        return this._maxNodes;
    }
    get nodeIds() {
        return this._nodeIds;
    }
    get reportsToFollow() {
        return this._reportsToFollow;
    }
    getPartialCCSessionId() {
        // Distinguish sessions by the association group ID
        return { groupId: this._groupId };
    }
    expectMoreMessages() {
        return this._reportsToFollow > 0;
    }
    mergePartialCCs(applHost, partials) {
        // Concat the list of nodes
        this._nodeIds = [...partials, this]
            .map((report) => report._nodeIds)
            .reduce((prev, cur) => prev.concat(...cur), []);
    }
    toLogEntry(applHost) {
        return {
            ...super.toLogEntry(applHost),
            message: {
                "group id": this.groupId,
                "max # of nodes": this.maxNodes,
                "node IDs": this.nodeIds.join(", "),
                "reports to follow": this.reportsToFollow,
            },
        };
    }
};
__decorate([
    (0, CommandClassDecorators_1.ccValue)(exports.AssociationCCValues.maxNodes, (self) => [self.groupId])
], AssociationCCReport.prototype, "maxNodes", null);
__decorate([
    (0, CommandClassDecorators_1.ccValue)(exports.AssociationCCValues.nodeIds, (self) => [self.groupId])
], AssociationCCReport.prototype, "nodeIds", null);
AssociationCCReport = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.AssociationCommand.Report)
], AssociationCCReport);
exports.AssociationCCReport = AssociationCCReport;
let AssociationCCGet = class AssociationCCGet extends AssociationCC {
    constructor(host, options) {
        super(host, options);
        if ((0, CommandClass_1.gotDeserializationOptions)(options)) {
            // TODO: Deserialize payload
            throw new safe_1.ZWaveError(`${this.constructor.name}: deserialization not implemented`, safe_1.ZWaveErrorCodes.Deserialization_NotImplemented);
        }
        else {
            if (options.groupId < 1) {
                throw new safe_1.ZWaveError("The group id must be positive!", safe_1.ZWaveErrorCodes.Argument_Invalid);
            }
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
AssociationCCGet = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.AssociationCommand.Get),
    (0, CommandClassDecorators_1.expectedCCResponse)(AssociationCCReport)
], AssociationCCGet);
exports.AssociationCCGet = AssociationCCGet;
let AssociationCCSupportedGroupingsReport = class AssociationCCSupportedGroupingsReport extends AssociationCC {
    constructor(host, options) {
        super(host, options);
        (0, safe_1.validatePayload)(this.payload.length >= 1);
        this._groupCount = this.payload[0];
    }
    get groupCount() {
        return this._groupCount;
    }
    toLogEntry(applHost) {
        return {
            ...super.toLogEntry(applHost),
            message: { "group count": this.groupCount },
        };
    }
};
__decorate([
    (0, CommandClassDecorators_1.ccValue)(exports.AssociationCCValues.groupCount)
], AssociationCCSupportedGroupingsReport.prototype, "groupCount", null);
AssociationCCSupportedGroupingsReport = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.AssociationCommand.SupportedGroupingsReport)
], AssociationCCSupportedGroupingsReport);
exports.AssociationCCSupportedGroupingsReport = AssociationCCSupportedGroupingsReport;
let AssociationCCSupportedGroupingsGet = class AssociationCCSupportedGroupingsGet extends AssociationCC {
};
AssociationCCSupportedGroupingsGet = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.AssociationCommand.SupportedGroupingsGet),
    (0, CommandClassDecorators_1.expectedCCResponse)(AssociationCCSupportedGroupingsReport)
], AssociationCCSupportedGroupingsGet);
exports.AssociationCCSupportedGroupingsGet = AssociationCCSupportedGroupingsGet;
//# sourceMappingURL=AssociationCC.js.map