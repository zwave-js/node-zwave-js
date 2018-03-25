import { assert, expect } from "chai";
import { ZWaveError, ZWaveErrorCodes } from "./zwave-error";
// tslint:disable:no-unused-expression

describe("lib/ZWave-error => ", () => {

	const err = new ZWaveError("Test message", ZWaveErrorCodes.ConnectionFailed);
	function thisThrows() {
		throw new ZWaveError("Test message", ZWaveErrorCodes.ConnectionFailed);
	}
	it("should be of type Error", () => {
		assert(err instanceof Error);
	});

	it("should contain an error code", () => {
		expect(thisThrows).to.throw(ZWaveError);
		try {
			thisThrows();
		} catch (e) {
			expect(e.code).to.equal(ZWaveErrorCodes.ConnectionFailed);
		}
	});

});
