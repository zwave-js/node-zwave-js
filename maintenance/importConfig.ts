/*!
 * This script is used to import the Z-Wave device database from
 * https://www.cd-jackson.com/zwave_device_database/zwave-database-json.gz.tar
 * and translate the information into a form this library expects
 */

/* eslint-disable @typescript-eslint/explicit-function-return-type */
process.on("unhandledRejection", r => {
	throw r;
});

import axios from "axios";
import * as fs from "fs-extra";
import * as path from "path";

const importDir = path.join(__dirname, "..", "config/import");

const urlIDs =
	"https://www.cd-jackson.com/index.php/zwave/zwave-device-database/database-summary";
const urlDevice = (id: string) =>
	`https://www.cd-jackson.com/index.php?option=com_zwave_database&view=devicesummary&format=json&id=${id}`;

async function fetchIDs(): Promise<string[]> {
	const sources: string = (await axios({ url: urlIDs })).data;
	const head = sources.substring(
		sources.indexOf("<head>") + 6,
		sources.indexOf("</head>"),
	);
	const idsString = head.match(/id=\[((?:\d+,?\s?)+)\]/)![1];
	const ids = idsString
		.split(",")
		.map(str => str.trim())
		.filter(str => str != "");
	return ids;
}

async function fetchDevice(id: string): Promise<string> {
	const source = (await axios({ url: urlDevice(id) })).data;
	return JSON.stringify(source, null, "\t");
}

async function downloadDB(): Promise<void> {
	process.stdout.write("Fetching database IDs...");
	const IDs = await fetchIDs();
	// Delete the last line
	process.stdout.write("\r\x1b[K");

	await fs.ensureDir(importDir);
	for (let i = 0; i < IDs.length; i++) {
		process.stdout.write(
			`Fetching device config ${i + 1} of ${IDs.length}...`,
		);
		const content = await fetchDevice(IDs[i]);
		await fs.writeFile(
			path.join(importDir, `${IDs[i]}.json`),
			content,
			"utf8",
		);
		// Delete the last line
		process.stdout.write("\r\x1b[K");
	}
	console.log("done!");
}

async function parseConfigFile(filename: string): Promise<string> {
	const content = JSON.parse(await fs.readFile(filename, "utf8"));
	const ret = {
		_approved: content.state === "1",
		...(content.errors?.length ? { _errors: content.errors } : undefined),
		...(content.warnings?.length
			? { _warnings: content.warnings }
			: undefined),
		name: content.description,
		label: content.label,
		devices: content.type_id
			.split(",")
			.filter(Boolean)
			.map((ref: string) => {
				const [productType, productId] = ref
					.trim()
					.split(":")
					.map(str => "0x" + str);
				return { productType, productId };
			}),
		firmwareVersion: {
			min: content.versionminDisplay,
			max: content.versionmaxDisplay,
		},
	};
	// Add comment explaining which devices this file contains
	return `// ${content.manufacturer} ${content.description} (${content.label})
${JSON.stringify(ret, undefined, 4)}`;
}

async function importConfigFiles(): Promise<void> {
	const configFiles = (await fs.readdir(importDir)).filter(
		file => file.endsWith(".json") && !file.startsWith("_"),
	);
	console.error(await parseConfigFile(path.join(importDir, configFiles[0])));
}

(async () => {
	if (process.argv.includes("download")) {
		await downloadDB();
	} else if (process.argv.includes("import")) {
		await importConfigFiles();
	}
})();
