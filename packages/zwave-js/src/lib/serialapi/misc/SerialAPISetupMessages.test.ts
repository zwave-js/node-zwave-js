import type { Driver } from "../../driver/Driver";
import { Message } from "../../message/Message";
import { createEmptyMockDriver } from "../../test/mocks";
import { SerialAPISetup_GetSupportedCommandsResponse } from "./SerialAPISetupMessages";

const fakeDriver = createEmptyMockDriver() as unknown as Driver;

describe("SerialAPISetupMessages", () => {
	it("GetSupportedCommandsResponse with extended bitmask parses correctly", () => {
		const data = Buffer.from(
			"0116010b01fe160103000100000001000000000000000109",
			"hex",
		);

		const msg = Message.from(fakeDriver, data);
		expect(msg).toBeInstanceOf(SerialAPISetup_GetSupportedCommandsResponse);
		const supported = (msg as SerialAPISetup_GetSupportedCommandsResponse)
			.supportedCommands;

		expect(supported).toEqual([
			0x01, 0x02, 0x04, 0x08, 0x10, 0x11, 0x20, 0x40, 0x80,
		]);
	});
});
