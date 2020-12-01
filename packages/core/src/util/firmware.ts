// @ts-expect-error There are no type definitions for nrf-intel-hex
import MemoryMap from "nrf-intel-hex";
import { ZWaveError, ZWaveErrorCodes } from "../error/ZWaveError";

export type FirmwareFileFormat = "aeotec" | "otz" | "ota" | "hex" | "gecko";

export interface Firmware {
	data: Buffer;
	firmwareTarget?: number;
}

const firmwareIndicators = {
	// All aeotec updater exes contain this text
	aeotec: Buffer.from("Aeon Labs", "utf8"),
	// This seems to be the standard beginning of a gecko bootloader firmware
	gecko: 0xeb17a603,
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
	if (
		(filename.endsWith(".exe") || filename.endsWith(".ex_")) &&
		rawData.includes(firmwareIndicators.aeotec)
	) {
		return "aeotec";
	} else if (/\.(hex|ota|otz)$/.test(filename)) {
		return filename.slice(-3) as FirmwareFileFormat;
	} else if (filename.endsWith(".hec")) {
		throw new ZWaveError(
			"Encrypted .hec firmware files are not supported",
			ZWaveErrorCodes.Unsupported_Firmware_Format,
		);
	} else if (
		filename.endsWith(".gbl") &&
		rawData.readUInt32BE(0) === firmwareIndicators.gecko
	) {
		return "gecko";
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
		case "gecko":
			// There is no description for the file contents, so we
			// have to assume this is for firmware target 0
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

	// The exe file contains the firmware data and filename at the end
	const firmwareStart = data.readUInt32BE(data.length - 8);
	const firmwareLength = data.readUInt32BE(data.length - 4);
	if (firmwareStart + firmwareLength > data.length - 256 - 8) {
		throw new ZWaveError(
			"This does not appear to be a valid Aeotec updater (invalid firmware length)!",
			ZWaveErrorCodes.Argument_Invalid,
		);
	}

	const firmwareData = data.slice(
		firmwareStart,
		firmwareStart + firmwareLength,
	);
	const firmwareNameBytes = data.slice(data.length - 256 - 8).slice(0, 256);
	const firmwareName = firmwareNameBytes
		.slice(0, firmwareNameBytes.indexOf(0))
		.toString("utf8");
	if (!/^[a-zA-Z0-9_]+$/.test(firmwareName)) {
		throw new ZWaveError(
			"This does not appear to be a valid Aeotec updater (invalid firmware name)!",
			ZWaveErrorCodes.Argument_Invalid,
		);
	}

	// The filename includes which chip is being targeted
	const ret: Firmware = {
		data: firmwareData,
	};
	if (/__TargetZwave__/.test(firmwareName)) {
		ret.firmwareTarget = 0;
	} else {
		const match = /__TargetMcu(\d)__/.exec(firmwareName);
		if (match) ret.firmwareTarget = +match[1];
	}
	return ret;
}

function extractFirmwareHEX(data: Buffer): Firmware {
	try {
		const memMap = MemoryMap.fromHex(data.toString("ascii"));
		return {
			data: Buffer.from(memMap.get(0)),
		};
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
