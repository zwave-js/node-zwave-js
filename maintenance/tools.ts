import * as fs from "fs";
import * as path from "path";

/**
 * Recursively enumerates all files in the given directory
 * @param dir The directory to scan
 * @param predicate An optional predicate to apply to every found file system entry
 * @returns A list of all files found
 */
export function enumFilesRecursiveSync(
	dir: string,
	predicate?: (name: string, parentDir: string) => boolean,
): string[] {
	const ret: string[] = [];
	if (typeof predicate !== "function") predicate = () => true;
	// enumerate all files in this directory
	const filesOrDirs = fs
		.readdirSync(dir)
		.filter(f => predicate!(f, dir)) // exclude all files starting with "."
		.map(f => path.join(dir, f)); // and prepend the full path
	for (const entry of filesOrDirs) {
		if (fs.statSync(entry).isDirectory()) {
			// Continue recursing this directory and remember the files there
			ret.push(...enumFilesRecursiveSync(entry, predicate));
		} else {
			// remember this file
			ret.push(entry);
		}
	}
	return ret;
}

/**
 * Enumerates all files in the given directory
 * @param dir The directory to scan
 * @param predicate An optional predicate to apply to every found file system entry
 * @returns A list of all files found
 */
export function enumFilesSync(
	dir: string,
	predicate?: (name: string) => boolean,
): string[] {
	if (typeof predicate !== "function") predicate = () => true;
	// enumerate all files in this directory
	return fs
		.readdirSync(dir)
		.filter(f => !fs.statSync(f).isDirectory())
		.filter(f => predicate!(f))
		.map(f => path.join(dir, f)); // and prepend the full path
}
