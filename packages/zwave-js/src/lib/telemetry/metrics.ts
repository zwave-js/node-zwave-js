import { formatId } from "@zwave-js/shared";
import { isObject } from "alcalzone-shared/typeguards";
import axios from "axios";
import * as crypto from "crypto";
import type { Driver } from "../driver/Driver";

const baseUrl = "https://metrics.zwave-js.io:9998"; // No leading slash!
// The shared "secret" between metrics server and zwave-js. Can be used to disable reporting for misbehaving clients.
const authKey = "Og9O}$[wKk=<$Z*qUduK";

const authUrl = `${baseUrl}/auth`;
const metricsUrl = `${baseUrl}/metrics`;

export interface AppInfo {
	driverVersion: string;
	applicationName: string;
	applicationVersion: string;
}

export function compileMetrics(
	driver: Driver,
	appInfo: AppInfo,
): Record<string, any> {
	return {
		// Hash the homeId, so it cannot easily be tracked
		id: crypto
			.createHash("md5")
			.update(driver.controller.homeId!.toString(16))
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

export async function sendMetrics(
	metrics: Record<string, any>,
): Promise<boolean> {
	// Auth first
	let token: string;
	try {
		const { data } = await axios.post(authUrl, {
			key: authKey,
		});
		if (
			isObject(data) &&
			data.success === true &&
			typeof data.token === "string"
		) {
			token = data.token;
		} else {
			// didn't work, try again later
			return false;
		}
	} catch (e) {
		// didn't work, try again later
		return false;
	}

	// Send data later
	try {
		const { data } = await axios.post(
			metricsUrl,
			{
				data: [metrics],
			},
			{
				headers: {
					"x-access-token": `Bearer ${token}`,
				},
			},
		);
		if (isObject(data) && typeof data.success === "boolean") {
			return data.success;
		}
		return false;
	} catch (e) {
		// didn't work, try again later
		return false;
	}
}
