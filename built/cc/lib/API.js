"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeCCNameOrId = exports.PhysicalCCAPI = exports.CCAPI = exports.throwWrongValueType = exports.throwMissingPropertyKey = exports.throwUnsupportedPropertyKey = exports.throwUnsupportedProperty = exports.POLL_VALUE = exports.SET_VALUE = void 0;
const core_1 = require("@zwave-js/core");
const shared_1 = require("@zwave-js/shared");
const typeguards_1 = require("alcalzone-shared/typeguards");
const CommandClassDecorators_1 = require("./CommandClassDecorators");
/** Used to identify the method on the CC API class that handles setting values on nodes directly */
exports.SET_VALUE = Symbol.for("CCAPI_SET_VALUE");
/** Used to identify the method on the CC API class that handles polling values from nodes */
exports.POLL_VALUE = Symbol.for("CCAPI_POLL_VALUE");
// Since the setValue API is called from a point with very generic parameters,
// we must do narrowing inside the API calls. These three methods are for convenience
function throwUnsupportedProperty(cc, property) {
    throw new core_1.ZWaveError(`${core_1.CommandClasses[cc]}: "${property}" is not a supported property`, core_1.ZWaveErrorCodes.Argument_Invalid);
}
exports.throwUnsupportedProperty = throwUnsupportedProperty;
function throwUnsupportedPropertyKey(cc, property, propertyKey) {
    throw new core_1.ZWaveError(`${core_1.CommandClasses[cc]}: "${propertyKey}" is not a supported property key for property "${property}"`, core_1.ZWaveErrorCodes.Argument_Invalid);
}
exports.throwUnsupportedPropertyKey = throwUnsupportedPropertyKey;
function throwMissingPropertyKey(cc, property) {
    throw new core_1.ZWaveError(`${core_1.CommandClasses[cc]}: property "${property}" requires a property key, but none was given`, core_1.ZWaveErrorCodes.Argument_Invalid);
}
exports.throwMissingPropertyKey = throwMissingPropertyKey;
function throwWrongValueType(cc, property, expectedType, receivedType) {
    throw new core_1.ZWaveError(`${core_1.CommandClasses[cc]}: "${property}" must be of type "${expectedType}", received "${receivedType}"`, core_1.ZWaveErrorCodes.Argument_Invalid);
}
exports.throwWrongValueType = throwWrongValueType;
/**
 * The base class for all CC APIs exposed via `Node.commandClasses.<CCName>`
 * @publicAPI
 */
class CCAPI {
    constructor(applHost, endpoint) {
        this.applHost = applHost;
        this.endpoint = endpoint;
        this.ccId = (0, CommandClassDecorators_1.getCommandClass)(this);
    }
    static create(ccId, applHost, endpoint, requireSupport) {
        const APIConstructor = (0, CommandClassDecorators_1.getAPI)(ccId);
        const ccName = core_1.CommandClasses[ccId];
        if (APIConstructor == undefined) {
            throw new core_1.ZWaveError(`Command Class ${ccName} (${(0, shared_1.num2hex)(ccId)}) has no associated API!`, core_1.ZWaveErrorCodes.CC_NoAPI);
        }
        const apiInstance = new APIConstructor(applHost, endpoint);
        // Only require support for physical endpoints by default
        requireSupport ?? (requireSupport = !endpoint.virtual);
        if (requireSupport) {
            // @ts-expect-error TS doesn't like assigning to conditional types
            return new Proxy(apiInstance, {
                get: (target, property) => {
                    // Forbid access to the API if it is not supported by the node
                    if (property !== "ccId" &&
                        property !== "endpoint" &&
                        property !== "isSupported" &&
                        property !== "withOptions" &&
                        property !== "commandOptions" &&
                        !target.isSupported()) {
                        let messageStart;
                        if (endpoint.virtual) {
                            const hasNodeId = typeof endpoint.nodeId === "number" &&
                                endpoint.nodeId !== core_1.NODE_ID_BROADCAST;
                            messageStart = `${hasNodeId ? "The" : "This"} virtual node${hasNodeId ? ` ${endpoint.nodeId}` : ""}`;
                        }
                        else {
                            messageStart = `Node ${endpoint.nodeId}`;
                        }
                        throw new core_1.ZWaveError(`${messageStart}${endpoint.index === 0
                            ? ""
                            : ` (endpoint ${endpoint.index})`} does not support the Command Class ${ccName}!`, core_1.ZWaveErrorCodes.CC_NotSupported);
                    }
                    return target[property];
                },
            });
        }
        else {
            // @ts-expect-error TS doesn't like assigning to conditional types
            return apiInstance;
        }
    }
    /**
     * Can be used on supported CC APIs to set a CC value by property name (and optionally the property key)
     */
    get setValue() {
        return this[exports.SET_VALUE];
    }
    /** Whether a successful setValue call should imply that the value was successfully updated */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    isSetValueOptimistic(valueId) {
        return true;
    }
    /**
     * Can be used on supported CC APIs to poll a CC value by property name (and optionally the property key)
     */
    get pollValue() {
        return this[exports.POLL_VALUE]?.bind(this);
    }
    /**
     * Schedules a value to be polled after a given time. Schedules are deduplicated on a per-property basis.
     * @returns `true` if the poll was scheduled, `false` otherwise
     */
    schedulePoll(property, expectedValue, { duration, transition = "slow" } = {}) {
        // Figure out the delay. If a non-zero duration was given or this is a "fast" transition,
        // use/add the short delay. Otherwise, default to the long delay.
        const durationMs = duration?.toMilliseconds() ?? 0;
        const additionalDelay = !!durationMs || transition === "fast"
            ? this.applHost.options.timeouts.refreshValueAfterTransition
            : this.applHost.options.timeouts.refreshValue;
        const timeoutMs = durationMs + additionalDelay;
        if (this.isSinglecast()) {
            const node = this.endpoint.getNodeUnsafe();
            if (!node)
                return false;
            return this.applHost.schedulePoll(node.id, {
                commandClass: this.ccId,
                endpoint: this.endpoint.index,
                ...property,
            }, { timeoutMs, expectedValue });
        }
        else if (this.isMulticast()) {
            // Only poll supporting nodes in multicast
            const supportingNodes = this.endpoint.node.physicalNodes.filter((node) => node
                .getEndpoint(this.endpoint.index)
                ?.supportsCC(this.ccId));
            let ret = false;
            for (const node of supportingNodes) {
                ret || (ret = this.applHost.schedulePoll(node.id, {
                    commandClass: this.ccId,
                    endpoint: this.endpoint.index,
                    ...property,
                }, { timeoutMs, expectedValue }));
            }
            return ret;
        }
        else {
            // Don't poll the broadcast node
            return false;
        }
    }
    /**
     * Retrieves the version of the given CommandClass this endpoint implements
     */
    get version() {
        if (this.isSinglecast() && this.endpoint.nodeId !== core_1.NODE_ID_BROADCAST) {
            return this.applHost.getSafeCCVersionForNode(this.ccId, this.endpoint.nodeId, this.endpoint.index);
        }
        else {
            return (0, CommandClassDecorators_1.getImplementedVersion)(this.ccId);
        }
    }
    /** Determines if this simplified API instance may be used. */
    isSupported() {
        return (
        // NoOperation is always supported
        this.ccId === core_1.CommandClasses["No Operation"] ||
            // Basic should always be supported. Since we are trying to hide it from library consumers
            // we cannot trust supportsCC to test it
            this.ccId === core_1.CommandClasses.Basic ||
            this.endpoint.supportsCC(this.ccId));
    }
    /**
     * Determine whether the linked node supports a specific command of this command class.
     * "unknown" means that the information has not been received yet
     */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    supportsCommand(command) {
        // This needs to be overwritten per command class. In the default implementation, we don't know anything!
        return core_1.unknownBoolean;
    }
    assertSupportsCommand(commandEnum, command) {
        if (this.supportsCommand(command) !== true) {
            throw new core_1.ZWaveError(`${this.isSinglecast()
                ? `Node #${this.endpoint.nodeId}`
                : "This virtual node"}${this.endpoint.index > 0
                ? ` (Endpoint ${this.endpoint.index})`
                : ""} does not support the command ${(0, shared_1.getEnumMemberName)(commandEnum, command)}!`, core_1.ZWaveErrorCodes.CC_NotSupported);
        }
    }
    assertPhysicalEndpoint(endpoint) {
        if (endpoint.virtual) {
            throw new core_1.ZWaveError(`This method is not supported for virtual nodes!`, core_1.ZWaveErrorCodes.CC_NotSupported);
        }
    }
    /** Returns the command options to use for sendCommand calls */
    get commandOptions() {
        // No default options
        return {};
    }
    /** Creates an instance of this API, scoped to use the given options */
    withOptions(options) {
        const mergedOptions = {
            ...this.commandOptions,
            ...options,
        };
        return new Proxy(this, {
            get: (target, property) => {
                if (property === "commandOptions") {
                    return mergedOptions;
                }
                else {
                    return target[property];
                }
            },
        });
    }
    /** Creates an instance of this API which (if supported) will return TX reports along with the result. */
    withTXReport() {
        if (this.constructor === CCAPI) {
            throw new core_1.ZWaveError("The withTXReport method may only be called on specific CC API implementations.", core_1.ZWaveErrorCodes.Driver_NotSupported);
        }
        // Remember which properties need to be proxied
        const ownProps = new Set(Object.getOwnPropertyNames(this.constructor.prototype));
        ownProps.delete("constructor");
        function wrapResult(result, txReport) {
            // Both the result and the TX report may be undefined (no response, no support)
            return (0, core_1.stripUndefined)({
                result,
                txReport,
            });
        }
        return new Proxy(this, {
            get: (target, prop) => {
                if (prop === "withTXReport")
                    return undefined;
                let original = target[prop];
                if (ownProps.has(prop) &&
                    typeof original === "function") {
                    // This is a method that only exists in the specific implementation
                    // Wrap each call with its own API proxy, so we don't mix up TX reports
                    let txReport;
                    const api = target.withOptions({
                        onTXReport: (report) => {
                            // Remember the last status report
                            txReport = report;
                        },
                    });
                    original = api[prop].bind(api);
                    // Return a wrapper function that will add the status report after the call is complete
                    return (...args) => {
                        let result = original(...args);
                        if (result instanceof Promise) {
                            result = result.then((res) => wrapResult(res, txReport));
                        }
                        else {
                            result = wrapResult(result, txReport);
                        }
                        return result;
                    };
                }
                else {
                    return original;
                }
            },
        });
    }
    isSinglecast() {
        return (!this.endpoint.virtual &&
            typeof this.endpoint.nodeId === "number" &&
            this.endpoint.nodeId !== core_1.NODE_ID_BROADCAST);
    }
    isMulticast() {
        return this.endpoint.virtual && (0, typeguards_1.isArray)(this.endpoint.nodeId);
    }
    isBroadcast() {
        return (this.endpoint.virtual && this.endpoint.nodeId === core_1.NODE_ID_BROADCAST);
    }
    /**
     * Returns the node this CC API is linked to. Throws if the controller is not yet ready.
     */
    getNode() {
        if (this.isSinglecast()) {
            return this.applHost.nodes.get(this.endpoint.nodeId);
        }
    }
    /**
     * @internal
     * Returns the node this CC API is linked to (or undefined if the node doesn't exist)
     */
    getNodeUnsafe() {
        try {
            return this.getNode();
        }
        catch (e) {
            // This was expected
            if ((0, core_1.isZWaveError)(e) && e.code === core_1.ZWaveErrorCodes.Driver_NotReady) {
                return undefined;
            }
            // Something else happened
            throw e;
        }
    }
    /** Returns the value DB for this CC API's node (if it can be safely accessed) */
    tryGetValueDB() {
        if (!this.isSinglecast())
            return;
        try {
            return this.applHost.getValueDB(this.endpoint.nodeId);
        }
        catch {
            return;
        }
    }
    /** Returns the value DB for this CC's node (or throws if it cannot be accessed) */
    getValueDB() {
        if (this.isSinglecast()) {
            try {
                return this.applHost.getValueDB(this.endpoint.nodeId);
            }
            catch {
                throw new core_1.ZWaveError("The node for this CC does not exist or the driver is not ready yet", core_1.ZWaveErrorCodes.Driver_NotReady);
            }
        }
        throw new core_1.ZWaveError("Cannot retrieve the value DB for non-singlecast CCs", core_1.ZWaveErrorCodes.CC_NoNodeID);
    }
}
exports.CCAPI = CCAPI;
/** A CC API that is only available for physical endpoints */
class PhysicalCCAPI extends CCAPI {
    constructor(applHost, endpoint) {
        super(applHost, endpoint);
        this.assertPhysicalEndpoint(endpoint);
    }
}
exports.PhysicalCCAPI = PhysicalCCAPI;
function normalizeCCNameOrId(ccNameOrId) {
    if (!(ccNameOrId in core_1.CommandClasses))
        return undefined;
    let ret;
    if (typeof ccNameOrId === "string") {
        if (/^\d+$/.test(ccNameOrId)) {
            // This can happen on property access
            ret = +ccNameOrId;
        }
        else if (typeof core_1.CommandClasses[ccNameOrId] === "number") {
            ret = core_1.CommandClasses[ccNameOrId];
        }
    }
    else {
        ret = ccNameOrId;
    }
    return ret;
}
exports.normalizeCCNameOrId = normalizeCCNameOrId;
//# sourceMappingURL=API.js.map