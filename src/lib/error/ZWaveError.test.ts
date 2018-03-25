import { assert, expect } from "chai";
import { ZWaveError, ZWaveErrorCodes } from "./ZWaveError";
// tslint:disable:no-unused-expression

describe("lib/ZWaveError => ", () => {

	const err = new ZWaveError("Test message", ZWaveErrorCodes.PacketFormat_Invalid);
	function thisThrows() {
		throw new ZWaveError("Test message", ZWaveErrorCodes.PacketFormat_Invalid);
	}
	it("should be of type Error", () => {
		assert(err instanceof Error);
	});

	it("should contain an error code", () => {
		expect(thisThrows).to.throw(ZWaveError);
		try {
			thisThrows();
		} catch (e) {
			expect(e.code).to.equal(ZWaveErrorCodes.PacketFormat_Invalid);
		}
	});

});
