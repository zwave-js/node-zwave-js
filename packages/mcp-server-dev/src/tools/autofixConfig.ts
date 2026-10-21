import { readFile, writeFile } from "node:fs/promises";

import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { clearTemplateCache } from "@zwave-js/config";
import spawn from "nano-spawn";
import type { ASTNode } from "vscode-json-languageservice";

import {
	type ObjectPropertyASTNode,
	tryExpandPropertyRange,
} from "../configDoc/astUtils.js";
import { parseConfigDocument } from "../configDoc/configDocument.js";
import { DiagnosticType } from "../configDoc/diagnostics.js";
import { generateImportOverrideDiagnostics } from "../configDoc/importOverrideDiagnostics.js";
import { DEVICES_DIR, REPO_ROOT, fs } from "../configEnv.js";
import type { ToolHandler } from "../types.js";

export const TOOL_NAME = "autofix_config";

interface ESLintMessage {
	ruleId: string;
	severity: number;
	message: string;
	line: number;
	column: number;
	nodeType: string | null;
	messageId: string;
	endLine: number;
	endColumn: number;
	suggestions?: Array<{
		messageId: string;
		data: Record<string, string>;
		fix: {
			range: [number, number];
			text: string;
		};
		desc: string;
	}>;
}

interface ESLintResult {
	filePath: string;
	messages: ESLintMessage[];
	suppressedMessages: unknown[];
	errorCount: number;
	fatalErrorCount: number;
	warningCount: number;
	fixableErrorCount: number;
	fixableWarningCount: number;
	source: string;
	usedDeprecatedRules: unknown[];
}

interface AutofixConfigArgs {
	filename: string;
}

/**
 * Runs ESLint with `--fix`, then applies the first suggestion of each
 * remaining error (these are typically produced by the custom @zwave-js/...
 * rules). Returns a human-readable description of each applied suggestion.
 */
async function applyEslintFixes(filename: string): Promise<string[]> {
	let eslintResult;
	try {
		// ESLint already writes its own auto-fixes to disk here
		eslintResult = await spawn(
			"yarn",
			[
				"workspace",
				"@zwave-js/config",
				"run",
				"lint:config:eslint",
				"-f",
				"json",
				"--fix",
				"--",
				filename,
			],
			{
				cwd: REPO_ROOT,
				stdio: "pipe",
			},
		);
	} catch (error: any) {
		// ESLint returns a non-zero exit code when there are issues,
		// but we still want to parse the output
		eslintResult = error;
	}

	let results: ESLintResult[];
	try {
		results = JSON.parse(eslintResult.stdout);
	} catch (parseError) {
		throw new Error(
			`Failed to parse ESLint output: ${String(
				parseError,
			)}\n\nRaw output:\n${eslintResult.stdout}\n\nStderr:\n${eslintResult.stderr}`,
		);
	}

	if (!results || results.length === 0) return [];

	// Find all messages that have suggestions, which are likely created by
	// @zwave-js/... rules, and apply those suggestions to the file
	const fileResult = results[0];
	const errorsWithSuggestions = fileResult.messages.filter(
		(msg) =>
			msg.severity === 2 && msg.suggestions && msg.suggestions.length > 0,
	);

	if (errorsWithSuggestions.length === 0) return [];

	const originalContent = await readFile(filename, "utf-8");

	// Sort errors by position (last to first) to avoid range shifting
	errorsWithSuggestions.sort((a, b) => {
		if (a.line !== b.line) return b.line - a.line;
		return b.column - a.column;
	});

	let modifiedContent = originalContent;
	const appliedFixes: string[] = [];

	for (const error of errorsWithSuggestions) {
		const suggestion = error.suggestions![0]; // Use the first suggestion
		const [start, end] = suggestion.fix.range;
		modifiedContent =
			modifiedContent.slice(0, start)
			+ suggestion.fix.text
			+ modifiedContent.slice(end);

		appliedFixes.push(
			`Line ${error.line}: ${error.message} -> ${suggestion.desc}`,
		);
	}

	await writeFile(filename, modifiedContent, "utf-8");
	return appliedFixes;
}

/**
 * Deletes properties that redundantly re-state an imported template's value
 * (the config editor's "Remove unnecessary override" quick fix). Returns the
 * number of properties removed.
 *
 * @param filename Absolute path to the device config file to fix
 */
async function removeUnnecessaryOverrides(filename: string): Promise<number> {
	let text = await readFile(filename, "utf8");

	// Read templates fresh from disk, then resolve the whole file once
	clearTemplateCache();
	const doc = await parseConfigDocument(fs, filename, DEVICES_DIR, text);

	// Collect the text range to delete for each unnecessary override. The
	// diagnostic only ever flags direct param properties that follow their
	// `$import`, so tryExpandPropertyRange always extends backwards to the
	// preceding comma and the resulting ranges are mutually disjoint.
	const ranges: { start: number; end: number }[] = [];
	for (const diag of generateImportOverrideDiagnostics(doc)) {
		if (diag.type !== DiagnosticType.UnnecessaryImportOverride) continue;

		const node: ASTNode | undefined = doc.json.getNodeFromOffset(
			doc.text.offsetAt(diag.range.start),
		);
		const propNode = node?.parent;
		if (!propNode || propNode.type !== "property") continue;

		const range = tryExpandPropertyRange(
			doc.text,
			propNode as ObjectPropertyASTNode,
		);
		ranges.push({
			start: doc.text.offsetAt(range.start),
			end: doc.text.offsetAt(range.end),
		});
	}

	// Delete back to front so each removal leaves the earlier offsets intact
	ranges.sort((a, b) => b.start - a.start);
	for (const { start, end } of ranges) {
		text = text.slice(0, start) + text.slice(end);
	}

	if (ranges.length > 0) await writeFile(filename, text, "utf8");
	return ranges.length;
}

/**
 * Returns the import-override issues that cannot be fixed automatically and
 * require manual attention (allowed vs. minValue/maxValue conflicts across an
 * import boundary). These are flagged by the config editor but not by ESLint.
 *
 * @param filename Absolute path to the device config file to check
 */
async function remainingImportOverrideIssues(
	filename: string,
): Promise<string[]> {
	clearTemplateCache();
	const doc = await parseConfigDocument(fs, filename, DEVICES_DIR);
	const issues: { message: string; line: number; column: number }[] = [];

	for (const diag of generateImportOverrideDiagnostics(doc)) {
		if (diag.type !== DiagnosticType.AllowedMinMaxConflict) continue;
		issues.push({
			message: diag.localHasAllowed
				? `The "allowed" field cannot be used when the imported template defines "minValue" or "maxValue".`
				: `"minValue"/"maxValue" cannot be used when the imported template defines "allowed".`,
			line: diag.range.start.line + 1,
			column: diag.range.start.character + 1,
		});
	}

	issues.sort((a, b) => a.line - b.line || a.column - b.column);
	return issues.map(
		(i) => `${i.message} (line ${i.line}, column ${i.column})`,
	);
}

async function handleAutofixConfig(
	args: AutofixConfigArgs,
): Promise<CallToolResult> {
	const { filename } = args;

	if (!filename) {
		return {
			content: [
				{ type: "text", text: "Error: filename argument is required" },
			],
			isError: true,
		};
	}

	let eslintFixes: string[];
	try {
		eslintFixes = await applyEslintFixes(filename);
	} catch (error: any) {
		return {
			content: [{ type: "text", text: String(error.message ?? error) }],
			isError: true,
		};
	}

	let removedOverrides: number;
	let remainingIssues: string[];
	try {
		removedOverrides = await removeUnnecessaryOverrides(filename);
		remainingIssues = await remainingImportOverrideIssues(filename);
	} catch (error: any) {
		return {
			content: [
				{
					type: "text",
					text: `Failed to fix import overrides in ${filename}: ${String(
						error,
					)}`,
				},
			],
			isError: true,
		};
	}

	const sections: string[] = [];
	if (eslintFixes.length > 0) {
		sections.push(
			`Applied ${eslintFixes.length} ESLint fix${
				eslintFixes.length === 1 ? "" : "es"
			}:\n${eslintFixes.join("\n")}`,
		);
	}
	if (removedOverrides > 0) {
		sections.push(
			`Removed ${removedOverrides} unnecessary import override${
				removedOverrides === 1 ? "" : "s"
			}.`,
		);
	}
	if (sections.length === 0) {
		sections.push(`No automatic fixes were necessary in ${filename}.`);
	}
	if (remainingIssues.length > 0) {
		sections.push(
			`Import-override issues requiring manual attention:\n${remainingIssues
				.map((i) => `- ${i}`)
				.join("\n")}`,
		);
	}

	return {
		content: [{ type: "text", text: sections.join("\n\n") }],
		// Surface unfixable conflicts as an error so they aren't missed
		isError: remainingIssues.length > 0,
	};
}

export const autofixConfigTool: ToolHandler<AutofixConfigArgs> = {
	name: TOOL_NAME,
	description:
		"Automatically fix a device config file: apply ESLint fixes, remove "
		+ "unnecessary overrides of imported template properties, and report any "
		+ "remaining import-override conflicts (allowed vs. minValue/maxValue) "
		+ "that must be resolved manually.",
	annotations: {
		readOnlyHint: false,
		destructiveHint: true,
		idempotentHint: true,
		openWorldHint: false,
	},
	inputSchema: {
		type: "object",
		properties: {
			filename: {
				type: "string",
				description: "Absolute path to the configuration file to fix",
			},
		},
		required: ["filename"],
	},
	handler: handleAutofixConfig,
};
