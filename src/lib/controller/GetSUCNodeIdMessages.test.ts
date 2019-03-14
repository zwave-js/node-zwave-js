import { FunctionType, MessagePriority, MessageType } from "../message/Constants";
import { getDefaultPriority, getDefaultPriorityStatic, getExpectedResponse, getExpectedResponseStatic, getFunctionType, getFunctionTypeStatic, getMessageType, getMessageTypeStatic, Message } from "../message/Message";
import { GetSUCNodeIdRequest, GetSUCNodeIdResponse } from "./GetSUCNodeIdMessages";

describe("lib/controller/GetSUCNodeIdRequest => ", () => {
	const req = new GetSUCNodeIdRequest(undefined);

	it("should be a Message", () => {
		expect(req).toBeInstanceOf(Message);
	});
	it("with type Request", () => {
		expect(getMessageType(req)).toBe(MessageType.Request);
		expect(getMessageTypeStatic(GetSUCNodeIdRequest)).toBe(MessageType.Request);
	});
	it("and priority Controller", () => {
		expect(getDefaultPriority(req)).toBe(MessagePriority.Controller);
		expect(getDefaultPriorityStatic(GetSUCNodeIdRequest)).toBe(MessagePriority.Controller);
	});
	it("and a function type GetSUCNodeId", () => {
		expect(getFunctionType(req)).toBe(FunctionType.GetSUCNodeId);
		expect(getFunctionTypeStatic(GetSUCNodeIdRequest)).toBe(FunctionType.GetSUCNodeId);
	});
	it("that expects a GetSUCNodeId response", () => {
		expect(getExpectedResponse(req)).toBe(FunctionType.GetSUCNodeId);
		expect(getExpectedResponseStatic(GetSUCNodeIdRequest)).toBe(FunctionType.GetSUCNodeId);
	});

});

describe("lib/controller/GetSUCNodeIdResponse => ", () => {
	const res = new GetSUCNodeIdResponse(undefined);

	it("should be a Message", () => {
		expect(res).toBeInstanceOf(Message);
	});
	it("with type Response", () => {
		expect(getMessageType(res)).toBe(MessageType.Response);
		expect(getMessageTypeStatic(GetSUCNodeIdResponse)).toBe(MessageType.Response);
	});
	it("and NO default priority", () => {
		expect(getDefaultPriority(res)).toBeUndefined();
		expect(getDefaultPriorityStatic(GetSUCNodeIdResponse)).toBeUndefined();
	});
	it("and a function type GetSUCNodeId", () => {
		expect(getFunctionType(res)).toBe(FunctionType.GetSUCNodeId);
		expect(getFunctionTypeStatic(GetSUCNodeIdResponse)).toBe(FunctionType.GetSUCNodeId);
	});
	it("that expects NO response", () => {
		expect(getExpectedResponse(res)).toBeUndefined();
		expect(getExpectedResponseStatic(GetSUCNodeIdResponse)).toBeUndefined();
	});

	it.todo("TODO: Test deserialization");
});
