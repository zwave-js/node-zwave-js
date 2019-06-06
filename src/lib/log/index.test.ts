import { stripColor } from "ansi-colors";
import * as Transport from "winston-transport";
import { serialLoggerFormat } from "./Serial";
import winston = require("winston");

/** Log to a jest.fn() in order to perform assertions during unit tests */
export class SpyTransport extends Transport {
	public constructor() {
		super();
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

const messageSymbol = Symbol.for("message");

/** Tests a printed log message */
function assertMessage(
	transport: SpyTransport,
	options: Partial<{
		message: string;
		predicate: (msg: string) => boolean;
		stripColor: boolean;
		callNumber: number;
	}>,
) {
	const callNumber = options.callNumber || 0;
	const callArg = transport.spy.mock.calls[callNumber][0];
	let actualMessage = callArg[messageSymbol];

	if (options.stripColor) {
		actualMessage = stripColor(actualMessage);
	}
	if (typeof options.message === "string") {
		expect(actualMessage).toBe(options.message);
	}
	if (typeof options.predicate === "function") {
		expect(actualMessage).toSatisfy(options.predicate);
	}
}

describe("lib/log/Serial", () => {
	let serialLogger: winston.Logger;
	let spyTransport: SpyTransport;

	beforeAll(() => {
		serialLogger = winston.loggers.get("serial");
		// Replace all defined transports with a spy transport
		spyTransport = new SpyTransport();
		serialLogger.configure({
			format: serialLoggerFormat,
			transports: [spyTransport],
		});
	});

	beforeEach(() => {
		spyTransport.spy.mockClear();
	});

	it("works", () => {
		serialLogger.log("info", "bar");
		assertMessage(spyTransport, {
			predicate: msg => msg.startsWith("info: bar"),
			stripColor: true,
		});
	});
});
