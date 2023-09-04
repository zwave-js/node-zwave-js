import { type MockControllerBehavior } from "@zwave-js/testing";
import {
	GetControllerIdRequest,
	type GetControllerIdResponse,
} from "../../serialapi/memory/GetControllerIdMessages";
import { integrationTest } from "../integrationTestSuite";

let shouldRespond = true;

integrationTest("Detect an unresponsive stick and reset it", {
	debug: true,

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

		const ids = await driver.sendMessage<GetControllerIdResponse>(
			new GetControllerIdRequest(driver),
			{ supportCheck: false },
		);

		t.not(ids, undefined);
	},
});
