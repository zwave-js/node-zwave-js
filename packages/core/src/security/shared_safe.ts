/**
 * Tries to extract a DSK from a scanned QR code. If the string is a valid DSK (prefixed with "zws2dsk:" or unprefixed), the DSK will be returned.
 * This can then be used to initiate an S2 inclusion with pre-filled DSK.
 */
export function tryParseDSKFromQRCodeString(qr: string): string | undefined {
	// Trim off whitespace that might have been copied by accident
	qr = qr.trim();
	if (qr.startsWith("zws2dsk:")) {
		qr = qr.slice("zws2dsk:".length);
	}
	if (isValidDSK(qr)) {
		return qr;
	}
}

export function isValidDSK(dsk: string): boolean {
	return /^(\d{5}-){7}\d{5}$/.test(dsk);
}
