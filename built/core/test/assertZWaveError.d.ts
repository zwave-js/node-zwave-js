import type { ExecutionContext } from "ava";
import type { ZWaveErrorCodes } from "../error/ZWaveError";
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
export declare function assertZWaveError<T>(t: ExecutionContext, valueOrFactory: T, options?: AssertZWaveErrorOptions): T extends () => PromiseLike<any> ? Promise<void> : void;
//# sourceMappingURL=assertZWaveError.d.ts.map