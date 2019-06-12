import * as colors from "ansi-colors";
import { format } from "logform";
import winston = require("winston");
const defaultColors = winston.config.npm.colors;

// This is a placeholder
export interface ColorizerOptions {
	__foo?: undefined;
}

export const colorizer = format((info, _opts: ColorizerOptions) => {
	const textColor: colors.StyleFunction =
		colors[defaultColors[info.level] as string];
	// Colorize all segments separately
	info.message = textColor(info.message);
	info.direction = colors.gray(info.direction);
	if (info.prefix) {
		info.prefix = textColor(info.prefix);
	}
	if (info.postfix) {
		info.postfix = colors.gray(info.postfix);
	}
	return info;
});
