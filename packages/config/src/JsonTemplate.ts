import { ZWaveError, ZWaveErrorCodes } from "@zwave-js/core";
import { isArray, isObject } from "alcalzone-shared/typeguards";
import * as fs from "fs-extra";
import JSON5 from "json5";
import * as path from "path";

const IMPORT_KEY = "$import";
const importSpecifierRegex = /^(?<filename>[\w\d\/\\\._-]+\.json)?(?:#(?<selector>[\w\d\/\._-]+(?:\[0x[0-9a-fA-F]+\])?))?$/i;
type FileCache = Map<string, Record<string, unknown>>;

/** Parses a JSON file with $import keys and replaces them with the selected objects */
export async function readJsonWithTemplate(
	filename: string,
): Promise<Record<string, unknown>> {
	if (!(await fs.pathExists(filename))) {
		throw new ZWaveError(
			`Could not open config file ${filename}: not found!`,
			ZWaveErrorCodes.Config_NotFound,
		);
	}
	return readJsonWithTemplateInternal(filename, undefined, [], new Map());
}

function assertImportSpecifier(
	val: unknown,
	source?: string,
): asserts val is string {
	if (typeof val !== "string") {
		throw new ZWaveError(
			`Invalid import specifier ${String(val)}!${
				source != undefined ? ` Source: ${source}` : ""
			}`,
			ZWaveErrorCodes.Config_Invalid,
		);
	}
	if (!importSpecifierRegex.test(val)) {
		throw new ZWaveError(
			`Import specifier "${val}" is invalid!${
				source != undefined ? ` Source: ${source}` : ""
			}`,
			ZWaveErrorCodes.Config_Invalid,
		);
	}
}

function getImportSpecifier(filename: string, selector?: string): string {
	let ret = filename;
	if (selector) ret += `#${selector}`;
	return ret;
}

function select(
	obj: Record<string, unknown>,
	selector: string,
): Record<string, unknown> {
	let ret: Record<string, unknown> = obj;
	const selectorParts = selector.split("/").filter((s): s is string => !!s);
	for (const part of selectorParts) {
		ret = (ret as any)[part];
	}
	if (!isObject(ret)) {
		throw new ZWaveError(
			`The import target "${selector}" is not an object!`,
			ZWaveErrorCodes.Config_Invalid,
		);
	}
	return ret;
}

async function readJsonWithTemplateInternal(
	filename: string,
	selector: string | undefined,
	visited: string[],
	fileCache: FileCache,
): Promise<Record<string, unknown>> {
	filename = path.normalize(filename);

	const specifier = getImportSpecifier(filename, selector);
	if (visited.includes(specifier)) {
		const msg = `Circular $import in config files: ${[
			...visited,
			specifier,
		].join(" -> ")}\n`;
		// process.stderr.write(msg + "\n");
		throw new ZWaveError(msg, ZWaveErrorCodes.Config_CircularImport);
	}

	let json: Record<string, unknown>;
	if (fileCache.has(filename)) {
		json = fileCache.get(filename)!;
	} else {
		try {
			const fileContent = await fs.readFile(filename, "utf8");
			json = JSON5.parse(fileContent);
			fileCache.set(filename, json);
		} catch (e) {
			let message = `Could not parse config file ${filename}: ${e.message}`;
			const source = [...visited, selector ? `#${selector}` : undefined]
				.reverse()
				.filter((s) => !!s) as string[];
			if (source.length > 0) {
				message += `\nImport stack: ${source
					.map((s) => `\n  in ${s}`)
					.join("")}`;
			}
			throw new ZWaveError(message, ZWaveErrorCodes.Config_Invalid);
		}
	}
	// Resolve the JSON imports for (a subset) of the file and return the compound file
	return resolveJsonImports(
		selector ? select(json, selector) : json,
		filename,
		[...visited, specifier],
		fileCache,
	);
}

/** Replaces all `$import` properties in a JSON object with object spreads of the referenced file/property */
async function resolveJsonImports(
	json: Record<string, unknown>,
	filename: string,
	visited: string[],
	fileCache: FileCache,
): Promise<Record<string, unknown>> {
	const ret: Record<string, unknown> = {};
	// Loop through all properties and copy them to the resulting object
	for (const [prop, val] of Object.entries(json)) {
		if (prop === IMPORT_KEY) {
			// This is an import statement. Make sure we're working with a string
			assertImportSpecifier(val, visited.join(" -> "));
			const {
				filename: importFilename,
				selector,
			} = importSpecifierRegex.exec(val)!.groups!;

			// const importFilename = path.join(path.dirname(filename), val);
			const imported = await readJsonWithTemplateInternal(
				// If a filename is specified, resolve it - else use the current file
				importFilename
					? path.join(path.dirname(filename), importFilename)
					: filename,
				selector,
				visited,
				fileCache,
			);
			Object.assign(ret, imported);
		} else if (isObject(val)) {
			// We're looking at an object, recurse into it
			ret[prop] = await resolveJsonImports(
				val,
				filename,
				visited,
				fileCache,
			);
		} else if (isArray(val)) {
			// We're looking at an array, check if there are objects we need to recurse into
			const tasks = val.map((v) =>
				isObject(v)
					? resolveJsonImports(v, filename, visited, fileCache)
					: v,
			);
			ret[prop] = await Promise.all(tasks);
		} else {
			ret[prop] = val;
		}
	}
	return ret;
}
