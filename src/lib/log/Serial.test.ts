import { pseudoRandomBytes } from "crypto";
import * as winston from "winston";
import { assertMessage, SpyTransport } from "../../../test/SpyTransport";
import log from "./index";
import { BOX_CHARS, restoreSilence } from "./shared";

describe("lib/log/Serial =>", () => {
	let serialLogger: winston.Logger;
	let spyTransport: SpyTransport;
	let wasSilenced = true;

	// Replace all defined transports with a spy transport
	beforeAll(() => {
		// the loggers are lazy-loaded, so force loading
		void log.serial;
		serialLogger = winston.loggers.get("serial");
		spyTransport = new SpyTransport();
		// Uncomment this to debug the log outputs manually
		// wasSilenced = unsilence(controllerLogger);
		serialLogger.add(spyTransport);
	});

	// Don't spam the console when performing the other tests not related to logging
	afterAll(() => {
		serialLogger.remove(spyTransport);
		restoreSilence(serialLogger, wasSilenced);
	});

	beforeEach(() => {
		spyTransport.spy.mockClear();
	});

	describe("logs single-byte messages correctly", () => {
		it("inbound ACK", () => {
			log.serial.ACK("inbound");
			const alignRight = " ".repeat(80 - 16);
			assertMessage(spyTransport, {
				message: `«   [ACK] ${alignRight}(0x06)`,
			});
		});

		it("outbound ACK", () => {
			log.serial.ACK("outbound");
			const alignRight = " ".repeat(80 - 16);
			assertMessage(spyTransport, {
				message: ` »  [ACK] ${alignRight}(0x06)`,
			});
		});

		it("inbound NAK", () => {
			log.serial.NAK("inbound");
			const alignRight = " ".repeat(80 - 16);
			assertMessage(spyTransport, {
				message: `«   [NAK] ${alignRight}(0x15)`,
			});
		});

		it("outbound NAK", () => {
			log.serial.NAK("outbound");
			const alignRight = " ".repeat(80 - 16);
			assertMessage(spyTransport, {
				message: ` »  [NAK] ${alignRight}(0x15)`,
			});
		});

		it("inbound CAN", () => {
			log.serial.CAN("inbound");
			const alignRight = " ".repeat(80 - 16);
			assertMessage(spyTransport, {
				message: `«   [CAN] ${alignRight}(0x18)`,
			});
		});

		it("outbound CAN", () => {
			log.serial.CAN("outbound");
			const alignRight = " ".repeat(80 - 16);
			assertMessage(spyTransport, {
				message: ` »  [CAN] ${alignRight}(0x18)`,
			});
		});
	});

	describe("logs raw data correctly", () => {
		it("short buffer, inbound", () => {
			log.serial.data("inbound", Buffer.from([1, 2, 3, 4, 5, 6, 7, 8]));
			const alignRight = " ".repeat(80 - 32);
			assertMessage(spyTransport, {
				message: `«   0x0102030405060708 ${alignRight}(8 bytes)`,
			});
		});

		it("short buffer, outbound", () => {
			log.serial.data("outbound", Buffer.from([0x55, 4, 3, 2, 1]));
			const alignRight = " ".repeat(80 - 26);
			assertMessage(spyTransport, {
				message: ` »  0x5504030201 ${alignRight}(5 bytes)`,
			});
		});

		it("wraps longer buffers into multiple lines", () => {
			// We have room for 65 chars in the first line
			const expected = pseudoRandomBytes(38);
			const hexBuffer = `0x${expected.toString("hex")}`;
			const expectedLine1 = hexBuffer.slice(0, 65);
			const expectedLine2 = hexBuffer.slice(65);
			log.serial.data("inbound", expected);
			assertMessage(spyTransport, {
				message: `« ${BOX_CHARS.top} ${expectedLine1} (38 bytes)
  ${BOX_CHARS.bottom} ${expectedLine2}`,
			});
		});

		it("correctly groups very long lines", () => {
			// We have room for 65 chars in the first line, that is 31.5 bytes
			// and 76 chars (38 bytes) in each following line
			const expected = pseudoRandomBytes(70);
			const hexBuffer = `0x${expected.toString("hex")}`;
			const expectedLine1 = hexBuffer.slice(0, 65);
			const expectedLine2 = hexBuffer.slice(65, 65 + 76);
			const expectedLine3 = hexBuffer.slice(65 + 76);
			log.serial.data("inbound", expected);
			assertMessage(spyTransport, {
				message: `« ${BOX_CHARS.top} ${expectedLine1} (70 bytes)
  ${BOX_CHARS.middle} ${expectedLine2}
  ${BOX_CHARS.bottom} ${expectedLine3}`,
			});
		});
	});

	describe("logs the receive buffer correctly", () => {
		it("for short buffers", () => {
			log.serial.receiveBuffer(Buffer.from([0, 8, 0x15]));
			const alignRight = " ".repeat(80 - 32);
			assertMessage(spyTransport, {
				message: `·   Buffer := 0x000815 ${alignRight}(3 bytes)`,
			});
		});

		it("for longer buffers", () => {
			// max length without line breaks is 80, excluding prefixes and postfixes
			// this means we have 26 bytes to display (0x plus 2*26 chars)
			const expected = pseudoRandomBytes(26);
			log.serial.receiveBuffer(expected);
			assertMessage(spyTransport, {
				message: `·   Buffer := 0x${expected.toString(
					"hex",
				)}  (26 bytes)`,
			});
		});

		it("wraps longer buffers into multiple lines", () => {
			let expected = pseudoRandomBytes(27);
			let hexBuffer = `0x${expected.toString("hex")}`;
			let expectedLine1 = hexBuffer.slice(0, 55);
			let expectedLine2 = hexBuffer.slice(55);

			log.serial.receiveBuffer(expected);
			assertMessage(spyTransport, {
				message: `· ${BOX_CHARS.top} Buffer := ${expectedLine1} (27 bytes)
  ${BOX_CHARS.bottom} ${expectedLine2}`,
			});

			expected = pseudoRandomBytes(38);
			hexBuffer = `0x${expected.toString("hex")}`;
			expectedLine1 = hexBuffer.slice(0, 55);
			expectedLine2 = hexBuffer.slice(55);
			log.serial.receiveBuffer(expected);
			assertMessage(spyTransport, {
				message: `· ${BOX_CHARS.top} Buffer := ${expectedLine1} (38 bytes)
  ${BOX_CHARS.bottom} ${expectedLine2}`,
				callNumber: 1,
			});
		});
	});

	describe("logs simple messages correctly", () => {
		it("short ones", () => {
			log.serial.message("Test");
			assertMessage(spyTransport, {
				message: `·   Test`,
			});
		});

		it("long ones", () => {
			log.serial.message(
				"This is a very long message that should be broken into multiple lines maybe sometimes...",
			);
			assertMessage(spyTransport, {
				message: `· ${BOX_CHARS.top} This is a very long message that should be broken into multiple lines maybe 
  ${BOX_CHARS.bottom} sometimes...`,
			});
		});
	});
});
