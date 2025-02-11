import colors from "ansi-colors";
import { configs } from "triple-beam";
import { type LogFormat } from "./format.js";

const defaultColors = configs.npm.colors;

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

export function colorizer(bg: boolean = true): LogFormat {
	return {
		transform: (info) => {
			const levelColorKey =
				defaultColors[info.level as keyof typeof defaultColors];
			const textColor = (colors as any)[levelColorKey];
			const bgColor = bg
				? (colors as any)[getBgColorName(levelColorKey)]
				: ((txt: string) => txt);
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
		},
	};
}
