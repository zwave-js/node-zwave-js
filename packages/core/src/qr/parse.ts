import { Bytes } from "@zwave-js/shared/safe";
import { digest } from "../crypto/index.js";
import { SecurityClass } from "../definitions/SecurityClass.js";
import { dskToString } from "../dsk/index.js";
import { parseBitMask } from "../values/Primitive.js";
import {
	ProvisioningInformationType,
	QRCodeVersion,
	type QRProvisioningInformation,
	minQRCodeLength,
	onlyDigitsRegex,
} from "./definitions.js";
import { fail, parseTLV, readLevel, readUInt16, readUInt8 } from "./utils.js";

/** Parses a string that has been decoded from a Z-Wave (S2 or SmartStart) QR code */
export async function parseQRCodeString(
	qr: string,
): Promise<QRProvisioningInformation> {
	// Trim off whitespace that might have been copied by accident
	qr = qr.trim();
	// Validate the QR code
	if (!qr.startsWith("90")) fail("must start with 90");
	if (qr.length < minQRCodeLength) fail("too short");
	if (!onlyDigitsRegex.test(qr)) fail("contains invalid characters");

	const version = readLevel(qr, 2);
	if (version > QRCodeVersion.SmartStart) fail("invalid version");

	const checksum = readUInt16(qr, 4);
	// The checksum covers the remaining data
	const checksumInput = new TextEncoder().encode(qr.slice(9));

	const hashResult = await digest("sha-1", checksumInput);
	const expectedChecksum = Bytes.view(hashResult).readUInt16BE(0);
	if (checksum !== expectedChecksum) fail("invalid checksum");

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

	while (offset < qr.length) {
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
	}

	// Ensure the required fields are present
	if (!hasProductID || !hasProductType) {
		fail("missing required fields");
	}

	return ret;
}
