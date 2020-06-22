import type { Driver } from "../driver/Driver";
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
import { createEmptyMockDriver } from "../test/mocks";
import {
	GetRoutingInfoRequest,
	GetRoutingInfoResponse,
} from "./GetRoutingInfoMessages";

const fakeDriver = (createEmptyMockDriver() as unknown) as Driver;

describe("lib/controller/GetRoutingInfoRequest => ", () => {
	const req = new GetRoutingInfoRequest(fakeDriver, { nodeId: 1 });

	it("should be a Message", () => {
		expect(req).toBeInstanceOf(Message);
	});
	it("with type Request", () => {
		expect(getMessageType(req)).toBe(MessageType.Request);
		expect(getMessageTypeStatic(GetRoutingInfoRequest)).toBe(
			MessageType.Request,
		);
	});
	it("and priority Controller", () => {
		expect(getDefaultPriority(req)).toBe(MessagePriority.Controller);
		expect(getDefaultPriorityStatic(GetRoutingInfoRequest)).toBe(
			MessagePriority.Controller,
		);
	});
	it("and a function type GetRoutingInfo", () => {
		expect(getFunctionType(req)).toBe(FunctionType.GetRoutingInfo);
		expect(getFunctionTypeStatic(GetRoutingInfoRequest)).toBe(
			FunctionType.GetRoutingInfo,
		);
	});
	it("that expects a GetRoutingInfo response", () => {
		expect(getExpectedResponse(req)).toBe(FunctionType.GetRoutingInfo);
		expect(getExpectedResponseStatic(GetRoutingInfoRequest)).toBe(
			FunctionType.GetRoutingInfo,
		);
	});
});

describe("lib/controller/GetRoutingInfoResponse => ", () => {
	const req = new GetRoutingInfoResponse(fakeDriver, {} as any);

	it("should be a Message", () => {
		expect(req).toBeInstanceOf(Message);
	});
	it("with type Response", () => {
		expect(getMessageType(req)).toBe(MessageType.Response);
		expect(getMessageTypeStatic(GetRoutingInfoResponse)).toBe(
			MessageType.Response,
		);
	});
	it("and NO priority", () => {
		expect(getDefaultPriority(req)).toBeUndefined();
		expect(
			getDefaultPriorityStatic(GetRoutingInfoResponse),
		).toBeUndefined();
	});
	it("and a function type GetRoutingInfo", () => {
		expect(getFunctionType(req)).toBe(FunctionType.GetRoutingInfo);
		expect(getFunctionTypeStatic(GetRoutingInfoResponse)).toBe(
			FunctionType.GetRoutingInfo,
		);
	});
	it("that expects NO response", () => {
		expect(getExpectedResponse(req)).toBeUndefined();
		expect(
			getExpectedResponseStatic(GetRoutingInfoResponse),
		).toBeUndefined();
	});
});
