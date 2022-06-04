import {
	allCCs,
	applicationCCs,
	CommandClasses,
	getCCName,
	SetValueOptions,
	TranslatedValueID,
	ValueID,
	ZWaveError,
	ZWaveErrorCodes,
} from "@zwave-js/core";
import type {
	ZWaveEndpointBase,
	ZWaveHost,
	ZWaveNodeBase,
} from "@zwave-js/host";
import { CommandClass } from "../commandclass/CommandClass";
import {
	getAggregatedCountValueId,
	getCountIsDynamicValueId,
	getEndpointIndizesValueId,
	getIdenticalCapabilitiesValueId,
	getIndividualCountValueId,
} from "../commandclass/MultiChannelCC";

function getValue<T>(
	host: ZWaveHost,
	node: ZWaveNodeBase,
	valueId: ValueID,
): T | undefined {
	return host.getValueDB(node.id).getValue(valueId);
}

function setValue(
	host: ZWaveHost,
	node: ZWaveNodeBase,
	valueId: ValueID,
	value: unknown,
	options?: SetValueOptions,
): void {
	return host.getValueDB(node.id).setValue(valueId, value, options);
}

export function endpointCountIsDynamic(
	host: ZWaveHost,
	node: ZWaveNodeBase,
): boolean | undefined {
	return getValue(host, node, getCountIsDynamicValueId());
}

export function endpointsHaveIdenticalCapabilities(
	host: ZWaveHost,
	node: ZWaveNodeBase,
): boolean | undefined {
	return getValue(host, node, getIdenticalCapabilitiesValueId());
}

export function getIndividualEndpointCount(
	host: ZWaveHost,
	node: ZWaveNodeBase,
): number | undefined {
	return getValue(host, node, getIndividualCountValueId());
}

export function getAggregatedEndpointCount(
	host: ZWaveHost,
	node: ZWaveNodeBase,
): number | undefined {
	return getValue(host, node, getAggregatedCountValueId());
}

export function getEndpointCount(host: ZWaveHost, node: ZWaveNodeBase): number {
	return (
		(getIndividualEndpointCount(host, node) || 0) +
		(getAggregatedEndpointCount(host, node) || 0)
	);
}

export function setIndividualEndpointCount(
	host: ZWaveHost,
	node: ZWaveNodeBase,
	count: number,
): void {
	setValue(host, node, getIndividualCountValueId(), count);
}

export function setAggregatedEndpointCount(
	host: ZWaveHost,
	node: ZWaveNodeBase,
	count: number,
): void {
	setValue(host, node, getAggregatedCountValueId(), count);
}

export function getEndpointIndizes(
	host: ZWaveHost,
	node: ZWaveNodeBase,
): number[] {
	let ret = getValue<number[]>(host, node, getEndpointIndizesValueId());
	if (!ret) {
		// Endpoint indizes not stored, assume sequential endpoints
		ret = [];
		for (let i = 1; i <= getEndpointCount(host, node); i++) {
			ret.push(i);
		}
	}
	return ret;
}

export function setEndpointIndizes(
	host: ZWaveHost,
	node: ZWaveNodeBase,
	indizes: number[],
): void {
	setValue(host, node, getEndpointIndizesValueId(), indizes);
}

export function isMultiChannelInterviewComplete(
	host: ZWaveHost,
	node: ZWaveNodeBase,
): boolean {
	return !!getValue(host, node, {
		commandClass: CommandClasses["Multi Channel"],
		endpoint: 0,
		property: "interviewComplete",
	});
}

export function setMultiChannelInterviewComplete(
	host: ZWaveHost,
	node: ZWaveNodeBase,
	complete: boolean,
): void {
	setValue(
		host,
		node,
		{
			commandClass: CommandClasses["Multi Channel"],
			endpoint: 0,
			property: "interviewComplete",
		},
		complete,
	);
}

export function getAllEndpoints(
	host: ZWaveHost,
	node: ZWaveNodeBase,
): ZWaveEndpointBase[] {
	const ret: ZWaveEndpointBase[] = [node];
	// Check if the Multi Channel CC interview for this node is completed,
	// because we don't have all the endpoint information before that
	if (isMultiChannelInterviewComplete(host, node)) {
		for (const i of getEndpointIndizes(host, node)) {
			const endpoint = node.getEndpoint(i);
			if (endpoint) ret.push(endpoint);
		}
	}
	return ret;
}

/** Determines whether the root application CC values should be hidden in favor of endpoint values */
export function shouldHideRootApplicationCCValues(
	host: ZWaveHost,
	node: ZWaveNodeBase,
): boolean {
	// This is not the case when the root values should explicitly be preserved
	if (node.deviceConfig?.compat?.preserveRootApplicationCCValueIDs)
		return false;

	// This is not the case when there are no endpoints
	const endpointIndizes = getEndpointIndizes(host, node);
	if (endpointIndizes.length === 0) return false;

	// This is not the case when only individual endpoints should be preserved in addition to the root
	const preserveEndpoints = node.deviceConfig?.compat?.preserveEndpoints;
	if (
		preserveEndpoints != undefined &&
		preserveEndpoints !== "*" &&
		preserveEndpoints.length !== endpointIndizes.length
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
	host: ZWaveHost,
	node: ZWaveNodeBase,
	valueId: T,
): T & TranslatedValueID {
	// Try to retrieve the speaking CC name
	const commandClassName = getCCName(valueId.commandClass);
	const ret: T & TranslatedValueID = {
		commandClassName,
		...valueId,
	};
	const ccInstance = CommandClass.createInstanceUnchecked(
		host,
		node,
		valueId.commandClass,
	);
	if (!ccInstance) {
		throw new ZWaveError(
			`Cannot translate a value ID for the non-implemented CC ${getCCName(
				valueId.commandClass,
			)}`,
			ZWaveErrorCodes.CC_NotImplemented,
		);
	}

	// Retrieve the speaking property name
	ret.propertyName = ccInstance.translateProperty(
		valueId.property,
		valueId.propertyKey,
	);
	// Try to retrieve the speaking property key
	if (valueId.propertyKey != undefined) {
		const propertyKey = ccInstance.translatePropertyKey(
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
export function filterRootApplicationCCValueIDs(
	allValueIds: ValueID[],
): ValueID[] {
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
				other.commandClass === valueId.commandClass &&
				// non-root endpoint
				!!other.endpoint &&
				// same property and key
				other.property === valueId.property &&
				other.propertyKey === valueId.propertyKey,
		);
		return valueExistsOnAnotherEndpoint;
	};

	return allValueIds.filter(
		(vid) => !shouldHideRootValueID(vid, allValueIds),
	);
}

/** Returns a list of all value names that are defined on all endpoints of this node */
export function getDefinedValueIDs(
	host: ZWaveHost,
	node: ZWaveNodeBase,
): TranslatedValueID[] {
	let ret: ValueID[] = [];
	const allowControlled: CommandClasses[] = [
		CommandClasses["Scene Activation"],
	];
	for (const endpoint of getAllEndpoints(host, node)) {
		for (const cc of allCCs) {
			if (
				endpoint.supportsCC(cc) ||
				(endpoint.controlsCC(cc) && allowControlled.includes(cc))
			) {
				const ccInstance = CommandClass.createInstanceUnchecked(
					host,
					endpoint,
					cc,
				);
				if (ccInstance) {
					ret.push(...ccInstance.getDefinedValueIDs());
				}
			}
		}
	}

	// Application command classes of the Root Device capabilities that are also advertised by at
	// least one End Point SHOULD be filtered out by controlling nodes before presenting the functionalities
	// via service discovery mechanisms like mDNS or to users in a GUI.

	// We do this when there are endpoints that were explicitly preserved
	if (shouldHideRootApplicationCCValues(host, node)) {
		ret = filterRootApplicationCCValueIDs(ret);
	}

	// Translate the remaining value IDs before exposing them to applications
	return ret.map((id) => translateValueID(host, node, id));
}
