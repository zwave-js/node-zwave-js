import { ConfigManager } from "../src";

async function main() {
	const cm = new ConfigManager();
	await cm.loadFulltextDeviceIndex();
}
void main();
