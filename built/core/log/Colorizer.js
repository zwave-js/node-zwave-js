"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.colorizer = void 0;
const ansi_colors_1 = __importDefault(require("ansi-colors"));
const logform_1 = require("logform");
const winston_1 = __importDefault(require("winston"));
const defaultColors = winston_1.default.config.npm.colors;
const primaryAndInlineTagRegex = /\[([^\]]+)\]/g;
function getBgColorName(color) {
    return `bg${color[0].toUpperCase()}${color.slice(1)}`;
}
function colorizeTextAndTags(textWithTags, textColor, bgColor) {
    return textColor(textWithTags.replace(primaryAndInlineTagRegex, (match, group1) => bgColor("[") + ansi_colors_1.default.inverse(group1) + bgColor("]")));
}
exports.colorizer = (0, logform_1.format)(((info, _opts) => {
    const textColor = ansi_colors_1.default[defaultColors[info.level]];
    const bgColor = ansi_colors_1.default[getBgColorName(defaultColors[info.level])];
    // Colorize all segments separately
    if (typeof info.message === "string") {
        info.message = colorizeTextAndTags(info.message, textColor, bgColor);
    }
    else {
        info.message = info.message.map((msg) => colorizeTextAndTags(msg, textColor, bgColor));
    }
    info.direction = ansi_colors_1.default.white(info.direction);
    if (info.label) {
        info.label = ansi_colors_1.default.gray.inverse(info.label);
    }
    if (info.timestamp) {
        info.timestamp = ansi_colors_1.default.gray(info.timestamp);
    }
    if (info.primaryTags) {
        info.primaryTags = colorizeTextAndTags(info.primaryTags, textColor, bgColor);
    }
    if (info.secondaryTags) {
        info.secondaryTags = ansi_colors_1.default.gray(info.secondaryTags);
    }
    return info;
}));
//# sourceMappingURL=Colorizer.js.map