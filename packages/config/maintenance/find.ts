import path from "path";
import { ConfigManager } from "../src/ConfigManager";

const configManager = new ConfigManager();
const deviceIdRegex =
	/^0x[0-9a-f]{4}:0x[0-9a-f]{4}:0x[0-9a-f]{4}(?::\d+\.\d+)?$/i;

async function main() {
	const pattern = process.argv[2];
	const match = deviceIdRegex.exec(pattern);
	if (!match) {
		console.error("Invalid device id pattern");
		process.exit(1);
	}

	const idParts = match[0].split(":");
	const manufacturerId = parseInt(idParts[0], 16);
	const productType = parseInt(idParts[1], 16);
	const productId = parseInt(idParts[2], 16);
	const firmwareVersion = idParts[3];

	await configManager.loadDeviceIndex();
	const device = await configManager.lookupDevice(
		manufacturerId,
		productType,
		productId,
		firmwareVersion,
	);
	if (device) {
		console.log();
		console.log(
			`Found config file for ${device.manufacturer} ${device.label}:`,
		);
		console.log();
		console.log(`\t` + path.relative(process.cwd(), device.filename));
		console.log();
	}
}

void main();
