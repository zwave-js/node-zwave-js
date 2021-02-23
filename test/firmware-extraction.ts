import { extractFirmware, guessFirmwareFileFormat } from "@zwave-js/core";
import * as fs from "fs-extra";

void (async () => {
	const filename = process.argv[2];
	const data = await fs.readFile(filename);
	const format = guessFirmwareFileFormat(filename, data);
	extractFirmware(data, format);
})();
