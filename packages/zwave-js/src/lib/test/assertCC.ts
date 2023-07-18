import type { CCConstructor, CommandClass } from "@zwave-js/cc";
import type { ExecutionContext } from "ava";
import { SendDataBridgeRequest } from "../serialapi/transport/SendDataBridgeMessages";
import { SendDataRequest } from "../serialapi/transport/SendDataMessages";

export function assertCC<
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
