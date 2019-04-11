import { assertZWaveError } from "../../../test/util";
import { ZWaveErrorCodes } from "../error/ZWaveError";
import { FunctionType, MessageType } from "./Constants";
import { Message, ResponseRole } from "./Message";

describe("lib/message", () => {
	describe("Message", () => {
		it("should deserialize and serialize correctly", () => {
			// actual messages from OZW
			const okayMessages = [
				Buffer.from([
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
				Buffer.from([0x01, 0x05, 0x00, 0x47, 0x04, 0x20, 0x99]),
				Buffer.from([0x01, 0x06, 0x00, 0x46, 0x0c, 0x0d, 0x32, 0x8c]),
				Buffer.from([
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
				const parsed = new Message(undefined);
				parsed.deserialize(original);
				expect(parsed.serialize()).toEqual(original);
			}
		});

		it("should serialize correctly when the payload is null", () => {
			// synthetic message
			const expected = Buffer.from([0x01, 0x03, 0x00, 0xff, 0x03]);
			const message = new Message(undefined);
			message.type = MessageType.Request;
			message.functionType = 0xff;
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
				const parsed = new Message(undefined);
				assertZWaveError(() => parsed.deserialize(message), {
					messageMatches: msg,
					errorCode: code,
				});
			}
		});

		it("isComplete() should work correctly", () => {
			// actual messages from OZW
			const okayMessages = [
				Buffer.from([
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
				Buffer.from([0x01, 0x05, 0x00, 0x47, 0x04, 0x20, 0x99]),
				Buffer.from([0x01, 0x06, 0x00, 0x46, 0x0c, 0x0d, 0x32, 0x8c]),
				Buffer.from([
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
			for (const msg of okayMessages) {
				expect(Message.isComplete(msg)).toBe(true); // `${msg.toString("hex")} should be detected as complete`
			}

			// truncated messages
			const truncatedMessages = [
				null,
				Buffer.from([]),
				Buffer.from([0x01]),
				Buffer.from([0x01, 0x09]),
				Buffer.from([0x01, 0x09, 0x00]),
				Buffer.from([
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
				]),
			];
			for (const msg of truncatedMessages) {
				expect(Message.isComplete(msg)).toBe(false); // `${msg ? msg.toString("hex") : "null"} should be detected as incomplete`
			}

			// faulty but non-truncated messages should be detected as complete
			const faultyMessages = [
				Buffer.from([
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
				Buffer.from([0x01, 0x05, 0x00, 0x47, 0x04, 0x20, 0x99]),
				Buffer.from([0x01, 0x06, 0x00, 0x46, 0x0c, 0x0d, 0x32, 0x8c]),
				Buffer.from([
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
			for (const msg of faultyMessages) {
				expect(Message.isComplete(msg)).toBe(true); // `${msg.toString("hex")} should be detected as complete`
			}

			// actual messages from OZW, appended with some random data
			const tooLongMessages = [
				Buffer.from([
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
					0x00,
				]),
				Buffer.from([
					0x01,
					0x05,
					0x00,
					0x47,
					0x04,
					0x20,
					0x99,
					0x01,
					0x02,
				]),
				Buffer.from([
					0x01,
					0x06,
					0x00,
					0x46,
					0x0c,
					0x0d,
					0x32,
					0x8c,
					0xab,
					0xcd,
					0xef,
				]),
				Buffer.from([
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
					0x12,
				]),
			];
			for (const msg of tooLongMessages) {
				expect(Message.isComplete(msg)).toBe(true); // `${msg.toString("hex")} should be detected as complete`
			}
		});

		it("toJSON() should return a semi-readable JSON representation", () => {
			const msg1 = new Message(
				undefined,
				MessageType.Request,
				FunctionType.GetControllerVersion,
				null,
			);
			const json1 = {
				name: msg1.constructor.name,
				type: "Request",
				functionType: "GetControllerVersion",
			};
			const msg2 = new Message(
				undefined,
				MessageType.Request,
				FunctionType.GetControllerVersion,
				null,
				Buffer.from("aabbcc", "hex"),
			);
			const json2 = {
				name: msg2.constructor.name,
				type: "Request",
				functionType: "GetControllerVersion",
				payload: "aabbcc",
			};
			const msg3 = new Message(
				undefined,
				MessageType.Response,
				FunctionType.GetControllerVersion,
				FunctionType.GetControllerVersion,
			);
			const json3 = {
				name: msg3.constructor.name,
				type: "Response",
				functionType: "GetControllerVersion",
				expectedResponse: "GetControllerVersion",
			};
			const msg4 = new Message(
				undefined,
				MessageType.Request,
				FunctionType.GetControllerVersion,
				FunctionType.GetControllerVersion,
				Buffer.from("aabbcc", "hex"),
			);
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

		it("new Message(Buffer) should interpret the buffer as the payload", () => {
			const buf = Buffer.from([1, 2, 3]);
			const msg = new Message(undefined, buf);
			expect(msg.payload).toEqual(buf);
		});

		it("getConstructor() should return `Message` for an unknown packet type", () => {
			const unknown = Buffer.from([0x01, 0x03, 0x00, 0x00, 0xfc]);
			expect(Message.getConstructor(unknown)).toBe(Message);
		});

		it(`when expectedResponse is a FunctionType, testResponse() should return "final" or "unexpected"`, () => {
			const msg = new Message(
				undefined,
				MessageType.Request,
				undefined,
				FunctionType.ApplicationCommand,
			);
			const final = new Message(
				undefined,
				MessageType.Response,
				FunctionType.ApplicationCommand,
				undefined,
			);
			expect(msg.testResponse(final)).toBe("final");

			// wrong function type
			const unexpected1 = new Message(
				undefined,
				MessageType.Response,
				FunctionType.SendData,
				undefined,
			);
			expect(msg.testResponse(unexpected1)).toBe("unexpected");

			// not a response
			const unexpected2 = new Message(
				undefined,
				MessageType.Request,
				undefined,
				undefined,
			);
			expect(msg.testResponse(unexpected2)).toBe("unexpected");
		});

		it(`when expectedResponse is a predicate, testResponse() should pass its return value through`, () => {
			const predicate = jest.fn();
			const msg = new Message(
				undefined,
				MessageType.Request,
				undefined,
				predicate,
			);
			const test = new Message(undefined);

			const results: ResponseRole[] = [
				"fatal_controller",
				"fatal_node",
				"final",
				"confirmation",
				"unexpected",
			];
			for (const result of results) {
				predicate.mockReset();
				predicate.mockReturnValue(result);

				expect(msg.testResponse(test)).toBe(result);
				expect(predicate).toHaveBeenCalledWith(msg, test);
			}
		});
	});
});
