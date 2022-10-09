import test from "ava";
import { assertZWaveErrorAva } from "../test/assertZWaveError";
import { ZWaveError, ZWaveErrorCodes } from "./ZWaveError";

const err = new ZWaveError(
	"Test message",
	ZWaveErrorCodes.PacketFormat_Invalid,
);

function thisThrows() {
	throw new ZWaveError("Test message", ZWaveErrorCodes.PacketFormat_Invalid);
}

test("ZWaveError should be of type Error", (t) => {
	t.true(err instanceof Error);
});

test("ZWaveError should contain an error code", (t) => {
	assertZWaveErrorAva(t, thisThrows, {
		messageMatches: "Test message",
		errorCode: ZWaveErrorCodes.PacketFormat_Invalid,
	});
	t.pass();
});
