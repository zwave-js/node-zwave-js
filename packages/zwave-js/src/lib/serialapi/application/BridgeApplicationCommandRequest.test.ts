// import "@zwave-js/cc";
import { createTestingHost } from "@zwave-js/host";
import { Message } from "@zwave-js/serial";
import test from "ava";

test("BridgeApplicationCommandRequest can be parsed without RSSI", async (t) => {
	t.timeout(30000);

	const host = createTestingHost();

	// Repro for https://github.com/zwave-js/node-zwave-js/issues/4335
	t.notThrows(() =>
		Message.from(host, {
			data: Buffer.from(
				"011200a80001020a320221340000000000000069",
				"hex",
			),
		})
	);
});
