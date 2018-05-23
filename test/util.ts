import { expect, should } from "chai";
should();

import { ZWaveError, ZWaveErrorCodes } from "../src/lib/error/ZWaveError";

export function assertZWaveError(
	factory: (...args: any[]) => any,
	expected?: string | RegExp,
	code?: ZWaveErrorCodes,
) {
	expect(factory)
		.to.throw(expected, `the thrown error does not match "${expected.toString()}"`)
		.and.be.an.instanceof(ZWaveError, `the thrown error is not a ZWaveError`)
		.and.satisfy((err: ZWaveError) => code != null ? err.code === code : true, `the thrown error has the wrong code`)
		;
}
