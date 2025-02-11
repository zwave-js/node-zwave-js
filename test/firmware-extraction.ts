import { extractFirmware, guessFirmwareFileFormat } from "@zwave-js/core";
import fs from "node:fs/promises";

void (async () => {
	const filename = process.argv[2];
	const data = await fs.readFile(filename);
	const format = guessFirmwareFileFormat(filename, data);
	await extractFirmware(data, format);
})();
