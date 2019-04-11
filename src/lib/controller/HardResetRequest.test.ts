import {
	FunctionType,
	MessagePriority,
	MessageType,
} from "../message/Constants";
import {
	getDefaultPriority,
	getDefaultPriorityStatic,
	getExpectedResponse,
	getExpectedResponseStatic,
	getFunctionType,
	getFunctionTypeStatic,
	getMessageType,
	getMessageTypeStatic,
	Message,
} from "../message/Message";
import { HardResetRequest } from "./HardResetRequest";

describe("lib/controller/HardResetRequest => ", () => {
	const req = new HardResetRequest(undefined);

	it("should be a Message", () => {
		expect(req).toBeInstanceOf(Message);
	});
	it("with type Request", () => {
		expect(getMessageType(req)).toBe(MessageType.Request);
		expect(getMessageTypeStatic(HardResetRequest)).toBe(
			MessageType.Request,
		);
	});
	it("and priority Controller", () => {
		expect(getDefaultPriority(req)).toBe(MessagePriority.Controller);
		expect(getDefaultPriorityStatic(HardResetRequest)).toBe(
			MessagePriority.Controller,
		);
	});
	it("and a function type HardReset", () => {
		expect(getFunctionType(req)).toBe(FunctionType.HardReset);
		expect(getFunctionTypeStatic(HardResetRequest)).toBe(
			FunctionType.HardReset,
		);
	});
	it("that expects NO response", () => {
		expect(getExpectedResponse(req)).toBeUndefined();
		expect(getExpectedResponseStatic(HardResetRequest)).toBeUndefined();
	});
});
