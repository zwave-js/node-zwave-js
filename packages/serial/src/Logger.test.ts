import {
	createDefaultTransportFormat,
	ZWaveLogContainer,
} from "@zwave-js/core";
import { assertMessage, SpyTransport } from "@zwave-js/testing";
import colors from "ansi-colors";
import { pseudoRandomBytes } from "crypto";
import { SerialLogger } from "./Logger";

describe("lib/log/Serial =>", () => {
	let serialLogger: SerialLogger;
	let spyTransport: SpyTransport;

	// Replace all defined transports with a spy transport
	beforeAll(() => {
		spyTransport = new SpyTransport();
		spyTransport.format = createDefaultTransportFormat(true, true);
		serialLogger = new SerialLogger(
			new ZWaveLogContainer({
				transports: [spyTransport],
			}),
		);
		// Uncomment this to debug the log outputs manually
		// wasSilenced = unsilence(serialLogger);
	});

	// Don't spam the console when performing the other tests not related to logging
	afterAll(() => {
		serialLogger.container.updateConfiguration({ enabled: false });
	});

	beforeEach(() => {
		spyTransport.spy.mockClear();
	});

	describe("logs single-byte messages correctly", () => {
		it("inbound ACK", () => {
			serialLogger.ACK("inbound");
			const alignRight = " ".repeat(80 - 14);
			assertMessage(spyTransport, {
				message: `« [ACK] ${alignRight}(0x06)`,
			});
		});

		it("outbound ACK", () => {
			serialLogger.ACK("outbound");
			const alignRight = " ".repeat(80 - 14);
			assertMessage(spyTransport, {
				message: `» [ACK] ${alignRight}(0x06)`,
			});
		});

		it("inbound NAK", () => {
			serialLogger.NAK("inbound");
			const alignRight = " ".repeat(80 - 14);
			assertMessage(spyTransport, {
				message: `« [NAK] ${alignRight}(0x15)`,
			});
		});

		it("outbound NAK", () => {
			serialLogger.NAK("outbound");
			const alignRight = " ".repeat(80 - 14);
			assertMessage(spyTransport, {
				message: `» [NAK] ${alignRight}(0x15)`,
			});
		});

		it("inbound CAN", () => {
			serialLogger.CAN("inbound");
			const alignRight = " ".repeat(80 - 14);
			assertMessage(spyTransport, {
				message: `« [CAN] ${alignRight}(0x18)`,
			});
		});

		it("outbound CAN", () => {
			serialLogger.CAN("outbound");
			const alignRight = " ".repeat(80 - 14);
			assertMessage(spyTransport, {
				message: `» [CAN] ${alignRight}(0x18)`,
			});
		});
	});

	describe("colors single-byte messages like tags", () => {
		for (const msg of ["ACK", "NAK", "CAN"] as const) {
			it(msg, () => {
				serialLogger[msg]("inbound");

				const expected1 = colors.blue(
					colors.bgBlue("[") +
						colors.inverse(msg) +
						colors.bgBlue("]"),
				);
				assertMessage(spyTransport, {
					predicate: (msg) => msg.includes(expected1),
					ignoreColor: false,
				});
			});
		}
	});

	describe("logs raw data correctly", () => {
		it("short buffer, inbound", () => {
			serialLogger.data("inbound", Buffer.from([1, 2, 3, 4, 5, 6, 7, 8]));
			const alignRight = " ".repeat(80 - 30);
			assertMessage(spyTransport, {
				message: `« 0x0102030405060708 ${alignRight}(8 bytes)`,
			});
		});

		it("short buffer, outbound", () => {
			serialLogger.data("outbound", Buffer.from([0x55, 4, 3, 2, 1]));
			const alignRight = " ".repeat(80 - 24);
			assertMessage(spyTransport, {
				message: `» 0x5504030201 ${alignRight}(5 bytes)`,
			});
		});

		it("wraps longer buffers into multiple lines", () => {
			// We have room for 67 chars in the first line
			const expected = pseudoRandomBytes(39);
			const hexBuffer = `0x${expected.toString("hex")}`;
			const expectedLine1 = hexBuffer.slice(0, 67);
			const expectedLine2 = hexBuffer.slice(67);
			serialLogger.data("inbound", expected);
			assertMessage(spyTransport, {
				message: `« ${expectedLine1} (39 bytes)
  ${expectedLine2}`,
			});
		});

		it("correctly groups very long lines", () => {
			// We have room for 67 chars in the first line, that is 32.5 bytes
			// and 78 chars (39 bytes) in each following line
			const expected = pseudoRandomBytes(72);
			const hexBuffer = `0x${expected.toString("hex")}`;
			const expectedLine1 = hexBuffer.slice(0, 67);
			const expectedLine2 = hexBuffer.slice(67, 67 + 78);
			const expectedLine3 = hexBuffer.slice(67 + 78);
			serialLogger.data("inbound", expected);
			assertMessage(spyTransport, {
				message: `« ${expectedLine1} (72 bytes)
  ${expectedLine2}
  ${expectedLine3}`,
			});
		});
	});

	// 	describe("logs the receive buffer correctly", () => {
	// 		it("for short buffers", () => {
	// 			serialLogger.receiveBuffer(Buffer.from([0, 8, 0x15]), true);
	// 			const alignRight = " ".repeat(80 - 30);
	// 			assertMessage(spyTransport, {
	// 				message: `  Buffer := 0x000815 ${alignRight}(3 bytes)`,
	// 			});
	// 		});

	// 		it("for longer buffers", () => {
	// 			// max length without line breaks is 80, excluding prefixes and postfixes
	// 			// this means we have 27 bytes to display (0x plus 2*27 chars)
	// 			const expected = pseudoRandomBytes(27);
	// 			serialLogger.receiveBuffer(expected, true);
	// 			assertMessage(spyTransport, {
	// 				message: `  Buffer := 0x${expected.toString(
	// 					"hex",
	// 				)}  (27 bytes)`,
	// 			});
	// 		});

	// 		it("tags incomplete buffers", () => {
	// 			serialLogger.receiveBuffer(Buffer.from([0, 8, 0x15]), false);
	// 			const alignRight = " ".repeat(80 - 43);
	// 			assertMessage(spyTransport, {
	// 				message: `  [incomplete] Buffer := 0x000815 ${alignRight}(3 bytes)`,
	// 			});
	// 		});

	// 		it("wraps longer buffers into multiple lines", () => {
	// 			let expected = pseudoRandomBytes(28);
	// 			let hexBuffer = `0x${expected.toString("hex")}`;
	// 			let expectedLine1 = hexBuffer.slice(0, 57);
	// 			let expectedLine2 = hexBuffer.slice(57);

	// 			serialLogger.receiveBuffer(expected, true);
	// 			assertMessage(spyTransport, {
	// 				message: `  Buffer := ${expectedLine1} (28 bytes)
	//   ${expectedLine2}`,
	// 			});

	// 			expected = pseudoRandomBytes(38);
	// 			hexBuffer = `0x${expected.toString("hex")}`;
	// 			expectedLine1 = hexBuffer.slice(0, 57);
	// 			expectedLine2 = hexBuffer.slice(57);
	// 			serialLogger.receiveBuffer(expected, true);
	// 			assertMessage(spyTransport, {
	// 				message: `  Buffer := ${expectedLine1} (38 bytes)
	//   ${expectedLine2}`,
	// 				callNumber: 1,
	// 			});
	// 		});
	// 	});

	describe("logs simple messages correctly", () => {
		it("short ones", () => {
			serialLogger.message("Test");
			assertMessage(spyTransport, {
				message: `  Test`,
			});
		});

		it("long ones", () => {
			serialLogger.message(
				"This is a very long message that should be broken into multiple lines maybe sometimes...",
			);
			assertMessage(spyTransport, {
				message: `  This is a very long message that should be broken into multiple lines maybe so
  metimes...`,
			});
		});
	});
});
