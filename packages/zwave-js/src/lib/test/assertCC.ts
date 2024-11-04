import type { CCConstructor, CommandClass } from "@zwave-js/cc";
import { SendDataBridgeRequest } from "@zwave-js/serial/serialapi";
import { SendDataRequest } from "@zwave-js/serial/serialapi";
import { type ExpectStatic } from "vitest";

export function assertCC<
	TConst extends CCConstructor<CommandClass> = CCConstructor<CommandClass>,
>(
	expect: ExpectStatic,
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
		for (const [prop, val] of Object.entries(options.ccValues)) {
			expect((command as any)[prop]).toBe(val);
		}
	}
}
