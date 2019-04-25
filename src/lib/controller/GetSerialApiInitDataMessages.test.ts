import { createEmptyMockDriver } from "../../../test/mocks";
import { FunctionType, MessagePriority, MessageType } from "../message/Constants";
import { getDefaultPriority, getDefaultPriorityStatic, getExpectedResponse, getExpectedResponseStatic, getFunctionType, getFunctionTypeStatic, getMessageType, getMessageTypeStatic, Message } from "../message/Message";
import { GetSerialApiInitDataRequest } from "./GetSerialApiInitDataMessages";

const fakeDriver = createEmptyMockDriver();

describe("lib/controller/GetSerialApiInitDataRequest => ", () => {
	const req = new GetSerialApiInitDataRequest(fakeDriver);

	it("should be a Message", () => {
		expect(req).toBeInstanceOf(Message);
	});
	it("with type Request", () => {
		expect(getMessageType(req)).toBe(MessageType.Request);
		expect(getMessageTypeStatic(GetSerialApiInitDataRequest)).toBe(
			MessageType.Request,
		);
	});
	it("and priority Controller", () => {
		expect(getDefaultPriority(req)).toBe(MessagePriority.Controller);
		expect(getDefaultPriorityStatic(GetSerialApiInitDataRequest)).toBe(
			MessagePriority.Controller,
		);
	});
	it("and a function type GetSerialApiInitData", () => {
		expect(getFunctionType(req)).toBe(FunctionType.GetSerialApiInitData);
		expect(getFunctionTypeStatic(GetSerialApiInitDataRequest)).toBe(
			FunctionType.GetSerialApiInitData,
		);
	});
	it("that expects a GetSerialApiInitData response", () => {
		expect(getExpectedResponse(req)).toBe(
			FunctionType.GetSerialApiInitData,
		);
		expect(getExpectedResponseStatic(GetSerialApiInitDataRequest)).toBe(
			FunctionType.GetSerialApiInitData,
		);
	});
});

// TODO: Find a way to test this without actual buffers
// describe.skip("lib/controller/GetSerialApiInitDataResponse => ", () => {
// 	const res = new GetSerialApiInitDataResponse(fakeDriver, {} as any);

// 	it("should be a Message", () => {
// 		expect(res).toBeInstanceOf(Message);
// 	});
// 	it("with type Response", () => {
// 		expect(getMessageType(res)).toBe(MessageType.Response);
// 		expect(getMessageTypeStatic(GetSerialApiInitDataResponse)).toBe(
// 			MessageType.Response,
// 		);
// 	});
// 	it("and NO default priority", () => {
// 		expect(getDefaultPriority(res)).toBeUndefined();
// 		expect(
// 			getDefaultPriorityStatic(GetSerialApiInitDataResponse),
// 		).toBeUndefined();
// 	});
// 	it("and a function type GetSerialApiInitData", () => {
// 		expect(getFunctionType(res)).toBe(FunctionType.GetSerialApiInitData);
// 		expect(getFunctionTypeStatic(GetSerialApiInitDataResponse)).toBe(
// 			FunctionType.GetSerialApiInitData,
// 		);
// 	});
// 	it("that expects NO response", () => {
// 		expect(getExpectedResponse(res)).toBeUndefined();
// 		expect(
// 			getExpectedResponseStatic(GetSerialApiInitDataResponse),
// 		).toBeUndefined();
// 	});

// 	it.todo("TODO: Test deserialization");
// });
