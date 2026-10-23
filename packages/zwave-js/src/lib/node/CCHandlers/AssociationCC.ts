import type {
	AssociationCCGet,
	AssociationCCRemove,
	AssociationCCSet,
	AssociationCCSpecificGroupGet,
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

export async function handleAssociationGet(
	ctx: PersistValuesContext & LogNode,
	controller: ZWaveController,
	node: ZWaveNode,
	command: AssociationCCGet,
): Promise<void> {
	// We only "support" the lifeline group
	const groupId = 1;

	const endpoint = node.getEndpoint(command.endpointIndex) ?? node;

	// We are being queried, so the device may actually not support the CC, just control it.
	// Using the commandClasses property would throw in that case
	const api = endpoint
		.createAPI(CommandClasses.Association, false)
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

	try {
		await api.sendReport({
			groupId,
			maxNodes: MAX_ASSOCIATIONS,
			nodeIds,
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

export function handleAssociationSet(
	ctx: PersistValuesContext & LogNode,
	controller: ZWaveController,
	node: ZWaveNode,
	command: AssociationCCSet,
): void {
	if (command.groupId !== 1) {
		// We only "support" the lifeline group.
		throw new ZWaveError(
			`Association group ${command.groupId} is not supported.`,
			ZWaveErrorCodes.CC_OperationFailed,
		);
	}

	// Ignore associations that already exist
	const newAssociations = command.nodeIds
		.filter(
			(newNodeId) =>
				!controller.associations.some(
					({ nodeId, endpoint }) =>
						endpoint === undefined && nodeId === newNodeId,
				),
		)
		.map((nodeId) => ({ nodeId }));

	const associations = [...controller.associations];
	associations.push(...newAssociations);

	// Report error if the association group is already full
	if (associations.length > MAX_ASSOCIATIONS) {
		throw new ZWaveError(
			`Association group ${command.groupId} is full`,
			ZWaveErrorCodes.CC_OperationFailed,
		);
	}
	controller.associations = associations;
}

export function handleAssociationRemove(
	ctx: PersistValuesContext & LogNode,
	controller: ZWaveController,
	node: ZWaveNode,
	command: AssociationCCRemove,
): void {
	// Allow accessing the lifeline group or all groups (which is the same)
	if (!!command.groupId && command.groupId !== 1) {
		// We only "support" the lifeline group
		return;
	}

	if (!command.nodeIds?.length) {
		// clear
		controller.associations = [];
	} else {
		controller.associations = controller.associations.filter(
			({ nodeId, endpoint }) =>
				endpoint === undefined && !command.nodeIds!.includes(nodeId),
		);
	}
}

export async function handleAssociationSpecificGroupGet(
	ctx: PersistValuesContext & LogNode,
	node: ZWaveNode,
	command: AssociationCCSpecificGroupGet,
): Promise<void> {
	const endpoint = node.getEndpoint(command.endpointIndex) ?? node;

	// We are being queried, so the device may actually not support the CC, just control it.
	// Using the commandClasses property would throw in that case
	const api = endpoint
		.createAPI(CommandClasses.Association, false)
		.withOptions({
			// Answer with the same encapsulation as asked, but omit
			// Supervision as it shouldn't be used for Get-Report flows
			encapsulationFlags:
				command.encapsulationFlags & ~EncapsulationFlags.Supervision,
		});

	// We don't support this feature.
	// It is RECOMMENDED that the value 0 is returned by non-supporting devices.
	try {
		await api.reportSpecificGroup(0);
	} catch (e: any) {
		ctx.logNode(node.id, {
			message: e.message,
			level: "error",
		});
		// ignore
	}
}
