import { FirmwareUpdateMetaDataCC } from "@zwave-js/cc/FirmwareUpdateMetaDataCC";
import { MultiChannelCCCommandEncapsulation } from "@zwave-js/cc/MultiChannelCC";
import { SecurityCCCommandEncapsulation } from "@zwave-js/cc/SecurityCC";
import { EncapsulationFlags, TransmitOptions } from "@zwave-js/core";
import { SendDataRequest } from "@zwave-js/serial/serialapi";
import { MockController } from "@zwave-js/testing";
import ava, { type TestFn } from "ava";
import { createDefaultMockControllerBehaviors } from "../../../Utils.js";
import type { Driver } from "../../driver/Driver.js";
import { createAndStartTestingDriver } from "../../driver/DriverMock.js";

interface TestContext {
	driver: Driver;
	controller: MockController;
}

const test = ava as TestFn<TestContext>;

test.beforeEach(async (t) => {
	t.timeout(30000);
	const { driver } = await createAndStartTestingDriver({
		loadConfiguration: false,
		skipNodeInterview: true,
		securityKeys: {
			S0_Legacy: new Uint8Array(16).fill(0xff),
		},
		beforeStartup(mockPort) {
			const controller = new MockController({ serial: mockPort });
			controller.defineBehavior(
				...createDefaultMockControllerBehaviors(),
			);
			t.context.controller = controller;
		},
	});
	t.context.driver = driver;
});

test.afterEach.always(async (t) => {
	const { driver } = t.context;
	await driver.destroy();
	driver.removeAllListeners();
});

test("should compute the correct net payload sizes", (t) => {
	const { driver } = t.context;
	const testMsg1 = new SendDataRequest({
		command: new SecurityCCCommandEncapsulation({
			nodeId: 2,
			encapsulated: {} as any,
		}),
		transmitOptions: TransmitOptions.DEFAULT,
	});
	testMsg1.command!.encapsulated = undefined as any;
	t.is(driver.computeNetCCPayloadSize(testMsg1), 26);

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
	t.is(driver.computeNetCCPayloadSize(testMsg2), 54 - 20 - 4);

	const testMsg3 = new FirmwareUpdateMetaDataCC({
		nodeId: 2,
	});
	testMsg3.toggleEncapsulationFlag(EncapsulationFlags.Security, true);
	t.is(driver.computeNetCCPayloadSize(testMsg3), 46 - 20 - 2);
});
