"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendStatistics = exports.compileStatistics = void 0;
const got_1 = __importDefault(require("@esm2cjs/got"));
const shared_1 = require("@zwave-js/shared");
const typeguards_1 = require("alcalzone-shared/typeguards");
const crypto = __importStar(require("crypto"));
const apiToken = "ef58278d935ccb26307800279458484d";
const statisticsUrl = `https://stats.zwave-js.io/statistics`;
async function compileStatistics(driver, appInfo) {
    const salt = await driver.getUUID();
    return {
        // Salt and hash the homeId, so it cannot easily be tracked
        // It is no state secret, but since we're collecting it, make sure it is anonymous
        id: crypto
            .createHash("sha256")
            .update(driver.controller.homeId.toString(16))
            .update(salt)
            .digest("hex"),
        ...appInfo,
        devices: [...driver.controller.nodes.values()].map((node) => ({
            manufacturerId: node.manufacturerId != undefined
                ? (0, shared_1.formatId)(node.manufacturerId)
                : "",
            productType: node.productType != undefined ? (0, shared_1.formatId)(node.productType) : "",
            productId: node.productId != undefined ? (0, shared_1.formatId)(node.productId) : "",
            firmwareVersion: node.firmwareVersion ?? "",
        })),
    };
}
exports.compileStatistics = compileStatistics;
/**
 * Sends the statistics to the statistics backend. Returns:
 * - `true` when sending succeeded
 * - The number of seconds to wait before trying again when hitting the rate limiter
 * - `false` for any other errors
 */
async function sendStatistics(statistics) {
    try {
        const data = await got_1.default
            .post(statisticsUrl, {
            json: { data: [statistics] },
            headers: { "x-api-token": apiToken },
        })
            .json();
        if ((0, typeguards_1.isObject)(data) && typeof data.success === "boolean") {
            return data.success;
        }
        return false;
    }
    catch (e) {
        if ((0, typeguards_1.isObject)(e.response) && e.response.status === 429) {
            // We've hit the rate limiter. Figure out when we may try again.
            if ((0, typeguards_1.isObject)(e.response.headers) &&
                "retry-after" in e.response.headers) {
                const retryAfter = parseInt(e.response.headers["retry-after"]);
                if (Number.isInteger(retryAfter))
                    return retryAfter;
            }
        }
        // didn't work, try again later
        return false;
    }
}
exports.sendStatistics = sendStatistics;
//# sourceMappingURL=statistics.js.map