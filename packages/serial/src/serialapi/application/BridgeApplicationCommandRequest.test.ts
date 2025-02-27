// import "@zwave-js/cc";
import { Message } from "@zwave-js/serial";
import { Bytes } from "@zwave-js/shared/safe";
import { test } from "vitest";

test("BridgeApplicationCommandRequest can be parsed without RSSI", async (t) => {
	// Repro for https://github.com/zwave-js/zwave-js/issues/4335
	Message.parse(
		Bytes.from(
			"011200a80001020a320221340000000000000069",
			"hex",
		),
		{} as any,
	);
});
