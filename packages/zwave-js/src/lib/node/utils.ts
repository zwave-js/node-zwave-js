import { CommandClass } from "@zwave-js/cc";
import { MultiChannelCCValues } from "@zwave-js/cc/MultiChannelCC";
import { type GetDeviceConfig } from "@zwave-js/config";
import {
	CommandClasses,
	type ControlsCC,
	type EndpointId,
	type GetEndpoint,
	type GetNode,
	type GetSupportedCCVersion,
	type GetValueDB,
	type HostIDs,
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

function getValue<T>(
	ctx: GetValueDB,
	nodeId: number,
	valueId: ValueID,
): T | undefined {
	return ctx.getValueDB(nodeId).getValue(valueId);
}

function setValue(
	ctx: GetValueDB,
	nodeId: number,
	valueId: ValueID,
	value: unknown,
	options?: SetValueOptions,
): void {
	return ctx.getValueDB(nodeId).setValue(valueId, value, options);
}

export function endpointCountIsDynamic(
	ctx: GetValueDB,
	nodeId: number,
): MaybeNotKnown<boolean> {
	return getValue(
		ctx,
		nodeId,
		MultiChannelCCValues.endpointCountIsDynamic.id,
	);
}

export function endpointsHaveIdenticalCapabilities(
	ctx: GetValueDB,
	nodeId: number,
): MaybeNotKnown<boolean> {
	return getValue(
		ctx,
		nodeId,
		MultiChannelCCValues.endpointsHaveIdenticalCapabilities.id,
	);
}

export function getIndividualEndpointCount(
	ctx: GetValueDB,
	nodeId: number,
): MaybeNotKnown<number> {
	return getValue(
		ctx,
		nodeId,
		MultiChannelCCValues.individualEndpointCount.id,
	);
}

export function getAggregatedEndpointCount(
	ctx: GetValueDB,
	nodeId: number,
): MaybeNotKnown<number> {
	return getValue(
		ctx,
		nodeId,
		MultiChannelCCValues.aggregatedEndpointCount.id,
	);
}

export function getEndpointCount(
	ctx: GetValueDB,
	nodeId: number,
): number {
	return (
		(getIndividualEndpointCount(ctx, nodeId) || 0)
		+ (getAggregatedEndpointCount(ctx, nodeId) || 0)
	);
}

export function setIndividualEndpointCount(
	ctx: GetValueDB,
	nodeId: number,
	count: number,
): void {
	setValue(
		ctx,
		nodeId,
		MultiChannelCCValues.individualEndpointCount.id,
		count,
	);
}

export function setAggregatedEndpointCount(
	ctx: GetValueDB,
	nodeId: number,
	count: number,
): void {
	setValue(
		ctx,
		nodeId,
		MultiChannelCCValues.aggregatedEndpointCount.id,
		count,
	);
}

export function getEndpointIndizes(
	ctx: GetValueDB,
	nodeId: number,
): number[] {
	let ret = getValue<number[]>(
		ctx,
		nodeId,
		MultiChannelCCValues.endpointIndizes.id,
	);
	if (!ret) {
		// Endpoint indizes not stored, assume sequential endpoints
		ret = [];
		for (let i = 1; i <= getEndpointCount(ctx, nodeId); i++) {
			ret.push(i);
		}
	}
	return ret;
}

export function setEndpointIndizes(
	ctx: GetValueDB,
	nodeId: number,
	indizes: number[],
): void {
	setValue(
		ctx,
		nodeId,
		MultiChannelCCValues.endpointIndizes.id,
		indizes,
	);
}

export function isMultiChannelInterviewComplete(
	ctx: GetValueDB,
	nodeId: number,
): boolean {
	return !!getValue(ctx, nodeId, {
		commandClass: CommandClasses["Multi Channel"],
		endpoint: 0,
		property: "interviewComplete",
	});
}

export function setMultiChannelInterviewComplete(
	ctx: GetValueDB,
	nodeId: number,
	complete: boolean,
): void {
	setValue(
		ctx,
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
	ctx: GetValueDB,
	node: T & GetEndpoint<EndpointId & T>,
): T[] {
	const ret: T[] = [node];
	// Check if the Multi Channel CC interview for this node is completed,
	// because we don't have all the endpoint information before that
	if (isMultiChannelInterviewComplete(ctx, node.nodeId)) {
		for (const i of getEndpointIndizes(ctx, node.nodeId)) {
			const endpoint = node.getEndpoint(i);
			if (endpoint) ret.push(endpoint);
		}
	}
	return ret;
}

/** Determines whether the root application CC values should be hidden in favor of endpoint values */
export function shouldHideRootApplicationCCValues(
	ctx: GetValueDB & GetDeviceConfig,
	nodeId: number,
): boolean {
	// This is not the case when the root values should explicitly be preserved
	const compatConfig = ctx.getDeviceConfig?.(nodeId)?.compat;
	if (compatConfig?.preserveRootApplicationCCValueIDs) return false;

	// This is not the case when there are no endpoints
	const endpointIndizes = getEndpointIndizes(ctx, nodeId);
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
	ctx: GetValueDB,
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
		ctx,
		valueId.property,
		valueId.propertyKey,
	);
	// Try to retrieve the speaking property key
	if (valueId.propertyKey != undefined) {
		const propertyKey = ccInstance.translatePropertyKey(
			ctx,
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
	ctx:
		& HostIDs
		& GetValueDB
		& GetDeviceConfig
		& GetSupportedCCVersion
		& GetNode<
			NodeId & GetEndpoint<EndpointId & SupportsCC & ControlsCC>
		>,
	node:
		& NodeId
		& SupportsCC
		& ControlsCC
		& GetEndpoint<EndpointId & SupportsCC & ControlsCC>,
): TranslatedValueID[] {
	return getDefinedValueIDsInternal(ctx, node, false);
}

/**
 * @internal
 * Returns a list of all value names that are defined on all endpoints of this node
 */
export function getDefinedValueIDsInternal(
	ctx:
		& HostIDs
		& GetValueDB
		& GetDeviceConfig
		& GetSupportedCCVersion
		& GetNode<
			NodeId & GetEndpoint<EndpointId & SupportsCC & ControlsCC>
		>,
	node:
		& NodeId
		& SupportsCC
		& ControlsCC
		& GetEndpoint<EndpointId & SupportsCC & ControlsCC>,
	includeInternal: boolean = false,
): TranslatedValueID[] {
	// The controller has no values. Even if some ended up in the cache somehow, do not return any.
	if (node.id === ctx.ownNodeId) return [];

	let ret: ValueID[] = [];
	const allowControlled: CommandClasses[] = [
		CommandClasses["Scene Activation"],
	];
	for (
		const endpoint of getAllEndpoints<EndpointId & SupportsCC & ControlsCC>(
			ctx,
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
					endpoint,
					cc,
				);
				if (ccInstance) {
					ret.push(
						...ccInstance.getDefinedValueIDs(
							ctx,
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
	if (shouldHideRootApplicationCCValues(ctx, node.id)) {
		ret = filterRootApplicationCCValueIDs(ret);
	}

	// Translate the remaining value IDs before exposing them to applications
	return ret.map((id) => translateValueID(ctx, node, id));
}
