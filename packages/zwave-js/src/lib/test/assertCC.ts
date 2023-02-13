import type { CCConstructor, CommandClass } from "@zwave-js/cc";
import type { ExecutionContext } from "ava";
import { SendDataBridgeRequest } from "../serialapi/transport/SendDataBridgeMessages";
import { SendDataRequest } from "../serialapi/transport/SendDataMessages";

/** Performs assertions on a sendMessage call argument that's supposed to be a CC */
export function assertCC<
	TConst extends CCConstructor<CommandClass> = CCConstructor<CommandClass>,
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
		for (const [prop, val] of Object.entries(options.ccValues)) {
			expect((command as any)[prop]).toBe(val);
		}
	}
}

export function assertCCAva<
	TConst extends CCConstructor<CommandClass> = CCConstructor<CommandClass>,
>(
	t: ExecutionContext,
	callArg: any,
	options: {
		nodeId?: number;
		cc: TConst;
		ccValues?: Record<string, any>;
	},
): void {
	const request: SendDataRequest | SendDataBridgeRequest = callArg;
	try {
		t.true(request instanceof SendDataRequest);
	} catch {
		t.true(request instanceof SendDataBridgeRequest);
	}
	if (options.nodeId) t.is(request.getNodeId(), options.nodeId);

	const command = request.command;
	t.true(command instanceof options.cc);
	if (options.ccValues) {
		for (const [prop, val] of Object.entries(options.ccValues)) {
			t.is((command as any)[prop], val);
		}
	}
}
