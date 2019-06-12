import { stripColor } from "ansi-colors";
import { pseudoRandomBytes } from "crypto";
import * as winston from "winston";
import * as Transport from "winston-transport";
import log from "./index";
import { serialLoggerFormat } from "./Serial";
import { BOX_CHARS, messageSymbol } from "./shared";

/** Log to a jest.fn() in order to perform assertions during unit tests */
export class SpyTransport extends Transport {
	public constructor() {
		super({
			level: "silly",
		});
		this._spy = jest.fn();
	}

	private _spy: jest.Mock;
	public get spy(): jest.Mock {
		return this._spy;
	}

	public log(info: any, next: () => void): any {
		this._spy(info);
		next();
	}
}

/** Tests a printed log message */
function assertMessage(
	transport: SpyTransport,
	options: Partial<{
		message: string;
		predicate: (msg: string) => boolean;
		ignoreColor: boolean;
		callNumber: number;
	}>,
) {
	const callNumber = options.callNumber || 0;
	expect(transport.spy.mock.calls.length).toBeGreaterThan(callNumber);

	const callArg = transport.spy.mock.calls[callNumber][0];
	let actualMessage = callArg[messageSymbol];

	if (options.ignoreColor) {
		actualMessage = stripColor(actualMessage);
	}
	if (typeof options.message === "string") {
		if (options.ignoreColor) {
			options.message = stripColor(options.message);
		}
		expect(actualMessage).toEqual(options.message);
	}
	if (typeof options.predicate === "function") {
		expect(actualMessage).toSatisfy(options.predicate);
	}
}

describe("lib/log/Serial =>", () => {
	let serialLogger: winston.Logger;
	let spyTransport: SpyTransport;

	// Replace all defined transports with a spy transport
	beforeAll(() => {
		serialLogger = winston.loggers.get("serial");
		spyTransport = new SpyTransport();
		serialLogger.configure({
			format: serialLoggerFormat,
			transports: [
				new winston.transports.Console({ level: "silly" }),
				spyTransport,
			],
		});
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
				ignoreColor: true,
			});
		});

		it("outbound ACK", () => {
			log.serial.ACK("outbound");
			const alignRight = " ".repeat(80 - 16);
			assertMessage(spyTransport, {
				message: `  » [ACK] ${alignRight}(0x06)`,
				ignoreColor: true,
			});
		});

		it("inbound NAK", () => {
			log.serial.NAK("inbound");
			const alignRight = " ".repeat(80 - 16);
			assertMessage(spyTransport, {
				message: `«   [NAK] ${alignRight}(0x15)`,
				ignoreColor: true,
			});
		});

		it("outbound NAK", () => {
			log.serial.NAK("outbound");
			const alignRight = " ".repeat(80 - 16);
			assertMessage(spyTransport, {
				message: `  » [NAK] ${alignRight}(0x15)`,
				ignoreColor: true,
			});
		});

		it("inbound CAN", () => {
			log.serial.CAN("inbound");
			const alignRight = " ".repeat(80 - 16);
			assertMessage(spyTransport, {
				message: `«   [CAN] ${alignRight}(0x18)`,
				ignoreColor: true,
			});
		});

		it("outbound CAN", () => {
			log.serial.CAN("outbound");
			const alignRight = " ".repeat(80 - 16);
			assertMessage(spyTransport, {
				message: `  » [CAN] ${alignRight}(0x18)`,
				ignoreColor: true,
			});
		});
	});

	describe("logs raw data correctly", () => {
		it("short buffer, inbound", () => {
			log.serial.data("inbound", Buffer.from([1, 2, 3, 4, 5, 6, 7, 8]));
			const alignRight = " ".repeat(80 - 32);
			assertMessage(spyTransport, {
				message: `«   0x0102030405060708 ${alignRight}(8 bytes)`,
				ignoreColor: true,
			});
		});

		it("short buffer, outbound", () => {
			log.serial.data("outbound", Buffer.from([0x55, 4, 3, 2, 1]));
			const alignRight = " ".repeat(80 - 26);
			assertMessage(spyTransport, {
				message: `  » 0x5504030201 ${alignRight}(5 bytes)`,
				ignoreColor: true,
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
				message: `«  ${BOX_CHARS.top}${expectedLine1} (38 bytes)
   ${BOX_CHARS.bottom}${expectedLine2}`,
				ignoreColor: true,
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
				message: `«  ${BOX_CHARS.top}${expectedLine1} (70 bytes)
   ${BOX_CHARS.middle}${expectedLine2}
   ${BOX_CHARS.bottom}${expectedLine3}`,
				ignoreColor: true,
			});
		});
	});

	describe("logs the receive buffer correctly", () => {
		it("for short buffers", () => {
			log.serial.receiveBuffer(Buffer.from([0, 8, 0x15]));
			const alignRight = " ".repeat(80 - 32);
			assertMessage(spyTransport, {
				message: ` ·  Buffer := 0x000815 ${alignRight}(3 bytes)`,
				ignoreColor: true,
			});
		});

		it("for longer buffers", () => {
			// max length without line breaks is 80, excluding prefixes and postfixes
			// this means we have 26 bytes to display (0x plus 2*26 chars)
			const expected = pseudoRandomBytes(26);
			log.serial.receiveBuffer(expected);
			assertMessage(spyTransport, {
				message: ` ·  Buffer := 0x${expected.toString(
					"hex",
				)}  (26 bytes)`,
				ignoreColor: true,
			});
		});

		it("wraps longer buffers into multiple lines", () => {
			let expected = pseudoRandomBytes(27);
			let hexBuffer = `0x${expected.toString("hex")}`;
			let expectedLine1 = hexBuffer.slice(0, 55);
			let expectedLine2 = hexBuffer.slice(55);

			log.serial.receiveBuffer(expected);
			assertMessage(spyTransport, {
				message: ` · ${BOX_CHARS.top}Buffer := ${expectedLine1} (27 bytes)
   ${BOX_CHARS.bottom}${expectedLine2}`,
				ignoreColor: true,
			});

			expected = pseudoRandomBytes(38);
			hexBuffer = `0x${expected.toString("hex")}`;
			expectedLine1 = hexBuffer.slice(0, 55);
			expectedLine2 = hexBuffer.slice(55);
			log.serial.receiveBuffer(expected);
			assertMessage(spyTransport, {
				message: ` · ${BOX_CHARS.top}Buffer := ${expectedLine1} (38 bytes)
   ${BOX_CHARS.bottom}${expectedLine2}`,
				ignoreColor: true,
				callNumber: 1,
			});
		});
	});
});
