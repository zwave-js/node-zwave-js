/** A number between -128 and +124 dBm or one of the special values in {@link RssiError} indicating an error */

export type RSSI = number | RssiError;

export enum RssiError {
	NotAvailable = 127,
	ReceiverSaturated = 126,
	NoSignalDetected = 125,
}

export function isRssiError(rssi: RSSI): rssi is RssiError {
	return rssi >= RssiError.NoSignalDetected;
}
/** Averages RSSI measurements using an exponential moving average with the given weight for the accumulator */

export function averageRSSI(
	acc: number | undefined,
	rssi: RSSI,
	weight: number,
): number {
	if (isRssiError(rssi)) {
		switch (rssi) {
			case RssiError.NotAvailable:
				// If we don't have a value yet, return 0
				return acc ?? 0;
			case RssiError.ReceiverSaturated:
				// Assume rssi is 0 dBm
				rssi = 0;
				break;
			case RssiError.NoSignalDetected:
				// Assume rssi is -128 dBm
				rssi = -128;
				break;
		}
	}

	if (acc == undefined) return rssi;
	return Math.round(acc * weight + rssi * (1 - weight));
}
/**
 * Converts an RSSI value to a human readable format, i.e. the measurement including the unit or the corresponding error message.
 */

export function rssiToString(rssi: RSSI): string {
	switch (rssi) {
		case RssiError.NotAvailable:
			return "N/A";
		case RssiError.ReceiverSaturated:
			return "Receiver saturated";
		case RssiError.NoSignalDetected:
			return "No signal detected";
		default:
			return `${rssi} dBm`;
	}
}
