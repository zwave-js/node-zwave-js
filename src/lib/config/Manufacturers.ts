import { padStart } from "alcalzone-shared/strings";
import { readFile } from "fs-extra";
import * as JSON5 from "json5";
import * as path from "path";

let manufacturers: Record<string, string> | undefined;
async function loadManufacturers(): Promise<Record<string, string>> {
	// TODO: Extract the path resolution
	const fileContents = await readFile(
		path.join(__dirname, "../../../config/manufacturers.json"),
		"utf8",
	);
	return JSON5.parse(fileContents);
}

export async function lookupManufacturer(
	manufacturerID: number,
): Promise<string | undefined> {
	if (!manufacturers) manufacturers = await loadManufacturers();
	const key = "0x" + padStart(manufacturerID.toString(16), 4, "0");
	return manufacturers[key];
}
