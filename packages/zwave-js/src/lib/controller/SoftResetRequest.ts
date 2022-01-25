import {
	FunctionType,
	MessagePriority,
	MessageType,
} from "../message/Constants";
import { Message, messageTypes, priority } from "../message/Message";

@messageTypes(MessageType.Request, FunctionType.SoftReset)
@priority(MessagePriority.Controller)
export class SoftResetRequest extends Message {}
