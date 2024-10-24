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
// import { isNodeQuery } from "../node/INodeQuery";
// import {
// 	GetNodeProtocolInfoRequest,
// 	GetNodeProtocolInfoResponse,
// } from "./GetNodeProtocolInfoMessages";

// const fakeDriver = createEmptyMockDriver();

// describe("lib/driver/GetNodeProtocolInfoRequest => ", () => {
// 	const req = new GetNodeProtocolInfoRequest(fakeDriver, { nodeId: 4 });

// 	it("should be a Message", () => {
// 		expect(req).toBeInstanceOf(Message);
// 	});
// 	it("with type Request", () => {
// 		expect(getMessageType(req)).toBe(MessageType.Request);
// 		expect(getMessageTypeStatic(GetNodeProtocolInfoRequest)).toBe(
// 			MessageType.Request,
// 		);
// 	});
// 	it("and priority NodeQuery", () => {
// 		expect(getDefaultPriority(req)).toBe(MessagePriority.NodeQuery);
// 		expect(getDefaultPriorityStatic(GetNodeProtocolInfoRequest)).toBe(
// 			MessagePriority.NodeQuery,
// 		);
// 	});
// 	it("and a function type GetNodeProtocolInfo", () => {
// 		expect(getFunctionType(req)).toBe(FunctionType.GetNodeProtocolInfo);
// 		expect(getFunctionTypeStatic(GetNodeProtocolInfoRequest)).toBe(
// 			FunctionType.GetNodeProtocolInfo,
// 		);
// 	});
// 	it("that expects a GetNodeProtocolInfo response", () => {
// 		expect(getExpectedResponse(req)).toBe(FunctionType.GetNodeProtocolInfo);
// 		expect(getExpectedResponseStatic(GetNodeProtocolInfoRequest)).toBe(
// 			FunctionType.GetNodeProtocolInfo,
// 		);
// 	});

// 	it("should be detected as an INodeQuery", () => {
// 		expect(isNodeQuery(req)).toBe(true);
// 	});
// 	it("and getNodeId() should return the correct node id", () => {
// 		expect(req.getNodeId()).toBe(4);
// 	});
// });

// // TODO: Find a way to do this without actual buffers
// describe.skip("lib/driver/GetNodeProtocolInfoResponse => ", () => {
// 	let res: GetNodeProtocolInfoResponse;
// 	beforeAll(() => {
// 		res = new GetNodeProtocolInfoResponse(fakeDriver, {} as any);
// 	});

// 	it("should be a Message", () => {
// 		expect(res).toBeInstanceOf(Message);
// 	});
// 	it("with type Response", () => {
// 		expect(getMessageType(res)).toBe(MessageType.Response);
// 		expect(getMessageTypeStatic(GetNodeProtocolInfoResponse)).toBe(
// 			MessageType.Response,
// 		);
// 	});
// 	it("and no default priority", () => {
// 		expect(getDefaultPriority(res)).toBeUndefined();
// 		expect(
// 			getDefaultPriorityStatic(GetNodeProtocolInfoResponse),
// 		).toBeUndefined();
// 	});
// 	it("and a function type GetControllerVersion", () => {
// 		expect(getFunctionType(res)).toBe(FunctionType.GetNodeProtocolInfo);
// 		expect(getFunctionTypeStatic(GetNodeProtocolInfoResponse)).toBe(
// 			FunctionType.GetNodeProtocolInfo,
// 		);
// 	});
// 	it("that expects NO response", () => {
// 		expect(getExpectedResponse(res)).toBeUndefined();
// 		expect(
// 			getExpectedResponseStatic(GetNodeProtocolInfoResponse),
// 		).toBeUndefined();
// 	});

// 	// TODO: Pick up an actual message from OZW to test this
// 	// const rawBuf = Buffer.from("011001155a2d5761766520342e3035000197", "hex");
// 	// const parsed = new GetNodeProtocolInfo(undefined);
// 	// parsed.deserialize(rawBuf);

// 	// it("should extract the controller version and type", () => {
// 	// 	expect(parsed.libraryVersion).toBe("Z-Wave 4.05");
// 	// 	expect(parsed.controllerType).toBe(ZWaveLibraryTypes["Static Controller"]);
// 	// });

// 	// it("its constructor should be retrieved for Response & GetControllerVersion", () => {
// 	// 	const constr = Message.getConstructor(rawBuf);
// 	// 	expect(constr).toBe(GetControllerVersionResponse);
// 	// 	expect(constr).not.toBe(Message);
// 	// });
// });
