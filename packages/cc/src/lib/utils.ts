import {
	actuatorCCs,
	CommandClasses,
	IZWaveNode,
	ZWaveError,
	ZWaveErrorCodes,
	type IZWaveEndpoint,
} from "@zwave-js/core/safe";
import type { ZWaveApplicationHost } from "@zwave-js/host/safe";
import { ObjectKeyMap, type ReadonlyObjectKeyMap } from "@zwave-js/shared/safe";
import { distinct } from "alcalzone-shared/arrays";
import {
	AssociationCC,
	AssociationCCValues,
	getLifelineGroupIds,
} from "../cc/AssociationCC";
import { AssociationGroupInfoCC } from "../cc/AssociationGroupInfoCC";
import {
	MultiChannelAssociationCC,
	MultiChannelAssociationCCValues,
} from "../cc/MultiChannelAssociationCC";
import { CCAPI } from "./API";
import type {
	AssociationAddress,
	AssociationGroup,
	EndpointAddress,
} from "./_Types";

export function getAssociations(
	applHost: ZWaveApplicationHost,
	endpoint: IZWaveEndpoint,
): ReadonlyMap<number, readonly AssociationAddress[]> {
	const ret = new Map<number, readonly AssociationAddress[]>();

	if (endpoint.supportsCC(CommandClasses.Association)) {
		const destinations = AssociationCC.getAllDestinationsCached(
			applHost,
			endpoint,
		);
		for (const [groupId, assocs] of destinations) {
			ret.set(groupId, assocs);
		}
	} else {
		throw new ZWaveError(
			`Node ${endpoint.nodeId}${
				endpoint.index > 0 ? `, endpoint ${endpoint.index}` : ""
			} does not support associations!`,
			ZWaveErrorCodes.CC_NotSupported,
		);
	}

	// Merge the "normal" destinations with multi channel destinations
	if (endpoint.supportsCC(CommandClasses["Multi Channel Association"])) {
		const destinations = MultiChannelAssociationCC.getAllDestinationsCached(
			applHost,
			endpoint,
		);
		for (const [groupId, assocs] of destinations) {
			if (ret.has(groupId)) {
				const normalAssociations = ret.get(groupId)!;
				ret.set(groupId, [
					...normalAssociations,
					// Eliminate potential duplicates
					...assocs.filter(
						(a1) =>
							normalAssociations.findIndex(
								(a2) =>
									a1.nodeId === a2.nodeId &&
									a1.endpoint === a2.endpoint,
							) === -1,
					),
				]);
			} else {
				ret.set(groupId, assocs);
			}
		}
	}

	return ret;
}

export function getAllAssociations(
	applHost: ZWaveApplicationHost,
	node: IZWaveNode,
): ReadonlyObjectKeyMap<
	AssociationAddress,
	ReadonlyMap<number, readonly AssociationAddress[]>
> {
	const ret = new ObjectKeyMap<
		AssociationAddress,
		ReadonlyMap<number, readonly AssociationAddress[]>
	>();
	for (const endpoint of node.getAllEndpoints()) {
		const address: AssociationAddress = {
			nodeId: node.id,
			endpoint: endpoint.index,
		};
		if (endpoint.supportsCC(CommandClasses.Association)) {
			ret.set(address, getAssociations(applHost, endpoint));
		}
	}
	return ret;
}

export function isAssociationAllowed(
	applHost: ZWaveApplicationHost,
	endpoint: IZWaveEndpoint,
	group: number,
	destination: AssociationAddress,
): boolean {
	// Check that the target endpoint exists except when adding an association to the controller
	const targetNode = applHost.nodes.getOrThrow(destination.nodeId);
	const targetEndpoint =
		destination.nodeId === applHost.ownNodeId
			? targetNode
			: targetNode.getEndpointOrThrow(destination.endpoint ?? 0);

	if (
		!endpoint.supportsCC(CommandClasses.Association) &&
		!endpoint.supportsCC(CommandClasses["Multi Channel Association"])
	) {
		throw new ZWaveError(
			`Node ${endpoint.nodeId}${
				endpoint.index > 0 ? `, endpoint ${endpoint.index}` : ""
			} does not support associations!`,
			ZWaveErrorCodes.CC_NotSupported,
		);
	}

	// For Association version 1 and version 2 / MCA version 1-3:
	// A controlling node MUST NOT associate Node A to a Node B destination
	// if Node A and Node B’s highest Security Class are not identical.
	// For Association version 3 / MCA version 4:
	// A controlling node MUST NOT associate Node A to a Node B destination
	// if Node A was not granted Node B’s highest Security Class.

	const sourceNode = endpoint.getNodeUnsafe()!;
	let securityClassMustMatch: boolean;
	if (destination.endpoint == undefined) {
		// "normal" association
		const sourceNodeCCVersion = endpoint.getCCVersion(
			CommandClasses.Association,
		);
		securityClassMustMatch = sourceNodeCCVersion < 3;
	} else {
		// multi channel association
		const sourceNodeCCVersion = endpoint.getCCVersion(
			CommandClasses["Multi Channel Association"],
		);
		securityClassMustMatch = sourceNodeCCVersion < 4;
	}

	const sourceSecurityClass = sourceNode.getHighestSecurityClass();
	const targetSecurityClass = targetNode.getHighestSecurityClass();

	// If the security classes are unknown, all bets are off
	if (sourceSecurityClass != undefined && targetSecurityClass != undefined) {
		if (
			securityClassMustMatch &&
			sourceSecurityClass !== targetSecurityClass
		) {
			return false;
		} else if (
			!securityClassMustMatch &&
			!sourceNode.hasSecurityClass(targetSecurityClass)
		) {
			return false;
		}
	}

	// SDS14223:
	// A controlling node MUST NOT associate Node A to a Node B destination that does not support
	// the Command Class that the Node A will be controlling
	//
	// To determine this, the node must support the AGI CC or we have no way of knowing which
	// CCs the node will control
	if (!endpoint.supportsCC(CommandClasses["Association Group Information"])) {
		return true;
	}

	// The following checks don't apply to Lifeline associations
	if (destination.nodeId === applHost.ownNodeId) return true;

	const groupCommandList = AssociationGroupInfoCC.getIssuedCommandsCached(
		applHost,
		endpoint,
		group,
	);
	if (!groupCommandList || !groupCommandList.size) {
		// We don't know which CCs this group controls, just allow it
		return true;
	}
	const groupCCs = [...groupCommandList.keys()];

	// A controlling node MAY create an association to a destination supporting an
	// actuator Command Class if the actual association group sends Basic Control Command Class.
	if (
		groupCCs.includes(CommandClasses.Basic) &&
		actuatorCCs.some((cc) => targetEndpoint?.supportsCC(cc))
	) {
		return true;
	}

	// Enforce that at least one issued CC is supported
	return groupCCs.some((cc) => targetEndpoint?.supportsCC(cc));
}

export function getAssociationGroups(
	applHost: ZWaveApplicationHost,
	endpoint: IZWaveEndpoint,
): ReadonlyMap<number, AssociationGroup> {
	// Check whether we have multi channel support or not
	let assocInstance: typeof AssociationCC;
	let mcInstance: typeof MultiChannelAssociationCC | undefined;
	if (endpoint.supportsCC(CommandClasses.Association)) {
		assocInstance = AssociationCC;
	} else {
		throw new ZWaveError(
			`Node ${endpoint.nodeId}${
				endpoint.index > 0 ? `, endpoint ${endpoint.index}` : ""
			} does not support associations!`,
			ZWaveErrorCodes.CC_NotSupported,
		);
	}
	if (endpoint.supportsCC(CommandClasses["Multi Channel Association"])) {
		mcInstance = MultiChannelAssociationCC;
	}

	const assocGroupCount =
		assocInstance.getGroupCountCached(applHost, endpoint) ?? 0;
	const mcGroupCount =
		mcInstance?.getGroupCountCached(applHost, endpoint) ?? 0;
	const groupCount = Math.max(assocGroupCount, mcGroupCount);

	const deviceConfig = applHost.getDeviceConfig?.(endpoint.nodeId);

	const ret = new Map<number, AssociationGroup>();

	if (endpoint.supportsCC(CommandClasses["Association Group Information"])) {
		// We can read all information we need from the AGI CC
		const agiInstance = AssociationGroupInfoCC;
		for (let group = 1; group <= groupCount; group++) {
			const assocConfig = deviceConfig?.getAssociationConfigForEndpoint(
				endpoint.index,
				group,
			);
			const multiChannel = !!mcInstance && group <= mcGroupCount;
			ret.set(group, {
				maxNodes:
					(multiChannel
						? mcInstance!
						: assocInstance
					).getMaxNodesCached(applHost, endpoint, group) || 1,
				// AGI implies Z-Wave+ where group 1 is the lifeline
				isLifeline: group === 1,
				label:
					// prefer the configured label if we have one
					assocConfig?.label ??
					// the ones reported by AGI are sometimes pretty bad
					agiInstance.getGroupNameCached(applHost, endpoint, group) ??
					// but still better than "unnamed"
					`Unnamed group ${group}`,
				multiChannel,
				profile: agiInstance.getGroupProfileCached(
					applHost,
					endpoint,
					group,
				),
				issuedCommands: agiInstance.getIssuedCommandsCached(
					applHost,
					endpoint,
					group,
				),
			});
		}
	} else {
		// we need to consult the device config
		for (let group = 1; group <= groupCount; group++) {
			const assocConfig = deviceConfig?.getAssociationConfigForEndpoint(
				endpoint.index,
				group,
			);
			const multiChannel = !!mcInstance && group <= mcGroupCount;
			ret.set(group, {
				maxNodes:
					(multiChannel
						? mcInstance!
						: assocInstance
					).getMaxNodesCached(applHost, endpoint, group) ||
					assocConfig?.maxNodes ||
					1,
				isLifeline: assocConfig?.isLifeline ?? group === 1,
				label: assocConfig?.label ?? `Unnamed group ${group}`,
				multiChannel,
			});
		}
	}
	return ret;
}

export function getAllAssociationGroups(
	applHost: ZWaveApplicationHost,
	node: IZWaveNode,
): ReadonlyMap<number, ReadonlyMap<number, AssociationGroup>> {
	const ret = new Map<number, ReadonlyMap<number, AssociationGroup>>();
	for (const endpoint of node.getAllEndpoints()) {
		if (endpoint.supportsCC(CommandClasses.Association)) {
			ret.set(endpoint.index, getAssociationGroups(applHost, endpoint));
		}
	}
	return ret;
}

export async function addAssociations(
	applHost: ZWaveApplicationHost,
	endpoint: IZWaveEndpoint,
	group: number,
	destinations: AssociationAddress[],
): Promise<void> {
	const nodeAndEndpointString = `${endpoint.nodeId}${
		endpoint.index > 0 ? `, endpoint ${endpoint.index}` : ""
	}`;

	// Check whether we should add any associations the device does not have support for
	let assocInstance: typeof AssociationCC | undefined;
	let mcInstance: typeof MultiChannelAssociationCC | undefined;
	// Split associations into conventional and endpoint associations
	const nodeAssociations = distinct(
		destinations
			.filter((a) => a.endpoint == undefined)
			.map((a) => a.nodeId),
	);
	const endpointAssociations = destinations.filter(
		(a) => a.endpoint != undefined,
	) as EndpointAddress[];

	if (endpoint.supportsCC(CommandClasses.Association)) {
		assocInstance = AssociationCC;
	} else if (nodeAssociations.length > 0) {
		throw new ZWaveError(
			`Node ${nodeAndEndpointString} does not support associations!`,
			ZWaveErrorCodes.CC_NotSupported,
		);
	}
	if (endpoint.supportsCC(CommandClasses["Multi Channel Association"])) {
		mcInstance = MultiChannelAssociationCC;
	} else if (endpointAssociations.length > 0) {
		throw new ZWaveError(
			`Node ${nodeAndEndpointString} does not support multi channel associations!`,
			ZWaveErrorCodes.CC_NotSupported,
		);
	}

	const assocGroupCount =
		assocInstance?.getGroupCountCached(applHost, endpoint) ?? 0;
	const mcGroupCount =
		mcInstance?.getGroupCountCached(applHost, endpoint) ?? 0;
	const groupCount = Math.max(assocGroupCount, mcGroupCount);
	if (group > groupCount) {
		throw new ZWaveError(
			`Group ${group} does not exist on node ${nodeAndEndpointString}`,
			ZWaveErrorCodes.AssociationCC_InvalidGroup,
		);
	}

	const deviceConfig = applHost.getDeviceConfig?.(endpoint.nodeId);

	const groupIsMultiChannel =
		!!mcInstance &&
		group <= mcGroupCount &&
		deviceConfig?.associations?.get(group)?.multiChannel !== false;

	if (groupIsMultiChannel) {
		// Check that all associations are allowed
		const disallowedAssociations = destinations.filter(
			(a) => !isAssociationAllowed(applHost, endpoint, group, a),
		);
		if (disallowedAssociations.length) {
			let message = `The following associations are not allowed:`;
			message += disallowedAssociations
				.map(
					(a) =>
						`\n· Node ${a.nodeId}${
							a.endpoint ? `, endpoint ${a.endpoint}` : ""
						}`,
				)
				.join("");
			throw new ZWaveError(
				message,
				ZWaveErrorCodes.AssociationCC_NotAllowed,
			);
		}

		// And add them
		const api = CCAPI.create(
			CommandClasses["Multi Channel Association"],
			applHost,
			endpoint,
		);
		await api.addDestinations({
			groupId: group,
			nodeIds: nodeAssociations,
			endpoints: endpointAssociations,
		});
		// Refresh the association list
		await api.getGroup(group);
	} else {
		// Although the node supports multi channel associations, this group only supports "normal" associations
		if (destinations.some((a) => a.endpoint != undefined)) {
			throw new ZWaveError(
				`Node ${nodeAndEndpointString}, group ${group} does not support multi channel associations!`,
				ZWaveErrorCodes.CC_NotSupported,
			);
		}

		// Check that all associations are allowed
		const disallowedAssociations = destinations.filter(
			(a) => !isAssociationAllowed(applHost, endpoint, group, a),
		);
		if (disallowedAssociations.length) {
			throw new ZWaveError(
				`The associations to the following nodes are not allowed: ${disallowedAssociations
					.map((a) => a.nodeId)
					.join(", ")}`,
				ZWaveErrorCodes.AssociationCC_NotAllowed,
			);
		}

		const api = CCAPI.create(
			CommandClasses.Association,
			applHost,
			endpoint,
		);
		await api.addNodeIds(group, ...destinations.map((a) => a.nodeId));
		// Refresh the association list
		await api.getGroup(group);
	}
}

export async function removeAssociations(
	applHost: ZWaveApplicationHost,
	endpoint: IZWaveEndpoint,
	group: number,
	destinations: AssociationAddress[],
): Promise<void> {
	const nodeAndEndpointString = `${endpoint.nodeId}${
		endpoint.index > 0 ? `, endpoint ${endpoint.index}` : ""
	}`;

	// Split associations into conventional and endpoint associations
	const nodeAssociations = distinct(
		destinations
			.filter((a) => a.endpoint == undefined)
			.map((a) => a.nodeId),
	);
	const endpointAssociations = destinations.filter(
		(a) => a.endpoint != undefined,
	) as EndpointAddress[];

	// Removing associations is not either/or - we could have a device with duplicated associations between
	// Association CC and Multi Channel Association CC
	// Figure out what we need to use to remove the associations

	let groupExistsAsMultiChannel = false;
	let groupExistsAsNodeAssociation = false;

	let mcInstance: typeof MultiChannelAssociationCC | undefined;
	let assocInstance: typeof AssociationCC | undefined;

	// To remove a multi channel association, we need to make sure that the group exists
	// and the node supports multi channel associations
	if (endpoint.supportsCC(CommandClasses["Multi Channel Association"])) {
		mcInstance = MultiChannelAssociationCC;
		if (group <= mcInstance.getGroupCountCached(applHost, endpoint)) {
			groupExistsAsMultiChannel = true;
		}
	} else if (endpointAssociations.length > 0) {
		throw new ZWaveError(
			`Node ${nodeAndEndpointString} does not support multi channel associations!`,
			ZWaveErrorCodes.CC_NotSupported,
		);
	}

	// To remove a normal association, we need to make sure that the group exists either as a normal association
	// or as a multi channel association
	if (endpoint.supportsCC(CommandClasses.Association)) {
		assocInstance = AssociationCC;
		if (group <= assocInstance.getGroupCountCached(applHost, endpoint)) {
			groupExistsAsNodeAssociation = true;
		}
	}

	if (!mcInstance && !assocInstance) {
		throw new ZWaveError(
			`Node ${nodeAndEndpointString} does not support associations!`,
			ZWaveErrorCodes.CC_NotSupported,
		);
	}

	// Ensure the group exists and can be used
	if (!groupExistsAsMultiChannel && !groupExistsAsNodeAssociation) {
		throw new ZWaveError(
			` Association group ${group} does not exist for node ${nodeAndEndpointString}`,
			ZWaveErrorCodes.AssociationCC_InvalidGroup,
		);
	}
	if (endpointAssociations.length > 0 && !groupExistsAsMultiChannel) {
		throw new ZWaveError(
			`Node ${nodeAndEndpointString}, association group ${group} does not support multi channel associations!`,
			ZWaveErrorCodes.AssociationCC_InvalidGroup,
		);
	}

	// Even if we only remove node associations, we use both CCs since it has been found that some
	// devices do not correctly share the node list between the two commands
	if (
		assocInstance &&
		nodeAssociations.length > 0 &&
		groupExistsAsNodeAssociation
	) {
		const api = CCAPI.create(
			CommandClasses.Association,
			applHost,
			endpoint,
		);
		await api.removeNodeIds({
			groupId: group,
			nodeIds: nodeAssociations,
		});
		// Refresh the association list
		await api.getGroup(group);
	}

	if (mcInstance && groupExistsAsMultiChannel) {
		const api = CCAPI.create(
			CommandClasses["Multi Channel Association"],
			applHost,
			endpoint,
		);
		await api.removeDestinations({
			groupId: group,
			nodeIds: nodeAssociations,
			endpoints: endpointAssociations,
		});
		// Refresh the multi channel association list
		await api.getGroup(group);
	}
}

export async function configureLifelineAssociations(
	applHost: ZWaveApplicationHost,
	endpoint: IZWaveEndpoint,
): Promise<void> {
	// Assign the controller to all lifeline groups
	const ownNodeId = applHost.ownNodeId;
	const node = endpoint.getNodeUnsafe()!;
	const valueDB = applHost.getValueDB(node.id);
	const deviceConfig = applHost.getDeviceConfig?.(node.id);

	// We check if a node supports Multi Channel CC before creating Multi Channel Lifeline Associations (#1109)
	const nodeSupportsMultiChannel = node.supportsCC(
		CommandClasses["Multi Channel"],
	);

	let assocInstance: typeof AssociationCC | undefined;
	const assocAPI = CCAPI.create(
		CommandClasses.Association,
		applHost,
		endpoint,
	);
	if (endpoint.supportsCC(CommandClasses.Association)) {
		assocInstance = AssociationCC;
	}

	let mcInstance: typeof MultiChannelAssociationCC | undefined;
	let mcGroupCount = 0;
	const mcAPI = CCAPI.create(
		CommandClasses["Multi Channel Association"],
		applHost,
		endpoint,
	);
	if (endpoint.supportsCC(CommandClasses["Multi Channel Association"])) {
		mcInstance = MultiChannelAssociationCC;
		mcGroupCount = mcInstance.getGroupCountCached(applHost, endpoint) ?? 0;
	}

	const lifelineGroups = getLifelineGroupIds(applHost, node);
	if (lifelineGroups.length === 0) {
		applHost.controllerLog.logNode(node.id, {
			endpoint: endpoint.index,
			message:
				"No information about Lifeline associations, cannot assign ourselves!",
			level: "warn",
		});
		// Remember that we have NO lifeline association
		valueDB.setValue(
			AssociationCCValues.hasLifeline.endpoint(endpoint.index),
			false,
		);
		return;
	}

	applHost.controllerLog.logNode(node.id, {
		endpoint: endpoint.index,
		message: `Checking/assigning lifeline groups: ${lifelineGroups.join(
			", ",
		)}
supports classic associations:       ${!!assocInstance}
supports multi channel associations: ${!!mcInstance}`,
	});

	for (const group of lifelineGroups) {
		const groupSupportsMultiChannelAssociation = group <= mcGroupCount;
		const assocConfig = deviceConfig?.getAssociationConfigForEndpoint(
			endpoint.index,
			group,
		);

		const mustUseNodeAssociation =
			!groupSupportsMultiChannelAssociation ||
			!nodeSupportsMultiChannel ||
			assocConfig?.multiChannel === false;
		let mustUseMultiChannelAssociation = false;

		if (groupSupportsMultiChannelAssociation && nodeSupportsMultiChannel) {
			if (assocConfig?.multiChannel === true) {
				mustUseMultiChannelAssociation = true;
			} else if (endpoint.index === 0) {
				// If the node has multiple endpoints but none of the extra ones support associations,
				// the root endpoints needs a Multi Channel Association
				const allEndpoints = node.getAllEndpoints();
				if (
					allEndpoints.length > 1 &&
					allEndpoints
						.filter((e) => e.index !== endpoint.index)
						.every(
							(e) =>
								!e.supportsCC(CommandClasses.Association) &&
								!e.supportsCC(
									CommandClasses["Multi Channel Association"],
								),
						)
				) {
					mustUseMultiChannelAssociation = true;
				}
			}
		}

		applHost.controllerLog.logNode(node.id, {
			endpoint: endpoint.index,
			message: `Configuring lifeline group #${group}:
group supports multi channel:  ${groupSupportsMultiChannelAssociation}
configured strategy:           ${assocConfig?.multiChannel ?? "auto"}
must use node association:     ${mustUseNodeAssociation}
must use endpoint association: ${mustUseMultiChannelAssociation}`,
		});

		// Figure out which associations exist and may need to be removed
		const isAssignedAsNodeAssociation = (): boolean => {
			if (groupSupportsMultiChannelAssociation && mcInstance) {
				if (
					// Only consider a group if it doesn't share its associations with the root endpoint
					mcInstance.getMaxNodesCached(applHost, endpoint, group) >
						0 &&
					!!mcInstance
						.getAllDestinationsCached(applHost, endpoint)
						.get(group)
						?.some(
							(addr) =>
								addr.nodeId === ownNodeId &&
								addr.endpoint == undefined,
						)
				) {
					return true;
				}
			}
			if (assocInstance) {
				if (
					// Only consider a group if it doesn't share its associations with the root endpoint
					assocInstance.getMaxNodesCached(applHost, endpoint, group) >
						0 &&
					!!assocInstance
						.getAllDestinationsCached(applHost, endpoint)
						.get(group)
						?.some((addr) => addr.nodeId === ownNodeId)
				) {
					return true;
				}
			}

			return false;
		};

		const isAssignedAsEndpointAssociation = (): boolean => {
			if (mcInstance) {
				if (
					// Only consider a group if it doesn't share its associations with the root endpoint
					mcInstance.getMaxNodesCached(applHost, endpoint, group) >
						0 &&
					mcInstance
						.getAllDestinationsCached(applHost, endpoint)
						.get(group)
						?.some(
							(addr) =>
								addr.nodeId === ownNodeId &&
								addr.endpoint === 0,
						)
				) {
					return true;
				}
			}
			return false;
		};

		// If the node was used with other controller software, there might be
		// invalid lifeline associations which cause reporting problems
		const invalidEndpointAssociations: EndpointAddress[] =
			mcInstance
				?.getAllDestinationsCached(applHost, endpoint)
				.get(group)
				?.filter(
					(addr): addr is AssociationAddress & EndpointAddress =>
						addr.nodeId === ownNodeId &&
						addr.endpoint != undefined &&
						addr.endpoint !== 0,
				) ?? [];

		// Clean them up first
		if (
			invalidEndpointAssociations.length > 0 &&
			mcAPI.isSupported() &&
			groupSupportsMultiChannelAssociation
		) {
			applHost.controllerLog.logNode(node.id, {
				endpoint: endpoint.index,
				message: `Found invalid lifeline associations in group #${group}, removing them...`,
				direction: "outbound",
			});
			await mcAPI.removeDestinations({
				groupId: group,
				endpoints: invalidEndpointAssociations,
			});
			// refresh the associations - don't trust that it worked
			await mcAPI.getGroup(group);
		}

		// Assigning the correct lifelines depends on the association kind, source endpoint and the desired strategy:
		//
		// When `mustUseMultiChannelAssociation` is `true` - Use a multi channel association (if possible), no fallback
		// When `mustUseNodeAssociation` is `true` - Use a node association (if possible), no fallback
		// Otherwise:
		//   1. Try a node association on the current endpoint/root
		//   2. If Association CC is not supported, try assigning a node association with the Multi Channel Association CC
		//   3. If that did not work, fall back to a multi channel association (target endpoint 0)
		//   4. If that did not work either, the endpoint index is >0 and the node is Z-Wave+:
		//      Fall back to a multi channel association (target endpoint 0) on the root, if it doesn't have one yet.

		let hasLifeline = false;

		// First try: node association
		if (!mustUseMultiChannelAssociation) {
			if (isAssignedAsNodeAssociation()) {
				// We already have the correct association
				hasLifeline = true;
				applHost.controllerLog.logNode(node.id, {
					endpoint: endpoint.index,
					message: `Lifeline group #${group} is already assigned with a node association`,
					direction: "none",
				});
			} else if (
				assocAPI.isSupported() &&
				// Some endpoint groups don't support having any destinations because they are shared with the root
				assocInstance!.getMaxNodesCached(applHost, endpoint, group) > 0
			) {
				// We can use a node association, but first remove any possible endpoint associations
				applHost.controllerLog.logNode(node.id, {
					endpoint: endpoint.index,
					message: `Assigning lifeline group #${group} with a node association via Association CC...`,
					direction: "outbound",
				});
				if (isAssignedAsEndpointAssociation() && mcAPI.isSupported()) {
					await mcAPI.removeDestinations({
						groupId: group,
						endpoints: [{ nodeId: ownNodeId, endpoint: 0 }],
					});
					// refresh the associations - don't trust that it worked
					await mcAPI.getGroup(group);
				}

				await assocAPI.addNodeIds(group, ownNodeId);
				// refresh the associations - don't trust that it worked
				const groupReport = await assocAPI.getGroup(group);
				hasLifeline = !!groupReport?.nodeIds.includes(ownNodeId);

				if (hasLifeline) {
					applHost.controllerLog.logNode(node.id, {
						endpoint: endpoint.index,
						message: `Lifeline group #${group} was assigned with a node association via Association CC`,
						direction: "none",
					});
				} else {
					applHost.controllerLog.logNode(node.id, {
						endpoint: endpoint.index,
						message: `Assigning lifeline group #${group} with a node association via Association CC did not work`,
						direction: "none",
					});
				}
			}

			// Second try: Node association using the Multi Channel Association CC
			if (
				!hasLifeline &&
				mcAPI.isSupported() &&
				mcInstance!.getMaxNodesCached(applHost, endpoint, group) > 0
			) {
				// We can use a node association, but first remove any possible endpoint associations
				applHost.controllerLog.logNode(node.id, {
					endpoint: endpoint.index,
					message: `Assigning lifeline group #${group} with a node association via Multi Channel Association CC...`,
					direction: "outbound",
				});
				if (isAssignedAsEndpointAssociation()) {
					await mcAPI.removeDestinations({
						groupId: group,
						endpoints: [{ nodeId: ownNodeId, endpoint: 0 }],
					});
				}

				await mcAPI.addDestinations({
					groupId: group,
					nodeIds: [ownNodeId],
				});
				// refresh the associations - don't trust that it worked
				const groupReport = await mcAPI.getGroup(group);
				hasLifeline = !!groupReport?.nodeIds.includes(ownNodeId);

				if (hasLifeline) {
					applHost.controllerLog.logNode(node.id, {
						endpoint: endpoint.index,
						message: `Lifeline group #${group} was assigned with a node association via Multi Channel Association CC`,
						direction: "none",
					});
				} else {
					applHost.controllerLog.logNode(node.id, {
						endpoint: endpoint.index,
						message: `Assigning lifeline group #${group} with a node association via Multi Channel Association CC did not work`,
						direction: "none",
					});
				}
			}
		}

		// Third try: Use an endpoint association (target endpoint 0)
		// This is only supported starting in Multi Channel Association CC V3
		if (!hasLifeline && !mustUseNodeAssociation) {
			if (isAssignedAsEndpointAssociation()) {
				// We already have the correct association
				hasLifeline = true;
				applHost.controllerLog.logNode(node.id, {
					endpoint: endpoint.index,
					message: `Lifeline group #${group} is already assigned with an endpoint association`,
					direction: "none",
				});
			} else if (
				mcAPI.isSupported() &&
				mcAPI.version >= 3 &&
				mcInstance!.getMaxNodesCached(applHost, endpoint, group) > 0
			) {
				// We can use a multi channel association, but first remove any possible node associations
				applHost.controllerLog.logNode(node.id, {
					endpoint: endpoint.index,
					message: `Assigning lifeline group #${group} with a multi channel association...`,
					direction: "outbound",
				});
				if (isAssignedAsNodeAssociation()) {
					// It has been found that some devices don't correctly share the node associations between
					// Association CC and Multi Channel Association CC, so we remove the nodes from both lists
					await mcAPI.removeDestinations({
						groupId: group,
						nodeIds: [ownNodeId],
					});
					if (assocAPI.isSupported()) {
						await assocAPI.removeNodeIds({
							groupId: group,
							nodeIds: [ownNodeId],
						});
						// refresh the associations - don't trust that it worked
						await assocAPI.getGroup(group);
					}
				}

				await mcAPI.addDestinations({
					groupId: group,
					endpoints: [{ nodeId: ownNodeId, endpoint: 0 }],
				});
				// refresh the associations - don't trust that it worked
				const groupReport = await mcAPI.getGroup(group);
				hasLifeline = !!groupReport?.endpoints.some(
					(a) => a.nodeId === ownNodeId && a.endpoint === 0,
				);

				if (hasLifeline) {
					applHost.controllerLog.logNode(node.id, {
						endpoint: endpoint.index,
						message: `Lifeline group #${group} was assigned with a multi channel association`,
						direction: "none",
					});
				} else {
					applHost.controllerLog.logNode(node.id, {
						endpoint: endpoint.index,
						message: `Assigning lifeline group #${group} with a multi channel association did not work`,
						direction: "none",
					});
				}
			}
		}

		// Last attempt (actual Z-Wave+ Lifelines only): Try a multi channel association on the root.
		// Endpoint interviews happen AFTER the root interview, so this enables us to overwrite what
		// we previously configured on the root.
		if (
			!hasLifeline &&
			group === 1 &&
			node.supportsCC(CommandClasses["Z-Wave Plus Info"]) &&
			endpoint.index > 0
		) {
			// But first check if the root may have a multi channel association
			const rootAssocConfig =
				deviceConfig?.getAssociationConfigForEndpoint(0, group);
			const rootMustUseNodeAssociation =
				!nodeSupportsMultiChannel ||
				rootAssocConfig?.multiChannel === false;

			applHost.controllerLog.logNode(node.id, {
				endpoint: endpoint.index,
				message: `Checking root device for fallback assignment of lifeline group #${group}:
root supports multi channel:  ${nodeSupportsMultiChannel}
configured strategy:           ${rootAssocConfig?.multiChannel ?? "auto"}
must use node association:     ${rootMustUseNodeAssociation}`,
			});

			if (!rootMustUseNodeAssociation) {
				const rootNodesValueId =
					MultiChannelAssociationCCValues.nodeIds(group).id;
				const rootHasNodeAssociation = !!valueDB
					.getValue<number[]>(rootNodesValueId)
					?.some((a) => a === ownNodeId);
				const rootEndpointsValueId =
					MultiChannelAssociationCCValues.endpoints(group).id;
				const rootHasEndpointAssociation = !!valueDB
					.getValue<EndpointAddress[]>(rootEndpointsValueId)
					?.some((a) => a.nodeId === ownNodeId && a.endpoint === 0);
				if (rootHasEndpointAssociation) {
					// We already have the correct association
					hasLifeline = true;
					applHost.controllerLog.logNode(node.id, {
						endpoint: endpoint.index,
						message: `Lifeline group #${group} is already assigned with a multi channel association on the root device`,
						direction: "none",
					});
				} else {
					const rootMCAPI = CCAPI.create(
						CommandClasses["Multi Channel Association"],
						applHost,
						node,
					);
					if (rootMCAPI.isSupported()) {
						applHost.controllerLog.logNode(node.id, {
							endpoint: endpoint.index,
							message: `Assigning lifeline group #${group} with a multi channel association on the root device...`,
							direction: "outbound",
						});
						// Clean up node associations because they might prevent us from adding the endpoint association
						if (rootHasNodeAssociation) {
							await rootMCAPI.removeDestinations({
								groupId: group,
								nodeIds: [ownNodeId],
							});
						}
						await rootMCAPI.addDestinations({
							groupId: group,
							endpoints: [{ nodeId: ownNodeId, endpoint: 0 }],
						});
						// refresh the associations - don't trust that it worked
						const groupReport = await rootMCAPI.getGroup(group);
						hasLifeline = !!groupReport?.endpoints.some(
							(a) => a.nodeId === ownNodeId && a.endpoint === 0,
						);
					}
				}
			}
		}

		if (!hasLifeline) {
			applHost.controllerLog.logNode(node.id, {
				endpoint: endpoint.index,
				message: `All attempts to assign lifeline group #${group} failed, skipping...`,
				direction: "none",
				level: "warn",
			});
		}
	}

	// Remember that we did the association assignment
	valueDB.setValue(
		AssociationCCValues.hasLifeline.endpoint(endpoint.index),
		true,
	);
}
