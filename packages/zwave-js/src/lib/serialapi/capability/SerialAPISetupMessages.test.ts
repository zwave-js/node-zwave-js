import { Message } from "@zwave-js/serial";
import test from "ava";
import { SerialAPISetup_GetSupportedCommandsResponse } from "./SerialAPISetupMessages";

test("GetSupportedCommandsResponse with extended bitmask parses correctly (pre-7.19.1 encoding)", (t) => {
	const data = Buffer.from(
		"0116010b01fe160103000100000001000000000000000109",
		"hex",
	);

	const msg = Message.from({
		data,
		sdkVersion: "7.19.0",
		ctx: {} as any,
	});
	t.true(msg instanceof SerialAPISetup_GetSupportedCommandsResponse);
	const supported = (msg as SerialAPISetup_GetSupportedCommandsResponse)
		.supportedCommands;

	t.deepEqual(
		supported,
		[0x01, 0x02, 0x04, 0x08, 0x10, 0x11, 0x20, 0x40, 0x80],
	);
});

test("GetSupportedCommandsResponse with extended bitmask parses correctly (post-7.19.1 encoding)", (t) => {
	const data = Buffer.from(
		"0116010b01ff8b8001800000008000000000000000800097",
		"hex",
	);

	const msg = Message.from({
		data,
		sdkVersion: "7.19.1",
		ctx: {} as any,
	});
	t.true(msg instanceof SerialAPISetup_GetSupportedCommandsResponse);
	const supported = (msg as SerialAPISetup_GetSupportedCommandsResponse)
		.supportedCommands;

	t.deepEqual(
		supported,
		[0x01, 0x02, 0x04, 0x08, 0x10, 0x11, 0x20, 0x40, 0x80],
	);
});
