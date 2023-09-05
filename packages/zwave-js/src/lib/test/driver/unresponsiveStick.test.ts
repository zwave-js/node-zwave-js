import { type MockControllerBehavior } from "@zwave-js/testing";
import {
	GetControllerIdRequest,
	type GetControllerIdResponse,
} from "../../serialapi/memory/GetControllerIdMessages";
import { SoftResetRequest } from "../../serialapi/misc/SoftResetRequest";
import { integrationTest } from "../integrationTestSuite";

let shouldRespond = true;

integrationTest("Attempt to soft-reset the stick when it is unresponsive", {
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
});
