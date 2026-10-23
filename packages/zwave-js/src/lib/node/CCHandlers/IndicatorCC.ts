import type {
	IndicatorCCDescriptionGet,
	IndicatorCCGet,
	IndicatorCCSet,
	IndicatorCCSupportedGet,
	PersistValuesContext,
} from "@zwave-js/cc";
import {
	CommandClasses,
	EncapsulationFlags,
	type LogNode,
} from "@zwave-js/core";

import type { ZWaveController } from "../../controller/Controller.js";
import type { ZWaveNode } from "../Node.js";

export function handleIndicatorSupportedGet(
	ctx: PersistValuesContext & LogNode,
	node: ZWaveNode,
	command: IndicatorCCSupportedGet,
): Promise<void> {
	const endpoint = node.getEndpoint(command.endpointIndex) ?? node;

	// We are being queried, so the device may actually not support the CC, just control it.
	// Using the commandClasses property would throw in that case
	const api = endpoint
		.createAPI(CommandClasses.Indicator, false)
		.withOptions({
			// Answer with the same encapsulation as asked, but omit
			// Supervision as it shouldn't be used for Get-Report flows
			encapsulationFlags:
				command.encapsulationFlags & ~EncapsulationFlags.Supervision,
		});

	switch (command.indicatorId) {
		case 0:
		// 0 must be answered with the first supported indicator ID.
		// We only support identify (0x50)
		case 0x50:
			// Identify
			return api.reportSupported(0x50, [0x03, 0x04, 0x05], 0);
		default:
			// A supporting node receiving a non-zero Indicator ID that is
			// not supported MUST set all fields to 0x00 in the returned response.
			return api.reportSupported(0, [], 0);
	}
}

export function handleIndicatorSet(
	ctx: PersistValuesContext & LogNode,
	controller: ZWaveController,
	node: ZWaveNode,
	command: IndicatorCCSet,
): void {
	// We only support "identify"
	if (command.values?.length !== 3) return;
	const [v1, v2, v3] = command.values;
	if (v1.indicatorId !== 0x50 || v1.propertyId !== 0x03) return;
	if (v2.indicatorId !== 0x50 || v2.propertyId !== 0x04) return;
	if (v3.indicatorId !== 0x50 || v3.propertyId !== 0x05) return;

	// This isn't really sane, but since we only support a single indicator, it's fine
	const store = controller.indicatorValues;
	store.set(0x50, [v1, v2, v3]);

	ctx.logNode(node.id, {
		message: "Received identify command",
		direction: "inbound",
	});

	controller.emit("identify", node);
}

export async function handleIndicatorGet(
	ctx: PersistValuesContext & LogNode,
	controller: ZWaveController,
	node: ZWaveNode,
	command: IndicatorCCGet,
): Promise<void> {
	const endpoint = node.getEndpoint(command.endpointIndex) ?? node;

	// We are being queried, so the device may actually not support the CC, just control it.
	// Using the commandClasses property would throw in that case
	const api = endpoint
		.createAPI(CommandClasses.Indicator, false)
		.withOptions({
			// Answer with the same encapsulation as asked, but omit
			// Supervision as it shouldn't be used for Get-Report flows
			encapsulationFlags:
				command.encapsulationFlags & ~EncapsulationFlags.Supervision,
		});

	// We only support "identify"
	try {
		if (command.indicatorId === 0x50) {
			const values = controller.indicatorValues.get(0x50) ?? [
				{ indicatorId: 0x50, propertyId: 0x03, value: 0 },
				{ indicatorId: 0x50, propertyId: 0x04, value: 0 },
				{ indicatorId: 0x50, propertyId: 0x05, value: 0 },
			];
			await api.sendReport({ values });
		} else if (typeof command.indicatorId === "number") {
			// V2+ report
			await api.sendReport({
				values: [
					{
						indicatorId: command.indicatorId,
						propertyId: 0,
						value: 0,
					},
				],
			});
		} else {
			// V1+ report
			await api.sendReport({ value: 0 });
		}
	} catch (e: any) {
		ctx.logNode(node.id, {
			message: e.message,
			level: "error",
		});
		// ignore
	}
}

export async function handleIndicatorDescriptionGet(
	ctx: PersistValuesContext & LogNode,
	node: ZWaveNode,
	command: IndicatorCCDescriptionGet,
): Promise<void> {
	const endpoint = node.getEndpoint(command.endpointIndex) ?? node;

	// We are being queried, so the device may actually not support the CC, just control it.
	// Using the commandClasses property would throw in that case
	const api = endpoint
		.createAPI(CommandClasses.Indicator, false)
		.withOptions({
			// Answer with the same encapsulation as asked, but omit
			// Supervision as it shouldn't be used for Get-Report flows
			encapsulationFlags:
				command.encapsulationFlags & ~EncapsulationFlags.Supervision,
		});

	// We only support "identify" (0x50) and requests for indicators outside the 0x80...0x9f range
	// MUST return an Indicator Description Report with the Description Length set to 0.
	// So we can just always do that.
	try {
		await api.reportDescription(command.indicatorId, "");
	} catch (e: any) {
		ctx.logNode(node.id, {
			message: e.message,
			level: "error",
		});
		// ignore
	}
}
