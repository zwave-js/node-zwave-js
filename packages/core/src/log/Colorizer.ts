import colors from "ansi-colors";
import { type TransformFunction, format } from "logform";
import winston from "winston";
import type { ZWaveLogInfo } from "./shared_safe.js";
const defaultColors = winston.config.npm.colors;

// This is a placeholder
interface ColorizerOptions {
	__foo?: undefined;
}

const primaryAndInlineTagRegex = /\[([^\]]+)\]/g;

function getBgColorName(color: string): string {
	return `bg${color[0].toUpperCase()}${color.slice(1)}`;
}

function colorizeTextAndTags(
	textWithTags: string,
	textColor: (input: string) => string,
	bgColor: (input: string) => string,
): string {
	return textColor(
		textWithTags.replaceAll(
			primaryAndInlineTagRegex,
			(match, group1) =>
				bgColor("[") + colors.inverse(group1) + bgColor("]"),
		),
	);
}

export const colorizer = format(
	((
		info: ZWaveLogInfo,
		_opts: ColorizerOptions,
	) => {
		const levelColorKey =
			defaultColors[info.level as keyof typeof defaultColors] as string;
		const textColor = (colors as any)[levelColorKey];
		const bgColor = (colors as any)[getBgColorName(levelColorKey)];
		// Colorize all segments separately
		if (typeof info.message === "string") {
			info.message = colorizeTextAndTags(
				info.message,
				textColor,
				bgColor,
			);
		} else {
			info.message = info.message.map((msg) =>
				colorizeTextAndTags(msg, textColor, bgColor)
			);
		}
		info.direction = colors.white(info.direction);
		if (info.label) {
			info.label = colors.gray.inverse(info.label);
		}
		if (info.timestamp) {
			info.timestamp = colors.gray(info.timestamp);
		}
		if (info.primaryTags) {
			info.primaryTags = colorizeTextAndTags(
				info.primaryTags,
				textColor,
				bgColor,
			);
		}
		if (info.secondaryTags) {
			info.secondaryTags = colors.gray(info.secondaryTags);
		}
		return info;
	}) as unknown as TransformFunction,
);
