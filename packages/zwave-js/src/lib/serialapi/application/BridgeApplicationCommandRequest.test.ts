import { ConfigManager } from "@zwave-js/config";
import { Message } from "@zwave-js/serial";
import "../../commandclass/index";
import type { Driver } from "../../driver/Driver";
import { createEmptyMockDriver } from "../../test/mocks";

const fakeDriver = createEmptyMockDriver() as unknown as Driver;

describe("BridgeApplicationCommandRequest", () => {
	beforeAll(async () => {
		const configManager = new ConfigManager();
		await configManager.loadMeters();
		(fakeDriver as any).configManager = configManager;
		(fakeDriver as any).controller = {
			ownNodeId: 1,
			nodes: {
				get() {
					return {
						valueDB: {
							hasMetadata: () => false,
							setMetadata() {},
							getMetadata() {},
							setValue() {},
							getValue() {},
						},
						isCCSecure: () => true,
						getEndpoint() {},
					};
				},
			},
		};
	});

	describe("regression tests", () => {
		it("parsing without RSSI", async () => {
			// Repro for https://github.com/zwave-js/node-zwave-js/issues/4335
			Message.from(
				fakeDriver,
				Buffer.from("011200a80001020a320221340000000000000069", "hex"),
			);
		});
	});
});
