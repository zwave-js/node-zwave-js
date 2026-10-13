import {
	CRC16_CCITT,
	decryptAES256OFB,
	encodeBitMask,
	encryptAES256OFB,
	parseBitMask,
} from "@zwave-js/core";
import { Bytes, type BytesView } from "@zwave-js/shared";

// The license mechanism of Z-Wave.me controllers is protected only by a CRC-16
// under a symmetric key that is publicly embedded in the (open source)
// SerialAPIWebTools. Reproduced here to read and modify the feature license.
export const ZWAVEME_LICENSE_KEY = Bytes.from(
	"867802098d894d418f3fd2042eecf5c4058cb936a9cc4b87913936b743183742",
	"hex",
);

export const LICENSE_BLOCK_SIZE = 0x30; // 48 bytes
export const LICENSE_BLOB_SIZE = 32;

export enum ZWaveMeLicenseSubcommand {
	Get = 0x00,
	Set = 0x01,
	Nonce = 0x02,
}

export const LICENSE_STATUS_OK = 0x00;

/** Capabilities that can be unlocked through the feature license */
export enum ZWaveMeLicenseFlag {
	ControllerStaticAPI = 0x00,
	AllowMaxRFPower = 0x01,
	BackupRestore = 0x02,
	BatterySaveOnSleeping = 0x03,
	AdvancedNetworkDiagnostics = 0x04,
	LongRange = 0x05,
	FastCommunications = 0x06,
	ChangeVendorID = 0x07,
	PromiscuousMode = 0x08,
	RFJammingDetection = 0x0a,
	ZnifferPTIMode = 0x0b,
	ZnifferAdvancedRadioTool = 0x0c,
}

export interface ZWaveMeLicense {
	vendorId: number;
	maxNodes: number;
	flags: ZWaveMeLicenseFlag[];
	countSupport: number;
	raw: Bytes;
}

/** Parses a 32-byte license blob */
export function parseLicenseBlob(blob: BytesView): ZWaveMeLicense {
	const raw = Bytes.view(blob);
	return {
		vendorId: raw.readUInt16BE(0),
		maxNodes: raw[2],
		flags: parseBitMask(raw.subarray(3, 11), 0),
		countSupport: raw.readUInt16LE(11),
		raw,
	};
}

/** Serializes a license blob, appending the trailing CRC-16 */
export function buildLicenseBlob(opts: {
	vendorId: number;
	maxNodes: number;
	flags: ZWaveMeLicenseFlag[];
	countSupport?: number;
}): Bytes {
	const blob = new Bytes(LICENSE_BLOB_SIZE);
	blob.writeUInt16BE(opts.vendorId, 0);
	blob[2] = opts.maxNodes;
	blob.set(encodeBitMask(opts.flags, undefined, 0), 3);
	blob.writeUInt16LE(opts.countSupport ?? 0, 11);
	// bytes 13..30 are reserved and left zero
	blob.writeUInt16LE(CRC16_CCITT(blob.subarray(0, 30)), 30);
	return blob;
}

/**
 * Builds a plaintext license command block:
 * `subCommand | data... | 0xFF padding | CRC16 (LE)`
 */
export function buildCommandBlock(
	subCommand: ZWaveMeLicenseSubcommand,
	data: BytesView = new Uint8Array(0),
): Bytes {
	const block = new Bytes(LICENSE_BLOCK_SIZE).fill(0xff);
	block[0] = subCommand;
	block.set(data, 1);
	const crcOffset = block.length - 2;
	block.writeUInt16LE(CRC16_CCITT(block.subarray(0, crcOffset)), crcOffset);
	return block;
}

/**
 * Verifies and parses a decrypted license command block.
 * Returns the payload after the subcommand and status bytes.
 */
export function parseCommandBlock(block: BytesView): {
	subCommand: number;
	status: number;
	payload: Bytes;
} {
	const view = Bytes.view(block);
	// CRC covers the whole block except the trailing 2-byte CRC itself
	const crcOffset = view.length - 2;
	const expectedCRC = view.readUInt16LE(crcOffset);
	const actualCRC = CRC16_CCITT(view.subarray(0, crcOffset));
	if (expectedCRC !== actualCRC) {
		throw new Error("Z-Wave.me license response failed CRC check");
	}
	return {
		subCommand: view[0],
		status: view[1],
		payload: view.subarray(2, crcOffset),
	};
}

/** Encrypts a 48-byte command block using AES-256-OFB */
export function encryptLicenseBlock(
	block: BytesView,
	iv: BytesView,
): Promise<BytesView> {
	return encryptAES256OFB(block, ZWAVEME_LICENSE_KEY, iv);
}

/** Decrypts a 48-byte command block using AES-256-OFB */
export function decryptLicenseBlock(
	ciphertext: BytesView,
	iv: BytesView,
): Promise<BytesView> {
	return decryptAES256OFB(ciphertext, ZWAVEME_LICENSE_KEY, iv);
}
