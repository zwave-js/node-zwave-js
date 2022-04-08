// Script to remove unnecessary min/maxValue from config files

import * as JSONC from "comment-json";
import * as fs from "fs-extra";
import path from "path";
import { enumFilesRecursive } from "../../shared/src";
import { formatWithPrettier } from "./prettier";

async function main() {
	const devicesDir = path.join(__dirname, "../../config/config/devices");

	const configFiles = await enumFilesRecursive(
		devicesDir,
		(file) =>
			file.endsWith(".json") &&
			!file.endsWith("index.json") &&
			!file.includes("/templates/") &&
			!file.includes("\\templates\\"),
	);

	for (const filename of configFiles) {
		const config = JSONC.parse(
			await fs.readFile(filename, "utf8"),
		) as JSONC.CommentObject;

		if (!config.paramInformation) continue;
		for (const param of config.paramInformation as JSONC.CommentArray<JSONC.CommentObject>) {
			if (
				param.allowManualEntry === false &&
				// Avoid false positives through imports
				!("$import" in param) &&
				param.options &&
				(param.options as any[]).length > 0
			) {
				if (typeof param.minValue === "number") delete param.minValue;
				if (typeof param.maxValue === "number") delete param.maxValue;
			}
		}

		let output = JSONC.stringify(config, null, "\t");
		output = formatWithPrettier(filename, output);
		await fs.writeFile(filename, output, "utf8");
	}
}

if (require.main === module) {
	void main();
}
