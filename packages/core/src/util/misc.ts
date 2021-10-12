import { entries } from "alcalzone-shared/objects";
import { ZWaveError, ZWaveErrorCodes } from "../error/ZWaveError";

/** Ensures that the values array is consecutive */
export function isConsecutiveArray(values: number[]): boolean {
	return values.every((v, i, arr) => (i === 0 ? true : v - 1 === arr[i - 1]));
}

/** Returns an object that includes all non-undefined properties from the original one */
export function stripUndefined<T>(obj: Record<string, T>): Record<string, T> {
	const ret = {} as Record<string, T>;
	for (const [key, value] of entries(obj)) {
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
export const validatePayload = validatePayloadInternal.bind(
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
