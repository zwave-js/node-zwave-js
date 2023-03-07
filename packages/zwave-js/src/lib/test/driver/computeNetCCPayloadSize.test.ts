import { FirmwareUpdateMetaDataCC } from "@zwave-js/cc/FirmwareUpdateMetaDataCC";
import { MultiChannelCCCommandEncapsulation } from "@zwave-js/cc/MultiChannelCC";
import { SecurityCCCommandEncapsulation } from "@zwave-js/cc/SecurityCC";
import { EncapsulationFlags, TransmitOptions } from "@zwave-js/core";
import { MockController } from "@zwave-js/testing";
import ava, { TestFn } from "ava";
import { createDefaultMockControllerBehaviors } from "../../../Utils";
import type { Driver } from "../../driver/Driver";
import { createAndStartTestingDriver } from "../../driver/DriverMock";
import { SendDataRequest } from "../../serialapi/transport/SendDataMessages";

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
			S0_Legacy: Buffer.alloc(16, 0xff),
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
	const testMsg1 = new SendDataRequest(driver, {
		command: new SecurityCCCommandEncapsulation(driver, {
			nodeId: 2,
			encapsulated: {} as any,
		}),
		transmitOptions: TransmitOptions.DEFAULT,
	});
	testMsg1.command.encapsulated = undefined as any;
	t.is(driver.computeNetCCPayloadSize(testMsg1), 26);

	const multiChannelCC = new MultiChannelCCCommandEncapsulation(driver, {
		nodeId: 2,
		destination: 1,
		encapsulated: {} as any,
	});
	const testMsg2 = new SendDataRequest(driver, {
		command: new SecurityCCCommandEncapsulation(driver, {
			nodeId: 2,
			encapsulated: multiChannelCC,
		}),
		transmitOptions: TransmitOptions.NoRoute,
	});
	multiChannelCC.encapsulated = undefined as any;
	t.is(driver.computeNetCCPayloadSize(testMsg2), 54 - 20 - 4);

	const testMsg3 = new FirmwareUpdateMetaDataCC(driver, {
		nodeId: 2,
	});
	testMsg3.toggleEncapsulationFlag(EncapsulationFlags.Security, true);
	t.is(driver.computeNetCCPayloadSize(testMsg3), 46 - 20 - 2);
});
