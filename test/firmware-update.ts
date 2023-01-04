import assert from "assert";
import { getAvailableFirmwareUpdates } from "../packages/zwave-js/src/lib/controller/FirmwareUpdateService";

async function main() {
	const get1 = () =>
		getAvailableFirmwareUpdates(
			{
				manufacturerId: 0x0063,
				productType: 0x4952,
				productId: 0x3138,
				firmwareVersion: "1.0",
			},
			{
				userAgent: "TEST",
			},
		);

	const get2 = () =>
		getAvailableFirmwareUpdates(
			{
				manufacturerId: 0x0063,
				productType: 0x4952,
				productId: 0x3131,
				firmwareVersion: "1.0",
			},
			{
				userAgent: "TEST",
			},
		);

	const upd1 = await get1();
	const upd2 = await get2();

	console.dir(upd1);
	console.dir(upd2);

	assert.notDeepStrictEqual(upd1, upd2);
}

void main();
