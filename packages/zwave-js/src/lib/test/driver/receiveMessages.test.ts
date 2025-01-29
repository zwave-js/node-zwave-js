import { WakeUpCCIntervalSet } from "@zwave-js/cc/WakeUpCC";
import { type MockPort } from "@zwave-js/serial/mock";
import { ApplicationCommandRequest } from "@zwave-js/serial/serialapi";
import { Bytes } from "@zwave-js/shared";
import { MockController } from "@zwave-js/testing";
import { test as baseTest } from "vitest";
import type { Driver } from "../../driver/Driver.js";
import { createAndStartTestingDriver } from "../../driver/DriverMock.js";

interface LocalTestContext {
	context: {
		driver: Driver;
		controller: MockController;
		mockPort: MockPort;
	};
}

const test = baseTest.extend<LocalTestContext>({
	context: [
		async ({}, use) => {
			// Setup
			const context = {} as LocalTestContext["context"];

			const { driver, mockPort } = await createAndStartTestingDriver({
				loadConfiguration: false,
				// We don't need a real interview for this
				skipControllerIdentification: true,
				skipNodeInterview: true,
				beforeStartup(mockPort, serial) {
					context.controller = new MockController({
						mockPort,
						serial,
					});
				},
			});
			context.driver = driver;
			context.mockPort = mockPort;

			// Run tests
			await use(context);

			// Teardown
			driver.removeAllListeners();
			await driver.destroy();
		},
		{ auto: true },
	],
});

test.sequential(
	"should not crash if a message is received that cannot be deserialized",
	async ({ context, expect }) => {
		const { driver, controller, mockPort } = context;
		const req = new ApplicationCommandRequest({
			command: new WakeUpCCIntervalSet({
				nodeId: 1,
				controllerNodeId: 2,
				wakeUpInterval: 5,
			}),
		});
		mockPort.emitData(
			await req.serialize(driver["getEncodingContext"]()),
		);
		await controller.expectHostACK(1000);
	},
);

test.sequential(
	"should correctly handle multiple messages in the receive buffer",
	async ({ context, expect }) => {
		const { controller, mockPort } = context;
		// This buffer contains a SendData transmit report and a ManufacturerSpecific report
		const data = Bytes.from(
			"010700130f000002e6010e000400020872050086000200828e",
			"hex",
		);
		mockPort.emitData(data);

		// Ensure the driver ACKed two messages
		await controller.expectHostACK(1000);
		await controller.expectHostACK(1000);
	},
);
