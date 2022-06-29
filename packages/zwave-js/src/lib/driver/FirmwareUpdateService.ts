import {
	extractFirmware,
	Firmware,
	guessFirmwareFileFormat,
	ZWaveError,
	ZWaveErrorCodes,
} from "@zwave-js/core";
import { formatId } from "@zwave-js/shared";
import axios from "axios";
import crypto from "crypto";
import type { FirmwareUpdateFileInfo, FirmwareUpdateInfo } from "./_Types";

const serviceURL = "https://firmware.zwave-js.io";
const DOWNLOAD_TIMEOUT = 60000;
const MAX_FIRMWARE_SIZE = 10 * 1024 * 1024; // 10MB should be enough for any conceivable Z-Wave chip

/**
 * Retrieves the available firmware updates for the node with the given fingerprint.
 * Returns the service response or `undefined` in case of an error.
 */
export async function getAvailableFirmwareUpdates(
	manufacturerId: number,
	productType: number,
	productId: number,
	firmwareVersion: string,
): Promise<FirmwareUpdateInfo[]> {
	const response: FirmwareUpdateInfo[] = (
		await axios({
			method: "post",
			url: `${serviceURL}/api/v1/updates`,
			data: {
				manufacturerId: formatId(manufacturerId),
				productType: formatId(productType),
				productId: formatId(productId),
				firmwareVersion,
			},
		})
	).data;

	return response;
}

export async function downloadFirmwareUpdate(
	file: FirmwareUpdateFileInfo,
): Promise<Firmware> {
	const [hashAlgorithm, expectedHash] = file.integrity.split(":", 2);

	if (hashAlgorithm !== "sha256") {
		throw new ZWaveError(
			`Unsupported hash algorithm ${hashAlgorithm} for integrity check`,
			ZWaveErrorCodes.Argument_Invalid,
		);
	}
	// TODO: Make request abort-able (requires AbortController, Node 14.17+ / Node 16)

	// Download the firmware file
	const downloadResponse = await axios.get<Buffer>(file.url, {
		timeout: DOWNLOAD_TIMEOUT,
		maxContentLength: MAX_FIRMWARE_SIZE,
		responseType: "arraybuffer",
	});
	const rawData = downloadResponse.data;

	// Infer the file type from the content-disposition header or the filename
	let filename: string;
	if (
		downloadResponse.headers["content-disposition"]?.startsWith(
			"attachment; filename=",
		)
	) {
		filename = downloadResponse.headers["content-disposition"]
			.split("filename=")[1]
			.replace(/^"/, "")
			.replace(/[";]$/, "");
	} else {
		filename = new URL(file.url).pathname;
	}
	// Extract the raw data
	const format = guessFirmwareFileFormat(filename, rawData);
	const firmware = extractFirmware(rawData, format);

	// Ensure the hash matches
	const hasher = crypto.createHash("sha256");
	hasher.update(firmware.data);
	const actualHash = hasher.digest("hex");

	if (actualHash !== expectedHash) {
		throw new ZWaveError(
			`Integrity check failed. Expected hash ${expectedHash}, got ${actualHash}`,
			ZWaveErrorCodes.FWUpdateService_IntegrityCheckFailed,
		);
	}

	return {
		data: firmware.data,
		// Don't trust the guessed firmware target, use the one from the provided info
		firmwareTarget: file.target,
	};
}
