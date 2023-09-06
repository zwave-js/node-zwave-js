import got, {
	type Headers,
	type OptionsOfTextResponseBody,
} from "@esm2cjs/got";
import PQueue from "@esm2cjs/p-queue";
import {
	type Firmware,
	RFRegion,
	ZWaveError,
	ZWaveErrorCodes,
	extractFirmware,
	guessFirmwareFileFormat,
} from "@zwave-js/core";
import { formatId } from "@zwave-js/shared";
import crypto from "crypto";
import type {
	FirmwareUpdateDeviceID,
	FirmwareUpdateFileInfo,
	FirmwareUpdateInfo,
	FirmwareUpdateServiceResponse,
} from "./_Types";

function serviceURL(): string {
	return process.env.ZWAVEJS_FW_SERVICE_URL || "https://firmware.zwave-js.io";
}
const DOWNLOAD_TIMEOUT = 60000;
// const MAX_FIRMWARE_SIZE = 10 * 1024 * 1024; // 10MB should be enough for any conceivable Z-Wave chip

const MAX_CACHE_SECONDS = 60 * 60 * 24; // Cache for a day at max
const CLEAN_CACHE_INTERVAL_MS = 60 * 60 * 1000; // Remove stale entries from the cache every hour

const requestCache = new Map<string, CachedRequest<unknown>>();
interface CachedRequest<T> {
	response: T;
	staleDate: number;
}

// Queue requests to the firmware update service. Only allow few parallel requests so we can make some use of the cache.
const requestQueue = new PQueue({ concurrency: 2 });

let cleanCacheTimeout: NodeJS.Timeout | undefined;
function cleanCache() {
	if (cleanCacheTimeout) {
		clearTimeout(cleanCacheTimeout);
		cleanCacheTimeout = undefined;
	}

	const now = Date.now();
	for (const [key, cached] of requestCache) {
		if (cached.staleDate < now) {
			requestCache.delete(key);
		}
	}

	if (requestCache.size > 0) {
		cleanCacheTimeout = setTimeout(
			cleanCache,
			CLEAN_CACHE_INTERVAL_MS,
		).unref();
	}
}

async function cachedGot<T>(config: OptionsOfTextResponseBody): Promise<T> {
	// Replaces got's built-in cache functionality because it uses Keyv internally
	// which apparently has some issues: https://github.com/zwave-js/node-zwave-js/issues/5404

	const hash = crypto
		.createHash("sha256")
		.update(JSON.stringify(config.json))
		.digest("hex");
	const cacheKey = `${config.method}:${config.url!.toString()}:${hash}`;

	// Return cached requests if they are not stale yet
	if (requestCache.has(cacheKey)) {
		const cached = requestCache.get(cacheKey)!;
		if (cached.staleDate > Date.now()) {
			return cached.response as T;
		}
	}

	const response = await got(config);
	const responseJson = JSON.parse(response.body) as T;

	// Check if we can cache the response
	if (response.statusCode === 200 && response.headers["cache-control"]) {
		const cacheControl = response.headers["cache-control"]!;

		let maxAge: number | undefined;
		const maxAgeMatch = cacheControl.match(/max-age=(\d+)/);
		if (maxAgeMatch) {
			maxAge = Math.max(0, parseInt(maxAgeMatch[1], 10));
		}

		if (maxAge) {
			let currentAge: number;
			if (response.headers.age) {
				currentAge = parseInt(response.headers.age, 10);
			} else if (response.headers.date) {
				currentAge = (Date.now() - Date.parse(response.headers.date))
					/ 1000;
			} else {
				currentAge = 0;
			}
			currentAge = Math.max(0, currentAge);

			if (maxAge > currentAge) {
				requestCache.set(cacheKey, {
					response: responseJson,
					staleDate: Date.now()
						+ Math.min(MAX_CACHE_SECONDS, maxAge - currentAge)
							* 1000,
				});
			}
		}
	}

	// Regularly clean the cache
	if (!cleanCacheTimeout) {
		cleanCacheTimeout = setTimeout(
			cleanCache,
			CLEAN_CACHE_INTERVAL_MS,
		).unref();
	}

	return responseJson;
}

function hasExtension(pathname: string): boolean {
	return /\.[a-z0-9_]+$/i.test(pathname);
}

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
export async function getAvailableFirmwareUpdates(
	deviceId: FirmwareUpdateDeviceID,
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

	// Prereleases and/or RF region-specific updates are only available in v3
	const apiVersion = options.includePrereleases || !!rfRegion ? "v3" : "v1";

	const config: OptionsOfTextResponseBody = {
		method: "POST",
		url: `${serviceURL()}/api/${apiVersion}/updates`,
		json: body,
		// Consider re-enabling this instead of using cachedGot()
		// At the moment, the built-in caching has some issues though, so we stick
		// with our own implementation
		// cache: requestCache,
		// cacheOptions: {
		// 	shared: false,
		// },
		headers,
	};

	const ret: FirmwareUpdateServiceResponse[] = await requestQueue.add(() =>
		cachedGot(config)
	);

	// Remember the device ID in the response, so we can use it later
	// to ensure the update is for the correct device
	return ret.map((update) => ({
		device: deviceId,
		...update,
	}));
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

	const requestedPathname = new URL(file.url).pathname;
	// The response may be redirected, so the filename information may be different
	// from the requested URL
	let actualPathname: string | undefined;
	try {
		actualPathname = new URL(downloadResponse.url).pathname;
	} catch {
		// ignore
	}

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
	} else if (actualPathname && hasExtension(actualPathname)) {
		filename = actualPathname;
	} else {
		filename = requestedPathname;
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
