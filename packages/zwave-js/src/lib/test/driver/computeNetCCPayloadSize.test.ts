import { FirmwareUpdateMetaDataCC } from "@zwave-js/cc/FirmwareUpdateMetaDataCC";
import { MultiChannelCCCommandEncapsulation } from "@zwave-js/cc/MultiChannelCC";
import { SecurityCCCommandEncapsulation } from "@zwave-js/cc/SecurityCC";
import { EncapsulationFlags, TransmitOptions } from "@zwave-js/core";
import { SendDataRequest } from "@zwave-js/serial/serialapi";
import { MockController } from "@zwave-js/testing";
import { test as baseTest } from "vitest";
import { createDefaultMockControllerBehaviors } from "../../../Testing.js";
import type { Driver } from "../../driver/Driver.js";
import { createAndStartTestingDriver } from "../../driver/DriverMock.js";

interface LocalTestContext {
	context: {
		driver: Driver;
		controller: MockController;
	};
}

const test = baseTest.extend<LocalTestContext>({
	context: [
		async ({}, use) => {
			// Setup
			const context = {} as LocalTestContext["context"];

			const { driver } = await createAndStartTestingDriver({
				loadConfiguration: false,
				skipNodeInterview: true,
				securityKeys: {
					S0_Legacy: new Uint8Array(16).fill(0xff),
				},
				beforeStartup(mockPort, serial) {
					const controller = new MockController({
						mockPort,
						serial,
					});
					controller.defineBehavior(
						...createDefaultMockControllerBehaviors(),
					);
					context.controller = controller;
				},
			});
			context.driver = driver;

			// Run tests
			await use(context);

			// Teardown
			driver.removeAllListeners();
			await driver.destroy();
		},
		{ auto: true },
	],
});

test("should compute the correct net payload sizes", ({ context, expect }) => {
	const { driver } = context;
	const testMsg1 = new SendDataRequest({
		command: new SecurityCCCommandEncapsulation({
			nodeId: 2,
			encapsulated: {} as any,
		}),
		transmitOptions: TransmitOptions.DEFAULT,
	});
	testMsg1.command!.encapsulated = undefined as any;
	expect(driver.computeNetCCPayloadSize(testMsg1)).toBe(26);

	const multiChannelCC = new MultiChannelCCCommandEncapsulation({
		nodeId: 2,
		destination: 1,
		encapsulated: {} as any,
	});
	const testMsg2 = new SendDataRequest({
		command: new SecurityCCCommandEncapsulation({
			nodeId: 2,
			encapsulated: multiChannelCC,
		}),
		transmitOptions: TransmitOptions.NoRoute,
	});
	multiChannelCC.encapsulated = undefined as any;
	expect(driver.computeNetCCPayloadSize(testMsg2)).toBe(54 - 20 - 4);

	const testMsg3 = new FirmwareUpdateMetaDataCC({
		nodeId: 2,
	});
	testMsg3.toggleEncapsulationFlag(EncapsulationFlags.Security, true);
	expect(driver.computeNetCCPayloadSize(testMsg3)).toBe(46 - 20 - 2);
});
