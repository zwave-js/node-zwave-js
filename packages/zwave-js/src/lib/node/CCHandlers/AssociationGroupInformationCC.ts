import {
	type AssociationCCSupportedGroupingsGet,
	type AssociationGroupInfoCCCommandListGet,
	type AssociationGroupInfoCCInfoGet,
	type AssociationGroupInfoCCNameGet,
	AssociationGroupInfoProfile,
	DeviceResetLocallyCommand,
	type PersistValuesContext,
} from "@zwave-js/cc";
import {
	CommandClasses,
	EncapsulationFlags,
	type LogNode,
} from "@zwave-js/core";

import type { ZWaveNode } from "../Node.js";

export async function handleAGINameGet(
	ctx: PersistValuesContext & LogNode,
	node: ZWaveNode,
	command: AssociationGroupInfoCCNameGet,
): Promise<void> {
	if (command.groupId !== 1) {
		// We only "support" the lifeline group
		return;
	}

	const endpoint = node.getEndpoint(command.endpointIndex) ?? node;

	// We are being queried, so the device may actually not support the CC, just control it.
	// Using the commandClasses property would throw in that case
	const api = endpoint
		.createAPI(CommandClasses["Association Group Information"], false)
		.withOptions({
			// Answer with the same encapsulation as asked, but omit
			// Supervision as it shouldn't be used for Get-Report flows
			encapsulationFlags:
				command.encapsulationFlags & ~EncapsulationFlags.Supervision,
		});

	try {
		await api.reportGroupName(1, "Lifeline");
	} catch (e: any) {
		ctx.logNode(node.id, {
			message: e.message,
			level: "error",
		});
		// ignore
	}
}

export async function handleAGIInfoGet(
	ctx: PersistValuesContext & LogNode,
	node: ZWaveNode,
	command: AssociationGroupInfoCCInfoGet,
): Promise<void> {
	if (!command.listMode && command.groupId !== 1) {
		// We only "support" the lifeline group
		return;
	}

	const endpoint = node.getEndpoint(command.endpointIndex) ?? node;

	// We are being queried, so the device may actually not support the CC, just control it.
	// Using the commandClasses property would throw in that case
	const api = endpoint
		.createAPI(CommandClasses["Association Group Information"], false)
		.withOptions({
			// Answer with the same encapsulation as asked, but omit
			// Supervision as it shouldn't be used for Get-Report flows
			encapsulationFlags:
				command.encapsulationFlags & ~EncapsulationFlags.Supervision,
		});

	try {
		await api.reportGroupInfo({
			isListMode: command.listMode ?? false,
			hasDynamicInfo: false,
			groups: [
				{
					groupId: 1,
					eventCode: 0, // ignored anyways
					profile: AssociationGroupInfoProfile["General: Lifeline"],
					mode: 0, // ignored anyways
				},
			],
		});
	} catch (e: any) {
		ctx.logNode(node.id, {
			message: e.message,
			level: "error",
		});
		// ignore
	}
}

export async function handleAGICommandListGet(
	ctx: PersistValuesContext & LogNode,
	node: ZWaveNode,
	command: AssociationGroupInfoCCCommandListGet,
): Promise<void> {
	if (command.groupId !== 1) {
		// We only "support" the lifeline group
		return;
	}

	const endpoint = node.getEndpoint(command.endpointIndex) ?? node;

	// We are being queried, so the device may actually not support the CC, just control it.
	// Using the commandClasses property would throw in that case
	const api = endpoint
		.createAPI(CommandClasses["Association Group Information"], false)
		.withOptions({
			// Answer with the same encapsulation as asked, but omit
			// Supervision as it shouldn't be used for Get-Report flows
			encapsulationFlags:
				command.encapsulationFlags & ~EncapsulationFlags.Supervision,
		});

	try {
		await api.reportCommands(
			command.groupId,
			new Map([
				[
					CommandClasses["Device Reset Locally"],
					[DeviceResetLocallyCommand.Notification],
				],
			]),
		);
	} catch (e: any) {
		ctx.logNode(node.id, {
			message: e.message,
			level: "error",
		});
		// ignore
	}
}

export async function handleAssociationSupportedGroupingsGet(
	ctx: PersistValuesContext & LogNode,
	node: ZWaveNode,
	command: AssociationCCSupportedGroupingsGet,
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
