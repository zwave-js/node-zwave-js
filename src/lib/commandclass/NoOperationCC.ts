import { SendDataRequest } from "../controller/SendDataMessages";
import { MessagePriority } from "../message/Constants";
import { CCAPI } from "./API";
import {
	API,
	CommandClass,
	commandClass,
	implementedVersion,
} from "./CommandClass";
import { CommandClasses } from "./CommandClasses";

// @noSetValueAPI This CC has no set-type commands

@API(CommandClasses["No Operation"])
export class NoOperationCCAPI extends CCAPI {
	public async send(): Promise<void> {
		const request = new SendDataRequest(this.driver, {
			command: new NoOperationCC(this.driver, {
				nodeId: this.endpoint.nodeId,
				endpoint: this.endpoint.index,
			}),
		});
		// Don't retry sending ping packets
		request.maxSendAttempts = 1;
		// set the priority manually, as SendData can be Application level too
		await this.driver.sendMessage<SendDataRequest>(request, {
			priority: MessagePriority.NodeQuery,
		});
	}
}

@commandClass(CommandClasses["No Operation"])
@implementedVersion(1)
export class NoOperationCC extends CommandClass {
	public ccCommand: undefined;
}
