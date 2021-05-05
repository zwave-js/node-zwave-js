import * as crypto from "crypto";
// @ts-expect-error There are no type definitions for nrf-intel-hex
import MemoryMap from "nrf-intel-hex";
import { ZWaveError, ZWaveErrorCodes } from "../error/ZWaveError";
import { CRC16_CCITT } from "./crc";

export type FirmwareFileFormat =
	| "aeotec"
	| "otz"
	| "ota"
	| "hex"
	| "hec"
	| "gecko"
	| "bin";

export interface Firmware {
	data: Buffer;
	firmwareTarget?: number;
}

const firmwareIndicators = {
	// All aeotec updater exes contain this text
	aeotec: Buffer.from("Zensys.ZWave", "utf8"),
	// This seems to be the standard beginning of a gecko bootloader firmware
	gecko: 0xeb17a603,
	// Encrypted HEC firmware files
	hec: Buffer.from("HSENC2", "ascii"),
};

/**
 * Guess the firmware format based on filename and firmware buffer
 *
 * @param filename The firmware filename
 * @param rawData A buffer containing the original firmware update file
 */
export function guessFirmwareFileFormat(
	filename: string,
	rawData: Buffer,
): FirmwareFileFormat {
	if (filename.endsWith(".bin")) {
		return "bin";
	} else if (
		(filename.endsWith(".exe") || filename.endsWith(".ex_")) &&
		rawData.includes(firmwareIndicators.aeotec)
	) {
		return "aeotec";
	} else if (/\.(hex|ota|otz)$/.test(filename)) {
		return filename.slice(-3) as FirmwareFileFormat;
	} else if (
		filename.endsWith(".gbl") &&
		rawData.readUInt32BE(0) === firmwareIndicators.gecko
	) {
		return "gecko";
	} else if (
		filename.endsWith(".hec") &&
		rawData
			.slice(0, firmwareIndicators.hec.length)
			.equals(firmwareIndicators.hec)
	) {
		return "hec";
	} else {
		throw new ZWaveError(
			"Could not detect firmware format",
			ZWaveErrorCodes.Invalid_Firmware_File,
		);
	}
}

/**
 * Extracts the firmware data from a file. The following formats are available:
 * - `"aeotec"` - A Windows executable (.exe or .ex_) that contains Aeotec's upload tool
 * - `"otz"` - A compressed firmware file in Intel HEX format
 * - `"ota"` or `"hex"` - An uncompressed firmware file in Intel HEX format
 * - `"hec"` - An encrypted Intel HEX firmware file
 * - `"gecko"` - A binary gecko bootloader firmware file with `.gbl` extension
 *
 * The returned firmware data and target can be used to start a firmware update process with `node.beginFirmwareUpdate`
 */
export function extractFirmware(
	rawData: Buffer,
	format: FirmwareFileFormat,
): Firmware {
	switch (format) {
		case "aeotec":
			return extractFirmwareAeotec(rawData);
		case "otz":
		case "ota":
		case "hex":
			return extractFirmwareHEX(rawData);
		case "hec":
			return extractFirmwareHEC(rawData);
		case "gecko":
			// There is no description for the file contents, so we
			// have to assume this is for firmware target 0
			return { data: rawData };
		case "bin":
			// There is no description for the file contents, so the user has to make sure to select the correct target
			return { data: rawData };
	}
}

function extractFirmwareAeotec(data: Buffer): Firmware {
	// Check if this is an EXE file
	if (data.readUInt16BE(0) !== 0x4d5a) {
		throw new ZWaveError(
			"This does not appear to be a valid Aeotec updater (not an executable)!",
			ZWaveErrorCodes.Argument_Invalid,
		);
	}

	// The Aeotec updaters are .net assemblies which are normally 16-byte-aligned
	// The additional firmware data (also 16-byte-aligned), the firmware name (256 bytes)
	// and some control bytes are added at the end, so we can deduce which kind of information
	// is included here
	let numControlBytes = data.length % 16;
	// The control bytes are as follows:
	// [2 bytes checksum]? [4 bytes offset] [4 bytes length]

	// The exe file contains the firmware data and filename at the end
	const firmwareStart = data.readUInt32BE(data.length - 8);
	const firmwareLength = data.readUInt32BE(data.length - 4);

	// Some files don't have such a strict alignment - in that case fall back to ignoring the non-aligned control bytes
	switch (true) {
		case firmwareStart + firmwareLength ===
			data.length - 256 - numControlBytes:
			// all good
			break;
		case firmwareStart + firmwareLength === data.length - 256 - 8:
			numControlBytes = 8;
			break;
		default:
			throw new ZWaveError(
				"This does not appear to be a valid Aeotec updater (invalid firmware length)!",
				ZWaveErrorCodes.Argument_Invalid,
			);
	}

	const firmwareData = data.slice(
		firmwareStart,
		firmwareStart + firmwareLength,
	);

	const firmwareNameBytes = data
		.slice(data.length - 256 - numControlBytes)
		.slice(0, 256);

	// Some exe files contain a CRC-16 checksum, extract that too and check it
	if (numControlBytes === 10) {
		const checksum = data.readUInt16BE(data.length - 10);
		const actualChecksum = CRC16_CCITT(
			Buffer.concat([firmwareData, firmwareNameBytes]),
			0xfe95,
		);
		if (checksum !== actualChecksum) {
			throw new ZWaveError(
				"This does not appear to be a valid Aeotec updater (invalid checksum)!",
				ZWaveErrorCodes.Argument_Invalid,
			);
		}
	}

	// Some updaters contain the firmware target in the first byte of the name
	// We can't test this, so we have to assume the value translates to a non-printable ASCII char (less than " ")
	const firmwareTarget =
		firmwareNameBytes[0] < 0x20 ? firmwareNameBytes[0] : undefined;
	const firmwareNameOffset = firmwareTarget == undefined ? 0 : 1;

	const firmwareName = firmwareNameBytes
		.slice(
			firmwareNameOffset,
			firmwareNameBytes.indexOf(0, firmwareNameOffset),
		)
		.toString("utf8");
	if (!/^[a-zA-Z0-9_ -]+$/.test(firmwareName)) {
		throw new ZWaveError(
			"This does not appear to be a valid Aeotec updater (invalid firmware name)!",
			ZWaveErrorCodes.Argument_Invalid,
		);
	}

	// The filename includes which chip is being targeted
	const ret: Firmware = {
		data: firmwareData,
	};
	if (firmwareTarget != undefined) {
		ret.firmwareTarget = firmwareTarget;
	}
	if (/__TargetZwave__/.test(firmwareName)) {
		ret.firmwareTarget = 0;
	} else {
		const match = /__TargetMcu(\d)__/.exec(firmwareName);
		if (match) ret.firmwareTarget = +match[1];
	}
	return ret;
}

function extractFirmwareHEX(dataHEX: Buffer | string): Firmware {
	try {
		if (Buffer.isBuffer(dataHEX)) {
			dataHEX = dataHEX.toString("ascii");
		}
		const memMap: Map<number, Uint8Array> = MemoryMap.fromHex(dataHEX);
		// A memory map can be sparse - we'll have to fill the gaps with 0xFF
		let data: Buffer = Buffer.from([]);
		for (const [offset, chunk] of memMap.entries()) {
			data = Buffer.concat([
				data,
				Buffer.alloc(offset - data.length, 0xff),
				chunk,
			]);
		}
		return { data };
	} catch (e) {
		if (/Malformed/.test(e.message)) {
			throw new ZWaveError(
				"Could not parse HEX firmware file!",
				ZWaveErrorCodes.Argument_Invalid,
			);
		} else {
			throw e;
		}
	}
}

function extractFirmwareHEC(data: Buffer): Firmware {
	const key =
		"d7a68def0f4a1241940f6cb8017121d15f0e2682e258c9f7553e706e834923b7";
	const iv = "0e6519297530583708612a2823663844";
	const decipher = crypto.createDecipheriv(
		"aes-256-cbc",
		Buffer.from(key, "hex"),
		Buffer.from(iv, "hex"),
	);

	const ciphertext = Buffer.from(data.slice(6).toString("ascii"), "base64");
	const plaintext = Buffer.concat([
		decipher.update(ciphertext),
		decipher.final(),
	])
		.toString("ascii")
		.replace(/ /g, "\n");

	return extractFirmwareHEX(plaintext);
}
