import { ZWaveError, ZWaveErrorCodes } from "../error/ZWaveError.js";

/** Ensures that the values array is consecutive */
export function isConsecutiveArray(values: number[]): boolean {
	return values.every((v, i, arr) => (i === 0 ? true : v - 1 === arr[i - 1]));
}

/** Returns an object that includes all non-undefined properties from the original one */
export function stripUndefined<T>(
	obj: Record<string, T | undefined>,
): Record<string, T> {
	const ret = {} as Record<string, T>;
	for (const [key, value] of Object.entries(obj)) {
		if (value !== undefined) ret[key] = value;
	}
	return ret;
}

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

function validatePayloadInternal(
	reason: string | ZWaveErrorCodes | undefined,
	...assertions: unknown[]
): void {
	if (!assertions.every(Boolean)) {
		throw new ZWaveError(
			"The message payload is invalid!",
			ZWaveErrorCodes.PacketFormat_InvalidPayload,
			reason,
		);
	}
}

// Export and augment the validatePayload method with a reason
export const validatePayload: ValidatePayload = validatePayloadInternal.bind(
	undefined,
	undefined,
) as ValidatePayload;
validatePayload.withReason = (reason: string | ZWaveErrorCodes) =>
	validatePayloadInternal.bind(undefined, reason);
validatePayload.fail = (reason: string | ZWaveErrorCodes) =>
	validatePayload.withReason(reason)(false) as unknown as never;

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
export function getMinimumShiftForBitMask(mask: number): number {
	let i = 0;
	while (mask % 2 === 0) {
		mask >>>= 1;
		if (mask === 0) break;
		i++;
	}
	return i;
}

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
export function getBitMaskWidth(mask: number): number {
	mask = mask >>> getMinimumShiftForBitMask(mask);
	let i = 0;
	while (mask > 0) {
		mask >>>= 1;
		i++;
	}
	return i;
}

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
export function getLegalRangeForBitMask(
	mask: number,
	unsigned: boolean,
): [min: number, max: number] {
	if (mask === 0) return [0, 0];
	const bitMaskWidth = getBitMaskWidth(mask);
	const min = unsigned || bitMaskWidth == 1 ? 0 : -(2 ** (bitMaskWidth - 1));
	const max = unsigned || bitMaskWidth == 1
		? 2 ** bitMaskWidth - 1
		: 2 ** (bitMaskWidth - 1) - 1;
	return [min, max];
}
