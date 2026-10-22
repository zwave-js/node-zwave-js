import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { clearTemplateCache, resolveTemplateImport } from "@zwave-js/config";

import { DEVICES_DIR, fs } from "../configEnv.js";
import type { ToolHandler } from "../types.js";

import { errorResult, jsonResult } from "./results.js";

export const TOOL_NAME = "resolve_config_import";

interface ResolveConfigImportArgs {
	filename: string;
	specifier: string;
}

async function handleResolveConfigImport(
	args: ResolveConfigImportArgs,
): Promise<CallToolResult> {
	const { filename, specifier } = args;

	if (!filename) return errorResult("Error: filename argument is required");
	if (!specifier) return errorResult("Error: specifier argument is required");

	// Read files fresh so edits between calls are not served from the cache
	clearTemplateCache();

	try {
		const resolved = await resolveTemplateImport(
			fs,
			filename,
			specifier,
			DEVICES_DIR,
		);
		return jsonResult(resolved);
	} catch (error: any) {
		return errorResult(`Failed to resolve import: ${String(error)}`);
	}
}

export const resolveImportTool: ToolHandler<ResolveConfigImportArgs> = {
	name: TOOL_NAME,
	description:
		"Resolve an $import specifier to the JSON it pulls in, with the "
		+ "imported file's own $imports resolved recursively. Mirrors the config "
		+ "editor's import hover preview.",
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
					"Absolute path to the config file the $import appears in "
					+ "(used to resolve relative and same-file imports)",
			},
			specifier: {
				type: "string",
				description:
					"The $import specifier, e.g. "
					+ '"~/templates/master_template.json#base_enable_disable"',
			},
		},
		required: ["filename", "specifier"],
	},
	handler: handleResolveConfigImport,
};
