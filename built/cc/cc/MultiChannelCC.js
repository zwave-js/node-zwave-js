"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MultiChannelCCV1CommandEncapsulation = exports.MultiChannelCCV1Get = exports.MultiChannelCCV1Report = exports.MultiChannelCCCommandEncapsulation = exports.MultiChannelCCAggregatedMembersGet = exports.MultiChannelCCAggregatedMembersReport = exports.MultiChannelCCEndPointFind = exports.MultiChannelCCEndPointFindReport = exports.MultiChannelCCCapabilityGet = exports.MultiChannelCCCapabilityReport = exports.MultiChannelCCEndPointGet = exports.MultiChannelCCEndPointReport = exports.MultiChannelCC = exports.MultiChannelCCAPI = exports.MultiChannelCCValues = void 0;
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
const safe_1 = require("@zwave-js/core/safe");
const safe_2 = require("@zwave-js/shared/safe");
const API_1 = require("../lib/API");
const CommandClass_1 = require("../lib/CommandClass");
const CommandClassDecorators_1 = require("../lib/CommandClassDecorators");
const Values_1 = require("../lib/Values");
const _Types_1 = require("../lib/_Types");
// TODO: Handle removal reports of dynamic endpoints
exports.MultiChannelCCValues = Object.freeze({
    ...Values_1.V.defineStaticCCValues(safe_1.CommandClasses["Multi Channel"], {
        ...Values_1.V.staticProperty("endpointIndizes", undefined, {
            internal: true,
            supportsEndpoints: false,
        }),
        ...Values_1.V.staticPropertyWithName("individualEndpointCount", "individualCount", undefined, {
            internal: true,
            supportsEndpoints: false,
        }),
        ...Values_1.V.staticPropertyWithName("aggregatedEndpointCount", "aggregatedCount", undefined, {
            internal: true,
            supportsEndpoints: false,
        }),
        ...Values_1.V.staticPropertyWithName("endpointCountIsDynamic", "countIsDynamic", undefined, {
            internal: true,
            supportsEndpoints: false,
        }),
        ...Values_1.V.staticPropertyWithName("endpointsHaveIdenticalCapabilities", "identicalCapabilities", undefined, {
            internal: true,
            supportsEndpoints: false,
        }),
        ...Values_1.V.staticPropertyWithName("endpointCCs", "commandClasses", undefined, { internal: true }),
        ...Values_1.V.staticPropertyWithName("endpointDeviceClass", "deviceClass", undefined, { internal: true }),
    }),
    ...Values_1.V.defineDynamicCCValues(safe_1.CommandClasses["Multi Channel"], {
        ...Values_1.V.dynamicPropertyAndKeyWithName("aggregatedEndpointMembers", "members", (endpointIndex) => endpointIndex, ({ property, propertyKey }) => property === "members" && typeof propertyKey === "number", undefined, { internal: true }),
    }),
});
// @noSetValueAPI
/**
 * Many devices unnecessarily use endpoints when they could (or do) provide all functionality via the root device.
 * This function gives an estimate if this is the case (i.e. all endpoints have a different device class)
 */
function areAllEndpointsDifferent(applHost, node, endpointIndizes) {
    // Endpoints are useless if all of them have different device classes
    const deviceClasses = new Set();
    for (const endpoint of endpointIndizes) {
        const devClassValueId = exports.MultiChannelCCValues.endpointDeviceClass.endpoint(endpoint);
        const deviceClass = applHost.getValueDB(node.id).getValue(devClassValueId);
        if (deviceClass) {
            deviceClasses.add(deviceClass.generic * 256 + deviceClass.specific);
        }
    }
    return deviceClasses.size === endpointIndizes.length;
}
let MultiChannelCCAPI = class MultiChannelCCAPI extends API_1.CCAPI {
    supportsCommand(cmd) {
        switch (cmd) {
            // Legacy commands:
            case _Types_1.MultiChannelCommand.GetV1:
                return this.isSinglecast() && this.version === 1;
            case _Types_1.MultiChannelCommand.CommandEncapsulationV1:
                return this.version === 1;
            // The specs start at version 3 but according to OZW,
            // these do seem to be supported in version 2
            case _Types_1.MultiChannelCommand.EndPointGet:
            case _Types_1.MultiChannelCommand.CapabilityGet:
                return this.version >= 2 && this.isSinglecast();
            case _Types_1.MultiChannelCommand.CommandEncapsulation:
                return this.version >= 2;
            case _Types_1.MultiChannelCommand.EndPointFind:
                return this.version >= 3 && this.isSinglecast();
            case _Types_1.MultiChannelCommand.AggregatedMembersGet:
                return this.version >= 4 && this.isSinglecast();
        }
        return super.supportsCommand(cmd);
    }
    // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
    async getEndpoints() {
        this.assertSupportsCommand(_Types_1.MultiChannelCommand, _Types_1.MultiChannelCommand.EndPointGet);
        const cc = new MultiChannelCCEndPointGet(this.applHost, {
            nodeId: this.endpoint.nodeId,
            endpoint: this.endpoint.index,
        });
        const response = await this.applHost.sendCommand(cc, this.commandOptions);
        if (response) {
            return {
                isDynamicEndpointCount: response.countIsDynamic,
                identicalCapabilities: response.identicalCapabilities,
                individualEndpointCount: response.individualCount,
                aggregatedEndpointCount: response.aggregatedCount,
            };
        }
    }
    async getEndpointCapabilities(endpoint) {
        __assertType("endpoint", "number", __assertType__number.bind(void 0, endpoint));
        this.assertSupportsCommand(_Types_1.MultiChannelCommand, _Types_1.MultiChannelCommand.CapabilityGet);
        const cc = new MultiChannelCCCapabilityGet(this.applHost, {
            nodeId: this.endpoint.nodeId,
            endpoint: this.endpoint.index,
            requestedEndpoint: endpoint,
        });
        const response = await this.applHost.sendCommand(cc, this.commandOptions);
        if (response) {
            const generic = this.applHost.configManager.lookupGenericDeviceClass(response.genericDeviceClass);
            const specific = this.applHost.configManager.lookupSpecificDeviceClass(response.genericDeviceClass, response.specificDeviceClass);
            return {
                isDynamic: response.isDynamic,
                wasRemoved: response.wasRemoved,
                supportedCCs: response.supportedCCs,
                generic,
                specific,
            };
        }
    }
    async findEndpoints(genericClass, specificClass) {
        __assertType("genericClass", "number", __assertType__number.bind(void 0, genericClass));
        __assertType("specificClass", "number", __assertType__number.bind(void 0, specificClass));
        this.assertSupportsCommand(_Types_1.MultiChannelCommand, _Types_1.MultiChannelCommand.EndPointFind);
        const cc = new MultiChannelCCEndPointFind(this.applHost, {
            nodeId: this.endpoint.nodeId,
            endpoint: this.endpoint.index,
            genericClass,
            specificClass,
        });
        const response = await this.applHost.sendCommand(cc, this.commandOptions);
        return response?.foundEndpoints;
    }
    async getAggregatedMembers(endpoint) {
        __assertType("endpoint", "number", __assertType__number.bind(void 0, endpoint));
        this.assertSupportsCommand(_Types_1.MultiChannelCommand, _Types_1.MultiChannelCommand.AggregatedMembersGet);
        const cc = new MultiChannelCCAggregatedMembersGet(this.applHost, {
            nodeId: this.endpoint.nodeId,
            endpoint: this.endpoint.index,
            requestedEndpoint: endpoint,
        });
        const response = await this.applHost.sendCommand(cc, this.commandOptions);
        return response?.members;
    }
    // @noValidateArgs - Encapsulation is used internally and too frequently that we
    // want to pay the cost of validating each call
    async sendEncapsulated(options) {
        this.assertSupportsCommand(_Types_1.MultiChannelCommand, _Types_1.MultiChannelCommand.CommandEncapsulation);
        const cc = new MultiChannelCCCommandEncapsulation(this.applHost, {
            nodeId: this.endpoint.nodeId,
            ...options,
        });
        await this.applHost.sendCommand(cc, this.commandOptions);
    }
    async getEndpointCountV1(ccId) {
        __assertType("ccId", "CommandClasses", __assertType__number.bind(void 0, ccId));
        this.assertSupportsCommand(_Types_1.MultiChannelCommand, _Types_1.MultiChannelCommand.GetV1);
        const cc = new MultiChannelCCV1Get(this.applHost, {
            nodeId: this.endpoint.nodeId,
            requestedCC: ccId,
        });
        const response = await this.applHost.sendCommand(cc, this.commandOptions);
        return response?.endpointCount;
    }
    // @noValidateArgs - Encapsulation is used internally and too frequently that we
    // want to pay the cost of validating each call
    async sendEncapsulatedV1(encapsulated) {
        this.assertSupportsCommand(_Types_1.MultiChannelCommand, _Types_1.MultiChannelCommand.CommandEncapsulationV1);
        const cc = new MultiChannelCCV1CommandEncapsulation(this.applHost, {
            nodeId: this.endpoint.nodeId,
            encapsulated,
        });
        await this.applHost.sendCommand(cc, this.commandOptions);
    }
};
MultiChannelCCAPI = __decorate([
    (0, CommandClassDecorators_1.API)(safe_1.CommandClasses["Multi Channel"])
], MultiChannelCCAPI);
exports.MultiChannelCCAPI = MultiChannelCCAPI;
let MultiChannelCC = class MultiChannelCC extends CommandClass_1.CommandClass {
    /** Tests if a command targets a specific endpoint and thus requires encapsulation */
    static requiresEncapsulation(cc) {
        return (cc.endpointIndex !== 0 &&
            !(cc instanceof MultiChannelCCCommandEncapsulation) &&
            !(cc instanceof MultiChannelCCV1CommandEncapsulation));
    }
    /** Encapsulates a command that targets a specific endpoint */
    static encapsulate(host, cc) {
        const ccVersion = host.getSafeCCVersionForNode(safe_1.CommandClasses["Multi Channel"], cc.nodeId);
        let ret;
        if (ccVersion === 1) {
            ret = new MultiChannelCCV1CommandEncapsulation(host, {
                nodeId: cc.nodeId,
                encapsulated: cc,
            });
        }
        else {
            ret = new MultiChannelCCCommandEncapsulation(host, {
                nodeId: cc.nodeId,
                encapsulated: cc,
                destination: cc.endpointIndex,
            });
        }
        // Copy the encapsulation flags from the encapsulated command
        ret.encapsulationFlags = cc.encapsulationFlags;
        return ret;
    }
    skipEndpointInterview() {
        // The endpoints are discovered by querying the root device
        return true;
    }
    async interview(applHost) {
        const node = this.getNode(applHost);
        const removeEndpoints = applHost.getDeviceConfig?.(node.id)?.compat
            ?.removeEndpoints;
        if (removeEndpoints === "*") {
            applHost.controllerLog.logNode(node.id, {
                endpoint: this.endpointIndex,
                message: `Skipping ${this.ccName} interview b/c all endpoints are ignored by the device config file...`,
                direction: "none",
            });
            return;
        }
        applHost.controllerLog.logNode(node.id, {
            endpoint: this.endpointIndex,
            message: `Interviewing ${this.ccName}...`,
            direction: "none",
        });
        // Special interview procedure for legacy nodes
        if (this.version === 1)
            return this.interviewV1(applHost);
        const endpoint = node.getEndpoint(this.endpointIndex);
        const api = API_1.CCAPI.create(safe_1.CommandClasses["Multi Channel"], applHost, endpoint).withOptions({
            priority: safe_1.MessagePriority.NodeQuery,
        });
        const valueDB = this.getValueDB(applHost);
        // Step 1: Retrieve general information about end points
        applHost.controllerLog.logNode(node.id, {
            endpoint: this.endpointIndex,
            message: "querying device endpoint information...",
            direction: "outbound",
        });
        const multiResponse = await api.getEndpoints();
        if (!multiResponse) {
            applHost.controllerLog.logNode(node.id, {
                endpoint: this.endpointIndex,
                message: "Querying device endpoint information timed out, aborting interview...",
                level: "warn",
            });
            return this.throwMissingCriticalInterviewResponse();
        }
        let logMessage = `received response for device endpoints:
endpoint count (individual): ${multiResponse.individualEndpointCount}
count is dynamic:            ${multiResponse.isDynamicEndpointCount}
identical capabilities:      ${multiResponse.identicalCapabilities}`;
        if (multiResponse.aggregatedEndpointCount != undefined) {
            logMessage += `\nendpoint count (aggregated): ${multiResponse.aggregatedEndpointCount}`;
        }
        applHost.controllerLog.logNode(node.id, {
            endpoint: this.endpointIndex,
            message: logMessage,
            direction: "inbound",
        });
        let allEndpoints = [];
        const addSequentialEndpoints = () => {
            for (let i = 1; i <=
                multiResponse.individualEndpointCount +
                    (multiResponse.aggregatedEndpointCount ?? 0); i++) {
                allEndpoints.push(i);
            }
        };
        if (api.supportsCommand(_Types_1.MultiChannelCommand.EndPointFind)) {
            // Step 2a: Find all endpoints
            applHost.controllerLog.logNode(node.id, {
                endpoint: this.endpointIndex,
                message: "querying all endpoints...",
                direction: "outbound",
            });
            const foundEndpoints = await api.findEndpoints(0xff, 0xff);
            if (foundEndpoints)
                allEndpoints.push(...foundEndpoints);
            if (!allEndpoints.length) {
                // Create a sequential list of endpoints
                applHost.controllerLog.logNode(node.id, {
                    endpoint: this.endpointIndex,
                    message: `Endpoint query returned no results, assuming that endpoints are sequential`,
                    direction: "inbound",
                });
                addSequentialEndpoints();
            }
            else {
                applHost.controllerLog.logNode(node.id, {
                    endpoint: this.endpointIndex,
                    message: `received endpoints: ${allEndpoints
                        .map(String)
                        .join(", ")}`,
                    direction: "inbound",
                });
            }
        }
        else {
            // Step 2b: Assume that the endpoints are in sequential order
            applHost.controllerLog.logNode(node.id, {
                endpoint: this.endpointIndex,
                message: `does not support EndPointFind, assuming that endpoints are sequential`,
                direction: "none",
            });
            addSequentialEndpoints();
        }
        // Step 2.5: remove ignored endpoints
        if (removeEndpoints?.length) {
            applHost.controllerLog.logNode(node.id, {
                endpoint: this.endpointIndex,
                message: `The following endpoints are ignored through the config file: ${removeEndpoints.join(", ")}`,
                direction: "none",
            });
            allEndpoints = allEndpoints.filter((e) => !removeEndpoints.includes(e));
        }
        // Step 3: Query endpoints
        let hasQueriedCapabilities = false;
        for (const endpoint of allEndpoints) {
            if (endpoint > multiResponse.individualEndpointCount &&
                this.version >= 4) {
                // Find members of aggregated end point
                applHost.controllerLog.logNode(node.id, {
                    endpoint: this.endpointIndex,
                    message: `querying members of aggregated endpoint #${endpoint}...`,
                    direction: "outbound",
                });
                const members = await api.getAggregatedMembers(endpoint);
                if (members) {
                    applHost.controllerLog.logNode(node.id, {
                        endpoint: this.endpointIndex,
                        message: `aggregated endpoint #${endpoint} has members ${members
                            .map(String)
                            .join(", ")}`,
                        direction: "inbound",
                    });
                }
            }
            // When the device reports identical capabilities for all endpoints,
            // we don't need to query them all
            if (multiResponse.identicalCapabilities && hasQueriedCapabilities) {
                applHost.controllerLog.logNode(node.id, {
                    endpoint: this.endpointIndex,
                    message: `all endpoints identical, skipping capability query for endpoint #${endpoint}...`,
                    direction: "none",
                });
                // copy the capabilities from the first endpoint
                const devClass = valueDB.getValue(exports.MultiChannelCCValues.endpointDeviceClass.endpoint(allEndpoints[0]));
                valueDB.setValue(exports.MultiChannelCCValues.endpointDeviceClass.endpoint(endpoint), devClass);
                const ep1Caps = valueDB.getValue(exports.MultiChannelCCValues.endpointCCs.endpoint(allEndpoints[0]));
                valueDB.setValue(exports.MultiChannelCCValues.endpointCCs.endpoint(endpoint), [...ep1Caps]);
                continue;
            }
            applHost.controllerLog.logNode(node.id, {
                endpoint: this.endpointIndex,
                message: `querying capabilities for endpoint #${endpoint}...`,
                direction: "outbound",
            });
            const caps = await api.getEndpointCapabilities(endpoint);
            if (caps) {
                hasQueriedCapabilities = true;
                logMessage = `received response for endpoint capabilities (#${endpoint}):
generic device class:  ${caps.generic.label}
specific device class: ${caps.specific.label}
is dynamic end point:  ${caps.isDynamic}
supported CCs:`;
                for (const cc of caps.supportedCCs) {
                    const ccName = safe_1.CommandClasses[cc];
                    logMessage += `\n  · ${ccName ? ccName : (0, safe_2.num2hex)(cc)}`;
                }
                applHost.controllerLog.logNode(node.id, {
                    endpoint: this.endpointIndex,
                    message: logMessage,
                    direction: "inbound",
                });
            }
            else {
                applHost.controllerLog.logNode(node.id, {
                    endpoint: this.endpointIndex,
                    message: `Querying endpoint #${endpoint} capabilities timed out, aborting interview...`,
                    level: "warn",
                });
                return this.throwMissingCriticalInterviewResponse();
            }
        }
        // Now that all endpoints have been interviewed, remember which ones are there
        // But first figure out if they seem unnecessary and if they do, which ones should be preserved
        if (!multiResponse.identicalCapabilities &&
            areAllEndpointsDifferent(applHost, node, allEndpoints)) {
            const preserve = applHost.getDeviceConfig?.(node.id)?.compat
                ?.preserveEndpoints;
            if (!preserve) {
                allEndpoints = [];
                applHost.controllerLog.logNode(node.id, {
                    message: `Endpoints seem unnecessary b/c they have different device classes, ignoring all...`,
                });
            }
            else if (preserve === "*") {
                // preserve all endpoints, do nothing
                applHost.controllerLog.logNode(node.id, {
                    message: `Endpoints seem unnecessary, but are configured to be preserved.`,
                });
            }
            else {
                allEndpoints = allEndpoints.filter((ep) => preserve.includes(ep));
                applHost.controllerLog.logNode(node.id, {
                    message: `Endpoints seem unnecessary, but endpoints ${allEndpoints.join(", ")} are configured to be preserved.`,
                });
            }
        }
        this.setValue(applHost, exports.MultiChannelCCValues.endpointIndizes, allEndpoints);
        // Remember that the interview is complete
        this.setInterviewComplete(applHost, true);
    }
    async interviewV1(applHost) {
        const node = this.getNode(applHost);
        const endpoint = this.getEndpoint(applHost);
        const api = API_1.CCAPI.create(safe_1.CommandClasses["Multi Channel"], applHost, endpoint);
        const valueDB = this.getValueDB(applHost);
        // V1 works the opposite way - we scan all CCs and remember how many
        // endpoints they have
        const supportedCCs = [...node.getCCs()]
            // Don't query CCs the node only controls
            .filter(([, info]) => info.isSupported)
            .map(([cc]) => cc)
            // Don't query CCs that want to skip the endpoint interview
            .filter((cc) => !CommandClass_1.CommandClass.createInstanceUnchecked(applHost, node, cc)?.skipEndpointInterview());
        const endpointCounts = new Map();
        for (const ccId of supportedCCs) {
            applHost.controllerLog.logNode(node.id, {
                message: `Querying endpoint count for CommandClass ${(0, safe_1.getCCName)(ccId)}...`,
                direction: "outbound",
            });
            const endpointCount = await api.getEndpointCountV1(ccId);
            if (endpointCount != undefined) {
                endpointCounts.set(ccId, endpointCount);
                applHost.controllerLog.logNode(node.id, {
                    message: `CommandClass ${(0, safe_1.getCCName)(ccId)} has ${endpointCount} endpoints`,
                    direction: "inbound",
                });
            }
        }
        // Store the collected information
        // We have only individual and no dynamic and no aggregated endpoints
        const numEndpoints = Math.max(...endpointCounts.values());
        this.setValue(applHost, exports.MultiChannelCCValues.endpointCountIsDynamic, false);
        this.setValue(applHost, exports.MultiChannelCCValues.aggregatedEndpointCount, 0);
        this.setValue(applHost, exports.MultiChannelCCValues.individualEndpointCount, numEndpoints);
        // Since we queried all CCs separately, we can assume that all
        // endpoints have different capabilities
        this.setValue(applHost, exports.MultiChannelCCValues.endpointsHaveIdenticalCapabilities, false);
        for (let endpoint = 1; endpoint <= numEndpoints; endpoint++) {
            // Check which CCs exist on this endpoint
            const endpointCCs = [...endpointCounts.entries()]
                .filter(([, ccEndpoints]) => ccEndpoints >= endpoint)
                .map(([ccId]) => ccId);
            // And store it per endpoint
            valueDB.setValue(exports.MultiChannelCCValues.endpointCCs.endpoint(endpoint), endpointCCs);
        }
        // Remember that the interview is complete
        this.setInterviewComplete(applHost, true);
    }
};
MultiChannelCC = __decorate([
    (0, CommandClassDecorators_1.commandClass)(safe_1.CommandClasses["Multi Channel"]),
    (0, CommandClassDecorators_1.implementedVersion)(4),
    (0, CommandClassDecorators_1.ccValues)(exports.MultiChannelCCValues)
], MultiChannelCC);
exports.MultiChannelCC = MultiChannelCC;
let MultiChannelCCEndPointReport = class MultiChannelCCEndPointReport extends MultiChannelCC {
    constructor(host, options) {
        super(host, options);
        if ((0, CommandClass_1.gotDeserializationOptions)(options)) {
            (0, safe_1.validatePayload)(this.payload.length >= 2);
            this.countIsDynamic = !!(this.payload[0] & 0b10000000);
            this.identicalCapabilities = !!(this.payload[0] & 0b01000000);
            this.individualCount = this.payload[1] & 0b01111111;
            if (this.version >= 4 && this.payload.length >= 3) {
                this.aggregatedCount = this.payload[2] & 0b01111111;
            }
        }
        else {
            this.countIsDynamic = options.countIsDynamic;
            this.identicalCapabilities = options.identicalCapabilities;
            this.individualCount = options.individualCount;
            this.aggregatedCount = options.aggregatedCount;
        }
    }
    serialize() {
        this.payload = Buffer.from([
            (this.countIsDynamic ? 0b10000000 : 0) |
                (this.identicalCapabilities ? 0b01000000 : 0),
            this.individualCount & 0b01111111,
            this.aggregatedCount ?? 0,
        ]);
        return super.serialize();
    }
    toLogEntry(applHost) {
        const message = {
            "endpoint count (individual)": this.individualCount,
            "count is dynamic": this.countIsDynamic,
            "identical capabilities": this.identicalCapabilities,
        };
        if (this.aggregatedCount != undefined) {
            message["endpoint count (aggregated)"] = this.aggregatedCount;
        }
        const ret = {
            ...super.toLogEntry(applHost),
            message,
        };
        return ret;
    }
};
__decorate([
    (0, CommandClassDecorators_1.ccValue)(exports.MultiChannelCCValues.endpointCountIsDynamic)
], MultiChannelCCEndPointReport.prototype, "countIsDynamic", void 0);
__decorate([
    (0, CommandClassDecorators_1.ccValue)(exports.MultiChannelCCValues.endpointsHaveIdenticalCapabilities)
], MultiChannelCCEndPointReport.prototype, "identicalCapabilities", void 0);
__decorate([
    (0, CommandClassDecorators_1.ccValue)(exports.MultiChannelCCValues.individualEndpointCount)
], MultiChannelCCEndPointReport.prototype, "individualCount", void 0);
__decorate([
    (0, CommandClassDecorators_1.ccValue)(exports.MultiChannelCCValues.aggregatedEndpointCount)
], MultiChannelCCEndPointReport.prototype, "aggregatedCount", void 0);
MultiChannelCCEndPointReport = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.MultiChannelCommand.EndPointReport)
], MultiChannelCCEndPointReport);
exports.MultiChannelCCEndPointReport = MultiChannelCCEndPointReport;
let MultiChannelCCEndPointGet = class MultiChannelCCEndPointGet extends MultiChannelCC {
};
MultiChannelCCEndPointGet = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.MultiChannelCommand.EndPointGet),
    (0, CommandClassDecorators_1.expectedCCResponse)(MultiChannelCCEndPointReport)
], MultiChannelCCEndPointGet);
exports.MultiChannelCCEndPointGet = MultiChannelCCEndPointGet;
let MultiChannelCCCapabilityReport = class MultiChannelCCCapabilityReport extends MultiChannelCC {
    constructor(host, options) {
        super(host, options);
        if ((0, CommandClass_1.gotDeserializationOptions)(options)) {
            // Only validate the bytes we expect to see here
            // parseApplicationNodeInformation does its own validation
            (0, safe_1.validatePayload)(this.payload.length >= 1);
            this.endpointIndex = this.payload[0] & 0b01111111;
            this.isDynamic = !!(this.payload[0] & 0b10000000);
            const NIF = (0, safe_1.parseApplicationNodeInformation)(this.payload.slice(1));
            this.genericDeviceClass = NIF.genericDeviceClass;
            this.specificDeviceClass = NIF.specificDeviceClass;
            this.supportedCCs = NIF.supportedCCs;
            // Removal reports have very specific information
            this.wasRemoved =
                this.isDynamic &&
                    this.genericDeviceClass === 0xff && // "Non-Interoperable"
                    this.specificDeviceClass === 0x00;
        }
        else {
            this.endpointIndex = options.endpointIndex;
            this.genericDeviceClass = options.genericDeviceClass;
            this.specificDeviceClass = options.specificDeviceClass;
            this.supportedCCs = options.supportedCCs;
            this.isDynamic = options.isDynamic;
            this.wasRemoved = options.wasRemoved;
        }
    }
    persistValues(applHost) {
        if (!super.persistValues(applHost))
            return false;
        const deviceClassValue = exports.MultiChannelCCValues.endpointDeviceClass;
        const ccsValue = exports.MultiChannelCCValues.endpointCCs;
        if (this.wasRemoved) {
            this.removeValue(applHost, deviceClassValue);
            this.removeValue(applHost, ccsValue);
        }
        else {
            this.setValue(applHost, deviceClassValue, {
                generic: this.genericDeviceClass,
                specific: this.specificDeviceClass,
            });
            this.setValue(applHost, ccsValue, this.supportedCCs);
        }
        return true;
    }
    serialize() {
        this.payload = Buffer.concat([
            Buffer.from([
                (this.endpointIndex & 0b01111111) |
                    (this.isDynamic ? 0b10000000 : 0),
            ]),
            (0, safe_1.encodeApplicationNodeInformation)(this),
        ]);
        return super.serialize();
    }
    toLogEntry(applHost) {
        const generic = applHost.configManager.lookupGenericDeviceClass(this.genericDeviceClass);
        const specific = applHost.configManager.lookupSpecificDeviceClass(this.genericDeviceClass, this.specificDeviceClass);
        return {
            ...super.toLogEntry(applHost),
            message: {
                "endpoint index": this.endpointIndex,
                "generic device class": generic.label,
                "specific device class": specific.label,
                "is dynamic end point": this.isDynamic,
                "supported CCs": this.supportedCCs
                    .map((cc) => `\n· ${(0, safe_1.getCCName)(cc)}`)
                    .join(""),
            },
        };
    }
};
MultiChannelCCCapabilityReport = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.MultiChannelCommand.CapabilityReport)
], MultiChannelCCCapabilityReport);
exports.MultiChannelCCCapabilityReport = MultiChannelCCCapabilityReport;
let MultiChannelCCCapabilityGet = class MultiChannelCCCapabilityGet extends MultiChannelCC {
    constructor(host, options) {
        super(host, options);
        if ((0, CommandClass_1.gotDeserializationOptions)(options)) {
            (0, safe_1.validatePayload)(this.payload.length >= 1);
            this.requestedEndpoint = this.payload[0] & 0b01111111;
        }
        else {
            this.requestedEndpoint = options.requestedEndpoint;
        }
    }
    serialize() {
        this.payload = Buffer.from([this.requestedEndpoint & 0b01111111]);
        return super.serialize();
    }
    toLogEntry(applHost) {
        return {
            ...super.toLogEntry(applHost),
            message: { endpoint: this.requestedEndpoint },
        };
    }
};
MultiChannelCCCapabilityGet = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.MultiChannelCommand.CapabilityGet),
    (0, CommandClassDecorators_1.expectedCCResponse)(MultiChannelCCCapabilityReport)
], MultiChannelCCCapabilityGet);
exports.MultiChannelCCCapabilityGet = MultiChannelCCCapabilityGet;
let MultiChannelCCEndPointFindReport = class MultiChannelCCEndPointFindReport extends MultiChannelCC {
    constructor(host, options) {
        super(host, options);
        if ((0, CommandClass_1.gotDeserializationOptions)(options)) {
            (0, safe_1.validatePayload)(this.payload.length >= 3);
            this.reportsToFollow = this.payload[0];
            this.genericClass = this.payload[1];
            this.specificClass = this.payload[2];
            // Some devices omit the endpoint list although that is not allowed in the specs
            // therefore don't validatePayload here.
            this.foundEndpoints = [...this.payload.slice(3)]
                .map((e) => e & 0b01111111)
                .filter((e) => e !== 0);
        }
        else {
            this.genericClass = options.genericClass;
            this.specificClass = options.specificClass;
            this.foundEndpoints = options.foundEndpoints;
            this.reportsToFollow = options.reportsToFollow;
        }
    }
    serialize() {
        this.payload = Buffer.concat([
            Buffer.from([
                this.reportsToFollow,
                this.genericClass,
                this.specificClass,
            ]),
            Buffer.from(this.foundEndpoints.map((e) => e & 0b01111111)),
        ]);
        return super.serialize();
    }
    getPartialCCSessionId() {
        // Distinguish sessions by the requested device classes
        return {
            genericClass: this.genericClass,
            specificClass: this.specificClass,
        };
    }
    expectMoreMessages() {
        return this.reportsToFollow > 0;
    }
    mergePartialCCs(applHost, partials) {
        // Concat the list of end points
        this.foundEndpoints = [...partials, this]
            .map((report) => report.foundEndpoints)
            .reduce((prev, cur) => prev.concat(...cur), []);
    }
    toLogEntry(applHost) {
        return {
            ...super.toLogEntry(applHost),
            message: {
                "generic device class": applHost.configManager.lookupGenericDeviceClass(this.genericClass).label,
                "specific device class": applHost.configManager.lookupSpecificDeviceClass(this.genericClass, this.specificClass).label,
                "found endpoints": this.foundEndpoints.join(", "),
                "# of reports to follow": this.reportsToFollow,
            },
        };
    }
};
MultiChannelCCEndPointFindReport = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.MultiChannelCommand.EndPointFindReport)
], MultiChannelCCEndPointFindReport);
exports.MultiChannelCCEndPointFindReport = MultiChannelCCEndPointFindReport;
let MultiChannelCCEndPointFind = class MultiChannelCCEndPointFind extends MultiChannelCC {
    constructor(host, options) {
        super(host, options);
        if ((0, CommandClass_1.gotDeserializationOptions)(options)) {
            (0, safe_1.validatePayload)(this.payload.length >= 2);
            this.genericClass = this.payload[0];
            this.specificClass = this.payload[1];
        }
        else {
            this.genericClass = options.genericClass;
            this.specificClass = options.specificClass;
        }
    }
    serialize() {
        this.payload = Buffer.from([this.genericClass, this.specificClass]);
        return super.serialize();
    }
    toLogEntry(applHost) {
        return {
            ...super.toLogEntry(applHost),
            message: {
                "generic device class": applHost.configManager.lookupGenericDeviceClass(this.genericClass).label,
                "specific device class": applHost.configManager.lookupSpecificDeviceClass(this.genericClass, this.specificClass).label,
            },
        };
    }
};
MultiChannelCCEndPointFind = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.MultiChannelCommand.EndPointFind),
    (0, CommandClassDecorators_1.expectedCCResponse)(MultiChannelCCEndPointFindReport)
], MultiChannelCCEndPointFind);
exports.MultiChannelCCEndPointFind = MultiChannelCCEndPointFind;
let MultiChannelCCAggregatedMembersReport = class MultiChannelCCAggregatedMembersReport extends MultiChannelCC {
    constructor(host, options) {
        super(host, options);
        (0, safe_1.validatePayload)(this.payload.length >= 2);
        this.aggregatedEndpointIndex = this.payload[0] & 127;
        const bitMaskLength = this.payload[1];
        (0, safe_1.validatePayload)(this.payload.length >= 2 + bitMaskLength);
        const bitMask = this.payload.slice(2, 2 + bitMaskLength);
        this.members = (0, safe_1.parseBitMask)(bitMask);
    }
    toLogEntry(applHost) {
        return {
            ...super.toLogEntry(applHost),
            message: {
                "aggregated endpoint": this.aggregatedEndpointIndex,
                members: this.members.join(", "),
            },
        };
    }
};
__decorate([
    (0, CommandClassDecorators_1.ccValue)(exports.MultiChannelCCValues.aggregatedEndpointMembers, (self) => [self.aggregatedEndpointIndex])
], MultiChannelCCAggregatedMembersReport.prototype, "members", void 0);
MultiChannelCCAggregatedMembersReport = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.MultiChannelCommand.AggregatedMembersReport)
], MultiChannelCCAggregatedMembersReport);
exports.MultiChannelCCAggregatedMembersReport = MultiChannelCCAggregatedMembersReport;
let MultiChannelCCAggregatedMembersGet = class MultiChannelCCAggregatedMembersGet extends MultiChannelCC {
    constructor(host, options) {
        super(host, options);
        if ((0, CommandClass_1.gotDeserializationOptions)(options)) {
            // TODO: Deserialize payload
            throw new safe_1.ZWaveError(`${this.constructor.name}: deserialization not implemented`, safe_1.ZWaveErrorCodes.Deserialization_NotImplemented);
        }
        else {
            this.requestedEndpoint = options.requestedEndpoint;
        }
    }
    serialize() {
        this.payload = Buffer.from([this.requestedEndpoint & 127]);
        return super.serialize();
    }
    toLogEntry(applHost) {
        return {
            ...super.toLogEntry(applHost),
            message: { endpoint: this.requestedEndpoint },
        };
    }
};
MultiChannelCCAggregatedMembersGet = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.MultiChannelCommand.AggregatedMembersGet),
    (0, CommandClassDecorators_1.expectedCCResponse)(MultiChannelCCAggregatedMembersReport)
], MultiChannelCCAggregatedMembersGet);
exports.MultiChannelCCAggregatedMembersGet = MultiChannelCCAggregatedMembersGet;
// SDS13783: A receiving node MAY respond to a Multi Channel encapsulated command if the Destination
// End Point field specifies a single End Point. In that case, the response MUST be Multi Channel
// encapsulated.
// A receiving node MUST NOT respond to a Multi Channel encapsulated command if the
// Destination End Point field specifies multiple End Points via bit mask addressing.
function getCCResponseForCommandEncapsulation(sent) {
    if (typeof sent.destination === "number" &&
        sent.encapsulated.expectsCCResponse()) {
        // Allow both versions of the encapsulation command
        // Our implementation check is a bit too strict, so change the return type
        return [
            MultiChannelCCCommandEncapsulation,
            MultiChannelCCV1CommandEncapsulation,
        ];
    }
}
function testResponseForCommandEncapsulation(sent, received) {
    if (typeof sent.destination === "number" &&
        sent.destination === received.endpointIndex) {
        return "checkEncapsulated";
    }
    return false;
}
let MultiChannelCCCommandEncapsulation = class MultiChannelCCCommandEncapsulation extends MultiChannelCC {
    constructor(host, options) {
        super(host, options);
        if ((0, CommandClass_1.gotDeserializationOptions)(options)) {
            (0, safe_1.validatePayload)(this.payload.length >= 2);
            if (this.host.getDeviceConfig?.(this.nodeId)?.compat
                ?.treatDestinationEndpointAsSource) {
                // This device incorrectly uses the destination field to indicate the source endpoint
                this.endpointIndex = this.payload[1] & 127;
                this.destination = 0;
            }
            else {
                // Parse normally
                this.endpointIndex = this.payload[0] & 127;
                const isBitMask = !!(this.payload[1] & 128);
                const destination = this.payload[1] & 127;
                if (isBitMask) {
                    this.destination = (0, safe_1.parseBitMask)(Buffer.from([destination]));
                }
                else {
                    this.destination = destination;
                }
            }
            // No need to validate further, each CC does it for itself
            this.encapsulated = CommandClass_1.CommandClass.from(this.host, {
                data: this.payload.slice(2),
                fromEncapsulation: true,
                encapCC: this,
                origin: options.origin,
                frameType: options.frameType,
            });
        }
        else {
            this.encapsulated = options.encapsulated;
            options.encapsulated.encapsulatingCC = this;
            this.destination = options.destination;
            if (this.host.getDeviceConfig?.(this.nodeId)?.compat
                ?.treatDestinationEndpointAsSource) {
                // This device incorrectly responds from the endpoint we've passed as our source endpoint
                if (typeof this.destination === "number")
                    this.endpointIndex = this.destination;
            }
        }
    }
    serialize() {
        const destination = typeof this.destination === "number"
            ? // The destination is a single number
                this.destination & 127
            : // The destination is a bit mask
                (0, safe_1.encodeBitMask)(this.destination, 7)[0] | 128;
        this.payload = Buffer.concat([
            Buffer.from([this.endpointIndex & 127, destination]),
            this.encapsulated.serialize(),
        ]);
        return super.serialize();
    }
    toLogEntry(applHost) {
        return {
            ...super.toLogEntry(applHost),
            message: {
                source: this.endpointIndex,
                destination: typeof this.destination === "number"
                    ? this.destination
                    : this.destination.join(", "),
            },
        };
    }
    computeEncapsulationOverhead() {
        // Multi Channel CC adds two bytes for the source and destination endpoint
        return super.computeEncapsulationOverhead() + 2;
    }
};
MultiChannelCCCommandEncapsulation = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.MultiChannelCommand.CommandEncapsulation),
    (0, CommandClassDecorators_1.expectedCCResponse)(getCCResponseForCommandEncapsulation, testResponseForCommandEncapsulation)
], MultiChannelCCCommandEncapsulation);
exports.MultiChannelCCCommandEncapsulation = MultiChannelCCCommandEncapsulation;
let MultiChannelCCV1Report = class MultiChannelCCV1Report extends MultiChannelCC {
    constructor(host, options) {
        super(host, options);
        // V1 won't be extended in the future, so do an exact check
        (0, safe_1.validatePayload)(this.payload.length === 2);
        this.requestedCC = this.payload[0];
        this.endpointCount = this.payload[1];
    }
    toLogEntry(applHost) {
        return {
            ...super.toLogEntry(applHost),
            message: {
                CC: (0, safe_1.getCCName)(this.requestedCC),
                "# of endpoints": this.endpointCount,
            },
        };
    }
};
MultiChannelCCV1Report = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.MultiChannelCommand.ReportV1)
], MultiChannelCCV1Report);
exports.MultiChannelCCV1Report = MultiChannelCCV1Report;
function testResponseForMultiChannelV1Get(sent, received) {
    return sent.requestedCC === received.requestedCC;
}
let MultiChannelCCV1Get = class MultiChannelCCV1Get extends MultiChannelCC {
    constructor(host, options) {
        super(host, options);
        if ((0, CommandClass_1.gotDeserializationOptions)(options)) {
            // TODO: Deserialize payload
            throw new safe_1.ZWaveError(`${this.constructor.name}: deserialization not implemented`, safe_1.ZWaveErrorCodes.Deserialization_NotImplemented);
        }
        else {
            this.requestedCC = options.requestedCC;
        }
    }
    serialize() {
        this.payload = Buffer.from([this.requestedCC]);
        return super.serialize();
    }
    toLogEntry(applHost) {
        return {
            ...super.toLogEntry(applHost),
            message: { CC: (0, safe_1.getCCName)(this.requestedCC) },
        };
    }
};
MultiChannelCCV1Get = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.MultiChannelCommand.GetV1),
    (0, CommandClassDecorators_1.expectedCCResponse)(MultiChannelCCV1Report, testResponseForMultiChannelV1Get)
], MultiChannelCCV1Get);
exports.MultiChannelCCV1Get = MultiChannelCCV1Get;
function getResponseForV1CommandEncapsulation(sent) {
    if (sent.encapsulated.expectsCCResponse()) {
        return MultiChannelCCV1CommandEncapsulation;
    }
}
function testResponseForV1CommandEncapsulation(sent, received) {
    if (sent.endpointIndex === received.endpointIndex) {
        return "checkEncapsulated";
    }
    return false;
}
let MultiChannelCCV1CommandEncapsulation = class MultiChannelCCV1CommandEncapsulation extends MultiChannelCC {
    constructor(host, options) {
        super(host, options);
        if ((0, CommandClass_1.gotDeserializationOptions)(options)) {
            (0, safe_1.validatePayload)(this.payload.length >= 1);
            this.endpointIndex = this.payload[0];
            // Some devices send invalid reports, i.e. MultiChannelCCV1CommandEncapsulation, but with V2+ binary format
            // This would be a NoOp CC, but it makes no sense to encapsulate that.
            const isV2withV1Header = this.payload.length >= 2 && this.payload[1] === 0x00;
            // No need to validate further, each CC does it for itself
            this.encapsulated = CommandClass_1.CommandClass.from(this.host, {
                data: this.payload.slice(isV2withV1Header ? 2 : 1),
                fromEncapsulation: true,
                encapCC: this,
                origin: options.origin,
                frameType: options.frameType,
            });
        }
        else {
            this.encapsulated = options.encapsulated;
            // No need to distinguish between source and destination in V1
            this.endpointIndex = this.encapsulated.endpointIndex;
        }
    }
    serialize() {
        this.payload = Buffer.concat([
            Buffer.from([this.endpointIndex]),
            this.encapsulated.serialize(),
        ]);
        return super.serialize();
    }
    computeEncapsulationOverhead() {
        // Multi Channel CC V1 adds one byte for the endpoint index
        return super.computeEncapsulationOverhead() + 1;
    }
    toLogEntry(applHost) {
        return {
            ...super.toLogEntry(applHost),
            message: { source: this.endpointIndex },
        };
    }
};
MultiChannelCCV1CommandEncapsulation = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.MultiChannelCommand.CommandEncapsulationV1),
    (0, CommandClassDecorators_1.expectedCCResponse)(getResponseForV1CommandEncapsulation, testResponseForV1CommandEncapsulation)
], MultiChannelCCV1CommandEncapsulation);
exports.MultiChannelCCV1CommandEncapsulation = MultiChannelCCV1CommandEncapsulation;
//# sourceMappingURL=MultiChannelCC.js.map