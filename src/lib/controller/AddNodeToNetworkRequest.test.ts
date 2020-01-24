import { createEmptyMockDriver, mockDriverDummyCallbackId } from "../../../test/mocks";
import type { Driver } from "../driver/Driver";
import { FunctionType, MessagePriority, MessageType } from "../message/Constants";
import { getDefaultPriority, getDefaultPriorityStatic, getExpectedResponse, getExpectedResponseStatic, getFunctionType, getFunctionTypeStatic, getMessageType, getMessageTypeStatic, Message } from "../message/Message";
import { AddNodeToNetworkRequest, AddNodeType } from "./AddNodeToNetworkRequest";

const fakeDriver = (createEmptyMockDriver() as unknown) as Driver;

describe("lib/controller/AddNodeToNetworkRequest => ", () => {
	const req = new AddNodeToNetworkRequest(fakeDriver);

	it("should be a Message", () => {
		expect(req).toBeInstanceOf(Message);
	});
	it("with type Request", () => {
		expect(getMessageType(req)).toBe(MessageType.Request);
		expect(getMessageTypeStatic(AddNodeToNetworkRequest)).toBe(
			MessageType.Request,
		);
	});
	it("and priority Controller", () => {
		expect(getDefaultPriority(req)).toBe(MessagePriority.Controller);
		expect(getDefaultPriorityStatic(AddNodeToNetworkRequest)).toBe(
			MessagePriority.Controller,
		);
	});
	it("and a function type AddNodeToNetwork", () => {
		expect(getFunctionType(req)).toBe(FunctionType.AddNodeToNetwork);
		expect(getFunctionTypeStatic(AddNodeToNetworkRequest)).toBe(
			FunctionType.AddNodeToNetwork,
		);
	});
	it("that expects NO response", () => {
		expect(getExpectedResponse(req)).toBeUndefined();
		expect(
			getExpectedResponseStatic(AddNodeToNetworkRequest),
		).toBeUndefined();
	});

	it("should serialize correctly", () => {
		const msg1 = new AddNodeToNetworkRequest(fakeDriver, {
			addNodeType: AddNodeType.Any,
			highPower: false,
			networkWide: false,
		});
		let payload = Message.extractPayload(msg1.serialize());
		expect(payload).toEqual(Buffer.from([0x01, mockDriverDummyCallbackId]));

		const msg2 = new AddNodeToNetworkRequest(fakeDriver, {
			addNodeType: AddNodeType.Any,
			highPower: true,
			networkWide: false,
		});
		payload = Message.extractPayload(msg2.serialize());
		expect(payload).toEqual(Buffer.from([0x81, mockDriverDummyCallbackId]));

		const msg3 = new AddNodeToNetworkRequest(fakeDriver, {
			addNodeType: AddNodeType.Any,
			highPower: false,
			networkWide: true,
		});
		payload = Message.extractPayload(msg3.serialize());
		expect(payload).toEqual(Buffer.from([0x41, mockDriverDummyCallbackId]));

		const msg4 = new AddNodeToNetworkRequest(fakeDriver, {
			addNodeType: AddNodeType.Any,
			highPower: true,
			networkWide: true,
		});
		payload = Message.extractPayload(msg4.serialize());
		expect(payload).toEqual(Buffer.from([0xc1, mockDriverDummyCallbackId]));

		const msg5 = new AddNodeToNetworkRequest(fakeDriver, {
			addNodeType: AddNodeType.Stop,
			highPower: true,
			networkWide: true,
		});
		payload = Message.extractPayload(msg5.serialize());
		expect(payload).toEqual(Buffer.from([0xc5, mockDriverDummyCallbackId]));
	});
});
