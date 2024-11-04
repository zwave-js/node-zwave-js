import { test } from "vitest";
import { assertZWaveError } from "../test/assertZWaveError.js";
import { ZWaveError, ZWaveErrorCodes } from "./ZWaveError.js";

const err = new ZWaveError(
	"Test message",
	ZWaveErrorCodes.PacketFormat_Invalid,
);

function thisThrows() {
	throw new ZWaveError("Test message", ZWaveErrorCodes.PacketFormat_Invalid);
}

test("ZWaveError should be of type Error", (t) => {
	t.expect(err instanceof Error).toBe(true);
});

test("ZWaveError should contain an error code", (t) => {
	assertZWaveError(t.expect, thisThrows, {
		messageMatches: "Test message",
		errorCode: ZWaveErrorCodes.PacketFormat_Invalid,
	});
});
