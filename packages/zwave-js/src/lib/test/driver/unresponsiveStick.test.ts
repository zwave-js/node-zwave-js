import { ZWaveErrorCodes, assertZWaveError } from "@zwave-js/core";
import { FunctionType } from "@zwave-js/serial";
import { type MockControllerBehavior } from "@zwave-js/testing";
import { wait } from "alcalzone-shared/async";
import Sinon from "sinon";
import {
	GetControllerIdRequest,
	type GetControllerIdResponse,
} from "../../serialapi/memory/GetControllerIdMessages";
import { SoftResetRequest } from "../../serialapi/misc/SoftResetRequest";
import { integrationTest } from "../integrationTestSuite";

let shouldRespond = true;

integrationTest(
	"When the controller is unresponsive, soft-reset it to recover",
	{
		// debug: true,

		async customSetup(driver, mockController, mockNode) {
			const doNotRespond: MockControllerBehavior = {
				onHostMessage(controller, msg) {
					if (!shouldRespond) {
						// Soft reset should restore normal operation
						if (msg instanceof SoftResetRequest) {
							// The ACK was not sent, so we need to do it here
							mockController.ackHostMessage();

							shouldRespond = true;
							mockController.autoAckHostMessages = true;

							// Call the original handler
							return false;
						}
						return true;
					}

					return false;
				},
			};
			mockController.defineBehavior(doNotRespond);
		},

		async testBody(t, driver, node, mockController, mockNode) {
			shouldRespond = false;
			mockController.autoAckHostMessages = false;

			const ids = await driver.sendMessage<GetControllerIdResponse>(
				new GetControllerIdRequest(),
				{ supportCheck: false },
			);

			t.is(ids.ownNodeId, mockController.ownNodeId);
		},
	},
);

integrationTest(
	"When the controller is still unresponsive after soft reset, re-open the serial port",
	{
		// debug: true,

		additionalDriverOptions: {
			testingHooks: {
				skipNodeInterview: true,
			},
			attempts: {
				// Spend less time waiting
				controller: 1,
			},
		},

		async customSetup(driver, mockController, mockNode) {
			const doNotRespond: MockControllerBehavior = {
				onHostMessage(controller, msg) {
					if (!shouldRespond) return true;

					return false;
				},
			};
			mockController.defineBehavior(doNotRespond);
		},

		async testBody(t, driver, node, mockController, mockNode) {
			shouldRespond = false;
			mockController.autoAckHostMessages = false;

			const serialPortCloseSpy = Sinon.stub().callsFake(() => {
				shouldRespond = true;
				mockController.autoAckHostMessages = true;
			});
			mockController.serial.on("close", serialPortCloseSpy);

			await wait(1000);

			await assertZWaveError(
				t,
				() =>
					driver.sendMessage<GetControllerIdResponse>(
						new GetControllerIdRequest(),
						{ supportCheck: false },
					),
				{
					errorCode: ZWaveErrorCodes.Controller_Timeout,
					context: "ACK",
				},
			);

			// The serial port should have been closed and reopened
			await wait(100);
			t.true(serialPortCloseSpy.called);

			// FIXME: When closing the serial port, we lose the connection between the mock port instance and the controller
			// Fix it at some point, then enable the below test.

			// await wait(1000);

			// // Sending a command should work again, assuming the controller is responsive again
			// await t.notThrowsAsync(() =>
			// 	driver.sendMessage<GetControllerIdResponse>(
			// 		new GetControllerIdRequest(driver),
			// 		{ supportCheck: false },
			// 	)
			// );

			// driver.driverLog.print("TEST PASSED");
		},
	},
);

integrationTest(
	"The unresponsive controller recovery does not kick in when it was enabled via config",
	{
		// debug: true,

		additionalDriverOptions: {
			attempts: {
				controller: 1,
			},
			features: {
				unresponsiveControllerRecovery: false,
			},
		},

		async customSetup(driver, mockController, mockNode) {
			const doNotRespond: MockControllerBehavior = {
				onHostMessage(controller, msg) {
					if (!shouldRespond) {
						return true;
					}

					return false;
				},
			};
			mockController.defineBehavior(doNotRespond);
		},

		async testBody(t, driver, node, mockController, mockNode) {
			shouldRespond = false;
			mockController.autoAckHostMessages = false;

			// The command fails
			await assertZWaveError(
				t,
				() =>
					driver.sendMessage<GetControllerIdResponse>(
						new GetControllerIdRequest(),
						{ supportCheck: false },
					),
				{
					errorCode: ZWaveErrorCodes.Controller_Timeout,
					context: "ACK",
				},
			);

			await wait(500);

			// And the controller does not get soft-reset
			t.throws(() =>
				mockController.assertReceivedHostMessage((msg) =>
					msg.functionType === FunctionType.SoftReset
				)
			);
		},
	},
);
