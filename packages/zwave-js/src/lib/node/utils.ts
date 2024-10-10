import { CommandClass } from "@zwave-js/cc";
import { MultiChannelCCValues } from "@zwave-js/cc/MultiChannelCC";
import {
	CommandClasses,
	type ControlsCC,
	type EndpointId,
	type GetEndpoint,
	type MaybeNotKnown,
	type NodeId,
	type SetValueOptions,
	type SupportsCC,
	type TranslatedValueID,
	type ValueID,
	ZWaveError,
	ZWaveErrorCodes,
	allCCs,
	applicationCCs,
	getCCName,
} from "@zwave-js/core";
import type { ZWaveApplicationHost } from "@zwave-js/host";

function getValue<T>(
	applHost: ZWaveApplicationHost,
	nodeId: number,
	valueId: ValueID,
): T | undefined {
	return applHost.getValueDB(nodeId).getValue(valueId);
}

function setValue(
	applHost: ZWaveApplicationHost,
	nodeId: number,
	valueId: ValueID,
	value: unknown,
	options?: SetValueOptions,
): void {
	return applHost.getValueDB(nodeId).setValue(valueId, value, options);
}

export function endpointCountIsDynamic(
	applHost: ZWaveApplicationHost,
	nodeId: number,
): MaybeNotKnown<boolean> {
	return getValue(
		applHost,
		nodeId,
		MultiChannelCCValues.endpointCountIsDynamic.id,
	);
}

export function endpointsHaveIdenticalCapabilities(
	applHost: ZWaveApplicationHost,
	nodeId: number,
): MaybeNotKnown<boolean> {
	return getValue(
		applHost,
		nodeId,
		MultiChannelCCValues.endpointsHaveIdenticalCapabilities.id,
	);
}

export function getIndividualEndpointCount(
	applHost: ZWaveApplicationHost,
	nodeId: number,
): MaybeNotKnown<number> {
	return getValue(
		applHost,
		nodeId,
		MultiChannelCCValues.individualEndpointCount.id,
	);
}

export function getAggregatedEndpointCount(
	applHost: ZWaveApplicationHost,
	nodeId: number,
): MaybeNotKnown<number> {
	return getValue(
		applHost,
		nodeId,
		MultiChannelCCValues.aggregatedEndpointCount.id,
	);
}

export function getEndpointCount(
	applHost: ZWaveApplicationHost,
	nodeId: number,
): number {
	return (
		(getIndividualEndpointCount(applHost, nodeId) || 0)
		+ (getAggregatedEndpointCount(applHost, nodeId) || 0)
	);
}

export function setIndividualEndpointCount(
	applHost: ZWaveApplicationHost,
	nodeId: number,
	count: number,
): void {
	setValue(
		applHost,
		nodeId,
		MultiChannelCCValues.individualEndpointCount.id,
		count,
	);
}

export function setAggregatedEndpointCount(
	applHost: ZWaveApplicationHost,
	nodeId: number,
	count: number,
): void {
	setValue(
		applHost,
		nodeId,
		MultiChannelCCValues.aggregatedEndpointCount.id,
		count,
	);
}

export function getEndpointIndizes(
	applHost: ZWaveApplicationHost,
	nodeId: number,
): number[] {
	let ret = getValue<number[]>(
		applHost,
		nodeId,
		MultiChannelCCValues.endpointIndizes.id,
	);
	if (!ret) {
		// Endpoint indizes not stored, assume sequential endpoints
		ret = [];
		for (let i = 1; i <= getEndpointCount(applHost, nodeId); i++) {
			ret.push(i);
		}
	}
	return ret;
}

export function setEndpointIndizes(
	applHost: ZWaveApplicationHost,
	nodeId: number,
	indizes: number[],
): void {
	setValue(
		applHost,
		nodeId,
		MultiChannelCCValues.endpointIndizes.id,
		indizes,
	);
}

export function isMultiChannelInterviewComplete(
	applHost: ZWaveApplicationHost,
	nodeId: number,
): boolean {
	return !!getValue(applHost, nodeId, {
		commandClass: CommandClasses["Multi Channel"],
		endpoint: 0,
		property: "interviewComplete",
	});
}

export function setMultiChannelInterviewComplete(
	applHost: ZWaveApplicationHost,
	nodeId: number,
	complete: boolean,
): void {
	setValue(
		applHost,
		nodeId,
		{
			commandClass: CommandClasses["Multi Channel"],
			endpoint: 0,
			property: "interviewComplete",
		},
		complete,
	);
}

export function getAllEndpoints<T extends EndpointId>(
	applHost: ZWaveApplicationHost,
	node: T & GetEndpoint<EndpointId & T>,
): T[] {
	const ret: T[] = [node];
	// Check if the Multi Channel CC interview for this node is completed,
	// because we don't have all the endpoint information before that
	if (isMultiChannelInterviewComplete(applHost, node.nodeId)) {
		for (const i of getEndpointIndizes(applHost, node.nodeId)) {
			const endpoint = node.getEndpoint(i);
			if (endpoint) ret.push(endpoint);
		}
	}
	return ret;
}

/** Determines whether the root application CC values should be hidden in favor of endpoint values */
export function shouldHideRootApplicationCCValues(
	applHost: ZWaveApplicationHost,
	nodeId: number,
): boolean {
	// This is not the case when the root values should explicitly be preserved
	const compatConfig = applHost.getDeviceConfig?.(nodeId)?.compat;
	if (compatConfig?.preserveRootApplicationCCValueIDs) return false;

	// This is not the case when there are no endpoints
	const endpointIndizes = getEndpointIndizes(applHost, nodeId);
	if (endpointIndizes.length === 0) return false;

	// This is not the case when only individual endpoints should be preserved in addition to the root
	const preserveEndpoints = compatConfig?.preserveEndpoints;
	if (
		preserveEndpoints != undefined
		&& preserveEndpoints !== "*"
		&& preserveEndpoints.length !== endpointIndizes.length
	) {
		return false;
	}

	// Otherwise they should be hidden
	return true;
}

/**
 * Enhances a value id so it can be consumed better by applications
 */
export function translateValueID<T extends ValueID>(
	applHost: ZWaveApplicationHost,
	endpoint: EndpointId,
	valueId: T,
): T & TranslatedValueID {
	// Try to retrieve the speaking CC name
	const commandClassName = getCCName(valueId.commandClass);
	const ret: T & TranslatedValueID = {
		commandClassName,
		...valueId,
	};
	const ccInstance = CommandClass.createInstanceUnchecked(
		applHost,
		endpoint,
		valueId.commandClass,
	);
	if (!ccInstance) {
		throw new ZWaveError(
			`Cannot translate a value ID for the non-implemented CC ${
				getCCName(
					valueId.commandClass,
				)
			}`,
			ZWaveErrorCodes.CC_NotImplemented,
		);
	}

	// Retrieve the speaking property name
	ret.propertyName = ccInstance.translateProperty(
		applHost,
		valueId.property,
		valueId.propertyKey,
	);
	// Try to retrieve the speaking property key
	if (valueId.propertyKey != undefined) {
		const propertyKey = ccInstance.translatePropertyKey(
			applHost,
			valueId.property,
			valueId.propertyKey,
		);
		ret.propertyKeyName = propertyKey;
	}
	return ret;
}

/**
 * Removes all Value IDs from an array that belong to a root endpoint and have a corresponding
 * Value ID on a non-root endpoint
 */
export function filterRootApplicationCCValueIDs<T extends ValueID>(
	allValueIds: T[],
): T[] {
	const shouldHideRootValueID = (
		valueId: ValueID,
		allValueIds: ValueID[],
	): boolean => {
		// Non-root endpoint values don't need to be filtered
		if (!!valueId.endpoint) return false;
		// Non-application CCs don't need to be filtered
		if (!applicationCCs.includes(valueId.commandClass)) return false;
		// Filter out root values if an identical value ID exists for another endpoint
		const valueExistsOnAnotherEndpoint = allValueIds.some(
			(other) =>
				// same CC
				other.commandClass === valueId.commandClass
				// non-root endpoint
				&& !!other.endpoint
				// same property and key
				&& other.property === valueId.property
				&& other.propertyKey === valueId.propertyKey,
		);
		return valueExistsOnAnotherEndpoint;
	};

	return allValueIds.filter(
		(vid) => !shouldHideRootValueID(vid, allValueIds),
	);
}

/** Returns a list of all value names that are defined on all endpoints of this node */
export function getDefinedValueIDs(
	applHost: ZWaveApplicationHost,
	node:
		& NodeId
		& SupportsCC
		& ControlsCC
		& GetEndpoint<EndpointId & SupportsCC & ControlsCC>,
): TranslatedValueID[] {
	return getDefinedValueIDsInternal(applHost, node, false);
}

/**
 * @internal
 * Returns a list of all value names that are defined on all endpoints of this node
 */
export function getDefinedValueIDsInternal(
	applHost: ZWaveApplicationHost,
	node:
		& NodeId
		& SupportsCC
		& ControlsCC
		& GetEndpoint<EndpointId & SupportsCC & ControlsCC>,
	includeInternal: boolean = false,
): TranslatedValueID[] {
	// The controller has no values. Even if some ended up in the cache somehow, do not return any.
	if (applHost.isControllerNode(node.id)) return [];

	let ret: ValueID[] = [];
	const allowControlled: CommandClasses[] = [
		CommandClasses["Scene Activation"],
	];
	for (
		const endpoint of getAllEndpoints<EndpointId & SupportsCC & ControlsCC>(
			applHost,
			node,
		)
	) {
		for (const cc of allCCs) {
			if (
				// Create values only for supported CCs
				endpoint.supportsCC(cc)
				// ...and some controlled CCs
				|| (endpoint.controlsCC(cc) && allowControlled.includes(cc))
				// ...and possibly Basic CC, which has some extra checks to know
				// whether values should be exposed
				|| cc === CommandClasses.Basic
			) {
				const ccInstance = CommandClass.createInstanceUnchecked(
					applHost,
					endpoint,
					cc,
				);
				if (ccInstance) {
					ret.push(
						...ccInstance.getDefinedValueIDs(
							applHost,
							includeInternal,
						),
					);
				}
			}
		}
	}

	// Application command classes of the Root Device capabilities that are also advertised by at
	// least one End Point SHOULD be filtered out by controlling nodes before presenting the functionalities
	// via service discovery mechanisms like mDNS or to users in a GUI.

	// We do this when there are endpoints that were explicitly preserved
	if (shouldHideRootApplicationCCValues(applHost, node.id)) {
		ret = filterRootApplicationCCValueIDs(ret);
	}

	// Translate the remaining value IDs before exposing them to applications
	return ret.map((id) => translateValueID(applHost, node, id));
}
