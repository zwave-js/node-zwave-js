import { formatId } from "@zwave-js/shared";
import axios from "axios";
import type { AvailableFirmwareUpdates } from "./_Types";

const serviceURL = "https://firmware.zwave-js.io";
// const serviceURL = "http://localhost:3000";

/**
 * Retrieves the available firmware updates for the node with the given fingerprint.
 * Returns the service response or `undefined` in case of an error.
 */
export async function getAvailableFirmwareUpdates(
	manufacturerId: number,
	productType: number,
	productId: number,
	firmwareVersion: string,
): Promise<AvailableFirmwareUpdates> {
	const response: AvailableFirmwareUpdates = (
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
