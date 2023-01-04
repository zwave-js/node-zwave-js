import got, { Headers, OptionsOfTextResponseBody } from "@esm2cjs/got";
import PQueue from "@esm2cjs/p-queue";
import type { DeviceID } from "@zwave-js/config";
import {
	extractFirmware,
	Firmware,
	guessFirmwareFileFormat,
	RFRegion,
	ZWaveError,
	ZWaveErrorCodes,
} from "@zwave-js/core";
import { formatId } from "@zwave-js/shared";
import crypto from "crypto";
import type { FirmwareUpdateFileInfo, FirmwareUpdateInfo } from "./_Types";

function serviceURL(): string {
	return process.env.ZWAVEJS_FW_SERVICE_URL || "https://firmware.zwave-js.io";
}

const DOWNLOAD_TIMEOUT = 60000;
// const MAX_FIRMWARE_SIZE = 10 * 1024 * 1024; // 10MB should be enough for any conceivable Z-Wave chip

const requestCache = new Map();

// Queue requests to the firmware update service. Only allow few parallel requests so we can make some use of the cache.
const requestQueue = new PQueue({ concurrency: 2 });

export interface GetAvailableFirmwareUpdateOptions {
	userAgent: string;
	apiKey?: string;
	includePrereleases?: boolean;
}

/** Converts the RF region to a format the update service understands */
function rfRegionToUpdateServiceRegion(
	rfRegion?: RFRegion,
): string | undefined {
	switch (rfRegion) {
		case RFRegion["Default (EU)"]:
		case RFRegion.Europe:
			return "europe";
		case RFRegion.USA:
		case RFRegion["USA (Long Range)"]:
			return "usa";
		case RFRegion["Australia/New Zealand"]:
			return "australia/new zealand";
		case RFRegion["Hong Kong"]:
			return "hong kong";
		case RFRegion.India:
			return "india";
		case RFRegion.Israel:
			return "israel";
		case RFRegion.Russia:
			return "russia";
		case RFRegion.China:
			return "china";
		case RFRegion.Japan:
			return "japan";
		case RFRegion.Korea:
			return "korea";
	}
}

/**
 * Retrieves the available firmware updates for the node with the given fingerprint.
 * Returns the service response or `undefined` in case of an error.
 */
export function getAvailableFirmwareUpdates(
	deviceId: DeviceID & { firmwareVersion: string; rfRegion?: RFRegion },
	options: GetAvailableFirmwareUpdateOptions,
): Promise<FirmwareUpdateInfo[]> {
	const headers: Headers = {
		"User-Agent": options.userAgent,
		"Content-Type": "application/json",
	};
	if (options.apiKey) {
		headers["X-API-Key"] = options.apiKey;
	}

	const body: Record<string, string> = {
		manufacturerId: formatId(deviceId.manufacturerId),
		productType: formatId(deviceId.productType),
		productId: formatId(deviceId.productId),
		firmwareVersion: deviceId.firmwareVersion,
	};
	const rfRegion = rfRegionToUpdateServiceRegion(deviceId.rfRegion);
	if (rfRegion) {
		body.region = rfRegion;
	}

	const config: OptionsOfTextResponseBody = {
		method: "POST",
		url: `${serviceURL()}/api/${
			options.includePrereleases ? "v3" : "v1"
		}/updates`,
		json: body,
		cache: requestCache,
		cacheOptions: {
			shared: false,
		},
		headers,
	};

	return requestQueue.add(() => {
		return got(config).json();
	});
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
	const downloadResponse = await got.get(file.url, {
		timeout: { request: DOWNLOAD_TIMEOUT },
		responseType: "buffer",
		// TODO: figure out how to do maxContentLength: MAX_FIRMWARE_SIZE,
	});

	const rawData = downloadResponse.body;

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
