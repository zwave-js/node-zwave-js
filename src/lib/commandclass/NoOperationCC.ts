import { SendDataRequest } from "../controller/SendDataMessages";
import { MessagePriority } from "../message/Constants";
import { Message } from "../message/Message";
import { CCAPI } from "./API";
import {
	API,
	CommandClass,
	commandClass,
	implementedVersion,
} from "./CommandClass";
import { CommandClasses } from "./CommandClasses";
import { isCommandClassContainer } from "./ICommandClassContainer";

// @noSetValueAPI This CC has no set-type commands
// @noInterview There's nothing to interview here

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
	declare ccCommand: undefined;
}

/** Tests if a given message is a ping */
export function messageIsPing<T extends Message>(
	msg: T,
): msg is T & { command: NoOperationCC } {
	return isCommandClassContainer(msg) && msg.command instanceof NoOperationCC;
}
