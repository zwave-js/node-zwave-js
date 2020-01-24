import { createEmptyMockDriver } from "../../../test/mocks";
import type { Driver } from "../driver/Driver";
import { FunctionType, MessageType } from "../message/Constants";
import { getDefaultPriority, getDefaultPriorityStatic, getExpectedResponse, getExpectedResponseStatic, getFunctionType, getFunctionTypeStatic, getMessageType, getMessageTypeStatic, Message } from "../message/Message";
import { ApplicationUpdateRequest } from "./ApplicationUpdateRequest";

const fakeDriver = (createEmptyMockDriver() as unknown) as Driver;

describe("lib/controller/ApplicationUpdateRequest => ", () => {
	let req: ApplicationUpdateRequest;
	beforeAll(() => {
		req = new ApplicationUpdateRequest(fakeDriver, {} as any);
	});

	it("should be a Message", () => {
		expect(req).toBeInstanceOf(Message);
	});
	it("with type Request", () => {
		expect(getMessageType(req)).toBe(MessageType.Request);
		expect(getMessageTypeStatic(ApplicationUpdateRequest)).toBe(
			MessageType.Request,
		);
	});
	it("and NO priority", () => {
		expect(getDefaultPriority(req)).toBeUndefined();
		expect(
			getDefaultPriorityStatic(ApplicationUpdateRequest),
		).toBeUndefined();
	});
	it("and a function type ApplicationUpdate", () => {
		expect(getFunctionType(req)).toBe(
			FunctionType.ApplicationUpdateRequest,
		);
		expect(getFunctionTypeStatic(ApplicationUpdateRequest)).toBe(
			FunctionType.ApplicationUpdateRequest,
		);
	});
	it("that expects NO response", () => {
		expect(getExpectedResponse(req)).toBeUndefined();
		expect(
			getExpectedResponseStatic(ApplicationUpdateRequest),
		).toBeUndefined();
	});
});
