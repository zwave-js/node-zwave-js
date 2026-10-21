import type {
	MultiChannelAssociationCCGet,
	MultiChannelAssociationCCRemove,
	MultiChannelAssociationCCSet,
	MultiChannelAssociationCCSupportedGroupingsGet,
	PersistValuesContext,
} from "@zwave-js/cc";
import {
	CommandClasses,
	EncapsulationFlags,
	type LogNode,
	ZWaveError,
	ZWaveErrorCodes,
} from "@zwave-js/core";

import type { ZWaveController } from "../../controller/Controller.js";
import type { ZWaveNode } from "../Node.js";

import { MAX_ASSOCIATIONS } from "./_shared.js";

export async function handleMultiChannelAssociationSupportedGroupingsGet(
	ctx: PersistValuesContext & LogNode,
	node: ZWaveNode,
	command: MultiChannelAssociationCCSupportedGroupingsGet,
): Promise<void> {
	const endpoint = node.getEndpoint(command.endpointIndex) ?? node;

	// We are being queried, so the device may actually not support the CC, just control it.
	// Using the commandClasses property would throw in that case
	const api = endpoint
		.createAPI(CommandClasses["Multi Channel Association"], false)
		.withOptions({
			// Answer with the same encapsulation as asked, but omit
			// Supervision as it shouldn't be used for Get-Report flows
			encapsulationFlags:
				command.encapsulationFlags & ~EncapsulationFlags.Supervision,
		});

	// We only "support" the lifeline group
	try {
		await api.reportGroupCount(1);
	} catch (e: any) {
		ctx.logNode(node.id, {
			message: e.message,
			level: "error",
		});
		// ignore
	}
}

export async function handleMultiChannelAssociationGet(
	ctx: PersistValuesContext & LogNode,
	controller: ZWaveController,
	node: ZWaveNode,
	command: MultiChannelAssociationCCGet,
): Promise<void> {
	// We only "support" the lifeline group
	const groupId = 1;

	const endpoint = node.getEndpoint(command.endpointIndex) ?? node;

	// We are being queried, so the device may actually not support the CC, just control it.
	// Using the commandClasses property would throw in that case
	const api = endpoint
		.createAPI(CommandClasses["Multi Channel Association"], false)
		.withOptions({
			// Answer with the same encapsulation as asked, but omit
			// Supervision as it shouldn't be used for Get-Report flows
			encapsulationFlags:
				command.encapsulationFlags & ~EncapsulationFlags.Supervision,
		});

	const nodeIds =
		controller.associations
			.filter((a) => a.endpoint == undefined)
			.map((a) => a.nodeId) ?? [];
	const endpoints =
		controller.associations
			.filter((a) => a.endpoint != undefined)
			.map(({ nodeId, endpoint }) => ({
				nodeId,
				endpoint: endpoint!,
			})) ?? [];

	try {
		await api.sendReport({
			groupId,
			maxNodes: MAX_ASSOCIATIONS,
			nodeIds,
			endpoints,
			reportsToFollow: 0,
		});
	} catch (e: any) {
		ctx.logNode(node.id, {
			message: e.message,
			level: "error",
		});
		// ignore
	}
}

export function handleMultiChannelAssociationSet(
	ctx: PersistValuesContext & LogNode,
	controller: ZWaveController,
	node: ZWaveNode,
	command: MultiChannelAssociationCCSet,
): void {
	if (command.groupId !== 1) {
		// We only "support" the lifeline group.
		throw new ZWaveError(
			`Multi Channel Association group ${command.groupId} is not supported.`,
			ZWaveErrorCodes.CC_OperationFailed,
		);
	}

	// Ignore associations that already exists
	const newNodeIdAssociations = command.nodeIds
		.filter(
			(newNodeId) =>
				!controller.associations.some(
					({ nodeId, endpoint }) =>
						endpoint === undefined && nodeId === newNodeId,
				),
		)
		.map((nodeId) => ({ nodeId }));
	const newEndpointAssociations = command.endpoints
		.flatMap(({ nodeId, endpoint }) => {
			if (typeof endpoint === "number") {
				return { nodeId, endpoint };
			} else {
				return endpoint.map((e) => ({ nodeId, endpoint: e }));
			}
		})
		.filter(
			({ nodeId: newNodeId, endpoint: newEndpoint }) =>
				!controller.associations.some(
					({ nodeId, endpoint }) =>
						nodeId === newNodeId && endpoint === newEndpoint,
				),
		);

	const associations = [...controller.associations];
	associations.push(...newNodeIdAssociations, ...newEndpointAssociations);

	// Report error if the association group is already full
	if (associations.length > MAX_ASSOCIATIONS) {
		throw new ZWaveError(
			`Multi Channel Association group ${command.groupId} is full`,
			ZWaveErrorCodes.CC_OperationFailed,
		);
	}

	controller.associations = associations.slice(0, MAX_ASSOCIATIONS);
}

export function handleMultiChannelAssociationRemove(
	ctx: PersistValuesContext & LogNode,
	controller: ZWaveController,
	node: ZWaveNode,
	command: MultiChannelAssociationCCRemove,
): void {
	// Allow accessing the lifeline group or all groups (which is the same)
	if (!!command.groupId && command.groupId !== 1) {
		// We only "support" the lifeline group
		return;
	}

	if (!command.nodeIds?.length && !command.endpoints?.length) {
		// Clear all associations
		controller.associations = [];
	} else {
		let associations = [...controller.associations];
		if (command.nodeIds?.length) {
			associations = associations.filter(
				({ nodeId, endpoint }) =>
					endpoint === undefined
					&& !command.nodeIds!.includes(nodeId),
			);
		}
		if (command.endpoints?.length) {
			associations = associations.filter(
				({ nodeId, endpoint }) =>
					!command.endpoints!.some(
						(dest) =>
							dest.nodeId === nodeId
							&& dest.endpoint === endpoint,
					),
			);
		}
		controller.associations = associations;
	}
}
