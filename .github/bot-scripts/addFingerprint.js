// @ts-check

/// <reference path="types.d.ts" />

const { ConfigManager } = require("@zwave-js/config");
const { formatId } = require("@zwave-js/shared");
const JSONC = require("comment-json");
const fs = require("fs-extra");
const { formatWithPrettier } = require("./utils");

/**
 * @param {{github: Github, context: Context}} param
 */
async function main(param) {
	const { github, context } = param;

	const cm = new ConfigManager();
	await cm.loadDeviceIndex();

	const idParts = process.env.id.split(":");
	const manufacturerId = parseInt(idParts[0], 16);
	const productType = parseInt(idParts[1], 16);
	const productId = parseInt(idParts[2], 16);
	const firmwareVersion = idParts[3];

	const fingerprintParts = process.env.fingerprint.split(":");
	const newProductType = parseInt(fingerprintParts[0], 16);
	const newProductId = parseInt(fingerprintParts[1], 16);

	const device = await cm.lookupDevice(
		manufacturerId,
		productType,
		productId,
		firmwareVersion,
	);

	const filename = device && device.filename;
	if (filename) {
		// Read file as JSONC
		let content = await fs.readFile(filename, "utf8");
		const json = JSONC.parse(content);

		// Add the fingerprint
		json.devices.push({
			productType: formatId(newProductType),
			productId: formatId(newProductId),
		});

		// And save it again
		content = JSONC.stringify(json, undefined, "\t");
		content = formatWithPrettier("file.json", content);
		await fs.writeFile(filename, content, "utf8");

		// Return the device label so it can be used in the PR title
		return `${json.manufacturer} ${json.label}`;
	}
}
module.exports = main;
