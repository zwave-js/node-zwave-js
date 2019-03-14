import { FunctionType, MessagePriority, MessageType } from "../message/Constants";
import { getDefaultPriority, getDefaultPriorityStatic, getExpectedResponse, getExpectedResponseStatic, getFunctionType, getFunctionTypeStatic, getMessageType, getMessageTypeStatic, Message } from "../message/Message";
import { GetSerialApiCapabilitiesRequest, GetSerialApiCapabilitiesResponse } from "./GetSerialApiCapabilitiesMessages";

describe("lib/controller/GetSerialApiCapabilitiesRequest => ", () => {
	const req = new GetSerialApiCapabilitiesRequest(undefined);

	it("should be a Message", () => {
		expect(req).toBeInstanceOf(Message);
	});
	it("with type Request", () => {
		expect(getMessageType(req)).toBe(MessageType.Request);
		expect(getMessageTypeStatic(GetSerialApiCapabilitiesRequest)).toBe(MessageType.Request);
	});
	it("and priority Controller", () => {
		expect(getDefaultPriority(req)).toBe(MessagePriority.Controller);
		expect(getDefaultPriorityStatic(GetSerialApiCapabilitiesRequest)).toBe(MessagePriority.Controller);
	});
	it("and a function type GetSerialApiCapabilities", () => {
		expect(getFunctionType(req)).toBe(FunctionType.GetSerialApiCapabilities);
		expect(getFunctionTypeStatic(GetSerialApiCapabilitiesRequest)).toBe(FunctionType.GetSerialApiCapabilities);
	});
	it("that expects a GetSerialApiCapabilities response", () => {
		expect(getExpectedResponse(req)).toBe(FunctionType.GetSerialApiCapabilities);
		expect(getExpectedResponseStatic(GetSerialApiCapabilitiesRequest)).toBe(FunctionType.GetSerialApiCapabilities);
	});

});

describe("lib/controller/GetSerialApiCapabilitiesResponse => ", () => {
	const res = new GetSerialApiCapabilitiesResponse(undefined);

	it("should be a Message", () => {
		expect(res).toBeInstanceOf(Message);
	});
	it("with type Response", () => {
		expect(getMessageType(res)).toBe(MessageType.Response);
		expect(getMessageTypeStatic(GetSerialApiCapabilitiesResponse)).toBe(MessageType.Response);
	});
	it("and NO default priority", () => {
		expect(getDefaultPriority(res)).toBeUndefined();
		expect(getDefaultPriorityStatic(GetSerialApiCapabilitiesResponse)).toBeUndefined();
	});
	it("and a function type GetSerialApiCapabilities", () => {
		expect(getFunctionType(res)).toBe(FunctionType.GetSerialApiCapabilities);
		expect(getFunctionTypeStatic(GetSerialApiCapabilitiesResponse)).toBe(FunctionType.GetSerialApiCapabilities);
	});
	it("that expects NO response", () => {
		expect(getExpectedResponse(res)).toBeUndefined();
		expect(getExpectedResponseStatic(GetSerialApiCapabilitiesResponse)).toBeUndefined();
	});

	it.todo("TODO: Test deserialization");

});
