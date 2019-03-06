import { FunctionType, MessageType } from "../message/Constants";
import { getDefaultPriority, getDefaultPriorityStatic, getExpectedResponse, getExpectedResponseStatic, getFunctionType, getFunctionTypeStatic, getMessageType, getMessageTypeStatic, Message } from "../message/Message";
import { ApplicationUpdateRequest } from "./ApplicationUpdateRequest";

describe("lib/controller/ApplicationUpdateRequest => ", () => {
	const req = new ApplicationUpdateRequest(undefined);

	it("should be a Message", () => {
		expect(req).toBeInstanceOf(Message);
	});
	it("with type Request", () => {
		expect(getMessageType(req)).toBe(MessageType.Request);
		expect(getMessageTypeStatic(ApplicationUpdateRequest)).toBe(MessageType.Request);
	});
	it("and NO priority", () => {
		expect(getDefaultPriority(req)).toBeUndefined();
		expect(getDefaultPriorityStatic(ApplicationUpdateRequest)).toBeUndefined();
	});
	it("and a function type ApplicationUpdate", () => {
		expect(getFunctionType(req)).toBe(FunctionType.ApplicationUpdateRequest);
		expect(getFunctionTypeStatic(ApplicationUpdateRequest)).toBe(FunctionType.ApplicationUpdateRequest);
	});
	it("that expects NO response", () => {
		expect(getExpectedResponse(req)).toBeUndefined();
		expect(getExpectedResponseStatic(ApplicationUpdateRequest)).toBeUndefined();
	});

});
