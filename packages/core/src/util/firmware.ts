import { Bytes, getErrorMessage, isUint8Array } from "@zwave-js/shared/safe";
import { unzipSync } from "fflate";
import { decryptAES256CBC } from "../crypto/index.js";
import { ZWaveError, ZWaveErrorCodes } from "../error/ZWaveError.js";
import type { Firmware, FirmwareFileFormat } from "./_Types.js";
import { CRC16_CCITT } from "./crc.js";

// This package has an incorrect type declaration
import MemoryMap_ from "nrf-intel-hex";
const MemoryMap =
	MemoryMap_ as unknown as typeof import("nrf-intel-hex").default;

const firmwareIndicators = {
	// All aeotec updater exes contain this text
	aeotec: Bytes.from("Zensys.ZWave", "utf8"),
	// This seems to be the standard beginning of a gecko bootloader firmware
	gecko: 0xeb17a603,
	// Encrypted HEC firmware files
	hec: Bytes.from("HSENC2", "ascii"),
};

/**
 * Guess the firmware format based on filename and firmware buffer
 *
 * @param filename The firmware filename
 * @param rawData A buffer containing the original firmware update file
 */
export function guessFirmwareFileFormat(
	filename: string,
	rawData: Uint8Array,
): FirmwareFileFormat {
	filename = filename.toLowerCase();
	const rawBuffer = Bytes.view(rawData);

	if (filename.endsWith(".bin")) {
		return "bin";
	} else if (
		(filename.endsWith(".exe") || filename.endsWith(".ex_"))
		&& rawBuffer.includes(firmwareIndicators.aeotec)
	) {
		return "aeotec";
	} else if (/\.(hex|ota|otz)$/.test(filename)) {
		return filename.slice(-3) as FirmwareFileFormat;
	} else if (
		filename.endsWith(".gbl")
		&& rawBuffer.readUInt32BE(0) === firmwareIndicators.gecko
	) {
		return "gecko";
	} else if (
		filename.endsWith(".hec")
		&& rawBuffer
			.subarray(0, firmwareIndicators.hec.length)
			.equals(firmwareIndicators.hec)
	) {
		return "hec";
	}

	throw new ZWaveError(
		"Could not detect firmware format",
		ZWaveErrorCodes.Invalid_Firmware_File,
	);
}

/**
 * Given the contents of a ZIP archive with a compatible firmware file,
 * this function extracts the firmware data and guesses the firmware format
 * using {@link guessFirmwareFileFormat}.
 *
 * @returns An object containing the filename, guessed format and unzipped data
 * of the firmware file from the ZIP archive, or `undefined` if no compatible
 * firmware file could be extracted.
 */
export function tryUnzipFirmwareFile(zipData: Uint8Array): {
	filename: string;
	format: FirmwareFileFormat;
	rawData: Uint8Array;
} | undefined {
	// Extract files we can work with
	const unzipped = unzipSync(zipData, {
		filter: (file) => {
			return /\.(hex|exe|ex_|ota|otz|hec|gbl|bin)$/.test(file.name);
		},
	});
	if (Object.keys(unzipped).length === 1) {
		// Exactly one file was extracted, inspect that
		const filename = Object.keys(unzipped)[0];
		const rawData = unzipped[filename];
		try {
			const format = guessFirmwareFileFormat(filename, rawData);
			return { filename, format, rawData };
		} catch {
			return;
		}
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
export async function extractFirmware(
	rawData: Uint8Array,
	format: FirmwareFileFormat,
): Promise<Firmware> {
	switch (format) {
		case "aeotec":
			return extractFirmwareAeotec(rawData);
		case "otz":
		case "ota":
			// Per convention, otz and ota files SHOULD be in Intel HEX format,
			// but some manufacturers use them for binary data. So we attempt parsing
			// them as HEX and fall back to returning the binary contents.
			if (rawData.every((b) => b <= 127)) {
				try {
					return extractFirmwareHEX(rawData);
				} catch (e) {
					if (
						e instanceof ZWaveError
						&& e.code === ZWaveErrorCodes.Argument_Invalid
					) {
						// Fall back to binary data
					} else {
						throw e;
					}
				}
			}
			return extractFirmwareRAW(rawData);
		case "hex":
			return extractFirmwareHEX(rawData);
		case "hec":
			return extractFirmwareHEC(rawData);
		case "gecko":
			// There is no description for the file contents, so we
			// have to assume this is for firmware target 0
			return extractFirmwareRAW(rawData);
		case "bin":
			// There is no description for the file contents, so the user has to make sure to select the correct target
			return extractFirmwareRAW(rawData);
	}
}

function extractFirmwareRAW(data: Uint8Array): Firmware {
	return { data };
}

function extractFirmwareAeotec(data: Uint8Array): Firmware {
	const buffer = Bytes.view(data);
	// Check if this is an EXE file
	if (buffer.readUInt16BE(0) !== 0x4d5a) {
		throw new ZWaveError(
			"This does not appear to be a valid Aeotec updater (not an executable)!",
			ZWaveErrorCodes.Argument_Invalid,
		);
	}

	// The exe file contains the firmware data and filename at the end
	const firmwareStart = buffer.readUInt32BE(buffer.length - 8);
	const firmwareLength = buffer.readUInt32BE(buffer.length - 4);
	let numControlBytes = 8;

	// Some exe files also contain a 2-byte checksum. The method "ImageCalcCrc16" is used to compute the checksum
	if (buffer.includes(Bytes.from("ImageCalcCrc16", "ascii"))) {
		numControlBytes += 2;
	}

	// Some files don't have such a strict alignment - in that case fall back to ignoring the non-aligned control bytes
	switch (true) {
		case firmwareStart + firmwareLength
			=== buffer.length - 256 - numControlBytes:
			// all good
			break;
		case firmwareStart + firmwareLength === buffer.length - 256 - 8:
			numControlBytes = 8;
			break;
		default:
			throw new ZWaveError(
				"This does not appear to be a valid Aeotec updater (invalid firmware length)!",
				ZWaveErrorCodes.Argument_Invalid,
			);
	}

	const firmwareData = buffer.subarray(
		firmwareStart,
		firmwareStart + firmwareLength,
	);

	const firmwareNameBytes = buffer
		.subarray(buffer.length - 256 - numControlBytes)
		.subarray(0, 256);

	// Some exe files contain a CRC-16 checksum, extract that too and check it
	if (numControlBytes === 10) {
		const checksum = buffer.readUInt16BE(buffer.length - 10);
		const actualChecksum = CRC16_CCITT(
			Bytes.concat([firmwareData, firmwareNameBytes]),
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
	const firmwareTarget = firmwareNameBytes[0] < 0x20
		? firmwareNameBytes[0]
		: undefined;
	const firmwareNameOffset = firmwareTarget == undefined ? 0 : 1;

	const firmwareName = firmwareNameBytes
		.subarray(
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

function extractFirmwareHEX(dataHEX: Uint8Array | string): Firmware {
	try {
		if (isUint8Array(dataHEX)) {
			dataHEX = Bytes.view(dataHEX).toString("ascii");
		}
		const memMap: Map<number, Uint8Array> = MemoryMap.fromHex(dataHEX);
		// A memory map can be sparse - we'll have to fill the gaps with 0xFF
		let data: Bytes = new Bytes();
		for (const [offset, chunk] of memMap.entries()) {
			data = Bytes.concat([
				data,
				Bytes.alloc(offset - data.length, 0xff),
				chunk,
			]);
		}
		return { data };
	} catch (e) {
		if (/Malformed/.test(getErrorMessage(e))) {
			throw new ZWaveError(
				"Could not parse HEX firmware file!",
				ZWaveErrorCodes.Argument_Invalid,
			);
		} else {
			throw e;
		}
	}
}

async function extractFirmwareHEC(data: Uint8Array): Promise<Firmware> {
	const key =
		"d7a68def0f4a1241940f6cb8017121d15f0e2682e258c9f7553e706e834923b7";
	const iv = "0e6519297530583708612a2823663844";

	const ciphertext = Bytes.from(
		Bytes.view(data.subarray(6)).toString("ascii"),
		"base64",
	);
	const plaintext = Bytes.view(
		await decryptAES256CBC(
			ciphertext,
			Bytes.from(key, "hex"),
			Bytes.from(iv, "hex"),
		),
	)
		.toString("ascii")
		.replaceAll(" ", "\n");

	return extractFirmwareHEX(plaintext);
}
