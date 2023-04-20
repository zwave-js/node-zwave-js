"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VirtualEndpoint = void 0;
const cc_1 = require("@zwave-js/cc");
const safe_1 = require("@zwave-js/core/safe");
const safe_2 = require("@zwave-js/shared/safe");
const arrays_1 = require("alcalzone-shared/arrays");
/**
 * Represents an endpoint of a virtual (broadcast, multicast) Z-Wave node.
 * This can either be the root device itself (index 0) or a more specific endpoint like a single plug.
 *
 * The endpoint's capabilities are determined by the capabilities of the individual nodes' endpoints.
 */
class VirtualEndpoint {
    constructor(
    /** The virtual node this endpoint belongs to (or undefined if it set later) */
    node, 
    /** The driver instance this endpoint belongs to */
    driver, 
    /** The index of this endpoint. 0 for the root device, 1+ otherwise */
    index, 
    /** Default command options to use for the CC API */
    defaultCommandOptions) {
        this.driver = driver;
        this.index = index;
        this.defaultCommandOptions = defaultCommandOptions;
        /** Required by {@link IZWaveEndpoint} */
        this.virtual = true;
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
                        throw new safe_1.ZWaveError(`Command Class ${ccNameOrId} is not implemented!`, safe_1.ZWaveErrorCodes.CC_NotImplemented);
                    }
                    // When accessing a CC API for the first time, we need to create it
                    if (!target.has(ccId)) {
                        const api = this.createAPI(ccId);
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
            const allCCs = (0, arrays_1.distinct)(this._node.physicalNodes
                .map((n) => n.getEndpoint(this.index))
                .filter((e) => !!e)
                .map((e) => [...e.implementedCommandClasses.keys()])
                .reduce((acc, cur) => [...acc, ...cur], []));
            for (const cc of allCCs) {
                if (this.supportsCC(cc)) {
                    // When a CC is supported, it can still happen that the CC API
                    // cannot be created for virtual endpoints
                    const APIConstructor = (0, cc_1.getAPI)(cc);
                    if ((0, safe_2.staticExtends)(APIConstructor, cc_1.PhysicalCCAPI))
                        continue;
                    yield this.commandClasses[cc];
                }
            }
        }.bind(this);
        if (node)
            this._node = node;
    }
    get node() {
        return this._node;
    }
    /** @internal */
    setNode(node) {
        this._node = node;
    }
    get nodeId() {
        // Use the defined node ID if it exists
        if (this.node.id != undefined)
            return this.node.id;
        // Otherwise deduce it from the physical nodes
        const ret = this.node.physicalNodes.map((n) => n.id);
        if (ret.length === 1)
            return ret[0];
        return ret;
    }
    /** Tests if this endpoint supports the given CommandClass */
    supportsCC(cc) {
        // A virtual endpoints supports a CC if any of the physical endpoints it targets supports the CC non-securely
        // Security S0 does not support broadcast / multicast!
        return this.node.physicalNodes.some((n) => {
            const endpoint = n.getEndpoint(this.index);
            return endpoint?.supportsCC(cc) && !endpoint?.isCCSecure(cc);
        });
    }
    /**
     * Retrieves the minimum non-zero version of the given CommandClass the physical endpoints implement
     * Returns 0 if the CC is not supported at all.
     */
    getCCVersion(cc) {
        const nonZeroVersions = this.node.physicalNodes
            .map((n) => n.getEndpoint(this.index)?.getCCVersion(cc))
            .filter((v) => v != undefined && v > 0);
        if (!nonZeroVersions.length)
            return 0;
        return Math.min(...nonZeroVersions);
    }
    /**
     * @internal
     * Creates an API instance for a given command class. Throws if no API is defined.
     * @param ccId The command class to create an API instance for
     */
    createAPI(ccId) {
        let ret = cc_1.CCAPI.create(ccId, this.driver, this);
        if (this.defaultCommandOptions) {
            ret = ret.withOptions(this.defaultCommandOptions);
        }
        // Trust me on this, TypeScript :)
        return ret;
    }
    /**
     * Provides access to simplified APIs that are tailored to specific CCs.
     * Make sure to check support of each API using `API.isSupported()` since
     * all other API calls will throw if the API is not supported
     */
    get commandClasses() {
        return this._commandClassAPIsProxy;
    }
    /** Allows checking whether a CC API is supported before calling it with {@link VirtualEndpoint.invokeCCAPI} */
    supportsCCAPI(cc) {
        // No need to validate the `cc` parameter, the following line will throw for invalid CCs
        return this.commandClasses[cc].isSupported();
    }
    /**
     * Allows dynamically calling any CC API method on this virtual endpoint by CC ID and method name.
     * Use {@link VirtualEndpoint.supportsCCAPI} to check support first.
     *
     * **Warning:** Get-type commands are not supported, even if auto-completion indicates that they are.
     */
    invokeCCAPI(cc, method, ...args) {
        // No need to validate the `cc` parameter, the following line will throw for invalid CCs
        const CCAPI = this.commandClasses[cc];
        const ccId = (0, cc_1.normalizeCCNameOrId)(cc);
        const ccName = (0, safe_1.getCCName)(ccId);
        if (!CCAPI) {
            throw new safe_1.ZWaveError(`The API for the ${ccName} CC does not exist or is not implemented!`, safe_1.ZWaveErrorCodes.CC_NoAPI);
        }
        const apiMethod = CCAPI[method];
        if (typeof apiMethod !== "function") {
            throw new safe_1.ZWaveError(`Method "${method}" does not exist on the API for the ${ccName} CC!`, safe_1.ZWaveErrorCodes.CC_NotImplemented);
        }
        return apiMethod.apply(CCAPI, args);
    }
    /**
     * @internal
     * DO NOT CALL THIS!
     */
    getNodeUnsafe() {
        throw new safe_1.ZWaveError(`The node of a virtual endpoint cannot be accessed this way!`, safe_1.ZWaveErrorCodes.CC_NoNodeID);
    }
}
exports.VirtualEndpoint = VirtualEndpoint;
//# sourceMappingURL=VirtualEndpoint.js.map