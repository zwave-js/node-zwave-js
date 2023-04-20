"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.downloadFirmwareUpdate = exports.getAvailableFirmwareUpdates = void 0;
const got_1 = __importDefault(require("@esm2cjs/got"));
const p_queue_1 = __importDefault(require("@esm2cjs/p-queue"));
const core_1 = require("@zwave-js/core");
const shared_1 = require("@zwave-js/shared");
const crypto_1 = __importDefault(require("crypto"));
function serviceURL() {
    return process.env.ZWAVEJS_FW_SERVICE_URL || "https://firmware.zwave-js.io";
}
const DOWNLOAD_TIMEOUT = 60000;
// const MAX_FIRMWARE_SIZE = 10 * 1024 * 1024; // 10MB should be enough for any conceivable Z-Wave chip
const MAX_CACHE_SECONDS = 60 * 60 * 24; // Cache for a day at max
const CLEAN_CACHE_INTERVAL_MS = 60 * 60 * 1000; // Remove stale entries from the cache every hour
const requestCache = new Map();
// Queue requests to the firmware update service. Only allow few parallel requests so we can make some use of the cache.
const requestQueue = new p_queue_1.default({ concurrency: 2 });
let cleanCacheTimeout;
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
        cleanCacheTimeout = setTimeout(cleanCache, CLEAN_CACHE_INTERVAL_MS).unref();
    }
}
async function cachedGot(config) {
    // Replaces got's built-in cache functionality because it uses Keyv internally
    // which apparently has some issues: https://github.com/zwave-js/node-zwave-js/issues/5404
    const hash = crypto_1.default
        .createHash("sha256")
        .update(JSON.stringify(config.json))
        .digest("hex");
    const cacheKey = `${config.method}:${config.url.toString()}:${hash}`;
    // Return cached requests if they are not stale yet
    if (requestCache.has(cacheKey)) {
        const cached = requestCache.get(cacheKey);
        if (cached.staleDate > Date.now()) {
            return cached.response;
        }
    }
    const response = await (0, got_1.default)(config);
    const responseJson = JSON.parse(response.body);
    // Check if we can cache the response
    if (response.statusCode === 200 && response.headers["cache-control"]) {
        const cacheControl = response.headers["cache-control"];
        let maxAge;
        const maxAgeMatch = cacheControl.match(/max-age=(\d+)/);
        if (maxAgeMatch) {
            maxAge = Math.max(0, parseInt(maxAgeMatch[1], 10));
        }
        if (maxAge) {
            let currentAge;
            if (response.headers.age) {
                currentAge = parseInt(response.headers.age, 10);
            }
            else if (response.headers.date) {
                currentAge =
                    (Date.now() - Date.parse(response.headers.date)) / 1000;
            }
            else {
                currentAge = 0;
            }
            currentAge = Math.max(0, currentAge);
            if (maxAge > currentAge) {
                requestCache.set(cacheKey, {
                    response: responseJson,
                    staleDate: Date.now() +
                        Math.min(MAX_CACHE_SECONDS, maxAge - currentAge) * 1000,
                });
            }
        }
    }
    // Regularly clean the cache
    if (!cleanCacheTimeout) {
        cleanCacheTimeout = setTimeout(cleanCache, CLEAN_CACHE_INTERVAL_MS).unref();
    }
    return responseJson;
}
/** Converts the RF region to a format the update service understands */
function rfRegionToUpdateServiceRegion(rfRegion) {
    switch (rfRegion) {
        case core_1.RFRegion["Default (EU)"]:
        case core_1.RFRegion.Europe:
            return "europe";
        case core_1.RFRegion.USA:
        case core_1.RFRegion["USA (Long Range)"]:
            return "usa";
        case core_1.RFRegion["Australia/New Zealand"]:
            return "australia/new zealand";
        case core_1.RFRegion["Hong Kong"]:
            return "hong kong";
        case core_1.RFRegion.India:
            return "india";
        case core_1.RFRegion.Israel:
            return "israel";
        case core_1.RFRegion.Russia:
            return "russia";
        case core_1.RFRegion.China:
            return "china";
        case core_1.RFRegion.Japan:
            return "japan";
        case core_1.RFRegion.Korea:
            return "korea";
    }
}
/**
 * Retrieves the available firmware updates for the node with the given fingerprint.
 * Returns the service response or `undefined` in case of an error.
 */
function getAvailableFirmwareUpdates(deviceId, options) {
    const headers = {
        "User-Agent": options.userAgent,
        "Content-Type": "application/json",
    };
    if (options.apiKey) {
        headers["X-API-Key"] = options.apiKey;
    }
    const body = {
        manufacturerId: (0, shared_1.formatId)(deviceId.manufacturerId),
        productType: (0, shared_1.formatId)(deviceId.productType),
        productId: (0, shared_1.formatId)(deviceId.productId),
        firmwareVersion: deviceId.firmwareVersion,
    };
    const rfRegion = rfRegionToUpdateServiceRegion(deviceId.rfRegion);
    if (rfRegion) {
        body.region = rfRegion;
    }
    const config = {
        method: "POST",
        url: `${serviceURL()}/api/${options.includePrereleases ? "v3" : "v1"}/updates`,
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
    return requestQueue.add(() => cachedGot(config));
}
exports.getAvailableFirmwareUpdates = getAvailableFirmwareUpdates;
async function downloadFirmwareUpdate(file) {
    const [hashAlgorithm, expectedHash] = file.integrity.split(":", 2);
    if (hashAlgorithm !== "sha256") {
        throw new core_1.ZWaveError(`Unsupported hash algorithm ${hashAlgorithm} for integrity check`, core_1.ZWaveErrorCodes.Argument_Invalid);
    }
    // TODO: Make request abort-able (requires AbortController, Node 14.17+ / Node 16)
    // Download the firmware file
    const downloadResponse = await got_1.default.get(file.url, {
        timeout: { request: DOWNLOAD_TIMEOUT },
        responseType: "buffer",
        // TODO: figure out how to do maxContentLength: MAX_FIRMWARE_SIZE,
    });
    const rawData = downloadResponse.body;
    // Infer the file type from the content-disposition header or the filename
    let filename;
    if (downloadResponse.headers["content-disposition"]?.startsWith("attachment; filename=")) {
        filename = downloadResponse.headers["content-disposition"]
            .split("filename=")[1]
            .replace(/^"/, "")
            .replace(/[";]$/, "");
    }
    else {
        filename = new URL(file.url).pathname;
    }
    // Extract the raw data
    const format = (0, core_1.guessFirmwareFileFormat)(filename, rawData);
    const firmware = (0, core_1.extractFirmware)(rawData, format);
    // Ensure the hash matches
    const hasher = crypto_1.default.createHash("sha256");
    hasher.update(firmware.data);
    const actualHash = hasher.digest("hex");
    if (actualHash !== expectedHash) {
        throw new core_1.ZWaveError(`Integrity check failed. Expected hash ${expectedHash}, got ${actualHash}`, core_1.ZWaveErrorCodes.FWUpdateService_IntegrityCheckFailed);
    }
    return {
        data: firmware.data,
        // Don't trust the guessed firmware target, use the one from the provided info
        firmwareTarget: file.target,
    };
}
exports.downloadFirmwareUpdate = downloadFirmwareUpdate;
//# sourceMappingURL=FirmwareUpdateService.js.map