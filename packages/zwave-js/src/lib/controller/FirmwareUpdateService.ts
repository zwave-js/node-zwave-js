import {
	type Firmware,
	RFRegion,
	ZWaveError,
	ZWaveErrorCodes,
	digest,
	extractFirmware,
	guessFirmwareFileFormat,
} from "@zwave-js/core";
import { Bytes, type Timer, formatId, getenv } from "@zwave-js/shared";
import { setTimer } from "@zwave-js/shared";
import type { Options as KyOptions } from "ky";
import type PQueue from "p-queue";
import type {
	FirmwareUpdateDeviceID,
	FirmwareUpdateFileInfo,
	FirmwareUpdateInfo,
	FirmwareUpdateServiceResponse,
} from "./_Types.js";

function serviceURL(): string {
	return getenv("ZWAVEJS_FW_SERVICE_URL") || "https://firmware.zwave-js.io";
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
let requestQueue: PQueue | undefined;

let cleanCacheTimeout: Timer | undefined;
function cleanCache() {
	cleanCacheTimeout?.clear();
	cleanCacheTimeout = undefined;

	const now = Date.now();
	for (const [key, cached] of requestCache) {
		if (cached.staleDate < now) {
			requestCache.delete(key);
		}
	}

	if (requestCache.size > 0) {
		cleanCacheTimeout = setTimer(
			cleanCache,
			CLEAN_CACHE_INTERVAL_MS,
		).unref();
	}
}

async function cachedRequest<T>(url: string, config: KyOptions): Promise<T> {
	const hash = Bytes.view(
		await digest(
			"sha-256",
			Bytes.from(JSON.stringify(config.json)),
		),
	).toString("hex");
	const cacheKey = `${config.method}:${url}:${hash}`;

	// Return cached requests if they are not stale yet
	if (requestCache.has(cacheKey)) {
		const cached = requestCache.get(cacheKey)!;
		if (cached.staleDate > Date.now()) {
			return cached.response as T;
		}
	}

	const { default: ky } = await import("ky");
	const response = await ky(url, config);
	const responseJson = await response.json<T>();

	// Check if we can cache the response
	if (response.status === 200 && response.headers.has("cache-control")) {
		const cacheControl = response.headers.get("cache-control")!;
		const age = response.headers.get("age");
		const date = response.headers.get("date");

		let maxAge: number | undefined;
		const maxAgeMatch = cacheControl.match(/max-age=(\d+)/);
		if (maxAgeMatch) {
			maxAge = Math.max(0, parseInt(maxAgeMatch[1], 10));
		}

		if (maxAge) {
			let currentAge: number;
			if (age) {
				currentAge = parseInt(age, 10);
			} else if (date) {
				currentAge = (Date.now() - Date.parse(date))
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
		cleanCacheTimeout = setTimer(
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
	const headers = new Headers({
		"User-Agent": options.userAgent,
		"Content-Type": "application/json",
	});
	if (options.apiKey) {
		headers.set("X-API-Key", options.apiKey);
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

	const url = `${serviceURL()}/api/${apiVersion}/updates`;
	const config: KyOptions = {
		method: "POST",
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

	if (!requestQueue) {
		// I just love ESM
		const PQueue = (await import("p-queue")).default;
		requestQueue = new PQueue({ concurrency: 2 });
	}
	// Weird types...
	const result = (
		await requestQueue.add(() => cachedRequest(url, config))
	) as FirmwareUpdateServiceResponse[];

	// Remember the device ID in the response, so we can use it later
	// to ensure the update is for the correct device
	return result.map((update) => ({
		device: deviceId,
		...update,
		channel: update.channel ?? "stable",
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
	const { default: ky } = await import("ky");
	const downloadResponse = await ky.get(file.url, {
		timeout: DOWNLOAD_TIMEOUT,
		// TODO: figure out how to do maxContentLength: MAX_FIRMWARE_SIZE,
	});

	const rawData = new Uint8Array(await downloadResponse.arrayBuffer());

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
	const contentDisposition = downloadResponse.headers.get(
		"content-disposition",
	);
	if (
		contentDisposition?.startsWith(
			"attachment; filename=",
		)
	) {
		filename = contentDisposition
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
	const firmware = await extractFirmware(rawData, format);

	// Ensure the hash matches
	const actualHash = Bytes.view(
		await digest("sha-256", firmware.data),
	).toString("hex");

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
