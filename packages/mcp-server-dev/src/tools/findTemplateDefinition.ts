import { readFile } from "node:fs/promises";

import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { clearTemplateCache, resolveImportPath } from "@zwave-js/config";
import { tryParseParamNumber } from "@zwave-js/core";
import { parse as parseJsonC } from "jsonc-parser";

import { parseSymbols } from "../configDoc/configDocument.js";
import { DEVICES_DIR, fs, resolveDeviceConfigPath } from "../configEnv.js";
import type { ToolHandler } from "../types.js";

import { errorResult, textResult } from "./results.js";

export const TOOL_NAME = "find_template_definition";

interface FindTemplateDefinitionArgs {
	filename: string;
	specifier?: string;
	parameter?: number;
}

/** Reads the raw `$import` specifier of a parameter (first matching variant) */
async function findParamImport(
	filename: string,
	parameter: number,
): Promise<string | undefined> {
	const text = await readFile(filename, "utf8");
	const json = parseJsonC(text);
	const params = json?.paramInformation;
	if (!Array.isArray(params)) return undefined;

	for (const p of params) {
		if (typeof p !== "object" || p === null) continue;
		const key = (p as Record<string, unknown>)["#"];
		if (typeof key !== "string") continue;
		if (tryParseParamNumber(key)?.parameter !== parameter) continue;
		const imp = (p as Record<string, unknown>)["$import"];
		if (typeof imp === "string") return imp;
	}
	return undefined;
}

async function handleFindTemplateDefinition(
	args: FindTemplateDefinitionArgs,
): Promise<CallToolResult> {
	const { filename, parameter } = args;
	let { specifier } = args;

	if (!filename) return errorResult("Error: filename argument is required");

	clearTemplateCache();

	try {
		if (!specifier && parameter != undefined) {
			specifier = await findParamImport(filename, parameter);
			if (!specifier) {
				return errorResult(
					`Parameter #${parameter} in ${filename} has no $import to navigate to.`,
				);
			}
		}
		if (!specifier) {
			return errorResult(
				"Error: provide either a specifier or a parameter that uses $import",
			);
		}

		const importPath = await resolveImportPath(
			fs,
			filename,
			specifier,
			DEVICES_DIR,
		);
		if (!importPath) {
			return errorResult(
				`Could not locate the file referenced by "${specifier}".`,
			);
		}
		// The specifier may point anywhere, so the import target must be checked too
		const targetFile = await resolveDeviceConfigPath(importPath);
		if (!targetFile) {
			return errorResult(
				`Error: the import target must be located inside ${DEVICES_DIR}`,
			);
		}

		const hashIndex = specifier.indexOf("#");
		const templateKey =
			hashIndex >= 0 ? specifier.slice(hashIndex + 1) : undefined;

		if (!templateKey) {
			return textResult(
				`${targetFile}:1:1\n(specifier has no #key, points at the whole file)`,
			);
		}

		const text = await readFile(targetFile, "utf8");
		const { symbols } = parseSymbols(targetFile, text);
		const symbol = symbols.find((s) => s.name === templateKey);

		if (!symbol) {
			return textResult(
				`${targetFile}:1:1\n(file resolved, but template "${templateKey}" was not found in it)`,
			);
		}

		const { line, character } = symbol.location.range.start;
		return textResult(
			`${targetFile}:${line + 1}:${character + 1}\n`
				+ `Definition of "${templateKey}"`,
		);
	} catch (error: any) {
		return errorResult(
			`Failed to find template definition: ${String(error)}`,
		);
	}
}

export const findTemplateDefinitionTool: ToolHandler<FindTemplateDefinitionArgs> =
	{
		name: TOOL_NAME,
		description:
			"Navigate to where an imported template is defined. Given a config file "
			+ "and either an $import specifier or a parameter number that uses "
			+ "$import, returns the target file and the line/column of the "
			+ "definition (file start if the specifier has no #key).",
		annotations: {
			readOnlyHint: true,
			destructiveHint: false,
			idempotentHint: true,
			openWorldHint: false,
		},
		inputSchema: {
			type: "object",
			properties: {
				filename: {
					type: "string",
					description:
						"Absolute path to the config file the import appears in",
				},
				specifier: {
					type: "string",
					description:
						"The $import specifier to resolve, e.g. "
						+ '"~/templates/master_template.json#base_enable_disable"',
				},
				parameter: {
					type: "number",
					description:
						"Alternatively, a parameter number whose $import should be "
						+ "resolved (used when specifier is omitted)",
				},
			},
			required: ["filename"],
		},
		handler: handleFindTemplateDefinition,
	};
