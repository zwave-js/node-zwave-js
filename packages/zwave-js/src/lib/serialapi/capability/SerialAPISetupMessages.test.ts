import { createTestingHost } from "@zwave-js/host";
import { Message } from "@zwave-js/serial";
import { SerialAPISetup_GetSupportedCommandsResponse } from "./SerialAPISetupMessages";

const host = createTestingHost();

describe("SerialAPISetupMessages", () => {
	it("GetSupportedCommandsResponse with extended bitmask parses correctly", () => {
		const data = Buffer.from(
			"0116010b01fe160103000100000001000000000000000109",
			"hex",
		);

		const msg = Message.from(host, data);
		expect(msg).toBeInstanceOf(SerialAPISetup_GetSupportedCommandsResponse);
		const supported = (msg as SerialAPISetup_GetSupportedCommandsResponse)
			.supportedCommands;

		expect(supported).toEqual([
			0x01, 0x02, 0x04, 0x08, 0x10, 0x11, 0x20, 0x40, 0x80,
		]);
	});
});
