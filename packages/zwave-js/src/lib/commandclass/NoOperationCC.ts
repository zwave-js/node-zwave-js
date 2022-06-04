import { CommandClasses } from "@zwave-js/core";
import type { Message } from "@zwave-js/serial";
import { MessagePriority } from "@zwave-js/serial";
import { PhysicalCCAPI } from "./API";
import {
	API,
	CommandClass,
	commandClass,
	implementedVersion,
} from "./CommandClass";
import { isCommandClassContainer } from "./ICommandClassContainer";

// @noSetValueAPI This CC has no set-type commands
// @noInterview There's nothing to interview here

@API(CommandClasses["No Operation"])
export class NoOperationCCAPI extends PhysicalCCAPI {
	public async send(): Promise<void> {
		await this.driver.sendCommand(
			new NoOperationCC(this.driver, {
				nodeId: this.endpoint.nodeId,
				endpoint: this.endpoint.index,
			}),
			{
				...this.commandOptions,
				// Don't retry sending ping packets
				maxSendAttempts: 1,
				// Pings have their own dedicated priority, since they
				// are used to test whether a node is awake/alive
				priority: MessagePriority.Ping,
			},
		);
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
