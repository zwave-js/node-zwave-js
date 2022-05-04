import { ZWaveError, ZWaveErrorCodes } from "@zwave-js/core/safe";
import { getErrorMessage } from "@zwave-js/shared/safe";
import { isArray, isObject } from "alcalzone-shared/typeguards";
import * as fs from "fs-extra";
import JSON5 from "json5";
import * as path from "path";

const IMPORT_KEY = "$import";
const importSpecifierRegex =
	/^(?<filename>(?:~\/)?[\w\d\/\\\._-]+\.json)?(?:#(?<selector>[\w\d\/\._-]+(?:\[0x[0-9a-fA-F]+\])?))?$/i;

type FileCache = Map<string, Record<string, unknown>>;

// The template cache is used to speed up cases where the same files get parsed multiple times,
// e.g. during config file linting. It should be cleared whenever the files need to be loaded fresh
// from disk, like when creating an index
const templateCache: FileCache = new Map();
export function clearTemplateCache(): void {
	templateCache.clear();
}

/** Parses a JSON file with $import keys and replaces them with the selected objects */
export async function readJsonWithTemplate(
	filename: string,
	rootDir?: string,
): Promise<Record<string, unknown>> {
	if (!(await fs.pathExists(filename))) {
		throw new ZWaveError(
			`Could not open config file ${filename}: not found!`,
			ZWaveErrorCodes.Config_NotFound,
		);
	}

	// Try to use the cached versions of the template files to speed up the loading
	const fileCache = new Map(templateCache);
	const ret = await readJsonWithTemplateInternal(
		filename,
		undefined,
		[],
		fileCache,
		rootDir,
	);

	// Only remember the cached templates, not the individual files to save RAM
	for (const [filename, cached] of fileCache) {
		if (/[\\/]templates[\\/]/.test(filename)) {
			templateCache.set(filename, cached);
		}
	}

	return ret;
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
		// Special case for paramInformation selectors to select params by #
		if (isArray(ret)) {
			const item = ret.find(
				(r) => isObject(r) && "#" in r && r["#"] === part,
			);
			if (item != undefined) {
				// Don't copy the param number
				const { ["#"]: _, ...rest } = item as any;
				ret = rest;
				continue;
			}
		}
		// By default select the object property
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

function getImportStack(
	visited: string[],
	selector: string | undefined,
): string {
	const source = [...visited, selector ? `#${selector}` : undefined]
		.reverse()
		.filter((s) => !!s) as string[];
	if (source.length > 0) {
		return `\nImport stack: ${source.map((s) => `\n  in ${s}`).join("")}`;
	}
	return "";
}

async function readJsonWithTemplateInternal(
	filename: string,
	selector: string | undefined,
	visited: string[],
	fileCache: FileCache,
	rootDir?: string,
): Promise<Record<string, unknown>> {
	filename = path.normalize(filename);

	// If we're limited by a root directory, make sure the file is inside that directory
	if (rootDir) {
		const relativeToRoot = path.relative(rootDir, filename);
		if (relativeToRoot.startsWith("..")) {
			throw new ZWaveError(
				`Tried to import config file "${filename}" outside of root directory "${rootDir}"!${getImportStack(
					visited,
					selector,
				)}`,
				ZWaveErrorCodes.Config_Invalid,
			);
		}
	}

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
			throw new ZWaveError(
				`Could not parse config file ${filename}: ${getErrorMessage(
					e,
				)}${getImportStack(visited, selector)}`,
				ZWaveErrorCodes.Config_Invalid,
			);
		}
	}
	// Resolve the JSON imports for (a subset) of the file and return the compound file
	return resolveJsonImports(
		selector ? select(json, selector) : json,
		filename,
		[...visited, specifier],
		fileCache,
		rootDir,
	);
}

/** Replaces all `$import` properties in a JSON object with object spreads of the referenced file/property */
async function resolveJsonImports(
	json: Record<string, unknown>,
	filename: string,
	visited: string[],
	fileCache: FileCache,
	rootDir?: string,
): Promise<Record<string, unknown>> {
	const ret: Record<string, unknown> = {};
	// Loop through all properties and copy them to the resulting object
	for (const [prop, val] of Object.entries(json)) {
		if (prop === IMPORT_KEY) {
			// This is an import statement. Make sure we're working with a string
			assertImportSpecifier(val, visited.join(" -> "));
			const { filename: importFilename, selector } =
				importSpecifierRegex.exec(val)!.groups!;

			// Resolve the correct import path
			let newFilename: string;
			if (importFilename) {
				if (importFilename.startsWith("~/")) {
					if (rootDir) {
						newFilename = path.join(
							rootDir,
							importFilename.slice(2),
						);
					} else {
						throw new ZWaveError(
							`An $import specifier cannot start with ~/ when no root directory is defined!${getImportStack(
								visited,
								selector,
							)}`,
							ZWaveErrorCodes.Config_Invalid,
						);
					}
				} else {
					newFilename = path.join(
						path.dirname(filename),
						importFilename,
					);
				}
			} else {
				newFilename = filename;
			}

			// const importFilename = path.join(path.dirname(filename), val);
			const imported = await readJsonWithTemplateInternal(
				newFilename,
				selector,
				visited,
				fileCache,
				rootDir,
			);
			Object.assign(ret, imported);
		} else if (isObject(val)) {
			// We're looking at an object, recurse into it
			ret[prop] = await resolveJsonImports(
				val,
				filename,
				visited,
				fileCache,
				rootDir,
			);
		} else if (isArray(val)) {
			// We're looking at an array, check if there are objects we need to recurse into
			const vals: unknown[] = [];
			for (const v of val) {
				if (isObject(v)) {
					vals.push(
						await resolveJsonImports(
							v,
							filename,
							visited,
							fileCache,
							rootDir,
						),
					);
				} else {
					vals.push(v);
				}
			}
			ret[prop] = vals;
		} else {
			ret[prop] = val;
		}
	}
	return ret;
}
