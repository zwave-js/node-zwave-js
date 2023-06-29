import type { ExecutionContext } from "ava";
import type { ZWaveError, ZWaveErrorCodes } from "../error/ZWaveError";

export interface AssertZWaveErrorOptions {
	messageMatches?: string | RegExp;
	errorCode?: ZWaveErrorCodes;
	context?: unknown;
}

/**
 * Asserts that a value is or a method returns a ZWaveError.
 * @param valueOrFactory An error object or method that is expected to throw
 * @param options Additional assertions
 */
export function assertZWaveError<T>(
	t: ExecutionContext,
	valueOrFactory: T,
	options: AssertZWaveErrorOptions = {},
): T extends () => PromiseLike<any> ? Promise<void> : void {
	const { messageMatches, errorCode, context } = options;

	function _assertZWaveError(e: any): asserts e is ZWaveError {
		t.is(e.constructor.name, "ZWaveError");
		t.is(typeof e.code, "number");
	}

	function handleError(e: any): void {
		_assertZWaveError(e);
		if (messageMatches != undefined) {
			const regex =
				messageMatches instanceof RegExp
					? messageMatches
					: new RegExp(messageMatches);
			t.regex(e.message, regex);
		}
		if (errorCode != undefined) t.is(e.code, errorCode);
		if (context != undefined) t.is(e.context, context);
	}
	function fail(): never {
		// We should not be here
		throw new Error("The factory function did not throw any error!");
	}

	if (typeof valueOrFactory === "function") {
		try {
			// This call is expected to throw if valueOrFactory is a synchronous function
			const result = valueOrFactory();
			if (result instanceof Promise) {
				return result.then(
					fail, // If valueOrFactory is an async function the promise should be rejected
					handleError,
				) as any;
			}
		} catch (e) {
			return void handleError(e) as any;
		}
		fail();
	} else {
		// Directly assert the error object
		handleError(valueOrFactory);
	}
	return undefined as any;
}
