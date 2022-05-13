import { buffer2hex } from "@zwave-js/shared/safe";
import type { MockControllerBehavior } from "./MockController";

const logHostMessages: MockControllerBehavior = {
	onHostMessage(controller, data) {
		console.log(`IN:  ${buffer2hex(data)}`);
		return false;
	},
};

/** Predefined default behaviors that are required for interacting with the driver correctly */
export function createDefaultBehaviors(): MockControllerBehavior[] {
	return [logHostMessages];
}
