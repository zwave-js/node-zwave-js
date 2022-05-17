import { FunctionType } from "@zwave-js/serial";
import { getEnumMemberName } from "@zwave-js/shared/safe";
import type { MockControllerBehavior } from "./MockController";

const logHostMessages: MockControllerBehavior = {
	onHostMessage(controller, msg) {
		console.log(
			`H > C:  ${getEnumMemberName(FunctionType, msg.functionType)}`,
		);
		return false;
	},
};

/** Predefined default behaviors that are required for interacting with the driver correctly */
export function createDefaultBehaviors(): MockControllerBehavior[] {
	return [logHostMessages];
}
