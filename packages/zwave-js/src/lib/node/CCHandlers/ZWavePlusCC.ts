import {
	type PersistValuesContext,
	type ZWavePlusCCGet,
	ZWavePlusNodeType,
	ZWavePlusRoleType,
} from "@zwave-js/cc";
import {
	CommandClasses,
	EncapsulationFlags,
	type LogNode,
} from "@zwave-js/core";

import type { ZWaveOptions } from "../../driver/ZWaveOptions.js";
import type { ZWaveNode } from "../Node.js";

export async function handleZWavePlusGet(
	ctx: PersistValuesContext & LogNode,
	node: ZWaveNode,
	command: ZWavePlusCCGet,
	vendorInfo: ZWaveOptions["vendor"],
): Promise<void> {
	const endpoint = node.getEndpoint(command.endpointIndex) ?? node;

	try {
		// We are being queried, so the device may actually not support the CC, just control it.
		// Using the commandClasses property would throw in that case
		await endpoint
			.createAPI(CommandClasses["Z-Wave Plus Info"], false)
			.withOptions({
				// Answer with the same encapsulation as asked, but omit
				// Supervision as it shouldn't be used for Get-Report flows
				encapsulationFlags:
					command.encapsulationFlags
					& ~EncapsulationFlags.Supervision,
			})
			.sendReport({
				zwavePlusVersion: 2,
				roleType: ZWavePlusRoleType.CentralStaticController,
				nodeType: ZWavePlusNodeType.Node,
				installerIcon: vendorInfo?.installerIcon ?? 0x0500, // Generic Gateway
				userIcon: vendorInfo?.userIcon ?? 0x0500, // Generic Gateway
			});
	} catch (e: any) {
		ctx.logNode(node.id, {
			message: e.message,
			level: "error",
		});
		// ignore
	}
}
