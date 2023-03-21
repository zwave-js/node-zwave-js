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
Object.defineProperty(exports, "__esModule", { value: true });
exports.MultiChannelAssociationCCSupportedGroupingsGet = exports.MultiChannelAssociationCCSupportedGroupingsReport = exports.MultiChannelAssociationCCGet = exports.MultiChannelAssociationCCReport = exports.MultiChannelAssociationCCRemove = exports.MultiChannelAssociationCCSet = exports.MultiChannelAssociationCC = exports.MultiChannelAssociationCCAPI = exports.MultiChannelAssociationCCValues = void 0;
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
const __assertType__MultiChannelAssociationCCSetOptions = $o => {
    function _number($o) {
        return typeof $o !== "number" ? {} : null;
    }
    function _2($o) {
        if (typeof $o !== "object" || $o === null || Array.isArray($o))
            return {};
        if ("groupId" in $o && $o["groupId"] !== undefined) {
            const error = _number($o["groupId"]);
            if (error)
                return error;
        }
        else
            return {};
        return null;
    }
    function sa__number_ea_10($o) {
        if (!Array.isArray($o))
            return {};
        for (let i = 0; i < $o.length; i++) {
            const error = _number($o[i]);
            if (error)
                return error;
        }
        return null;
    }
    function _3($o) {
        if (typeof $o !== "object" || $o === null || Array.isArray($o))
            return {};
        if ("nodeIds" in $o && $o["nodeIds"] !== undefined) {
            const error = sa__number_ea_10($o["nodeIds"]);
            if (error)
                return error;
        }
        else
            return {};
        return null;
    }
    function si__2__3_ei($o) {
        const conditions = [_2, _3];
        for (const condition of conditions) {
            const error = condition($o);
            if (error)
                return error;
        }
        return null;
    }
    function su__number_sa__number_ea_10_10_10_eu($o) {
        const conditions = [_number, sa__number_ea_10];
        for (const condition of conditions) {
            const error = condition($o);
            if (!error)
                return null;
        }
        return {};
    }
    function _11($o) {
        if (typeof $o !== "object" || $o === null || Array.isArray($o))
            return {};
        if ("nodeId" in $o && $o["nodeId"] !== undefined) {
            const error = _number($o["nodeId"]);
            if (error)
                return error;
        }
        else
            return {};
        if ("endpoint" in $o && $o["endpoint"] !== undefined) {
            const error = su__number_sa__number_ea_10_10_10_eu($o["endpoint"]);
            if (error)
                return error;
        }
        else
            return {};
        return null;
    }
    function sa__11_ea_11($o) {
        if (!Array.isArray($o))
            return {};
        for (let i = 0; i < $o.length; i++) {
            const error = _11($o[i]);
            if (error)
                return error;
        }
        return null;
    }
    function _5($o) {
        if (typeof $o !== "object" || $o === null || Array.isArray($o))
            return {};
        if ("endpoints" in $o && $o["endpoints"] !== undefined) {
            const error = sa__11_ea_11($o["endpoints"]);
            if (error)
                return error;
        }
        else
            return {};
        return null;
    }
    function si__2__5_ei($o) {
        const conditions = [_2, _5];
        for (const condition of conditions) {
            const error = condition($o);
            if (error)
                return error;
        }
        return null;
    }
    function _7($o) {
        if (typeof $o !== "object" || $o === null || Array.isArray($o))
            return {};
        if ("nodeIds" in $o && $o["nodeIds"] !== undefined) {
            const error = sa__number_ea_10($o["nodeIds"]);
            if (error)
                return error;
        }
        else
            return {};
        if ("endpoints" in $o && $o["endpoints"] !== undefined) {
            const error = sa__11_ea_11($o["endpoints"]);
            if (error)
                return error;
        }
        else
            return {};
        return null;
    }
    function si__2__7_ei($o) {
        const conditions = [_2, _7];
        for (const condition of conditions) {
            const error = condition($o);
            if (error)
                return error;
        }
        return null;
    }
    function su_si__2__3_ei_si__2__5_ei_si__2__7_ei_eu($o) {
        const conditions = [si__2__3_ei, si__2__5_ei, si__2__7_ei];
        for (const condition of conditions) {
            const error = condition($o);
            if (!error)
                return null;
        }
        return {};
    }
    return su_si__2__3_ei_si__2__5_ei_si__2__7_ei_eu($o);
};
const __assertType__MultiChannelAssociationCCRemoveOptions = $o => {
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
    function su__number_sa__number_ea_3_3_3_eu($o) {
        const conditions = [_number, sa__number_ea_3];
        for (const condition of conditions) {
            const error = condition($o);
            if (!error)
                return null;
        }
        return {};
    }
    function _4($o) {
        if (typeof $o !== "object" || $o === null || Array.isArray($o))
            return {};
        if ("nodeId" in $o && $o["nodeId"] !== undefined) {
            const error = _number($o["nodeId"]);
            if (error)
                return error;
        }
        else
            return {};
        if ("endpoint" in $o && $o["endpoint"] !== undefined) {
            const error = su__number_sa__number_ea_3_3_3_eu($o["endpoint"]);
            if (error)
                return error;
        }
        else
            return {};
        return null;
    }
    function sa__4_ea_4($o) {
        if (!Array.isArray($o))
            return {};
        for (let i = 0; i < $o.length; i++) {
            const error = _4($o[i]);
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
        if ("endpoints" in $o && $o["endpoints"] !== undefined) {
            const error = sa__4_ea_4($o["endpoints"]);
            if (error)
                return error;
        }
        return null;
    }
    return _0($o);
};
const safe_1 = require("@zwave-js/core/safe");
const safe_2 = require("@zwave-js/shared/safe");
const API_1 = require("../lib/API");
const CommandClass_1 = require("../lib/CommandClass");
const CommandClassDecorators_1 = require("../lib/CommandClassDecorators");
const ccUtils = __importStar(require("../lib/utils"));
const Values_1 = require("../lib/Values");
const _Types_1 = require("../lib/_Types");
const AssociationCC_1 = require("./AssociationCC");
exports.MultiChannelAssociationCCValues = Object.freeze({
    ...Values_1.V.defineStaticCCValues(safe_1.CommandClasses["Multi Channel Association"], {
        // number multi channel association groups
        ...Values_1.V.staticProperty("groupCount", undefined, { internal: true }),
    }),
    ...Values_1.V.defineDynamicCCValues(safe_1.CommandClasses["Multi Channel Association"], {
        // maximum number of nodes of a multi channel association group
        ...Values_1.V.dynamicPropertyAndKeyWithName("maxNodes", "maxNodes", (groupId) => groupId, ({ property, propertyKey }) => property === "maxNodes" && typeof propertyKey === "number", undefined, { internal: true }),
        // node IDs of a multi channel association group
        ...Values_1.V.dynamicPropertyAndKeyWithName("nodeIds", "nodeIds", (groupId) => groupId, ({ property, propertyKey }) => property === "nodeIds" && typeof propertyKey === "number", undefined, { internal: true }),
        // Endpoint addresses of a multi channel association group
        ...Values_1.V.dynamicPropertyAndKeyWithName("endpoints", "endpoints", (groupId) => groupId, ({ property, propertyKey }) => property === "endpoints" && typeof propertyKey === "number", undefined, { internal: true }),
    }),
});
function endpointAddressesToString(endpoints) {
    return endpoints
        .map(({ nodeId, endpoint }) => {
        if (typeof endpoint === "number") {
            return `${nodeId}:${endpoint}`;
        }
        else {
            return `${nodeId}:[${endpoint.map(String).join(", ")}]`;
        }
    })
        .join(", ");
}
const MULTI_CHANNEL_ASSOCIATION_MARKER = 0x00;
function serializeMultiChannelAssociationDestination(nodeIds, endpoints) {
    const nodeAddressBytes = nodeIds.length;
    const endpointAddressBytes = endpoints.length * 2;
    const payload = Buffer.allocUnsafe(
    // node addresses
    nodeAddressBytes +
        // endpoint marker
        (endpointAddressBytes > 0 ? 1 : 0) +
        // endpoints
        endpointAddressBytes);
    // write node addresses
    for (let i = 0; i < nodeIds.length; i++) {
        payload[i] = nodeIds[i];
    }
    // write endpoint addresses
    if (endpointAddressBytes > 0) {
        let offset = nodeIds.length;
        payload[offset] = MULTI_CHANNEL_ASSOCIATION_MARKER;
        offset += 1;
        for (let i = 0; i < endpoints.length; i++) {
            const endpoint = endpoints[i];
            const destination = typeof endpoint.endpoint === "number"
                ? // The destination is a single number
                    endpoint.endpoint & 127
                : // The destination is a bit mask
                    (0, safe_1.encodeBitMask)(endpoint.endpoint, 7)[0] | 128;
            payload[offset + 2 * i] = endpoint.nodeId;
            payload[offset + 2 * i + 1] = destination;
        }
    }
    return payload;
}
function deserializeMultiChannelAssociationDestination(data) {
    const nodeIds = [];
    let endpointOffset = data.length;
    // Scan node ids until we find the marker
    for (let i = 0; i < data.length; i++) {
        if (data[i] === MULTI_CHANNEL_ASSOCIATION_MARKER) {
            endpointOffset = i + 1;
            break;
        }
        nodeIds.push(data[i]);
    }
    const endpoints = [];
    for (let i = endpointOffset; i < data.length; i += 2) {
        const nodeId = data[i];
        const isBitMask = !!(data[i + 1] & 128);
        const destination = data[i + 1] & 127;
        const endpoint = isBitMask
            ? (0, safe_1.parseBitMask)(Buffer.from([destination]))
            : destination;
        endpoints.push({ nodeId, endpoint });
    }
    return { nodeIds, endpoints };
}
// @noSetValueAPI
let MultiChannelAssociationCCAPI = class MultiChannelAssociationCCAPI extends API_1.PhysicalCCAPI {
    supportsCommand(cmd) {
        switch (cmd) {
            case _Types_1.MultiChannelAssociationCommand.Get:
            case _Types_1.MultiChannelAssociationCommand.Set:
            case _Types_1.MultiChannelAssociationCommand.Remove:
            case _Types_1.MultiChannelAssociationCommand.SupportedGroupingsGet:
                return true; // This is mandatory
        }
        return super.supportsCommand(cmd);
    }
    /**
     * Returns the number of association groups a node supports.
     * Association groups are consecutive, starting at 1.
     */
    async getGroupCount() {
        this.assertSupportsCommand(_Types_1.MultiChannelAssociationCommand, _Types_1.MultiChannelAssociationCommand.SupportedGroupingsGet);
        const cc = new MultiChannelAssociationCCSupportedGroupingsGet(this.applHost, {
            nodeId: this.endpoint.nodeId,
            endpoint: this.endpoint.index,
        });
        const response = await this.applHost.sendCommand(cc, this.commandOptions);
        return response?.groupCount;
    }
    /**
     * Returns information about an association group.
     */
    async getGroup(groupId) {
        __assertType("groupId", "number", __assertType__number.bind(void 0, groupId));
        this.assertSupportsCommand(_Types_1.MultiChannelAssociationCommand, _Types_1.MultiChannelAssociationCommand.Get);
        const cc = new MultiChannelAssociationCCGet(this.applHost, {
            nodeId: this.endpoint.nodeId,
            endpoint: this.endpoint.index,
            groupId,
        });
        const response = await this.applHost.sendCommand(cc, this.commandOptions);
        if (response) {
            return (0, safe_2.pick)(response, ["maxNodes", "nodeIds", "endpoints"]);
        }
    }
    /**
     * Adds new nodes or endpoints to an association group
     */
    async addDestinations(options) {
        __assertType("options", "MultiChannelAssociationCCSetOptions", __assertType__MultiChannelAssociationCCSetOptions.bind(void 0, options));
        this.assertSupportsCommand(_Types_1.MultiChannelAssociationCommand, _Types_1.MultiChannelAssociationCommand.Set);
        const cc = new MultiChannelAssociationCCSet(this.applHost, {
            nodeId: this.endpoint.nodeId,
            endpoint: this.endpoint.index,
            ...options,
        });
        return this.applHost.sendCommand(cc, this.commandOptions);
    }
    /**
     * Removes nodes or endpoints from an association group
     */
    async removeDestinations(options) {
        __assertType("options", "MultiChannelAssociationCCRemoveOptions", __assertType__MultiChannelAssociationCCRemoveOptions.bind(void 0, options));
        this.assertSupportsCommand(_Types_1.MultiChannelAssociationCommand, _Types_1.MultiChannelAssociationCommand.Remove);
        if (!options.groupId && this.version === 1) {
            // V1 does not support omitting the group, manually remove the destination from all groups
            // We don't want to do too much work, so find out which groups the destination is in
            const currentDestinations = MultiChannelAssociationCC.getAllDestinationsCached(this.applHost, this.endpoint);
            for (const [group, destinations] of currentDestinations) {
                const cc = new MultiChannelAssociationCCRemove(this.applHost, {
                    nodeId: this.endpoint.nodeId,
                    endpoint: this.endpoint.index,
                    groupId: group,
                    nodeIds: destinations
                        .filter((d) => !d.endpoint)
                        .map((d) => d.nodeId),
                    endpoints: destinations.filter((d) => !!d.endpoint),
                });
                // TODO: evaluate intermediate supervision results
                await this.applHost.sendCommand(cc, this.commandOptions);
            }
        }
        else {
            const cc = new MultiChannelAssociationCCRemove(this.applHost, {
                nodeId: this.endpoint.nodeId,
                endpoint: this.endpoint.index,
                ...options,
            });
            return this.applHost.sendCommand(cc, this.commandOptions);
        }
    }
};
MultiChannelAssociationCCAPI = __decorate([
    (0, CommandClassDecorators_1.API)(safe_1.CommandClasses["Multi Channel Association"])
], MultiChannelAssociationCCAPI);
exports.MultiChannelAssociationCCAPI = MultiChannelAssociationCCAPI;
let MultiChannelAssociationCC = class MultiChannelAssociationCC extends CommandClass_1.CommandClass {
    determineRequiredCCInterviews() {
        // MultiChannelAssociationCC must be interviewed after Z-Wave+ if that is supported
        return [
            ...super.determineRequiredCCInterviews(),
            safe_1.CommandClasses["Z-Wave Plus Info"],
            // We need information about endpoints to correctly configure the lifeline associations
            safe_1.CommandClasses["Multi Channel"],
            // AssociationCC will short-circuit if this CC is supported
            safe_1.CommandClasses.Association,
        ];
    }
    /**
     * Returns the number of association groups reported by the node/endpoint.
     * This only works AFTER the interview process
     */
    static getGroupCountCached(applHost, endpoint) {
        return (applHost
            .getValueDB(endpoint.nodeId)
            .getValue(exports.MultiChannelAssociationCCValues.groupCount.endpoint(endpoint.index)) || 0);
    }
    /**
     * Returns the number of nodes an association group supports.
     * This only works AFTER the interview process
     */
    static getMaxNodesCached(applHost, endpoint, groupId) {
        return (applHost
            .getValueDB(endpoint.nodeId)
            .getValue(exports.MultiChannelAssociationCCValues.maxNodes(groupId).endpoint(endpoint.index)) ?? 0);
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
            const groupDestinations = [];
            // Add all node destinations
            const nodes = valueDB.getValue(exports.MultiChannelAssociationCCValues.nodeIds(i).endpoint(endpoint.index)) ?? [];
            groupDestinations.push(...nodes.map((nodeId) => ({ nodeId })));
            // And all endpoint destinations
            const endpoints = valueDB.getValue(exports.MultiChannelAssociationCCValues.endpoints(i).endpoint(endpoint.index)) ?? [];
            for (const ep of endpoints) {
                if (typeof ep.endpoint === "number") {
                    groupDestinations.push({
                        nodeId: ep.nodeId,
                        endpoint: ep.endpoint,
                    });
                }
                else {
                    groupDestinations.push(...ep.endpoint.map((e) => ({
                        nodeId: ep.nodeId,
                        endpoint: e,
                    })));
                }
            }
            ret.set(i, 
            // Filter out duplicates
            groupDestinations.filter((addr, index) => index ===
                groupDestinations.findIndex(({ nodeId, endpoint }) => nodeId === addr.nodeId &&
                    endpoint === addr.endpoint)));
        }
        return ret;
    }
    async interview(applHost) {
        const node = this.getNode(applHost);
        const endpoint = this.getEndpoint(applHost);
        const mcAPI = API_1.CCAPI.create(safe_1.CommandClasses["Multi Channel Association"], applHost, endpoint);
        applHost.controllerLog.logNode(node.id, {
            endpoint: this.endpointIndex,
            message: `Interviewing ${this.ccName}...`,
            direction: "none",
        });
        // First find out how many groups are supported as multi channel
        applHost.controllerLog.logNode(node.id, {
            endpoint: this.endpointIndex,
            message: "querying number of multi channel association groups...",
            direction: "outbound",
        });
        const mcGroupCount = await mcAPI.getGroupCount();
        if (mcGroupCount != undefined) {
            applHost.controllerLog.logNode(node.id, {
                endpoint: this.endpointIndex,
                message: `supports ${mcGroupCount} multi channel association groups`,
                direction: "inbound",
            });
        }
        else {
            applHost.controllerLog.logNode(node.id, {
                endpoint: this.endpointIndex,
                message: "Querying multi channel association groups timed out, skipping interview...",
                level: "warn",
            });
            return;
        }
        // Query each association group for its members
        await this.refreshValues(applHost);
        // And set up lifeline associations
        await ccUtils.configureLifelineAssociations(applHost, endpoint);
        // Remember that the interview is complete
        this.setInterviewComplete(applHost, true);
    }
    async refreshValues(applHost) {
        const node = this.getNode(applHost);
        const endpoint = this.getEndpoint(applHost);
        const mcAPI = API_1.CCAPI.create(safe_1.CommandClasses["Multi Channel Association"], applHost, endpoint).withOptions({
            priority: safe_1.MessagePriority.NodeQuery,
        });
        const assocAPI = API_1.CCAPI.create(safe_1.CommandClasses.Association, applHost, endpoint).withOptions({
            priority: safe_1.MessagePriority.NodeQuery,
        });
        const mcGroupCount = this.getValue(applHost, exports.MultiChannelAssociationCCValues.groupCount) ?? 0;
        // Some devices report more association groups than multi channel association groups, so we need this info here
        const assocGroupCount = this.getValue(applHost, AssociationCC_1.AssociationCCValues.groupCount) ||
            mcGroupCount;
        // Then query each multi channel association group
        for (let groupId = 1; groupId <= mcGroupCount; groupId++) {
            applHost.controllerLog.logNode(node.id, {
                endpoint: this.endpointIndex,
                message: `querying multi channel association group #${groupId}...`,
                direction: "outbound",
            });
            const group = await mcAPI.getGroup(groupId);
            if (!group)
                continue;
            const logMessage = `received information for multi channel association group #${groupId}:
maximum # of nodes:           ${group.maxNodes}
currently assigned nodes:     ${group.nodeIds.map(String).join(", ")}
currently assigned endpoints: ${group.endpoints
                .map(({ nodeId, endpoint }) => {
                if (typeof endpoint === "number") {
                    return `${nodeId}:${endpoint}`;
                }
                else {
                    return `${nodeId}:[${endpoint.map(String).join(", ")}]`;
                }
            })
                .join("")}`;
            applHost.controllerLog.logNode(node.id, {
                endpoint: this.endpointIndex,
                message: logMessage,
                direction: "inbound",
            });
        }
        // Check if there are more non-multi-channel association groups we haven't queried yet
        if (assocAPI.isSupported() && assocGroupCount > mcGroupCount) {
            applHost.controllerLog.logNode(node.id, {
                endpoint: this.endpointIndex,
                message: `querying additional non-multi-channel association groups...`,
                direction: "outbound",
            });
            for (let groupId = mcGroupCount + 1; groupId <= assocGroupCount; groupId++) {
                applHost.controllerLog.logNode(node.id, {
                    endpoint: this.endpointIndex,
                    message: `querying association group #${groupId}...`,
                    direction: "outbound",
                });
                const group = await assocAPI.getGroup(groupId);
                if (!group)
                    continue;
                const logMessage = `received information for association group #${groupId}:
maximum # of nodes:           ${group.maxNodes}
currently assigned nodes:     ${group.nodeIds.map(String).join(", ")}`;
                applHost.controllerLog.logNode(node.id, {
                    endpoint: this.endpointIndex,
                    message: logMessage,
                    direction: "inbound",
                });
            }
        }
    }
};
MultiChannelAssociationCC = __decorate([
    (0, CommandClassDecorators_1.commandClass)(safe_1.CommandClasses["Multi Channel Association"]),
    (0, CommandClassDecorators_1.implementedVersion)(4),
    (0, CommandClassDecorators_1.ccValues)(exports.MultiChannelAssociationCCValues)
], MultiChannelAssociationCC);
exports.MultiChannelAssociationCC = MultiChannelAssociationCC;
let MultiChannelAssociationCCSet = class MultiChannelAssociationCCSet extends MultiChannelAssociationCC {
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
            this.nodeIds = ("nodeIds" in options && options.nodeIds) || [];
            if (this.nodeIds.some((n) => n < 1 || n > safe_1.MAX_NODES)) {
                throw new safe_1.ZWaveError(`All node IDs must be between 1 and ${safe_1.MAX_NODES}!`, safe_1.ZWaveErrorCodes.Argument_Invalid);
            }
            this.endpoints =
                ("endpoints" in options && options.endpoints) || [];
        }
    }
    serialize() {
        this.payload = Buffer.concat([
            Buffer.from([this.groupId]),
            serializeMultiChannelAssociationDestination(this.nodeIds, this.endpoints),
        ]);
        return super.serialize();
    }
    toLogEntry(applHost) {
        return {
            ...super.toLogEntry(applHost),
            message: {
                "group id": this.groupId,
                "node ids": this.nodeIds.join(", "),
                endpoints: endpointAddressesToString(this.endpoints),
            },
        };
    }
};
MultiChannelAssociationCCSet = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.MultiChannelAssociationCommand.Set),
    (0, CommandClassDecorators_1.useSupervision)()
], MultiChannelAssociationCCSet);
exports.MultiChannelAssociationCCSet = MultiChannelAssociationCCSet;
let MultiChannelAssociationCCRemove = class MultiChannelAssociationCCRemove extends MultiChannelAssociationCC {
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
                    throw new safe_1.ZWaveError(`Node ${this.nodeId} only supports MultiChannelAssociationCC V1 which requires the group Id to be set`, safe_1.ZWaveErrorCodes.Argument_Invalid);
                }
            }
            else if (options.groupId < 0) {
                throw new safe_1.ZWaveError("The group id must be positive!", safe_1.ZWaveErrorCodes.Argument_Invalid);
            }
            // When removing associations, we allow invalid node IDs.
            // See GH#3606 - it is possible that those exist.
            this.groupId = options.groupId;
            this.nodeIds = options.nodeIds;
            this.endpoints = options.endpoints;
        }
    }
    serialize() {
        this.payload = Buffer.concat([
            Buffer.from([this.groupId || 0]),
            serializeMultiChannelAssociationDestination(this.nodeIds || [], this.endpoints || []),
        ]);
        return super.serialize();
    }
    toLogEntry(applHost) {
        const message = { "group id": this.groupId };
        if (this.nodeIds) {
            message["node ids"] = this.nodeIds.join(", ");
        }
        if (this.endpoints) {
            message.endpoints = endpointAddressesToString(this.endpoints);
        }
        return {
            ...super.toLogEntry(applHost),
            message,
        };
    }
};
MultiChannelAssociationCCRemove = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.MultiChannelAssociationCommand.Remove),
    (0, CommandClassDecorators_1.useSupervision)()
], MultiChannelAssociationCCRemove);
exports.MultiChannelAssociationCCRemove = MultiChannelAssociationCCRemove;
let MultiChannelAssociationCCReport = class MultiChannelAssociationCCReport extends MultiChannelAssociationCC {
    constructor(host, options) {
        super(host, options);
        (0, safe_1.validatePayload)(this.payload.length >= 3);
        this.groupId = this.payload[0];
        this.maxNodes = this.payload[1];
        this.reportsToFollow = this.payload[2];
        ({ nodeIds: this._nodeIds, endpoints: this._endpoints } =
            deserializeMultiChannelAssociationDestination(this.payload.slice(3)));
    }
    get nodeIds() {
        return this._nodeIds;
    }
    get endpoints() {
        return this._endpoints;
    }
    getPartialCCSessionId() {
        // Distinguish sessions by the association group ID
        return { groupId: this.groupId };
    }
    expectMoreMessages() {
        return this.reportsToFollow > 0;
    }
    mergePartialCCs(applHost, partials) {
        // Concat the list of nodes
        this._nodeIds = [...partials, this]
            .map((report) => [...report.nodeIds])
            .reduce((prev, cur) => prev.concat(...cur), []);
        // Concat the list of endpoints
        this._endpoints = [...partials, this]
            .map((report) => [...report.endpoints])
            .reduce((prev, cur) => prev.concat(...cur), []);
    }
    toLogEntry(applHost) {
        return {
            ...super.toLogEntry(applHost),
            message: {
                "group id": this.groupId,
                "maximum # of nodes": this.maxNodes,
                "node ids": this.nodeIds.join(", "),
                endpoints: endpointAddressesToString(this.endpoints),
            },
        };
    }
};
__decorate([
    (0, CommandClassDecorators_1.ccValue)(exports.MultiChannelAssociationCCValues.maxNodes, (self) => [self.groupId])
], MultiChannelAssociationCCReport.prototype, "maxNodes", void 0);
__decorate([
    (0, CommandClassDecorators_1.ccValue)(exports.MultiChannelAssociationCCValues.nodeIds, (self) => [self.groupId])
], MultiChannelAssociationCCReport.prototype, "nodeIds", null);
__decorate([
    (0, CommandClassDecorators_1.ccValue)(exports.MultiChannelAssociationCCValues.endpoints, (self) => [self.groupId])
], MultiChannelAssociationCCReport.prototype, "endpoints", null);
MultiChannelAssociationCCReport = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.MultiChannelAssociationCommand.Report)
], MultiChannelAssociationCCReport);
exports.MultiChannelAssociationCCReport = MultiChannelAssociationCCReport;
let MultiChannelAssociationCCGet = class MultiChannelAssociationCCGet extends MultiChannelAssociationCC {
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
MultiChannelAssociationCCGet = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.MultiChannelAssociationCommand.Get),
    (0, CommandClassDecorators_1.expectedCCResponse)(MultiChannelAssociationCCReport)
], MultiChannelAssociationCCGet);
exports.MultiChannelAssociationCCGet = MultiChannelAssociationCCGet;
let MultiChannelAssociationCCSupportedGroupingsReport = class MultiChannelAssociationCCSupportedGroupingsReport extends MultiChannelAssociationCC {
    constructor(host, options) {
        super(host, options);
        (0, safe_1.validatePayload)(this.payload.length >= 1);
        this.groupCount = this.payload[0];
    }
    toLogEntry(applHost) {
        return {
            ...super.toLogEntry(applHost),
            message: { "group count": this.groupCount },
        };
    }
};
__decorate([
    (0, CommandClassDecorators_1.ccValue)(exports.MultiChannelAssociationCCValues.groupCount)
], MultiChannelAssociationCCSupportedGroupingsReport.prototype, "groupCount", void 0);
MultiChannelAssociationCCSupportedGroupingsReport = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.MultiChannelAssociationCommand.SupportedGroupingsReport)
], MultiChannelAssociationCCSupportedGroupingsReport);
exports.MultiChannelAssociationCCSupportedGroupingsReport = MultiChannelAssociationCCSupportedGroupingsReport;
let MultiChannelAssociationCCSupportedGroupingsGet = class MultiChannelAssociationCCSupportedGroupingsGet extends MultiChannelAssociationCC {
};
MultiChannelAssociationCCSupportedGroupingsGet = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.MultiChannelAssociationCommand.SupportedGroupingsGet),
    (0, CommandClassDecorators_1.expectedCCResponse)(MultiChannelAssociationCCSupportedGroupingsReport)
], MultiChannelAssociationCCSupportedGroupingsGet);
exports.MultiChannelAssociationCCSupportedGroupingsGet = MultiChannelAssociationCCSupportedGroupingsGet;
//# sourceMappingURL=MultiChannelAssociationCC.js.map