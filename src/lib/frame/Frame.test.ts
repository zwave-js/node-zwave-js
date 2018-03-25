// tslint:disable:no-unused-expression

import { expect, should } from "chai";
should();

import { ZWaveError, ZWaveErrorCodes } from "../error/ZWaveError";
import { Frame, FrameType } from "./Frame";

describe.only("lib/frame/Frame => ", () => {
	it("should deserialize and serialize correctly", () => {

		const okayFrames = [
			Buffer.from([0x01, 0x09, 0x00, 0x13, 0x03, 0x02, 0x00, 0x00, 0x25, 0x0b, 0xca]),
			Buffer.from([0x01, 0x05, 0x00, 0x47, 0x04, 0x20, 0x99]),
			Buffer.from([0x01, 0x06, 0x00, 0x46, 0x0c, 0x0d, 0x32, 0x8c]),
			Buffer.from([0x01, 0x0a, 0x00, 0x13, 0x03, 0x03, 0x8e, 0x02, 0x04, 0x25, 0x40, 0x0b]),
		];
		for (const original of okayFrames) {
			const parsed = new Frame();
			parsed.deserialize(original);
			expect(parsed.serialize()).to.deep.equal(original);
		}
	});

	it("should serialize correctly when the payload is null", () => {
		// synthetic frame
		const expected = Buffer.from([0x01, 0x03, 0x00, 0xff, 0x03]);
		const frame = new Frame();
		frame.type = FrameType.Request;
		frame.functionType = 0xff;
		expect(frame.serialize()).to.deep.equal(expected);
	});

	it("should throw the correct error when parsing a faulty frame", () => {
		// fake frames to produce certain errors
		const brokenFrames: [Buffer, string, ZWaveErrorCodes][] = [
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
		for (const [frame, msg, code] of brokenFrames) {
			const parsed = new Frame();
			expect(() => parsed.deserialize(frame))
				.to.throw(msg)
				.and.be.an.instanceof(ZWaveError)
				.and.satisfy((err: ZWaveError) => err.code === code)
			;
		}
	});
});
