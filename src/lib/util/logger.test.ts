// tslint:disable:no-unused-expression

// import { assert, expect, should, use } from "chai";
// import { spy, stub } from "sinon";
// should();

// // stub out the debug package for logger
// import * as debugPackage from "debug";
// const debugSpy = stub();
// import * as proxyquire from "proxyquire";
// const { log, setCustomLogger } = proxyquire("./logger", {
// 	debug: stub().callsFake(namespace => {
// 		if (namespace === "zwave") return debugSpy;
// 		return debugPackage(namespace);
// 	}),
// });

import debug from "debug";
import { log, setCustomLogger, Severity } from "./logger";

jest.mock("debug");
const debugSpy = jest.fn();
((debug as any) as jest.Mock).mockReturnValue(debugSpy);

describe("lib/logger => ", () => {
	beforeEach(() => jest.clearAllMocks());

	it(`gets called with the correct arguments`, () => {
		const loggerStub = jest.fn();
		setCustomLogger(loggerStub);

		log("message", "debug");

		expect(loggerStub).toBeCalledTimes(1);
		expect(loggerStub).toBeCalledWith("message", "debug");
	});

	// it(`has a default severity of "info"`, () => {
	// 	loggerStub = jest.fn();
	// 	setCustomLogger(loggerStub);

	// 	log("message");

	// 	assert(loggerStub.calledWithExactly("message", "info"));
	// });

	it(`uses the "debug" package by default`, () => {
		setCustomLogger(undefined);

		log("message", "error");
		expect(debugSpy).toHaveBeenCalledTimes(1);
		// We cannot test for the exact string here as it contains invisible control characters
		expect(debugSpy).toBeCalledWith(expect.stringContaining("message"));
	});

	it(`using the default logger prepends the severity to the message in UPPERCASE`, () => {
		// except for info
		log("message", "info");
		expect(debugSpy).toBeCalledWith(expect.stringContaining("message"));
		expect(debugSpy).toBeCalledWith(expect.not.stringContaining("INFO"));

		for (const sev of ["warn", "debug", "error", "silly"] as Severity[]) {
			debugSpy.mockClear();
			log("message", sev);
			expect(debugSpy).toBeCalledWith(expect.stringContaining("message"));
			expect(debugSpy).toBeCalledWith(
				expect.not.stringContaining("INFO"),
			);
		}
	});

	it("throws when invalid arguments were passed", () => {
		expect(() => log.apply(undefined)).toThrow();
		expect(() => log.apply(undefined, [])).toThrow();
		expect(() => log.apply(undefined, [1, 2])).toThrow();
		expect(() => log.apply(undefined, [1, 2, 3])).toThrow();
	});
});
