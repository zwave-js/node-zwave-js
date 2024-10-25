import { MessagePriority } from "@zwave-js/core";
import {
	FunctionType,
	Message,
	MessageType,
	messageTypes,
	priority,
} from "@zwave-js/serial";

// These commands expect no ACK, no response, no callback

@messageTypes(MessageType.Request, FunctionType.StartWatchdog)
@priority(MessagePriority.Controller)
export class StartWatchdogRequest extends Message {
	public override expectsAck(): boolean {
		return false;
	}
}

@messageTypes(MessageType.Request, FunctionType.StopWatchdog)
@priority(MessagePriority.Controller)
export class StopWatchdogRequest extends Message {
	public override expectsAck(): boolean {
		return false;
	}
}
