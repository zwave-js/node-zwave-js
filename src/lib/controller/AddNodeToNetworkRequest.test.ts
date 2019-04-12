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
import {
	AddNodeToNetworkRequest,
	AddNodeType,
} from "./AddNodeToNetworkRequest";

describe("lib/controller/AddNodeToNetworkRequest => ", () => {
	const req = new AddNodeToNetworkRequest(undefined, 1);

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
		const msg1 = new AddNodeToNetworkRequest(
			undefined,
			AddNodeType.Any,
			false,
			false,
		);
		let payload = Message.extractPayload(msg1.serialize());
		expect(payload).toEqual(Buffer.from([0x01]));

		const msg2 = new AddNodeToNetworkRequest(
			undefined,
			AddNodeType.Any,
			true,
			false,
		);
		payload = Message.extractPayload(msg2.serialize());
		expect(payload).toEqual(Buffer.from([0x81]));

		const msg3 = new AddNodeToNetworkRequest(
			undefined,
			AddNodeType.Any,
			false,
			true,
		);
		payload = Message.extractPayload(msg3.serialize());
		expect(payload).toEqual(Buffer.from([0x41]));

		const msg4 = new AddNodeToNetworkRequest(
			undefined,
			AddNodeType.Any,
			true,
			true,
		);
		payload = Message.extractPayload(msg4.serialize());
		expect(payload).toEqual(Buffer.from([0xc1]));

		const msg5 = new AddNodeToNetworkRequest(
			undefined,
			AddNodeType.Stop,
			true,
			true,
		);
		payload = Message.extractPayload(msg5.serialize());
		expect(payload).toEqual(Buffer.from([0xc5]));
	});
});
