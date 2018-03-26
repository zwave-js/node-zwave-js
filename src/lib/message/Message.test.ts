// tslint:disable:no-unused-expression

import { expect, should } from "chai";
should();

import { ZWaveError, ZWaveErrorCodes } from "../error/ZWaveError";
import { FunctionType, Message, MessageType } from "./Message";

describe("lib/message/Message => ", () => {
	it("should deserialize and serialize correctly", () => {

		// actual messages from OZW
		const okayMessages = [
			Buffer.from([0x01, 0x09, 0x00, 0x13, 0x03, 0x02, 0x00, 0x00, 0x25, 0x0b, 0xca]),
			Buffer.from([0x01, 0x05, 0x00, 0x47, 0x04, 0x20, 0x99]),
			Buffer.from([0x01, 0x06, 0x00, 0x46, 0x0c, 0x0d, 0x32, 0x8c]),
			Buffer.from([0x01, 0x0a, 0x00, 0x13, 0x03, 0x03, 0x8e, 0x02, 0x04, 0x25, 0x40, 0x0b]),
		];
		for (const original of okayMessages) {
			const parsed = new Message();
			parsed.deserialize(original);
			expect(parsed.serialize()).to.deep.equal(original);
		}
	});

	it("should serialize correctly when the payload is null", () => {
		// synthetic message
		const expected = Buffer.from([0x01, 0x03, 0x00, 0xff, 0x03]);
		const message = new Message();
		message.type = MessageType.Request;
		message.functionType = 0xff;
		expect(message.serialize()).to.deep.equal(expected);
	});

	it("should throw the correct error when parsing a faulty message", () => {
		// fake messages to produce certain errors
		const brokenMessages: [Buffer, string, ZWaveErrorCodes][] = [
			// too short (<5 bytes)
			[Buffer.from([0x01, 0x02, 0x00, 0x00]), "truncated", ZWaveErrorCodes.PacketFormat_Truncated],
			// no SOF
			[Buffer.from([0x00, 0x03, 0x00, 0x00, 0x00]), "start with SOF", ZWaveErrorCodes.PacketFormat_Invalid],
			// too short for the provided data length
			[Buffer.from([0x01, 0x04, 0x00, 0x00, 0x00]), "truncated", ZWaveErrorCodes.PacketFormat_Truncated],
			// invalid checksum
			[Buffer.from([0x01, 0x03, 0x00, 0x00, 0x00]), "checksum", ZWaveErrorCodes.PacketFormat_Checksum],
			// invalid checksum (once more with a real packet)
			[Buffer.from([0x01, 0x05, 0x00, 0x47, 0x04, 0x20, 0x98]), "checksum", ZWaveErrorCodes.PacketFormat_Checksum],
		];
		for (const [message, msg, code] of brokenMessages) {
			const parsed = new Message();
			expect(() => parsed.deserialize(message))
				.to.throw(msg)
				.and.be.an.instanceof(ZWaveError)
				.and.satisfy((err: ZWaveError) => err.code === code)
				;
		}
	});

	it("isComplete() should work correctly", () => {
		// actual messages from OZW
		const okayMessages = [
			Buffer.from([0x01, 0x09, 0x00, 0x13, 0x03, 0x02, 0x00, 0x00, 0x25, 0x0b, 0xca]),
			Buffer.from([0x01, 0x05, 0x00, 0x47, 0x04, 0x20, 0x99]),
			Buffer.from([0x01, 0x06, 0x00, 0x46, 0x0c, 0x0d, 0x32, 0x8c]),
			Buffer.from([0x01, 0x0a, 0x00, 0x13, 0x03, 0x03, 0x8e, 0x02, 0x04, 0x25, 0x40, 0x0b]),
		];
		for (const msg of okayMessages) {
			expect(Message.isComplete(msg)).to.equal(true, `${msg.toString("hex")} should be detected as complete`);
		}

		// truncated messages
		const truncatedMessages = [
			null,
			Buffer.from([]),
			Buffer.from([0x01]),
			Buffer.from([0x01, 0x09]),
			Buffer.from([0x01, 0x09, 0x00]),
			Buffer.from([0x01, 0x09, 0x00, 0x13, 0x03, 0x02, 0x00, 0x00, 0x25, 0x0b]),
		];
		for (const msg of truncatedMessages) {
			expect(Message.isComplete(msg)).to.equal(false, `${msg ? msg.toString("hex") : "null"} should be detected as incomplete`);
		}

		// faulty but non-truncated messages should be detected as complete
		const faultyMessages = [
			Buffer.from([0x01, 0x09, 0x00, 0x13, 0x03, 0x02, 0x00, 0x00, 0x25, 0x0b, 0xca]),
			Buffer.from([0x01, 0x05, 0x00, 0x47, 0x04, 0x20, 0x99]),
			Buffer.from([0x01, 0x06, 0x00, 0x46, 0x0c, 0x0d, 0x32, 0x8c]),
			Buffer.from([0x01, 0x0a, 0x00, 0x13, 0x03, 0x03, 0x8e, 0x02, 0x04, 0x25, 0x40, 0x0b]),
		];
		for (const msg of faultyMessages) {
			expect(Message.isComplete(msg)).to.equal(true, `${msg.toString("hex")} should be detected as complete`);
		}

		// actual messages from OZW, appended with some random data
		const tooLongMessages = [
			Buffer.from([0x01, 0x09, 0x00, 0x13, 0x03, 0x02, 0x00, 0x00, 0x25, 0x0b, 0xca, 0x00]),
			Buffer.from([0x01, 0x05, 0x00, 0x47, 0x04, 0x20, 0x99, 0x01, 0x02]),
			Buffer.from([0x01, 0x06, 0x00, 0x46, 0x0c, 0x0d, 0x32, 0x8c, 0xab, 0xcd, 0xef]),
			Buffer.from([0x01, 0x0a, 0x00, 0x13, 0x03, 0x03, 0x8e, 0x02, 0x04, 0x25, 0x40, 0x0b, 0x12]),
		];
		for (const msg of tooLongMessages) {
			expect(Message.isComplete(msg)).to.equal(true, `${msg.toString("hex")} should be detected as complete`);
		}

	});

	it("toJSON() should return a semi-readable JSON representation", () => {
		const msg1 = new Message(MessageType.Request, FunctionType.GetControllerVersion, null);
		const json1 = {
			type: "Request",
			functionType: "GetControllerVersion",
		};
		const msg2 = new Message(MessageType.Request, FunctionType.GetControllerVersion, null, Buffer.from("aabbcc", "hex"));
		const json2 = {
			type: "Request",
			functionType: "GetControllerVersion",
			payload: "aabbcc",
		};
		const msg3 = new Message(MessageType.Response, FunctionType.GetControllerVersion, FunctionType.GetControllerVersion);
		const json3 = {
			type: "Response",
			functionType: "GetControllerVersion",
			expectedResponse: "GetControllerVersion",
		};
		const msg4 = new Message(MessageType.Request, FunctionType.GetControllerVersion, FunctionType.GetControllerVersion, Buffer.from("aabbcc", "hex"));
		const json4 = {
			type: "Request",
			functionType: "GetControllerVersion",
			expectedResponse: "GetControllerVersion",
			payload: "aabbcc",
		};

		msg1.toJSON().should.deep.equal(json1);
		msg2.toJSON().should.deep.equal(json2);
		msg3.toJSON().should.deep.equal(json3);
		msg4.toJSON().should.deep.equal(json4);
	});

	it("new Message(Buffer) should interpret the buffer as the payload", () => {
		const buf = Buffer.from([1, 2, 3]);
		const msg = new Message(buf);
		expect(msg.payload).to.deep.equal(buf);
	});

});
