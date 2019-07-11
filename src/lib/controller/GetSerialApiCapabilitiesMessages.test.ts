import { createEmptyMockDriver } from "../../../test/mocks";
import { IDriver } from "../driver/IDriver";
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
import { GetSerialApiCapabilitiesRequest } from "./GetSerialApiCapabilitiesMessages";

const fakeDriver = (createEmptyMockDriver() as unknown) as IDriver;

describe("lib/controller/GetSerialApiCapabilitiesRequest => ", () => {
	const req = new GetSerialApiCapabilitiesRequest(fakeDriver);

	it("should be a Message", () => {
		expect(req).toBeInstanceOf(Message);
	});
	it("with type Request", () => {
		expect(getMessageType(req)).toBe(MessageType.Request);
		expect(getMessageTypeStatic(GetSerialApiCapabilitiesRequest)).toBe(
			MessageType.Request,
		);
	});
	it("and priority Controller", () => {
		expect(getDefaultPriority(req)).toBe(MessagePriority.Controller);
		expect(getDefaultPriorityStatic(GetSerialApiCapabilitiesRequest)).toBe(
			MessagePriority.Controller,
		);
	});
	it("and a function type GetSerialApiCapabilities", () => {
		expect(getFunctionType(req)).toBe(
			FunctionType.GetSerialApiCapabilities,
		);
		expect(getFunctionTypeStatic(GetSerialApiCapabilitiesRequest)).toBe(
			FunctionType.GetSerialApiCapabilities,
		);
	});
	it("that expects a GetSerialApiCapabilities response", () => {
		expect(getExpectedResponse(req)).toBe(
			FunctionType.GetSerialApiCapabilities,
		);
		expect(getExpectedResponseStatic(GetSerialApiCapabilitiesRequest)).toBe(
			FunctionType.GetSerialApiCapabilities,
		);
	});
});

// TODO: Find a way to test this without actual buffers
// describe.skip("lib/controller/GetSerialApiCapabilitiesResponse => ", () => {
// 	let res: GetSerialApiCapabilitiesResponse;
// 	beforeAll(() => {
// 		res = new GetSerialApiCapabilitiesResponse(fakeDriver, {} as any);
// 	});

// 	it("should be a Message", () => {
// 		expect(res).toBeInstanceOf(Message);
// 	});
// 	it("with type Response", () => {
// 		expect(getMessageType(res)).toBe(MessageType.Response);
// 		expect(getMessageTypeStatic(GetSerialApiCapabilitiesResponse)).toBe(
// 			MessageType.Response,
// 		);
// 	});
// 	it("and NO default priority", () => {
// 		expect(getDefaultPriority(res)).toBeUndefined();
// 		expect(
// 			getDefaultPriorityStatic(GetSerialApiCapabilitiesResponse),
// 		).toBeUndefined();
// 	});
// 	it("and a function type GetSerialApiCapabilities", () => {
// 		expect(getFunctionType(res)).toBe(
// 			FunctionType.GetSerialApiCapabilities,
// 		);
// 		expect(getFunctionTypeStatic(GetSerialApiCapabilitiesResponse)).toBe(
// 			FunctionType.GetSerialApiCapabilities,
// 		);
// 	});
// 	it("that expects NO response", () => {
// 		expect(getExpectedResponse(res)).toBeUndefined();
// 		expect(
// 			getExpectedResponseStatic(GetSerialApiCapabilitiesResponse),
// 		).toBeUndefined();
// 	});

// 	it.todo("TODO: Test deserialization");
// });
