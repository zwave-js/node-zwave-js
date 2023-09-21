import { ZWaveErrorCodes, assertZWaveError } from "@zwave-js/core";
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
				onHostMessage(host, controller, msg) {
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
				new GetControllerIdRequest(driver),
				{ supportCheck: false },
			);

			t.is(ids.ownNodeId, mockController.host.ownNodeId);
		},
	},
);

integrationTest(
	"When the controller is still unresponsive after soft reset, destroy the driver",
	{
		// debug: true,

		async customSetup(driver, mockController, mockNode) {
			const doNotRespond: MockControllerBehavior = {
				onHostMessage(host, controller, msg) {
					if (!shouldRespond) return true;

					return false;
				},
			};
			mockController.defineBehavior(doNotRespond);
		},

		async testBody(t, driver, node, mockController, mockNode) {
			shouldRespond = false;
			mockController.autoAckHostMessages = false;

			const errorSpy = Sinon.spy();
			driver.on("error", errorSpy);

			await assertZWaveError(
				t,
				() =>
					driver.sendMessage<GetControllerIdResponse>(
						new GetControllerIdRequest(driver),
						{ supportCheck: false },
					),
				{
					errorCode: ZWaveErrorCodes.Controller_Timeout,
					context: "ACK",
				},
			);

			// The driver should have been destroyed
			await wait(100);
			assertZWaveError(t, errorSpy.getCall(0).args[0], {
				errorCode: ZWaveErrorCodes.Driver_Failed,
			});
		},
	},
);
