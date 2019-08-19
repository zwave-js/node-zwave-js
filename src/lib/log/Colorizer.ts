import colors from "ansi-colors";
import { format } from "logform";
import winston from "winston";
import { ZWaveLogInfo } from "./shared";
const defaultColors = winston.config.npm.colors;

// This is a placeholder
interface ColorizerOptions {
	__foo?: undefined;
}

const primaryTagRegex = /\[([^\]]+)\]/g;

function getBgColorName(color: string): string {
	return `bg${color[0].toUpperCase()}${color.slice(1)}`;
}

export const colorizer = format(
	(info: ZWaveLogInfo, _opts: ColorizerOptions) => {
		const textColor: colors.StyleFunction = (colors as any)[
			defaultColors[info.level] as string
		];
		const bgColor: colors.StyleFunction = (colors as any)[
			getBgColorName(defaultColors[info.level] as string)
		];
		// Colorize all segments separately
		info.message = textColor(info.message);
		info.direction = colors.gray(info.direction);
		if (info.label) {
			info.label = colors.gray.inverse(info.label);
		}
		if (info.timestamp) {
			info.timestamp = colors.gray(info.timestamp);
		}
		if (info.primaryTags) {
			info.primaryTags = textColor(
				info.primaryTags.replace(
					primaryTagRegex,
					(match, group1) =>
						bgColor("[") + colors.inverse(group1) + bgColor("]"),
				),
			);
		}
		if (info.secondaryTags) {
			info.secondaryTags = colors.gray(info.secondaryTags);
		}
		return info;
	},
);
