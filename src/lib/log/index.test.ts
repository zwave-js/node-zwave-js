import { stripColor } from "ansi-colors";
import { pseudoRandomBytes } from "crypto";
import * as winston from "winston";
import * as Transport from "winston-transport";
import log from "./index";
import { serialLoggerFormat } from "./Serial";
import { messageSymbol } from "./shared";

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
			assertMessage(spyTransport, {
				message: "«   [ACK] (0x06)",
				ignoreColor: true,
			});
		});

		it("outbound ACK", () => {
			log.serial.ACK("outbound");
			assertMessage(spyTransport, {
				message: "  » [ACK] (0x06)",
				ignoreColor: true,
			});
		});

		it("inbound NAK", () => {
			log.serial.NAK("inbound");
			assertMessage(spyTransport, {
				message: "«   [NAK] (0x15)",
				ignoreColor: true,
			});
		});

		it("outbound NAK", () => {
			log.serial.NAK("outbound");
			assertMessage(spyTransport, {
				message: "  » [NAK] (0x15)",
				ignoreColor: true,
			});
		});

		it("inbound CAN", () => {
			log.serial.CAN("inbound");
			assertMessage(spyTransport, {
				message: "«   [CAN] (0x18)",
				ignoreColor: true,
			});
		});

		it("outbound CAN", () => {
			log.serial.CAN("outbound");
			assertMessage(spyTransport, {
				message: "  » [CAN] (0x18)",
				ignoreColor: true,
			});
		});
	});

	describe("logs raw data correctly", () => {
		it("short buffer, inbound", () => {
			log.serial.data("inbound", Buffer.from([1, 2, 3, 4, 5, 6, 7, 8]));
			assertMessage(spyTransport, {
				message: "«   0x0102030405060708 (8 bytes)",
				ignoreColor: true,
			});
		});

		it("short buffer, outbound", () => {
			log.serial.data("outbound", Buffer.from([0x55, 4, 3, 2, 1]));
			assertMessage(spyTransport, {
				message: "  » 0x5504030201 (5 bytes)",
				ignoreColor: true,
			});
		});

		it("wraps longer buffers into multiple lines", () => {
			// We have room for 76 chars, that is 37 bytes
			const expected = pseudoRandomBytes(38);
			const hexBuffer = `0x${expected.toString("hex")}`;
			const expectedLine1 = hexBuffer.slice(0, 76);
			const expectedLine2 = hexBuffer.slice(76);
			log.serial.data("inbound", expected);
			assertMessage(spyTransport, {
				message: `«   (38 bytes)
    ${expectedLine1}
    ${expectedLine2}`,
				ignoreColor: true,
			});
		});
	});

	describe("logs the receive buffer correctly", () => {
		it("for short buffers", () => {
			log.serial.receiveBuffer(Buffer.from([0, 8, 0x15]));
			assertMessage(spyTransport, {
				message: " ·  Buffer := 0x000815 (3 bytes)",
				ignoreColor: true,
			});
		});

		it("for longer buffers", () => {
			// max length without line breaks is 80, excluding prefixes and postfixes that cross the 80 char line
			// this means we have 32 bytes to display (0x plus 2*32 chars)
			const expected = pseudoRandomBytes(32);
			log.serial.receiveBuffer(expected);
			assertMessage(spyTransport, {
				message: ` ·  Buffer := 0x${expected.toString(
					"hex",
				)} (32 bytes)`,
				ignoreColor: true,
			});
		});

		it("wraps longer buffers into multiple lines", () => {
			const expected = pseudoRandomBytes(37);
			log.serial.receiveBuffer(expected);
			assertMessage(spyTransport, {
				message: ` ·  Buffer := (37 bytes)
    0x${expected.toString("hex")}`,
				ignoreColor: true,
			});
		});
	});
});
