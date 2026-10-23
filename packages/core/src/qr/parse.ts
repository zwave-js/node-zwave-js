import { Bytes } from "@zwave-js/shared";

import { digest } from "../crypto/index.js";
import { SecurityClass } from "../definitions/SecurityClass.js";
import { dskToString } from "../dsk/index.js";
import { ZWaveError, ZWaveErrorCodes } from "../error/ZWaveError.js";
import { parseBitMask } from "../values/Primitive.js";

import {
	ProvisioningInformationType,
	QRCodeVersion,
	type QRProvisioningInformation,
	minQRCodeLength,
	onlyDigitsRegex,
} from "./definitions.js";
import { fail, parseTLV, readLevel, readUInt16, readUInt8 } from "./utils.js";

// Regex to find "90" followed by at least (minQRCodeLength - 2) digits
const qrCodeCandidateRegex = new RegExp(`90\\d{${minQRCodeLength - 2},}`, "g");

/**
 * Computes the checksum for a Z-Wave QR code, or a subset of it.
 */
async function computeChecksum(
	qr: string,
	endOffset: number = qr.length,
): Promise<number> {
	const checksumInput = new TextEncoder().encode(qr.slice(9, endOffset));
	const hashResult = await digest("sha-1", checksumInput);
	// oxlint-disable-next-line @zwave-js/no-unchecked-bytes-reads -- SHA-1 hashes are always 20 bytes long
	return Bytes.view(hashResult).readUInt16BE(0);
}

/** Internal parsing function that expects a clean QR code string */
async function parseQRCodeStringInternal(
	qr: string,
	parseSubsets: boolean,
): Promise<QRProvisioningInformation> {
	if (!qr.startsWith("90")) fail("must start with 90");
	if (qr.length < minQRCodeLength) fail("too short");
	if (!onlyDigitsRegex.test(qr)) fail("contains invalid characters");

	const version = readLevel(qr, 2);
	if (version > QRCodeVersion.SmartStart) fail("invalid version");

	const expectedChecksum = readUInt16(qr, 4);
	if (!parseSubsets) {
		// If we are not parsing subsets, just validate the checksum for the entire QR code
		if ((await computeChecksum(qr, qr.length)) !== expectedChecksum) {
			fail("invalid checksum");
		}
	}

	const requestedKeysBitmask = readUInt8(qr, 9);
	const requestedSecurityClasses = parseBitMask(
		[requestedKeysBitmask],
		SecurityClass.S2_Unauthenticated,
	);
	if (!requestedSecurityClasses.every((k) => k in SecurityClass)) {
		fail("invalid security class requested");
	}

	let offset = 12;
	const dsk = new Bytes(16);
	for (let dskBlock = 0; dskBlock < 8; dskBlock++) {
		const block = readUInt16(qr, offset);
		dsk.writeUInt16BE(block, dskBlock * 2);
		offset += 5;
	}

	const ret = {
		version,
		// This seems like a duplication, but it's more convenient for applications to not have to copy this field over
		requestedSecurityClasses,
		securityClasses: [...requestedSecurityClasses],
		dsk: dskToString(dsk),
	} as QRProvisioningInformation;

	let hasProductID = false;
	let hasProductType = false;

	// Parse TLV blocks until checksum matches (indicating end of QR code)
	while (offset + 4 <= qr.length) {
		const tlvLength = parseInt(qr.slice(offset + 2, offset + 4), 10);
		if (offset + 4 + tlvLength > qr.length) break;

		const {
			entry: { type, ...data },
			charsRead,
		} = parseTLV(qr.slice(offset));
		offset += charsRead;

		if (type === ProvisioningInformationType.ProductId) {
			hasProductID = true;
		} else if (type === ProvisioningInformationType.ProductType) {
			hasProductType = true;
		}
		Object.assign(ret, data);

		// If we are parsing subsets, we need to validate the checksum at the end of each TLV
		// to see if we've reached the end of the QR code
		if (
			parseSubsets
			&& hasProductID
			&& hasProductType
			&& (await computeChecksum(qr, offset)) === expectedChecksum
		) {
			return ret;
		}
	}

	// Ensure the required fields are present
	if (!hasProductID || !hasProductType) {
		fail("missing required fields");
	}

	// Final checksum validation
	if ((await computeChecksum(qr, offset)) !== expectedChecksum) {
		fail("invalid checksum");
	}

	return ret;
}

/**
 * Parses a string that has been decoded from a Z-Wave (S2 or SmartStart) QR code.
 * Automatically handles whitespace and tries to find a valid QR code within
 * longer strings that may contain extraneous characters.
 */
export async function parseQRCodeString(
	qr: string,
): Promise<QRProvisioningInformation> {
	// Remove all whitespace to handle QR codes with spaces/newlines in the middle
	const normalized = qr.replaceAll(/\s/g, "");

	// Optimize for the common case: the entire string is the complete QR code
	try {
		return await parseQRCodeStringInternal(normalized, false);
	} catch (e) {
		if (
			!(e instanceof ZWaveError)
			|| e.code !== ZWaveErrorCodes.Security2CC_InvalidQRCode
		) {
			throw e;
		}
	}

	// Fall back to searching for a valid QR code within the string
	const regex = new RegExp(qrCodeCandidateRegex);
	let match: RegExpExecArray | null;
	while ((match = regex.exec(normalized)) !== null) {
		try {
			return await parseQRCodeStringInternal(match[0], true);
		} catch (e) {
			if (
				!(e instanceof ZWaveError)
				|| e.code !== ZWaveErrorCodes.Security2CC_InvalidQRCode
			) {
				throw e;
			}
			// Continue searching after the "90" prefix of this failed match,
			// in case a valid QR code starts within the matched string
			regex.lastIndex = match.index + 2;
		}
	}

	// No valid QR code found
	fail("no valid QR code found");
}
