import {
	type Formatter,
	type GlobalConfiguration,
	createFromBuffer,
} from "@dprint/formatter";
import { getPath as jsonGetPath } from "@dprint/json";
import { getPath as tsGetPath } from "@dprint/typescript";
import { getPath as mdGetPath } from "@dprint/markdown";
import fs from "fs";
import path from "path";
import JSON5 from "json5";
import { repoRoot } from "./tsAPITools";

const formatterCache = new Map<string, Formatter>();

interface Config {
	global: GlobalConfiguration;
	".ts": Record<string, unknown>;
	".json": Record<string, unknown>;
	".md": Record<string, unknown>;
}
let config: Config | undefined;

function getConfig(): Config {
	if (!config) {
		const fileContent = fs.readFileSync(
			path.join(repoRoot, ".dprint.jsonc"),
			"utf8",
		);
		const {
			lineWidth,
			useTabs,
			indentWidth,
			newLineKind,
			typescript,
			json,
			markdown,
		} = JSON5.parse(fileContent);

		config = {
			global: {
				lineWidth,
				useTabs,
				indentWidth,
				newLineKind,
			},
			".ts": typescript,
			".json": json,
			".md": markdown,
		};
	}
	return config;
}

function getFormatter(filename: string): Formatter {
	let extension = path.extname(filename);
	if (extension === ".ts" || extension === ".js") {
		extension = ".ts";
	}

	if (!formatterCache.has(extension)) {
		let buffer: Buffer;
		if (extension === ".ts" || extension === ".js") {
			extension = ".ts";
			buffer = fs.readFileSync(tsGetPath());
		} else if (extension === ".json") {
			buffer = fs.readFileSync(jsonGetPath());
		} else if (extension === ".md") {
			buffer = fs.readFileSync(mdGetPath());
		} else {
			throw new Error(`Unsupported extension: ${extension}`);
		}

		const formatter = createFromBuffer(buffer);
		const config = getConfig();
		formatter.setConfig(config.global, (config as any)[extension] ?? {});
		formatterCache.set(extension, formatter);
	}

	return formatterCache.get(extension)!;
}

export function formatWithDprint(filename: string, sourceText: string): string {
	const formatter = getFormatter(filename);
	return formatter.formatText(filename, sourceText);
}
