import {
	type Firmware,
	MAX_FIRMWARE_SIZE,
	RFRegion,
	ZWaveError,
	ZWaveErrorCodes,
	digest,
	extractFirmware,
	guessFirmwareFileFormat,
} from "@zwave-js/core";
import {
	Bytes,
	ObjectKeyMap,
	type Timer,
	formatId,
	getenv,
	noop,
	padVersion,
	setTimer,
} from "@zwave-js/shared";
import type { Options as KyOptions } from "ky";
import type PQueue from "p-queue";

import type {
	FirmwareUpdateBulkInfo,
	FirmwareUpdateDeviceID,
	FirmwareUpdateFileInfo,
	FirmwareUpdateInfo,
} from "./_Types.js";

function additionalFirmwareVersionsEqual(
	a: Record<string, string> | undefined,
	b: Record<string, string> | undefined,
): boolean {
	if (a === b) return true;
	if (!a || !b) return false;
	const keysA = Object.keys(a);
	const keysB = Object.keys(b);
	if (keysA.length !== keysB.length) return false;
	return keysA.every((k) => a[k] === b[k]);
}

function serviceURL(): string {
	return getenv("ZWAVEJS_FW_SERVICE_URL") || "https://firmware.zwave-js.io";
}
const DOWNLOAD_TIMEOUT = 60000;
const CHECK_TIMEOUT = 30000; // The initial check after releasing new updates can be pretty slow. Give it some time.

const MAX_CACHE_SECONDS = 60 * 60 * 24; // Cache for a day at max
const MAX_DOWNLOAD_REDIRECTS = 5;
const CLEAN_CACHE_INTERVAL_MS = 60 * 60 * 1000; // Remove stale entries from the cache every hour

// Cache for individual device firmware updates
const deviceFirmwareCache = new ObjectKeyMap<
	FirmwareUpdateDeviceID,
	CachedDeviceResponse
>();
interface CachedDeviceResponse {
	/** The available updates, or `undefined` if the device is unknown to the update service */
	updates?: FirmwareUpdateInfo[];
	staleDate: number;
}

// Queue requests to the firmware update service, so requests made while
// another one is in flight can be answered from the cache
let requestQueue: PQueue | undefined;

let cleanCacheTimeout: Timer | undefined;
function cleanCache() {
	cleanCacheTimeout?.clear();
	cleanCacheTimeout = undefined;

	const now = Date.now();
	for (const [deviceKey, cached] of deviceFirmwareCache) {
		if (cached.staleDate < now) {
			deviceFirmwareCache.delete(deviceKey);
		}
	}

	if (deviceFirmwareCache.size > 0) {
		cleanCacheTimeout = setTimer(
			cleanCache,
			CLEAN_CACHE_INTERVAL_MS,
		).unref();
	}
}

/** Calculates cache expiry time based on response headers */
function calculateCacheExpiry(response: Response): number {
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
				currentAge = (Date.now() - Date.parse(date)) / 1000;
			} else {
				currentAge = 0;
			}
			currentAge = Math.max(0, currentAge);

			if (maxAge > currentAge) {
				return (
					Date.now()
					+ Math.min(MAX_CACHE_SECONDS, maxAge - currentAge) * 1000
				);
			}
		}
	}

	// Default fallback cache duration
	return Date.now() + MAX_CACHE_SECONDS * 1000;
}

async function makeRequest<T>(
	url: string,
	config: KyOptions,
): Promise<{ data: T; expiry: number }> {
	const { default: ky } = await import("ky");
	const response = await ky(url, config);
	const responseJson = await response.json<T>();

	return { data: responseJson, expiry: calculateCacheExpiry(response) };
}

function hasExtension(pathname: string): boolean {
	return /\.[a-z0-9_]+$/i.test(pathname);
}

export interface GetAvailableFirmwareUpdateOptions {
	userAgent: string;
	apiKey?: string;
}

export interface GetAvailableFirmwareUpdateBulkOptions extends GetAvailableFirmwareUpdateOptions {
	rfRegion?: RFRegion;
}

/** Converts the RF region to a format the update service understands */
function rfRegionToUpdateServiceRegion(
	rfRegion?: RFRegion,
): string | undefined {
	switch (rfRegion) {
		case RFRegion.Europe:
		case RFRegion["Europe (Long Range)"]:
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
 * Retrieves the available firmware updates for multiple devices in a single request.
 * Returns a map of device keys to their respective firmware update information.
 * Devices missing from the returned map are not known to the firmware update service.
 */
export async function getAvailableFirmwareUpdatesBulk(
	deviceIds: FirmwareUpdateDeviceID[],
	options: GetAvailableFirmwareUpdateBulkOptions,
): Promise<ObjectKeyMap<FirmwareUpdateDeviceID, FirmwareUpdateInfo[]>> {
	// Remove duplicates based on device fingerprint
	const uniqueDeviceIds = deviceIds.filter(
		(device, index) =>
			index
			=== deviceIds.findIndex(
				(d) =>
					d.manufacturerId === device.manufacturerId
					&& d.productType === device.productType
					&& d.productId === device.productId
					&& d.firmwareVersion === device.firmwareVersion
					&& additionalFirmwareVersionsEqual(
						d.additionalFirmwareVersions,
						device.additionalFirmwareVersions,
					),
			),
	);

	// Determine which devices need a request inside the queued task, so calls
	// waiting in the queue can use the cache entries of previous requests
	const checkStaleDevices = async () => {
		const now = Date.now();
		const staleDevices = uniqueDeviceIds.filter((device) => {
			const cached = deviceFirmwareCache.get(device);
			return !cached || cached.staleDate <= now;
		});
		if (staleDevices.length === 0) return;

		const headers = new Headers({
			"User-Agent": options.userAgent,
			"Content-Type": "application/json",
		});
		if (options.apiKey) {
			headers.set("X-API-Key", options.apiKey);
		}

		const body: Record<string, any> = {
			devices: staleDevices.map((device) => {
				const ret: Record<string, any> = {
					manufacturerId: formatId(device.manufacturerId),
					productType: formatId(device.productType),
					productId: formatId(device.productId),
					firmwareVersion: device.firmwareVersion,
				};
				if (device.additionalFirmwareVersions) {
					ret.additionalFirmwareVersions =
						device.additionalFirmwareVersions;
				}
				return ret;
			}),
		};

		const rfRegion = rfRegionToUpdateServiceRegion(options.rfRegion);
		if (rfRegion) {
			body.region = rfRegion;
		}

		const url = `${serviceURL()}/api/v4/updates`;
		const config: KyOptions = {
			method: "POST",
			json: body,
			headers,
			timeout: CHECK_TIMEOUT,
		};

		const { data: result, expiry } = await makeRequest<
			FirmwareUpdateBulkInfo[]
		>(url, config);

		const foundDevices = new Set<FirmwareUpdateDeviceID>();

		for (const deviceResponse of result) {
			const originalDevice = staleDevices.find(
				(device) =>
					formatId(device.manufacturerId)
						=== deviceResponse.manufacturerId
					&& formatId(device.productType)
						=== deviceResponse.productType
					&& formatId(device.productId) === deviceResponse.productId
					&& padVersion(device.firmwareVersion)
						=== padVersion(deviceResponse.firmwareVersion)
					&& additionalFirmwareVersionsEqual(
						device.additionalFirmwareVersions,
						deviceResponse.additionalFirmwareVersions,
					),
			);

			if (originalDevice) {
				foundDevices.add(originalDevice);

				const updates: FirmwareUpdateInfo[] =
					deviceResponse.updates.map((update) => ({
						device: originalDevice,
						...update,
						channel: update.channel ?? "stable",
					}));

				deviceFirmwareCache.set(originalDevice, {
					updates,
					staleDate: expiry,
				});
			}
		}

		// The update service omits devices it does not know. Cache those too,
		// so they are not re-requested before the cache entry becomes stale
		for (const device of staleDevices) {
			if (!foundDevices.has(device)) {
				deviceFirmwareCache.set(device, {
					updates: undefined,
					staleDate: expiry,
				});
			}
		}
	};

	if (!requestQueue) {
		// I just love ESM
		const PQueue = (await import("p-queue")).default;
		// Concurrent calls can reach this point simultaneously. Make sure they share one queue
		requestQueue ??= new PQueue({ concurrency: 1 });
	}

	await requestQueue.add(checkStaleDevices);

	// Build the final result map with all requested devices that have updates
	const ret = new ObjectKeyMap<
		FirmwareUpdateDeviceID,
		FirmwareUpdateInfo[]
	>();
	for (const deviceId of uniqueDeviceIds) {
		const updates = deviceFirmwareCache.get(deviceId)?.updates;
		if (updates) {
			ret.set(deviceId, updates);
		}
	}

	// Regularly clean the cache
	if (!cleanCacheTimeout) {
		cleanCacheTimeout = setTimer(
			cleanCache,
			CLEAN_CACHE_INTERVAL_MS,
		).unref();
	}

	return ret;
}

/**
 * Retrieves the available firmware updates for the node with the given fingerprint.
 * Return an empty array if no updates are available or the device is not known to the firmware update service.
 */
export async function getAvailableFirmwareUpdates(
	deviceId: FirmwareUpdateDeviceID,
	options: GetAvailableFirmwareUpdateOptions,
): Promise<FirmwareUpdateInfo[]> {
	// Use the bulk function for a single device
	const bulkResult = await getAvailableFirmwareUpdatesBulk(
		[deviceId],
		options,
	);
	return bulkResult.get(deviceId) || [];
}

// The integrity hash is only checked after the downloaded file was parsed and possibly decrypted,
// so a download over plain HTTP would expose that code to unauthenticated input.
// Plain HTTP is only allowed when the service itself was explicitly configured to use it.
function assertAllowedDownloadProtocol(url: string): void {
	const protocol = new URL(url).protocol;
	const allowedProtocols =
		new URL(serviceURL()).protocol === "http:"
			? ["http:", "https:"]
			: ["https:"];
	if (!allowedProtocols.includes(protocol)) {
		throw new ZWaveError(
			`Refusing to download firmware from ${url}: unsupported protocol ${protocol}`,
			ZWaveErrorCodes.FWUpdateService_RequestError,
		);
	}
}

async function readResponseWithLimit(
	response: Response,
	maxSize: number,
): Promise<Uint8Array<ArrayBuffer>> {
	const tooLarge = () =>
		new ZWaveError(
			`The firmware file exceeds the maximum size of ${maxSize} bytes`,
			ZWaveErrorCodes.Invalid_Firmware_File,
		);

	const contentLength = Number(response.headers.get("content-length"));
	if (contentLength > maxSize) {
		await response.body?.cancel().catch(noop);
		throw tooLarge();
	}
	if (!response.body) return new Uint8Array(await response.arrayBuffer());

	// The content-length header may be missing or wrong, so count while reading.
	// Chunks are copied into a single growing buffer, because retaining many tiny
	// chunks would use far more memory than the limit due to per-object overhead.
	let buffer = new Uint8Array(
		Math.min(contentLength > 0 ? contentLength : 64 * 1024, maxSize),
	);
	let size = 0;
	const reader = response.body.getReader();
	while (true) {
		const { done, value } = await reader.read();
		if (done) break;
		if (size + value.length > maxSize) {
			await reader.cancel().catch(noop);
			throw tooLarge();
		}
		if (size + value.length > buffer.length) {
			const grown = new Uint8Array(
				Math.min(
					Math.max(buffer.length * 2, size + value.length),
					maxSize,
				),
			);
			grown.set(buffer.subarray(0, size));
			buffer = grown;
		}
		buffer.set(value, size);
		size += value.length;
	}
	return buffer.slice(0, size);
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

	// Download the firmware file. Redirects are followed manually, so every hop
	// can be checked before it is requested.
	const { default: ky } = await import("ky");
	let downloadURL = file.url;
	let downloadResponse: Response;
	for (let redirects = 0; ; redirects++) {
		assertAllowedDownloadProtocol(downloadURL);
		downloadResponse = await ky.get(downloadURL, {
			timeout: DOWNLOAD_TIMEOUT,
			redirect: "manual",
			throwHttpErrors: (status) => status < 300 || status >= 400,
		});
		if (downloadResponse.ok) break;

		// Only 3xx responses get here
		await downloadResponse.body?.cancel().catch(noop);
		const location = downloadResponse.headers.get("location");
		if (!location) {
			throw new ZWaveError(
				`Firmware download failed with status ${downloadResponse.status}`,
				ZWaveErrorCodes.FWUpdateService_RequestError,
			);
		}
		if (redirects >= MAX_DOWNLOAD_REDIRECTS) {
			throw new ZWaveError(
				`Refusing to download firmware from ${file.url}: too many redirects`,
				ZWaveErrorCodes.FWUpdateService_RequestError,
			);
		}
		downloadURL = new URL(location, downloadURL).href;
	}

	const rawData = await readResponseWithLimit(
		downloadResponse,
		MAX_FIRMWARE_SIZE,
	);

	const requestedPathname = new URL(file.url).pathname;
	// The response may be redirected, so the filename information may be different
	// from the requested URL
	let actualPathname: string | undefined;
	try {
		actualPathname = new URL(downloadURL).pathname;
	} catch {
		// ignore
	}

	// Infer the file type from the content-disposition header or the filename
	let filename: string;
	const contentDisposition = downloadResponse.headers.get(
		"content-disposition",
	);
	if (contentDisposition?.startsWith("attachment; filename=")) {
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
