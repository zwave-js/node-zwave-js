import { entries } from "alcalzone-shared/objects";
import type { CommandClass, Constructable } from "../commandclass/CommandClass";
import { SendDataBridgeRequest } from "../controller/SendDataBridgeMessages";
import { SendDataRequest } from "../controller/SendDataMessages";

/** Performs assertions on a sendMessage call argument that's supposed to be a CC */
export function assertCC<
	TConst extends Constructable<CommandClass> = Constructable<CommandClass>
>(
	callArg: any,
	options: {
		nodeId?: number;
		cc: TConst;
		ccValues?: Record<string, any>;
	},
): void {
	const request: SendDataRequest | SendDataBridgeRequest = callArg;
	try {
		expect(request).toBeInstanceOf(SendDataRequest);
	} catch {
		expect(request).toBeInstanceOf(SendDataBridgeRequest);
	}
	if (options.nodeId) expect(request.getNodeId()).toBe(options.nodeId);

	const command = request.command;
	expect(command).toBeInstanceOf(options.cc);
	if (options.ccValues) {
		for (const [prop, val] of entries(options.ccValues)) {
			expect((command as any)[prop]).toBe(val);
		}
	}
}
