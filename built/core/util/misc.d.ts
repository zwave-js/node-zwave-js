import { ZWaveErrorCodes } from "../error/ZWaveError";
/** Ensures that the values array is consecutive */
export declare function isConsecutiveArray(values: number[]): boolean;
/** Returns an object that includes all non-undefined properties from the original one */
export declare function stripUndefined<T>(obj: Record<string, T>): Record<string, T>;
/**
 * Validates the payload about to be parsed. This can be used to avoid crashes caused by malformed packets
 * @param assertions An array of assertions to check if we have a valid payload
 */
type PayloadValidationFunction = (...assertions: unknown[]) => void;
interface ValidatePayload extends PayloadValidationFunction {
    /**
     * @param reason The optional reason for a rejection. Strings will be logged, error codes will be used for internal communication
     */
    withReason(reason: string | ZWaveErrorCodes): PayloadValidationFunction;
    /**
     * @param reason The reason for a rejection. Strings will be logged, error codes will be used for internal communication
     */
    fail(reason: string | ZWaveErrorCodes): never;
}
export declare const validatePayload: ValidatePayload;
/**
 * Determines how many bits a value must be shifted to be right-aligned with a given bit mask
 * Example:
 * ```txt
 *   Mask = 00110000
 *             ^---- => 4 bits
 *
 *   Mask = 00110001
 *                 ^ => 0 bits
 * ```
 */
export declare function getMinimumShiftForBitMask(mask: number): number;
/**
 * Determines how many wide a given bit mask is
 * Example:
 * ```txt
 *   Mask = 00110000
 *            ^^---- => 2 bits
 *
 *   Mask = 00110001
 *            ^....^ => 6 bits
 * ```
 */
export declare function getBitMaskWidth(mask: number): number;
/**
 * Determines the legal range of values that can be encoded at with the given bit mask
 * Example:
 * ```txt
 *   Mask = 00110000
 *            ^^---- => 0..3 unsigned OR -2..+1 signed
 *
 *   Mask = 00110001
 *            ^....^ => 0..63 unsigned OR -32..+31 signed (with gaps)
 * ```
 */
export declare function getLegalRangeForBitMask(mask: number, unsigned: boolean): [min: number, max: number];
export {};
//# sourceMappingURL=misc.d.ts.map