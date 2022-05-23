import { assertZWaveError, ZWaveErrorCodes } from "@zwave-js/core";
import { createTestingHost, TestingHost } from "@zwave-js/host";
import { FunctionType, MessageType } from "./Constants";
import type { INodeQuery } from "./INodeQuery";
import { Message, messageTypes } from "./Message";

describe("lib/message", () => {
	let host: TestingHost;

	beforeEach(() => {
		host = createTestingHost();
	});

	describe("Message", () => {
		it("should deserialize and serialize correctly", () => {
			// actual messages from OZW
			const okayMessages = [
				Buffer.from([
					0x01, 0x09, 0x00, 0x13, 0x03, 0x02, 0x00, 0x00, 0x25, 0x0b,
					0xca,
				]),
				Buffer.from([0x01, 0x05, 0x00, 0x47, 0x04, 0x20, 0x99]),
				Buffer.from([0x01, 0x06, 0x00, 0x46, 0x0c, 0x0d, 0x32, 0x8c]),
				Buffer.from([
					0x01, 0x0a, 0x00, 0x13, 0x03, 0x03, 0x8e, 0x02, 0x04, 0x25,
					0x40, 0x0b,
				]),
			];
			for (const original of okayMessages) {
				const parsed = new Message(host, { data: original });
				expect(parsed.serialize()).toEqual(original);
			}
		});

		it("should serialize correctly when the payload is null", () => {
			// synthetic message
			const expected = Buffer.from([0x01, 0x03, 0x00, 0xff, 0x03]);
			const message = new Message(host, {
				type: MessageType.Request,
				functionType: 0xff,
			});
			expect(message.serialize()).toEqual(expected);
		});

		it("should throw the correct error when parsing a faulty message", () => {
			// fake messages to produce certain errors
			const brokenMessages: [Buffer, string, ZWaveErrorCodes][] = [
				// too short (<5 bytes)
				[
					Buffer.from([0x01, 0x02, 0x00, 0x00]),
					"truncated",
					ZWaveErrorCodes.PacketFormat_Truncated,
				],
				// no SOF
				[
					Buffer.from([0x00, 0x03, 0x00, 0x00, 0x00]),
					"start with SOF",
					ZWaveErrorCodes.PacketFormat_Invalid,
				],
				// too short for the provided data length
				[
					Buffer.from([0x01, 0x04, 0x00, 0x00, 0x00]),
					"truncated",
					ZWaveErrorCodes.PacketFormat_Truncated,
				],
				// invalid checksum
				[
					Buffer.from([0x01, 0x03, 0x00, 0x00, 0x00]),
					"checksum",
					ZWaveErrorCodes.PacketFormat_Checksum,
				],
				// invalid checksum (once more with a real packet)
				[
					Buffer.from([0x01, 0x05, 0x00, 0x47, 0x04, 0x20, 0x98]),
					"checksum",
					ZWaveErrorCodes.PacketFormat_Checksum,
				],
			];
			for (const [message, msg, code] of brokenMessages) {
				assertZWaveError(() => new Message(host, { data: message }), {
					messageMatches: msg,
					errorCode: code,
				});
			}
		});

		it("isComplete() should work correctly", () => {
			// actual messages from OZW
			const okayMessages = [
				Buffer.from([
					0x01, 0x09, 0x00, 0x13, 0x03, 0x02, 0x00, 0x00, 0x25, 0x0b,
					0xca,
				]),
				Buffer.from([0x01, 0x05, 0x00, 0x47, 0x04, 0x20, 0x99]),
				Buffer.from([0x01, 0x06, 0x00, 0x46, 0x0c, 0x0d, 0x32, 0x8c]),
				Buffer.from([
					0x01, 0x0a, 0x00, 0x13, 0x03, 0x03, 0x8e, 0x02, 0x04, 0x25,
					0x40, 0x0b,
				]),
			];
			for (const msg of okayMessages) {
				expect(Message.isComplete(msg)).toBe(true); // `${msg.toString("hex")} should be detected as complete`
			}

			// truncated messages
			const truncatedMessages = [
				undefined,
				Buffer.from([]),
				Buffer.from([0x01]),
				Buffer.from([0x01, 0x09]),
				Buffer.from([0x01, 0x09, 0x00]),
				Buffer.from([
					0x01, 0x09, 0x00, 0x13, 0x03, 0x02, 0x00, 0x00, 0x25, 0x0b,
				]),
			];
			for (const msg of truncatedMessages) {
				expect(Message.isComplete(msg)).toBe(false); // `${msg ? msg.toString("hex") : "null"} should be detected as incomplete`
			}

			// faulty but non-truncated messages should be detected as complete
			const faultyMessages = [
				Buffer.from([
					0x01, 0x09, 0x00, 0x13, 0x03, 0x02, 0x00, 0x00, 0x25, 0x0b,
					0xca,
				]),
				Buffer.from([0x01, 0x05, 0x00, 0x47, 0x04, 0x20, 0x99]),
				Buffer.from([0x01, 0x06, 0x00, 0x46, 0x0c, 0x0d, 0x32, 0x8c]),
				Buffer.from([
					0x01, 0x0a, 0x00, 0x13, 0x03, 0x03, 0x8e, 0x02, 0x04, 0x25,
					0x40, 0x0b,
				]),
			];
			for (const msg of faultyMessages) {
				expect(Message.isComplete(msg)).toBe(true); // `${msg.toString("hex")} should be detected as complete`
			}

			// actual messages from OZW, appended with some random data
			const tooLongMessages = [
				Buffer.from([
					0x01, 0x09, 0x00, 0x13, 0x03, 0x02, 0x00, 0x00, 0x25, 0x0b,
					0xca, 0x00,
				]),
				Buffer.from([
					0x01, 0x05, 0x00, 0x47, 0x04, 0x20, 0x99, 0x01, 0x02,
				]),
				Buffer.from([
					0x01, 0x06, 0x00, 0x46, 0x0c, 0x0d, 0x32, 0x8c, 0xab, 0xcd,
					0xef,
				]),
				Buffer.from([
					0x01, 0x0a, 0x00, 0x13, 0x03, 0x03, 0x8e, 0x02, 0x04, 0x25,
					0x40, 0x0b, 0x12,
				]),
			];
			for (const msg of tooLongMessages) {
				expect(Message.isComplete(msg)).toBe(true); // `${msg.toString("hex")} should be detected as complete`
			}
		});

		it("toJSON() should return a semi-readable JSON representation", () => {
			const msg1 = new Message(host, {
				type: MessageType.Request,
				functionType: FunctionType.GetControllerVersion,
			});
			const json1 = {
				name: msg1.constructor.name,
				type: "Request",
				functionType: "GetControllerVersion",
				payload: "",
			};
			const msg2 = new Message(host, {
				type: MessageType.Request,
				functionType: FunctionType.GetControllerVersion,
				payload: Buffer.from("aabbcc", "hex"),
			});
			const json2 = {
				name: msg2.constructor.name,
				type: "Request",
				functionType: "GetControllerVersion",
				payload: "aabbcc",
			};
			const msg3 = new Message(host, {
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
			const msg4 = new Message(host, {
				type: MessageType.Request,
				functionType: FunctionType.GetControllerVersion,
				expectedResponse: FunctionType.GetControllerVersion,
				payload: Buffer.from("aabbcc", "hex"),
			});
			const json4 = {
				name: msg4.constructor.name,
				type: "Request",
				functionType: "GetControllerVersion",
				expectedResponse: "GetControllerVersion",
				payload: "aabbcc",
			};

			expect(msg1.toJSON()).toEqual(json1);
			expect(msg2.toJSON()).toEqual(json2);
			expect(msg3.toJSON()).toEqual(json3);
			expect(msg4.toJSON()).toEqual(json4);
		});

		it("getConstructor() should return `Message` for an unknown packet type", () => {
			const unknown = Buffer.from([0x01, 0x03, 0x00, 0x00, 0xfc]);
			expect(Message.getConstructor(unknown)).toBe(Message);
		});

		// it(`when the expectedResponse is defined, testResponse() should return "final" or "unexpected"`, () => {
		// 	const msg = new Message(fakeDriver, {
		// 		type: MessageType.Request,
		// 		functionType: 0xff,
		// 		expectedResponse: FunctionType.ApplicationCommand,
		// 	});
		// 	const final = new Message(fakeDriver, {
		// 		type: MessageType.Response,
		// 		functionType: FunctionType.ApplicationCommand,
		// 	});
		// 	expect(msg.testResponse(final)).toBe("final");

		// 	// wrong function type
		// 	const unexpected1 = new Message(fakeDriver, {
		// 		type: MessageType.Response,
		// 		functionType: FunctionType.SendData,
		// 	});
		// 	expect(msg.testResponse(unexpected1)).toBe("unexpected");

		// 	// not a response
		// 	const unexpected2 = new Message(fakeDriver, {
		// 		type: MessageType.Request,
		// 		functionType: 0xff,
		// 	});
		// 	expect(msg.testResponse(unexpected2)).toBe("unexpected");
		// });

		// it(`when the message has a callbackId, testResponse() should return "unexpected" for requests that don't match it`, () => {
		// 	const msg = new Message(fakeDriver, {
		// 		type: MessageType.Request,
		// 		functionType: 0xff,
		// 		expectedCallback: FunctionType.GetSUCNodeId,
		// 		callbackId: 5,
		// 	});
		// 	const final = new Message(fakeDriver, {
		// 		type: MessageType.Request,
		// 		functionType: FunctionType.GetSUCNodeId,
		// 		callbackId: 5,
		// 	});
		// 	expect(msg.testResponse(final)).toBe("final");

		// 	// wrong callback id
		// 	const unexpected1 = new Message(fakeDriver, {
		// 		type: MessageType.Request,
		// 		functionType: FunctionType.GetSUCNodeId,
		// 		callbackId: 4,
		// 	});
		// 	expect(msg.testResponse(unexpected1)).toBe("unexpected");

		// 	// missing callback id
		// 	const unexpected2 = new Message(fakeDriver, {
		// 		type: MessageType.Request,
		// 		functionType: FunctionType.GetSUCNodeId,
		// 	});
		// 	expect(msg.testResponse(unexpected2)).toBe("unexpected");

		// 	// sanity check: the function type should still be checked
		// 	const unexpected3 = new Message(fakeDriver, {
		// 		type: MessageType.Request,
		// 		functionType: FunctionType.RequestNodeInfo, // does not match
		// 		callbackId: 5, // matches
		// 	});
		// 	expect(msg.testResponse(unexpected3)).toBe("unexpected");
		// });

		it(`the constructor should throw when no message type is specified`, () => {
			assertZWaveError(() => new Message(host, { functionType: 0xff }), {
				errorCode: ZWaveErrorCodes.Argument_Invalid,
				messageMatches: /message type/i,
			});

			@messageTypes(undefined as any, 0xff)
			class FakeMessageWithoutMessageType extends Message {}

			assertZWaveError(() => new FakeMessageWithoutMessageType(host), {
				errorCode: ZWaveErrorCodes.Argument_Invalid,
				messageMatches: /message type/i,
			});
		});

		it(`the constructor should throw when no function type is specified`, () => {
			assertZWaveError(
				() => new Message(host, { type: MessageType.Request }),
				{
					errorCode: ZWaveErrorCodes.Argument_Invalid,
					messageMatches: /function type/i,
				},
			);

			@messageTypes(MessageType.Request, undefined as any)
			class FakeMessageWithoutFunctionType extends Message {}

			assertZWaveError(() => new FakeMessageWithoutFunctionType(host), {
				errorCode: ZWaveErrorCodes.Argument_Invalid,
				messageMatches: /function type/i,
			});
		});

		describe("getNodeUnsafe()", () => {
			it("returns undefined when the controller is not initialized yet", () => {
				const msg = new Message(host, {
					type: MessageType.Request,
					functionType: 0xff,
				});
				expect(msg.getNodeUnsafe()).toBeUndefined();
			});

			it("returns undefined when the message is no node query", () => {
				const msg = new Message(host, {
					type: MessageType.Request,
					functionType: 0xff,
				});
				expect(msg.getNodeUnsafe()).toBeUndefined();
			});

			it("returns the associated node otherwise", () => {
				host.nodes.set(1, {} as any);

				const msg = new Message(host, {
					type: MessageType.Request,
					functionType: 0xff,
				});

				// This node exists
				(msg as any as INodeQuery).nodeId = 1;
				expect(msg.getNodeUnsafe()).toBe(host.nodes.get(1));

				// This one does
				(msg as any as INodeQuery).nodeId = 2;
				expect(msg.getNodeUnsafe()).toBeUndefined();
			});
		});
	});
});
