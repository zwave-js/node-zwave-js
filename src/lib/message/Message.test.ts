// tslint:disable:no-unused-expression

import { expect, should } from "chai";
should();

import { ZWaveError, ZWaveErrorCodes } from "../error/ZWaveError";
import { Message, MessageType } from "./Message";

describe.only("lib/message/Message => ", () => {
	it("should deserialize and serialize correctly", () => {

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
});
