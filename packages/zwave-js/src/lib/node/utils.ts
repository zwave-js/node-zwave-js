import {
	CommandClass,
	EntryControlCCValues,
	type EntryControlEventTypes,
	NotificationCCValues,
	entryControlEventTypeLabels,
} from "@zwave-js/cc";
import { MultiChannelCCValues } from "@zwave-js/cc/MultiChannelCC";
import type { GetDeviceConfig } from "@zwave-js/config";
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
	getCCName,
	getNotification,
	isApplicationCC,
} from "@zwave-js/core";

import type {
	ZWaveNotificationCapability,
	ZWaveNotificationCapability_EntryControlCC,
	ZWaveNotificationCapability_NotificationCC,
} from "./_Types.js";

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

export function getEndpointCount(ctx: GetValueDB, nodeId: number): number {
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

export function getEndpointIndizes(ctx: GetValueDB, nodeId: number): number[] {
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
	setValue(ctx, nodeId, MultiChannelCCValues.endpointIndizes.id, indizes);
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
			`Cannot translate a value ID for the non-implemented CC ${getCCName(
				valueId.commandClass,
			)}`,
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
	// Index the candidates by CC, property and property key first. Scanning the
	// entire list once per root value ID is quadratic, which gets expensive for
	// nodes that expose thousands of value IDs. Map/Set lookups keep the numeric
	// and string spellings of a property apart, same as the === comparison did.
	const nonRootValueIds = new Map<
		CommandClasses,
		Map<string | number, Set<string | number | undefined>>
	>();
	for (const valueId of allValueIds) {
		if (!valueId.endpoint || !isApplicationCC(valueId.commandClass))
			continue;
		let byProperty = nonRootValueIds.get(valueId.commandClass);
		if (!byProperty) {
			byProperty = new Map();
			nonRootValueIds.set(valueId.commandClass, byProperty);
		}
		let propertyKeys = byProperty.get(valueId.property);
		if (!propertyKeys) {
			propertyKeys = new Set();
			byProperty.set(valueId.property, propertyKeys);
		}
		propertyKeys.add(valueId.propertyKey);
	}
	// Nodes with a single endpoint have nothing that could hide a root value
	if (nonRootValueIds.size === 0) return [...allValueIds];

	return allValueIds.filter(
		(valueId) =>
			// Non-root endpoint values don't need to be filtered
			!!valueId.endpoint
			// Non-application CCs don't need to be filtered
			|| !isApplicationCC(valueId.commandClass)
			// Filter out root values if an identical value ID exists for another endpoint
			|| !nonRootValueIds
				.get(valueId.commandClass)
				?.get(valueId.property)
				?.has(valueId.propertyKey),
	);
}

/** Returns a list of all value names that are defined on all endpoints of this node */
export function getDefinedValueIDs(
	ctx: HostIDs
		& GetValueDB
		& GetDeviceConfig
		& GetSupportedCCVersion
		& GetNode<NodeId & GetEndpoint<EndpointId & SupportsCC & ControlsCC>>,
	node: NodeId
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
	ctx: HostIDs
		& GetValueDB
		& GetDeviceConfig
		& GetSupportedCCVersion
		& GetNode<NodeId & GetEndpoint<EndpointId & SupportsCC & ControlsCC>>,
	node: NodeId
		& SupportsCC
		& ControlsCC
		& GetEndpoint<EndpointId & SupportsCC & ControlsCC>,
	includeInternal: boolean = false,
): TranslatedValueID[] {
	// The controller has no values. Even if some ended up in the cache somehow, do not return any.
	if (node.id === ctx.ownNodeId) return [];

	let ret: ValueID[] = [];
	const allowControlled = new Set([CommandClasses["Scene Activation"]]);
	for (const endpoint of getAllEndpoints<
		EndpointId & SupportsCC & ControlsCC
	>(ctx, node)) {
		for (const cc of allCCs) {
			if (
				// Create values only for supported CCs
				endpoint.supportsCC(cc)
				// ...and some controlled CCs
				|| (endpoint.controlsCC(cc) && allowControlled.has(cc))
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
						...ccInstance.getDefinedValueIDs(ctx, includeInternal),
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

export function getSupportedNotificationEvents(
	ctx: GetValueDB
		& GetNode<NodeId & GetEndpoint<EndpointId & SupportsCC & ControlsCC>>,
	node: NodeId
		& SupportsCC
		& ControlsCC
		& GetEndpoint<EndpointId & SupportsCC & ControlsCC>,
): ZWaveNotificationCapability[] {
	const ret: ZWaveNotificationCapability[] = [];
	const valueDB = ctx.getValueDB(node.id);
	for (const endpoint of getAllEndpoints<
		EndpointId & SupportsCC & ControlsCC
	>(ctx, node)) {
		// This list is hardcoded since there is just a small list of CCs
		// that can send notifications
		if (endpoint.supportsCC(CommandClasses["Entry Control"])) {
			const eventTypes = valueDB.getValue<EntryControlEventTypes[]>(
				EntryControlCCValues.supportedEventTypes.endpoint(
					endpoint.index,
				),
			);
			if (eventTypes) {
				const capability: ZWaveNotificationCapability_EntryControlCC = {
					commandClass: CommandClasses["Entry Control"],
					endpoint: endpoint.index,
					supportedEventTypes: Object.fromEntries(
						eventTypes.map(
							(et) =>
								[et, entryControlEventTypeLabels[et]] as const,
						),
					) as any,
				};
				ret.push(capability);
			}
		}

		if (endpoint.supportsCC(CommandClasses.Notification)) {
			const notificationTypes =
				valueDB.getValue<number[]>(
					NotificationCCValues.supportedNotificationTypes.endpoint(
						endpoint.index,
					),
				) ?? [];

			const capability: ZWaveNotificationCapability_NotificationCC = {
				commandClass: CommandClasses.Notification,
				endpoint: endpoint.index,
				supportedNotificationTypes: {},
			};
			let hasEvent = false;
			for (const notificationType of notificationTypes) {
				const notification = getNotification(notificationType);
				if (!notification) continue;

				const notificationEvents = valueDB
					.getValue<number[]>(
						NotificationCCValues.supportedNotificationEvents(
							notificationType,
						).endpoint(endpoint.index),
					)
					?.map((e) => notification.events.get(e))
					.filter((e) => e != undefined);
				if (!notificationEvents || notificationEvents.length === 0) {
					continue;
				}

				capability.supportedNotificationTypes[notificationType] = {
					label: notification.name,
					supportedEvents: Object.fromEntries(
						notificationEvents.map((e) => [e.value, e.label]),
					),
				};
				hasEvent = true;
			}

			if (hasEvent) ret.push(capability);
		}
	}
	return ret;
}
