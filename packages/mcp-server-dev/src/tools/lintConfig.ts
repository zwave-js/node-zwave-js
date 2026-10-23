import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import spawn from "nano-spawn";

import { REPO_ROOT } from "../configEnv.js";
import type { ToolHandler } from "../types.js";

export const TOOL_NAME = "lint_config";

interface LintConfigArgs {
	filename?: string;
}

async function handleLintConfig(args: LintConfigArgs): Promise<CallToolResult> {
	const { filename } = args;

	// Check in two steps:
	// 1. Run the custom linting script
	// 2. If that succeeds, run ESLint on the specific file

	try {
		await spawn(
			"yarn",
			["workspace", "@zwave-js/config", "run", "lint:config:custom"],
			{
				cwd: REPO_ROOT,
				stdio: "pipe",
			},
		);
	} catch (error: any) {
		return {
			content: [
				{
					type: "text",
					text: `Semantic check failed: ${error.message}\n\nOutput:\n${
						error.stdout || ""
					}${error.stderr ? `\nStderr:\n${error.stderr}` : ""}`,
				},
			],
			isError: true,
		};
	}

	if (!filename) {
		return {
			content: [
				{
					type: "text",
					text: "No filename provided. Skipping ESLint check.",
				},
			],
			isError: false,
		};
	}

	let eslintResult;
	try {
		eslintResult = await spawn(
			"yarn",
			[
				"workspace",
				"@zwave-js/config",
				"run",
				"lint:config:eslint",
				"-f",
				"json",
				"--",
				filename,
			],
			{
				cwd: REPO_ROOT,
				stdio: "pipe",
			},
		);
	} catch (error: any) {
		// ESLint returns non-zero exit code when there are issues,
		// but we still want to parse the output
		eslintResult = error;
	}

	let results: any[];
	try {
		results = JSON.parse(eslintResult.stdout);
	} catch (parseError) {
		return {
			content: [
				{
					type: "text",
					text: `Failed to parse ESLint output: ${String(
						parseError,
					)}\n\nRaw output:\n${eslintResult.stdout}\n\nStderr:\n${eslintResult.stderr}`,
				},
			],
			isError: true,
		};
	}

	if (!results || results.length === 0) {
		return {
			content: [
				{
					type: "text",
					text: "No ESLint results found for the file.",
				},
			],
		};
	}

	const issues = results.flatMap((result) => result.messages);
	if (issues.length === 0) {
		return {
			content: [
				{
					type: "text",
					text: "No linting issues found in the configuration file.",
				},
			],
		};
	}

	return {
		content: [
			{
				type: "text",
				text:
					`Linting issues found in ${filename}:\n\n`
					+ issues
						.map((issue) => {
							return `- ${issue.message} (line ${issue.line}, column ${issue.column})`;
						})
						.join("\n"),
			},
		],
		isError: true,
	};
}

export const lintConfigTool: ToolHandler = {
	name: TOOL_NAME,
	description: "Check semantic correctness of configuration files",
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
				description: "Absolute path to the configuration file to lint",
			},
		},
		required: [],
	},
	handler: handleLintConfig,
};
