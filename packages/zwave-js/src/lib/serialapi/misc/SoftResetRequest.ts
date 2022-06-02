import { MessagePriority } from "@zwave-js/core";
import {
	FunctionType,
	Message,
	MessageType,
	messageTypes,
	priority,
} from "@zwave-js/serial";

@messageTypes(MessageType.Request, FunctionType.SoftReset)
@priority(MessagePriority.Controller)
export class SoftResetRequest extends Message {}
