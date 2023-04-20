"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VirtualNode = void 0;
const cc_1 = require("@zwave-js/cc");
const core_1 = require("@zwave-js/core");
const arrays_1 = require("alcalzone-shared/arrays");
const VirtualEndpoint_1 = require("./VirtualEndpoint");
class VirtualNode extends VirtualEndpoint_1.VirtualEndpoint {
    constructor(id, driver, 
    /** The references to the physical node this virtual node abstracts */
    physicalNodes, 
    /** Default command options to use for the CC API */
    defaultCommandOptions) {
        // Define this node's intrinsic endpoint as the root device (0)
        super(undefined, driver, 0, defaultCommandOptions);
        this.id = id;
        /** Cache for this node's endpoint instances */
        this._endpointInstances = new Map();
        // Set the reference to this and the physical nodes
        super.setNode(this);
        this.physicalNodes = [...physicalNodes].filter(
        // And avoid including the controller node in the support checks
        (n) => n.id !== driver.controller.ownNodeId);
    }
    /**
     * Updates a value for a given property of a given CommandClass.
     * This will communicate with the physical node(s) this virtual node represents!
     */
    async setValue(valueId, value, options) {
        // Ensure we're dealing with a valid value ID, with no extra properties
        valueId = (0, core_1.normalizeValueID)(valueId);
        // Try to retrieve the corresponding CC API
        try {
            // Access the CC API by name
            const endpointInstance = this.getEndpoint(valueId.endpoint || 0);
            if (!endpointInstance)
                return false;
            const api = endpointInstance.commandClasses[valueId.commandClass];
            // Check if the setValue method is implemented
            if (!api.setValue)
                return false;
            // And call it
            await api.setValue({
                property: valueId.property,
                propertyKey: valueId.propertyKey,
            }, value, options);
            // api.setValue could technically return a SupervisionResult
            // but supervision isn't used for multicast / broadcast
            // FIXME: It just may for S2 multicast
            if (api.isSetValueOptimistic(valueId)) {
                // If the call did not throw, assume that the call was successful and remember the new value
                // for each node that was affected by this command
                const affectedNodes = endpointInstance.node.physicalNodes.filter((node) => node
                    .getEndpoint(endpointInstance.index)
                    ?.supportsCC(valueId.commandClass));
                for (const node of affectedNodes) {
                    node.valueDB.setValue(valueId, value);
                }
            }
            return true;
        }
        catch (e) {
            // Define which errors during setValue are expected and won't crash
            // the driver:
            if ((0, core_1.isZWaveError)(e)) {
                let handled = false;
                let emitErrorEvent = false;
                switch (e.code) {
                    // This CC or API is not implemented
                    case core_1.ZWaveErrorCodes.CC_NotImplemented:
                    case core_1.ZWaveErrorCodes.CC_NoAPI:
                        handled = true;
                        break;
                    // A user tried to set an invalid value
                    case core_1.ZWaveErrorCodes.Argument_Invalid:
                        handled = true;
                        emitErrorEvent = true;
                        break;
                }
                if (emitErrorEvent)
                    this.driver.emit("error", e);
                if (handled)
                    return false;
            }
            throw e;
        }
    }
    /**
     * Returns a list of all value IDs and their metadata that can be used to
     * control the physical node(s) this virtual node represents.
     */
    getDefinedValueIDs() {
        // If all nodes are secure, we can't use broadcast/multicast commands
        if (this.physicalNodes.every((n) => n.isSecure === true))
            return [];
        // In order to compare value ids, we need them to be strings
        const ret = new Map();
        for (const pNode of this.physicalNodes) {
            // Secure nodes cannot be used for broadcast
            if (pNode.isSecure === true)
                continue;
            // Take only the actuator values
            const valueIDs = pNode
                .getDefinedValueIDs()
                .filter((v) => core_1.actuatorCCs.includes(v.commandClass));
            // And add them to the returned array if they aren't included yet or if the version is higher
            for (const valueId of valueIDs) {
                const mapKey = (0, core_1.valueIdToString)(valueId);
                const ccVersion = pNode.getCCVersion(valueId.commandClass);
                const metadata = pNode.getValueMetadata(valueId);
                // Don't expose read-only values for virtual nodes, they won't ever have any value
                if (!metadata.writeable)
                    continue;
                const needsUpdate = !ret.has(mapKey) || ret.get(mapKey).ccVersion < ccVersion;
                if (needsUpdate) {
                    ret.set(mapKey, {
                        ...valueId,
                        ccVersion,
                        metadata: {
                            ...metadata,
                            // Metadata of virtual nodes is only writable
                            readable: false,
                        },
                    });
                }
            }
        }
        // Basic CC is not exposed, but virtual nodes need it to control multiple different devices together
        const exposedEndpoints = (0, arrays_1.distinct)([...ret.values()]
            .map((v) => v.endpoint)
            .filter((e) => e !== undefined));
        for (const endpoint of exposedEndpoints) {
            // TODO: This should be defined in the Basic CC file
            const valueId = {
                ...cc_1.BasicCCValues.targetValue.endpoint(endpoint),
                commandClassName: "Basic",
                propertyName: "Target value",
            };
            const ccVersion = 1;
            const metadata = {
                ...cc_1.BasicCCValues.targetValue.meta,
                readable: false,
            };
            ret.set((0, core_1.valueIdToString)(valueId), {
                ...valueId,
                ccVersion,
                metadata,
            });
        }
        return [...ret.values()];
    }
    getEndpoint(index) {
        if (index < 0)
            throw new core_1.ZWaveError("The endpoint index must be positive!", core_1.ZWaveErrorCodes.Argument_Invalid);
        // Zero is the root endpoint - i.e. this node
        if (index === 0)
            return this;
        // Check if the Multi Channel CC interviews for all nodes are completed,
        // because we don't have all the information before that
        if (!this.isMultiChannelInterviewComplete) {
            this.driver.driverLog.print(`Virtual node ${this.id ?? "??"}, Endpoint ${index}: Trying to access endpoint instance before the Multi Channel interview of all nodes was completed!`, "error");
            return undefined;
        }
        // Check if the requested endpoint exists on any physical node
        if (index > this.getEndpointCount())
            return undefined;
        // Create an endpoint instance if it does not exist
        if (!this._endpointInstances.has(index)) {
            this._endpointInstances.set(index, new VirtualEndpoint_1.VirtualEndpoint(this, this.driver, index));
        }
        return this._endpointInstances.get(index);
    }
    getEndpointOrThrow(index) {
        const ret = this.getEndpoint(index);
        if (!ret) {
            throw new core_1.ZWaveError(`Endpoint ${index} does not exist on virtual node ${this.id ?? "??"}`, core_1.ZWaveErrorCodes.Controller_EndpointNotFound);
        }
        return ret;
    }
    /** Returns the current endpoint count of this virtual node (the maximum in the list of physical nodes) */
    getEndpointCount() {
        let ret = 0;
        for (const node of this.physicalNodes) {
            const count = node.getEndpointCount();
            ret = Math.max(ret, count);
        }
        return ret;
    }
    get isMultiChannelInterviewComplete() {
        for (const node of this.physicalNodes) {
            if (!node["isMultiChannelInterviewComplete"])
                return false;
        }
        return true;
    }
}
exports.VirtualNode = VirtualNode;
//# sourceMappingURL=VirtualNode.js.map