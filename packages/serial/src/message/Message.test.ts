import { ZWaveErrorCodes, assertZWaveError } from "@zwave-js/core";
import { createTestingHost } from "@zwave-js/host";
import { Bytes } from "@zwave-js/shared";
import { test } from "vitest";
import { FunctionType, MessageType } from "./Constants.js";
import { Message, messageTypes } from "./Message.js";

test("should deserialize and serialize correctly", async (t) => {
	// actual messages from OZW
	const okayMessages = [
		Bytes.from([
			0x01,
			0x09,
			0x00,
			0x13,
			0x03,
			0x02,
			0x00,
			0x00,
			0x25,
			0x0b,
			0xca,
		]),
		Bytes.from([0x01, 0x05, 0x00, 0x47, 0x04, 0x20, 0x99]),
		Bytes.from([0x01, 0x06, 0x00, 0x46, 0x0c, 0x0d, 0x32, 0x8c]),
		Bytes.from([
			0x01,
			0x0a,
			0x00,
			0x13,
			0x03,
			0x03,
			0x8e,
			0x02,
			0x04,
			0x25,
			0x40,
			0x0b,
		]),
	];
	for (const original of okayMessages) {
		const parsed = Message.parse(original, {} as any);
		await t.expect(parsed.serialize({} as any)).resolves.toStrictEqual(
			original,
		);
	}
});

test("should serialize correctly when the payload is null", async (t) => {
	// synthetic message
	const expected = Bytes.from([0x01, 0x03, 0x00, 0xff, 0x03]);
	const message = new Message({
		type: MessageType.Request,
		functionType: 0xff as any,
	});
	await t.expect(message.serialize({} as any)).resolves.toStrictEqual(
		expected,
	);
});

test("should throw the correct error when parsing a faulty message", async (t) => {
	// fake messages to produce certain errors
	const brokenMessages: [Bytes, string, ZWaveErrorCodes][] = [
		// too short (<5 bytes)
		[
			Bytes.from([0x01, 0x02, 0x00, 0x00]),
			"truncated",
			ZWaveErrorCodes.PacketFormat_Truncated,
		],
		// no SOF
		[
			Bytes.from([0x00, 0x03, 0x00, 0x00, 0x00]),
			"start with SOF",
			ZWaveErrorCodes.PacketFormat_Invalid,
		],
		// too short for the provided data length
		[
			Bytes.from([0x01, 0x04, 0x00, 0x00, 0x00]),
			"truncated",
			ZWaveErrorCodes.PacketFormat_Truncated,
		],
		// invalid checksum
		[
			Bytes.from([0x01, 0x03, 0x00, 0x00, 0x00]),
			"checksum",
			ZWaveErrorCodes.PacketFormat_Checksum,
		],
		// invalid checksum (once more with a real packet)
		[
			Bytes.from([0x01, 0x05, 0x00, 0x47, 0x04, 0x20, 0x98]),
			"checksum",
			ZWaveErrorCodes.PacketFormat_Checksum,
		],
	];
	for (const [message, msg, code] of brokenMessages) {
		assertZWaveError(
			t.expect,
			() => Message.parse(message, {} as any),
			{
				messageMatches: msg,
				errorCode: code,
			},
		);
	}
});

test("toJSON() should return a semi-readable JSON representation", (t) => {
	const msg1 = new Message({
		type: MessageType.Request,
		functionType: FunctionType.GetControllerVersion,
	});
	const json1 = {
		name: msg1.constructor.name,
		type: "Request",
		functionType: "GetControllerVersion",
		payload: "",
	};
	const msg2 = new Message({
		type: MessageType.Request,
		functionType: FunctionType.GetControllerVersion,
		payload: Bytes.from("aabbcc", "hex"),
	});
	const json2 = {
		name: msg2.constructor.name,
		type: "Request",
		functionType: "GetControllerVersion",
		payload: "aabbcc",
	};
	const msg3 = new Message({
		type: MessageType.Response,
		functionType: FunctionType.GetControllerVersion,
		expectedResponse: FunctionType.GetControllerVersion,
	});
	const json3 = {
		name: msg3.constructor.name,
		type: "Response",
		functionType: "GetControllerVersion",
		expectedResponse: "GetControllerVersion",
		payload: "",
	};
	const msg4 = new Message({
		type: MessageType.Request,
		functionType: FunctionType.GetControllerVersion,
		expectedResponse: FunctionType.GetControllerVersion,
		payload: Bytes.from("aabbcc", "hex"),
	});
	const json4 = {
		name: msg4.constructor.name,
		type: "Request",
		functionType: "GetControllerVersion",
		expectedResponse: "GetControllerVersion",
		payload: "aabbcc",
	};

	t.expect(msg1.toJSON()).toStrictEqual(json1);
	t.expect(msg2.toJSON()).toStrictEqual(json2);
	t.expect(msg3.toJSON()).toStrictEqual(json3);
	t.expect(msg4.toJSON()).toStrictEqual(json4);
});

test("Parsing a buffer with an unknown function type returns an unspecified `Message` instance", async (t) => {
	const unknown = Bytes.from([0x01, 0x03, 0x00, 0x00, 0xfc]);
	const parsed = Message.parse(unknown, {} as any);
	t.expect(parsed).toBeInstanceOf(Message);
});

test(`the constructor should throw when no message type is specified`, (t) => {
	assertZWaveError(
		t.expect,
		() => new Message({ functionType: 0xff as any }),
		{
			errorCode: ZWaveErrorCodes.Argument_Invalid,
			messageMatches: /message type/i,
		},
	);

	@messageTypes(undefined as any, 0xff as any)
	class FakeMessageWithoutMessageType extends Message {}

	assertZWaveError(t.expect, () => new FakeMessageWithoutMessageType(), {
		errorCode: ZWaveErrorCodes.Argument_Invalid,
		messageMatches: /message type/i,
	});
});

test(`the constructor should throw when no function type is specified`, (t) => {
	assertZWaveError(
		t.expect,
		() => new Message({ type: MessageType.Request }),
		{
			errorCode: ZWaveErrorCodes.Argument_Invalid,
			messageMatches: /function type/i,
		},
	);

	@messageTypes(MessageType.Request, undefined as any)
	class FakeMessageWithoutFunctionType extends Message {}

	assertZWaveError(t.expect, () => new FakeMessageWithoutFunctionType(), {
		errorCode: ZWaveErrorCodes.Argument_Invalid,
		messageMatches: /function type/i,
	});
});

test("tryGetNode() returns undefined when the controller is not initialized yet", (t) => {
	const host = createTestingHost();
	const msg = new Message({
		type: MessageType.Request,
		functionType: 0xff as any,
	});
	t.expect(msg.tryGetNode(host)).toBeUndefined();
});

test("tryGetNode() returns undefined when the message is no node query", (t) => {
	const host = createTestingHost();
	const msg = new Message({
		type: MessageType.Request,
		functionType: 0xff as any,
	});
	t.expect(msg.tryGetNode(host)).toBeUndefined();
});

test("tryGetNode() returns the associated node otherwise", (t) => {
	const host = createTestingHost();
	host.setNode(1, {} as any);

	const msg = new Message({
		type: MessageType.Request,
		functionType: 0xff as any,
	});

	// This node exists
	(msg as any).nodeId = 1;
	t.expect(msg.tryGetNode(host)).toBe(host.getNode(1));

	// This one does
	(msg as any).nodeId = 2;
	t.expect(msg.tryGetNode(host)).toBeUndefined();
});
