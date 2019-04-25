import { createEmptyMockDriver } from "../../../test/mocks";
import { FunctionType, MessageType } from "../message/Constants";
import {
	getExpectedResponse,
	getFunctionType,
	getMessageType,
	Message,
} from "../message/Message";
import { GetControllerVersionRequest } from "./GetControllerVersionMessages";

const fakeDriver = createEmptyMockDriver();

describe("lib/driver/GetControllerVersionRequest => ", () => {
	const req = new GetControllerVersionRequest(fakeDriver);

	it("should be a Message", () => {
		expect(req).toBeInstanceOf(Message);
	});
	it("with type Request", () => {
		expect(getMessageType(req)).toBe(MessageType.Request);
	});
	it("and a function type GetControllerVersion", () => {
		expect(getFunctionType(req)).toBe(FunctionType.GetControllerVersion);
	});
	it("that expects a GetControllerVersion response", () => {
		expect(getExpectedResponse(req)).toBe(
			FunctionType.GetControllerVersion,
		);
	});
});

// TODO: Find a way to do this without an actual payload
// describe.skip("lib/driver/GetControllerVersionResponse => ", () => {
// 	const res = new GetControllerVersionResponse(fakeDriver, {} as any);

// 	it("should be a Message", () => {
// 		expect(res).toBeInstanceOf(Message);
// 	});
// 	it("with type Response", () => {
// 		expect(getMessageType(res)).toBe(MessageType.Response);
// 	});
// 	it("and a function type GetControllerVersion", () => {
// 		expect(getFunctionType(res)).toBe(FunctionType.GetControllerVersion);
// 	});
// 	it("that expects NO response", () => {
// 		expect(getExpectedResponse(res)).toBeUndefined();
// 	});

// 	// an actual message from OZW
// 	const rawBuf = Buffer.from("011001155a2d5761766520342e3035000197", "hex");
// 	const parsed = new GetControllerVersionResponse(fakeDriver, {
// 		data: rawBuf,
// 	});

// 	it("should extract the controller version and type", () => {
// 		expect(parsed.libraryVersion).toBe("Z-Wave 4.05");
// 		expect(parsed.controllerType).toBe(
// 			ZWaveLibraryTypes["Static Controller"],
// 		);
// 	});

// 	it("its constructor should be retrieved for Response & GetControllerVersion", () => {
// 		const constr = Message.getConstructor(rawBuf);
// 		expect(constr).toBe(GetControllerVersionResponse);
// 		expect(constr).not.toBe(Message);
// 	});
// });
