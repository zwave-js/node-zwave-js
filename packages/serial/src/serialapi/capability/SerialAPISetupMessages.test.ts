import { Message } from "@zwave-js/serial";
import { Bytes } from "@zwave-js/shared/safe";
import { test } from "vitest";
import { SerialAPISetup_GetSupportedCommandsResponse } from "./SerialAPISetupMessages.js";

test("GetSupportedCommandsResponse with extended bitmask parses correctly (pre-7.19.1 encoding)", async (t) => {
	const data = Bytes.from(
		"0116010b01fe160103000100000001000000000000000109",
		"hex",
	);

	const msg = Message.parse(
		data,
		{ sdkVersion: "7.19.0" } as any,
	);
	t.expect(msg instanceof SerialAPISetup_GetSupportedCommandsResponse).toBe(
		true,
	);
	const supported = (msg as SerialAPISetup_GetSupportedCommandsResponse)
		.supportedCommands;

	t.expect(
		supported,
	).toStrictEqual([0x01, 0x02, 0x04, 0x08, 0x10, 0x11, 0x20, 0x40, 0x80]);
});

test("GetSupportedCommandsResponse with extended bitmask parses correctly (post-7.19.1 encoding)", async (t) => {
	const data = Bytes.from(
		"0116010b01ff8b8001800000008000000000000000800097",
		"hex",
	);

	const msg = Message.parse(
		data,
		{ sdkVersion: "7.19.1" } as any,
	);
	t.expect(msg instanceof SerialAPISetup_GetSupportedCommandsResponse).toBe(
		true,
	);
	const supported = (msg as SerialAPISetup_GetSupportedCommandsResponse)
		.supportedCommands;

	t.expect(
		supported,
	).toStrictEqual([0x01, 0x02, 0x04, 0x08, 0x10, 0x11, 0x20, 0x40, 0x80]);
});
