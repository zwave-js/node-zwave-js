import { formatId } from "@zwave-js/shared";
import { isObject } from "alcalzone-shared/typeguards";
import axios from "axios";
import * as crypto from "crypto";
import type { Driver } from "../driver/Driver";

const apiToken = "ef58278d935ccb26307800279458484d";
const statisticsUrl = `https://stats.zwave-js.io/statistics`;

export interface AppInfo {
	driverVersion: string;
	applicationName: string;
	applicationVersion: string;
}

export async function compileStatistics(
	driver: Driver,
	appInfo: AppInfo,
): Promise<Record<string, any>> {
	const salt = await driver.getUUID();
	return {
		// Salt and hash the homeId, so it cannot easily be tracked
		// It is no state secret, but since we're collecting it, make sure it is anonymous
		id: crypto
			.createHash("sha256")
			.update(driver.controller.homeId!.toString(16))
			.update(salt)
			.digest("hex"),
		...appInfo,
		devices: [...driver.controller.nodes.values()].map((node) => ({
			manufacturerId:
				node.manufacturerId != undefined
					? formatId(node.manufacturerId)
					: "",
			productType:
				node.productType != undefined ? formatId(node.productType) : "",
			productId:
				node.productId != undefined ? formatId(node.productId) : "",
			firmwareVersion: node.firmwareVersion ?? "",
		})),
	};
}

/**
 * Sends the statistics to the statistics backend. Returns:
 * - `true` when sending succeeded
 * - The number of seconds to wait before trying again when hitting the rate limiter
 * - `false` for any other errors
 */
export async function sendStatistics(
	statistics: Record<string, any>,
): Promise<boolean | number> {
	try {
		const { data } = await axios.post(
			statisticsUrl,
			{ data: [statistics] },
			{ headers: { "x-api-token": apiToken } },
		);
		if (isObject(data) && typeof data.success === "boolean") {
			return data.success;
		}
		return false;
	} catch (e) {
		if (isObject(e.response) && e.response.status === 429) {
			// We've hit the rate limiter. Figure out when we may try again.
			if (
				isObject(e.response.headers) &&
				"retry-after" in e.response.headers
			) {
				const retryAfter = parseInt(e.response.headers["retry-after"]);
				if (Number.isInteger(retryAfter)) return retryAfter;
			}
		}
		// didn't work, try again later
		return false;
	}
}
