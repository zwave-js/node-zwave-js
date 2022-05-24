import { createTestingHost } from "@zwave-js/host";
import { Message } from "@zwave-js/serial";
import "../../commandclass/index";
import { type TestingHost } from "../../test/mocks";

describe("BridgeApplicationCommandRequest", () => {
	let host: TestingHost;
	beforeAll(async () => {
		host = createTestingHost();
		await host.configManager.loadMeters();
	});

	describe("regression tests", () => {
		it("parsing without RSSI", async () => {
			// Repro for https://github.com/zwave-js/node-zwave-js/issues/4335
			Message.from(
				host,
				Buffer.from("011200a80001020a320221340000000000000069", "hex"),
			);
		});
	});
});
