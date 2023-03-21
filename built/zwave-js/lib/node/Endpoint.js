"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Endpoint = void 0;
const cc_1 = require("@zwave-js/cc");
const ZWavePlusCC_1 = require("@zwave-js/cc/ZWavePlusCC");
const core_1 = require("@zwave-js/core");
const shared_1 = require("@zwave-js/shared");
const util_1 = require("util");
const NetworkCache_1 = require("../driver/NetworkCache");
/**
 * Represents a physical endpoint of a Z-Wave node. This can either be the root
 * device itself (index 0) or a more specific endpoint like a single plug.
 *
 * Each endpoint may have different capabilities (device class/supported CCs)
 */
class Endpoint {
    constructor(
    /** The id of the node this endpoint belongs to */
    nodeId, 
    /** The driver instance this endpoint belongs to */
    driver, 
    /** The index of this endpoint. 0 for the root device, 1+ otherwise */
    index, deviceClass, supportedCCs) {
        this.nodeId = nodeId;
        this.driver = driver;
        this.index = index;
        /** Required by {@link IZWaveEndpoint} */
        this.virtual = false;
        this._implementedCommandClasses = new core_1.CacheBackedMap(this.driver.networkCache, {
            prefix: NetworkCache_1.cacheKeys.node(this.nodeId).endpoint(this.index)._ccBaseKey,
            suffixSerializer: (cc) => (0, shared_1.num2hex)(cc),
            suffixDeserializer: (key) => {
                const ccId = parseInt(key, 16);
                if (ccId in core_1.CommandClasses)
                    return ccId;
            },
        });
        this._commandClassAPIs = new Map();
        this._commandClassAPIsProxy = new Proxy(this._commandClassAPIs, {
            get: (target, ccNameOrId) => {
                // Avoid ultra-weird error messages during testing
                if (process.env.NODE_ENV === "test" &&
                    typeof ccNameOrId === "string" &&
                    (ccNameOrId === "$$typeof" ||
                        ccNameOrId === "constructor" ||
                        ccNameOrId.includes("@@__IMMUTABLE"))) {
                    return undefined;
                }
                if (typeof ccNameOrId === "symbol") {
                    // Allow access to the iterator symbol
                    if (ccNameOrId === Symbol.iterator) {
                        return this.commandClassesIterator;
                    }
                    else if (ccNameOrId === Symbol.toStringTag) {
                        return "[object Object]";
                    }
                    // ignore all other symbols
                    return undefined;
                }
                else {
                    // The command classes are exposed to library users by their name or the ID
                    const ccId = (0, cc_1.normalizeCCNameOrId)(ccNameOrId);
                    if (ccId == undefined) {
                        throw new core_1.ZWaveError(`Command Class ${ccNameOrId} is not implemented!`, core_1.ZWaveErrorCodes.CC_NotImplemented);
                    }
                    // When accessing a CC API for the first time, we need to create it
                    if (!target.has(ccId)) {
                        const api = cc_1.CCAPI.create(ccId, this.driver, this);
                        target.set(ccId, api);
                    }
                    return target.get(ccId);
                }
            },
        });
        /**
         * Used to iterate over the commandClasses API without throwing errors by accessing unsupported CCs
         */
        this.commandClassesIterator = function* () {
            for (const cc of this.implementedCommandClasses.keys()) {
                if (this.supportsCC(cc))
                    yield this.commandClasses[cc];
            }
        }.bind(this);
        this.applyDeviceClass(deviceClass);
        // Add optional CCs
        if (supportedCCs != undefined) {
            for (const cc of supportedCCs) {
                this.addCC(cc, { isSupported: true });
            }
        }
    }
    get deviceClass() {
        if (this.index > 0) {
            return this._deviceClass;
        }
        else {
            return this.driver.cacheGet(NetworkCache_1.cacheKeys.node(this.nodeId).deviceClass);
        }
    }
    set deviceClass(deviceClass) {
        if (this.index > 0) {
            this._deviceClass = deviceClass;
        }
        else {
            this.driver.cacheSet(NetworkCache_1.cacheKeys.node(this.nodeId).deviceClass, deviceClass);
        }
    }
    /** Can be used to distinguish multiple endpoints of a node */
    get endpointLabel() {
        return this.getNodeUnsafe()?.deviceConfig?.endpoints?.get(this.index)
            ?.label;
    }
    /** Resets all stored information of this endpoint */
    reset() {
        this._implementedCommandClasses.clear();
        this._commandClassAPIs.clear();
    }
    /**
     * @internal
     * Information about the implemented Command Classes of this endpoint.
     */
    get implementedCommandClasses() {
        return this._implementedCommandClasses;
    }
    getCCs() {
        return this._implementedCommandClasses.entries();
    }
    /**
     * Sets the device class of this endpoint and configures the mandatory CCs.
     * **Note:** This does nothing if the device class was already configured
     */
    applyDeviceClass(deviceClass) {
        if (this.deviceClass)
            return;
        this.deviceClass = deviceClass;
        // Add mandatory CCs
        if (deviceClass) {
            for (const cc of deviceClass.mandatorySupportedCCs) {
                this.addMandatoryCC(cc, { isSupported: true });
            }
            for (const cc of deviceClass.mandatoryControlledCCs) {
                this.addMandatoryCC(cc, { isControlled: true });
            }
        }
    }
    /**
     * Adds a CC to the list of command classes implemented by the endpoint or updates the information.
     * You shouldn't need to call this yourself.
     * @param info The information about the command class. This is merged with existing information.
     */
    addCC(cc, info) {
        // Endpoints cannot support Multi Channel CC
        if (this.index > 0 && cc === core_1.CommandClasses["Multi Channel"])
            return;
        const original = this._implementedCommandClasses.get(cc);
        const updated = Object.assign({}, original ?? {
            isSupported: false,
            isControlled: false,
            secure: false,
            version: 0,
        }, info);
        if (!(0, util_1.isDeepStrictEqual)(original, updated)) {
            this._implementedCommandClasses.set(cc, updated);
        }
    }
    /**
     * Adds a mandatory CC to the list of command classes implemented by the endpoint or updates the information.
     * Performs some sanity checks before adding so the behavior is in compliance with the specifications
     */
    addMandatoryCC(cc, info) {
        if (this.getNodeUnsafe()?.isListening &&
            (cc === core_1.CommandClasses.Battery || cc === core_1.CommandClasses["Wake Up"])) {
            // Avoid adding Battery and Wake Up CC to always listening nodes or their endpoints
            return;
        }
        else if (this.index > 0 &&
            [
                core_1.CommandClasses["CRC-16 Encapsulation"],
                core_1.CommandClasses["Device Reset Locally"],
                core_1.CommandClasses["Manufacturer Specific"],
                core_1.CommandClasses.Powerlevel,
                core_1.CommandClasses.Version,
                core_1.CommandClasses["Transport Service"],
            ].includes(cc)) {
            // Avoid adding CCs as mandatory to endpoints that should only be implemented by the root device
            return;
        }
        this.addCC(cc, info);
    }
    /** Removes a CC from the list of command classes implemented by the endpoint */
    removeCC(cc) {
        this._implementedCommandClasses.delete(cc);
    }
    /** Tests if this endpoint supports the given CommandClass */
    supportsCC(cc) {
        return !!this._implementedCommandClasses.get(cc)?.isSupported;
    }
    /** Tests if this endpoint supports or controls the given CC only securely */
    isCCSecure(cc) {
        return !!this._implementedCommandClasses.get(cc)?.secure;
    }
    /** Tests if this endpoint controls the given CommandClass */
    controlsCC(cc) {
        return !!this._implementedCommandClasses.get(cc)?.isControlled;
    }
    /** Removes the BasicCC from the supported CCs if any other actuator CCs are supported */
    hideBasicCCInFavorOfActuatorCCs() {
        // This behavior is defined in SDS14223
        if (this.supportsCC(core_1.CommandClasses.Basic) &&
            core_1.actuatorCCs.some((cc) => this.supportsCC(cc))) {
            // We still want to know if BasicCC is controlled, so only mark it as not supported
            this.addCC(core_1.CommandClasses.Basic, { isSupported: false });
            // If the record is now only a dummy, remove the CC
            if (!this.supportsCC(core_1.CommandClasses.Basic) &&
                !this.controlsCC(core_1.CommandClasses.Basic)) {
                this.removeCC(core_1.CommandClasses.Basic);
            }
        }
    }
    /**
     * Retrieves the version of the given CommandClass this endpoint implements.
     * Returns 0 if the CC is not supported.
     */
    getCCVersion(cc) {
        const ccInfo = this._implementedCommandClasses.get(cc);
        const ret = ccInfo?.version ?? 0;
        // The specs are contracting themselves here...
        //
        // CC Control Specification:
        // A controlling node interviewing a Multi Channel End Point
        // MUST request the End Point’s Command Class version from the Root Device
        // if the End Point does not advertise support for the Version Command Class.
        //   - vs -
        // Management CC Specification:
        // [...] the Version Command Class SHOULD NOT be supported by individual End Points
        // The Root Device MUST respond to Version requests for any Command Class
        // implemented by the Multi Channel device; also in cases where the actual
        // Command Class is only provided by an End Point.
        //
        // We go with the 2nd interpretation since the other either results in
        // an unnecessary Version CC interview for each endpoint or an incorrect V1 for endpoints
        if (ret === 0 && this.index > 0) {
            return this.getNodeUnsafe().getCCVersion(cc);
        }
        return ret;
    }
    /**
     * Creates an instance of the given CC and links it to this endpoint.
     * Throws if the CC is neither supported nor controlled by the endpoint.
     */
    createCCInstance(cc) {
        const ccId = typeof cc === "number" ? cc : (0, cc_1.getCommandClassStatic)(cc);
        if (!this.supportsCC(ccId) && !this.controlsCC(ccId)) {
            throw new core_1.ZWaveError(`Cannot create an instance of the unsupported CC ${core_1.CommandClasses[ccId]} (${(0, shared_1.num2hex)(ccId)})`, core_1.ZWaveErrorCodes.CC_NotSupported);
        }
        return cc_1.CommandClass.createInstanceUnchecked(this.driver, this, cc);
    }
    /**
     * Creates an instance of the given CC and links it to this endpoint.
     * Returns `undefined` if the CC is neither supported nor controlled by the endpoint.
     */
    createCCInstanceUnsafe(cc) {
        const ccId = typeof cc === "number" ? cc : (0, cc_1.getCommandClassStatic)(cc);
        if (this.supportsCC(ccId) || this.controlsCC(ccId)) {
            return cc_1.CommandClass.createInstanceUnchecked(this.driver, this, cc);
        }
    }
    /** Returns instances for all CCs this endpoint supports, that should be interviewed, and that are implemented in this library */
    getSupportedCCInstances() {
        let supportedCCInstances = [...this.implementedCommandClasses.keys()]
            // Don't interview CCs the node or endpoint only controls
            .filter((cc) => this.supportsCC(cc))
            // Filter out CCs we don't implement
            .map((cc) => this.createCCInstance(cc))
            .filter((instance) => !!instance);
        // For endpoint interviews, we skip some CCs
        if (this.index > 0) {
            supportedCCInstances = supportedCCInstances.filter((instance) => !instance.skipEndpointInterview());
        }
        return supportedCCInstances;
    }
    /** Builds the dependency graph used to automatically determine the order of CC interviews */
    buildCCInterviewGraph(skipCCs) {
        const supportedCCs = this.getSupportedCCInstances()
            .map((instance) => instance.ccId)
            .filter((ccId) => !skipCCs.includes(ccId));
        // Create GraphNodes from all supported CCs that should not be skipped
        const ret = supportedCCs.map((cc) => new core_1.GraphNode(cc));
        // Create the dependencies
        for (const node of ret) {
            const instance = this.createCCInstance(node.value);
            for (const requiredCCId of instance.determineRequiredCCInterviews()) {
                const requiredCC = ret.find((instance) => instance.value === requiredCCId);
                if (requiredCC)
                    node.edges.add(requiredCC);
            }
        }
        return ret;
    }
    /**
     * @internal
     * Creates an API instance for a given command class. Throws if no API is defined.
     * @param ccId The command class to create an API instance for
     * @param requireSupport Whether accessing the API should throw if it is not supported by the node.
     */
    createAPI(ccId, requireSupport = true) {
        // Trust me on this, TypeScript :)
        return cc_1.CCAPI.create(ccId, this.driver, this, requireSupport);
    }
    /**
     * Provides access to simplified APIs that are tailored to specific CCs.
     * Make sure to check support of each API using `API.isSupported()` since
     * all other API calls will throw if the API is not supported
     */
    get commandClasses() {
        return this._commandClassAPIsProxy;
    }
    /** Allows checking whether a CC API is supported before calling it with {@link Endpoint.invokeCCAPI} */
    supportsCCAPI(cc) {
        // No need to validate the `cc` parameter, the following line will throw for invalid CCs
        return this.commandClasses[cc].isSupported();
    }
    /**
     * Allows dynamically calling any CC API method on this endpoint by CC ID and method name.
     * Use {@link Endpoint.supportsCCAPI} to check support first.
     */
    invokeCCAPI(cc, method, ...args) {
        // No need to validate the `cc` parameter, the following line will throw for invalid CCs
        const CCAPI = this.commandClasses[cc];
        const ccId = (0, cc_1.normalizeCCNameOrId)(cc);
        const ccName = (0, core_1.getCCName)(ccId);
        if (!CCAPI) {
            throw new core_1.ZWaveError(`The API for the ${ccName} CC does not exist or is not implemented!`, core_1.ZWaveErrorCodes.CC_NoAPI);
        }
        const apiMethod = CCAPI[method];
        if (typeof apiMethod !== "function") {
            throw new core_1.ZWaveError(`Method "${method}" does not exist on the API for the ${ccName} CC!`, core_1.ZWaveErrorCodes.CC_NotImplemented);
        }
        return apiMethod.apply(CCAPI, args);
    }
    /**
     * Returns the node this endpoint belongs to (or undefined if the node doesn't exist)
     */
    getNodeUnsafe() {
        return this.driver.controller.nodes.get(this.nodeId);
    }
    /** Z-Wave+ Icon (for management) */
    get installerIcon() {
        return this.getNodeUnsafe()?.getValue(ZWavePlusCC_1.ZWavePlusCCValues.installerIcon.endpoint(this.index));
    }
    /** Z-Wave+ Icon (for end users) */
    get userIcon() {
        return this.getNodeUnsafe()?.getValue(ZWavePlusCC_1.ZWavePlusCCValues.userIcon.endpoint(this.index));
    }
}
exports.Endpoint = Endpoint;
//# sourceMappingURL=Endpoint.js.map