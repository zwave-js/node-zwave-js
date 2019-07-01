import * as colors from "ansi-colors";
import { format } from "logform";
import { ZWaveLogInfo } from "./shared";
import winston = require("winston");
const defaultColors = winston.config.npm.colors;

// This is a placeholder
export interface ColorizerOptions {
	__foo?: undefined;
}

export const colorizer = format(
	(info: ZWaveLogInfo, _opts: ColorizerOptions) => {
		const textColor: colors.StyleFunction = (colors as any)[
			defaultColors[info.level] as string
		];
		// Colorize all segments separately
		info.message = textColor(info.message);
		info.direction = colors.gray(info.direction);
		if (info.label) {
			info.label = colors.inverse(colors.gray(info.label));
		}
		if (info.timestamp) {
			info.timestamp = colors.gray(info.timestamp);
		}
		if (info.primaryTags) {
			info.primaryTags = textColor(info.primaryTags);
		}
		if (info.secondaryTags) {
			info.secondaryTags = colors.gray(info.secondaryTags);
		}
		return info;
	},
);
