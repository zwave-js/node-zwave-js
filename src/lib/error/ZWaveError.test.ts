import { assertZWaveError } from "../../../test/util";
import { ZWaveError, ZWaveErrorCodes } from "./ZWaveError";

describe("lib/ZWaveError => ", () => {
	const err = new ZWaveError(
		"Test message",
		ZWaveErrorCodes.PacketFormat_Invalid,
	);
	function thisThrows() {
		throw new ZWaveError(
			"Test message",
			ZWaveErrorCodes.PacketFormat_Invalid,
		);
	}
	it("should be of type Error", () => {
		expect(err).toBeInstanceOf(Error);
	});

	it("should contain an error code", () => {
		assertZWaveError(thisThrows, {
			messageMatches: "Test message",
			errorCode: ZWaveErrorCodes.PacketFormat_Invalid,
		});
	});
});
