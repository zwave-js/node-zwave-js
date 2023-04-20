"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDefinedValueIDs = exports.filterRootApplicationCCValueIDs = exports.translateValueID = exports.shouldHideRootApplicationCCValues = exports.getAllEndpoints = exports.setMultiChannelInterviewComplete = exports.isMultiChannelInterviewComplete = exports.setEndpointIndizes = exports.getEndpointIndizes = exports.setAggregatedEndpointCount = exports.setIndividualEndpointCount = exports.getEndpointCount = exports.getAggregatedEndpointCount = exports.getIndividualEndpointCount = exports.endpointsHaveIdenticalCapabilities = exports.endpointCountIsDynamic = void 0;
const cc_1 = require("@zwave-js/cc");
const MultiChannelCC_1 = require("@zwave-js/cc/MultiChannelCC");
const core_1 = require("@zwave-js/core");
function getValue(applHost, node, valueId) {
    return applHost.getValueDB(node.id).getValue(valueId);
}
function setValue(applHost, node, valueId, value, options) {
    return applHost.getValueDB(node.id).setValue(valueId, value, options);
}
function endpointCountIsDynamic(applHost, node) {
    return getValue(applHost, node, MultiChannelCC_1.MultiChannelCCValues.endpointCountIsDynamic.id);
}
exports.endpointCountIsDynamic = endpointCountIsDynamic;
function endpointsHaveIdenticalCapabilities(applHost, node) {
    return getValue(applHost, node, MultiChannelCC_1.MultiChannelCCValues.endpointsHaveIdenticalCapabilities.id);
}
exports.endpointsHaveIdenticalCapabilities = endpointsHaveIdenticalCapabilities;
function getIndividualEndpointCount(applHost, node) {
    return getValue(applHost, node, MultiChannelCC_1.MultiChannelCCValues.individualEndpointCount.id);
}
exports.getIndividualEndpointCount = getIndividualEndpointCount;
function getAggregatedEndpointCount(applHost, node) {
    return getValue(applHost, node, MultiChannelCC_1.MultiChannelCCValues.aggregatedEndpointCount.id);
}
exports.getAggregatedEndpointCount = getAggregatedEndpointCount;
function getEndpointCount(applHost, node) {
    return ((getIndividualEndpointCount(applHost, node) || 0) +
        (getAggregatedEndpointCount(applHost, node) || 0));
}
exports.getEndpointCount = getEndpointCount;
function setIndividualEndpointCount(applHost, node, count) {
    setValue(applHost, node, MultiChannelCC_1.MultiChannelCCValues.individualEndpointCount.id, count);
}
exports.setIndividualEndpointCount = setIndividualEndpointCount;
function setAggregatedEndpointCount(applHost, node, count) {
    setValue(applHost, node, MultiChannelCC_1.MultiChannelCCValues.aggregatedEndpointCount.id, count);
}
exports.setAggregatedEndpointCount = setAggregatedEndpointCount;
function getEndpointIndizes(applHost, node) {
    let ret = getValue(applHost, node, MultiChannelCC_1.MultiChannelCCValues.endpointIndizes.id);
    if (!ret) {
        // Endpoint indizes not stored, assume sequential endpoints
        ret = [];
        for (let i = 1; i <= getEndpointCount(applHost, node); i++) {
            ret.push(i);
        }
    }
    return ret;
}
exports.getEndpointIndizes = getEndpointIndizes;
function setEndpointIndizes(applHost, node, indizes) {
    setValue(applHost, node, MultiChannelCC_1.MultiChannelCCValues.endpointIndizes.id, indizes);
}
exports.setEndpointIndizes = setEndpointIndizes;
function isMultiChannelInterviewComplete(applHost, node) {
    return !!getValue(applHost, node, {
        commandClass: core_1.CommandClasses["Multi Channel"],
        endpoint: 0,
        property: "interviewComplete",
    });
}
exports.isMultiChannelInterviewComplete = isMultiChannelInterviewComplete;
function setMultiChannelInterviewComplete(applHost, node, complete) {
    setValue(applHost, node, {
        commandClass: core_1.CommandClasses["Multi Channel"],
        endpoint: 0,
        property: "interviewComplete",
    }, complete);
}
exports.setMultiChannelInterviewComplete = setMultiChannelInterviewComplete;
function getAllEndpoints(applHost, node) {
    const ret = [node];
    // Check if the Multi Channel CC interview for this node is completed,
    // because we don't have all the endpoint information before that
    if (isMultiChannelInterviewComplete(applHost, node)) {
        for (const i of getEndpointIndizes(applHost, node)) {
            const endpoint = node.getEndpoint(i);
            if (endpoint)
                ret.push(endpoint);
        }
    }
    return ret;
}
exports.getAllEndpoints = getAllEndpoints;
/** Determines whether the root application CC values should be hidden in favor of endpoint values */
function shouldHideRootApplicationCCValues(applHost, node) {
    // This is not the case when the root values should explicitly be preserved
    const compatConfig = applHost.getDeviceConfig?.(node.id)?.compat;
    if (compatConfig?.preserveRootApplicationCCValueIDs)
        return false;
    // This is not the case when there are no endpoints
    const endpointIndizes = getEndpointIndizes(applHost, node);
    if (endpointIndizes.length === 0)
        return false;
    // This is not the case when only individual endpoints should be preserved in addition to the root
    const preserveEndpoints = compatConfig?.preserveEndpoints;
    if (preserveEndpoints != undefined &&
        preserveEndpoints !== "*" &&
        preserveEndpoints.length !== endpointIndizes.length) {
        return false;
    }
    // Otherwise they should be hidden
    return true;
}
exports.shouldHideRootApplicationCCValues = shouldHideRootApplicationCCValues;
/**
 * Enhances a value id so it can be consumed better by applications
 */
function translateValueID(applHost, node, valueId) {
    // Try to retrieve the speaking CC name
    const commandClassName = (0, core_1.getCCName)(valueId.commandClass);
    const ret = {
        commandClassName,
        ...valueId,
    };
    const ccInstance = cc_1.CommandClass.createInstanceUnchecked(applHost, node, valueId.commandClass);
    if (!ccInstance) {
        throw new core_1.ZWaveError(`Cannot translate a value ID for the non-implemented CC ${(0, core_1.getCCName)(valueId.commandClass)}`, core_1.ZWaveErrorCodes.CC_NotImplemented);
    }
    // Retrieve the speaking property name
    ret.propertyName = ccInstance.translateProperty(applHost, valueId.property, valueId.propertyKey);
    // Try to retrieve the speaking property key
    if (valueId.propertyKey != undefined) {
        const propertyKey = ccInstance.translatePropertyKey(applHost, valueId.property, valueId.propertyKey);
        ret.propertyKeyName = propertyKey;
    }
    return ret;
}
exports.translateValueID = translateValueID;
/**
 * Removes all Value IDs from an array that belong to a root endpoint and have a corresponding
 * Value ID on a non-root endpoint
 */
function filterRootApplicationCCValueIDs(allValueIds) {
    const shouldHideRootValueID = (valueId, allValueIds) => {
        // Non-root endpoint values don't need to be filtered
        if (!!valueId.endpoint)
            return false;
        // Non-application CCs don't need to be filtered
        if (!core_1.applicationCCs.includes(valueId.commandClass))
            return false;
        // Filter out root values if an identical value ID exists for another endpoint
        const valueExistsOnAnotherEndpoint = allValueIds.some((other) => 
        // same CC
        other.commandClass === valueId.commandClass &&
            // non-root endpoint
            !!other.endpoint &&
            // same property and key
            other.property === valueId.property &&
            other.propertyKey === valueId.propertyKey);
        return valueExistsOnAnotherEndpoint;
    };
    return allValueIds.filter((vid) => !shouldHideRootValueID(vid, allValueIds));
}
exports.filterRootApplicationCCValueIDs = filterRootApplicationCCValueIDs;
/** Returns a list of all value names that are defined on all endpoints of this node */
function getDefinedValueIDs(applHost, node) {
    let ret = [];
    const allowControlled = [
        core_1.CommandClasses["Scene Activation"],
    ];
    for (const endpoint of getAllEndpoints(applHost, node)) {
        for (const cc of core_1.allCCs) {
            if (endpoint.supportsCC(cc) ||
                (endpoint.controlsCC(cc) && allowControlled.includes(cc))) {
                const ccInstance = cc_1.CommandClass.createInstanceUnchecked(applHost, endpoint, cc);
                if (ccInstance) {
                    ret.push(...ccInstance.getDefinedValueIDs(applHost));
                }
            }
        }
    }
    // Application command classes of the Root Device capabilities that are also advertised by at
    // least one End Point SHOULD be filtered out by controlling nodes before presenting the functionalities
    // via service discovery mechanisms like mDNS or to users in a GUI.
    // We do this when there are endpoints that were explicitly preserved
    if (shouldHideRootApplicationCCValues(applHost, node)) {
        ret = filterRootApplicationCCValueIDs(ret);
    }
    // Translate the remaining value IDs before exposing them to applications
    return ret.map((id) => translateValueID(applHost, node, id));
}
exports.getDefinedValueIDs = getDefinedValueIDs;
//# sourceMappingURL=utils.js.map