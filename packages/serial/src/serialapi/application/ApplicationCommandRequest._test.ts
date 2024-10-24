const foo = undefined;
export default foo;

// import { createEmptyMockDriver } from "../../../../../test/mocks";
// import {
// 	FunctionType,
// 	MessagePriority,
// 	MessageType,
// } from "../message/Constants";
// import {
// 	getDefaultPriority,
// 	getDefaultPriorityStatic,
// 	getExpectedResponse,
// 	getExpectedResponseStatic,
// 	getFunctionType,
// 	getFunctionTypeStatic,
// 	getMessageType,
// 	getMessageTypeStatic,
// 	Message,
// } from "../message/Message";
// import { ApplicationCommandRequest } from "./ApplicationCommandRequest";

// const fakeDriver = createEmptyMockDriver();

// // TODO: Find a way to test this without needing actual message buffers
// describe.skip("lib/controller/ApplicationCommandRequest => ", () => {
// 	const req = new ApplicationCommandRequest(fakeDriver, {} as any);

// 	it("should be a Message", () => {
// 		expect(req).toBeInstanceOf(Message);
// 	});
// 	it("with type Request", () => {
// 		expect(getMessageType(req)).toBe(MessageType.Request);
// 		expect(getMessageTypeStatic(ApplicationCommandRequest)).toBe(
// 			MessageType.Request,
// 		);
// 	});
// 	it("and priority Normal", () => {
// 		expect(getDefaultPriority(req)).toBe(MessagePriority.Normal);
// 		expect(getDefaultPriorityStatic(ApplicationCommandRequest)).toBe(
// 			MessagePriority.Normal,
// 		);
// 	});
// 	it("and a function type ApplicationCommand", () => {
// 		expect(getFunctionType(req)).toBe(FunctionType.ApplicationCommand);
// 		expect(getFunctionTypeStatic(ApplicationCommandRequest)).toBe(
// 			FunctionType.ApplicationCommand,
// 		);
// 	});
// 	it("that expects NO response", () => {
// 		expect(getExpectedResponse(req)).toBeUndefined();
// 		expect(
// 			getExpectedResponseStatic(ApplicationCommandRequest),
// 		).toBeUndefined();
// 	});
// });
