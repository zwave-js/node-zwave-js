"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.stringToNodeList = exports.nonUndefinedLogConfigKeys = exports.getNodeTag = exports.LOG_PREFIX_WIDTH = exports.LOG_WIDTH = exports.directionPrefixPadding = exports.CONTROL_CHAR_WIDTH = exports.getDirectionPrefix = exports.channelPadding = exports.timestampPadding = exports.timestampPaddingShort = exports.timestampFormatShort = void 0;
const strings_1 = require("alcalzone-shared/strings");
exports.timestampFormatShort = "HH:mm:ss.SSS";
exports.timestampPaddingShort = " ".repeat(exports.timestampFormatShort.length + 1);
exports.timestampPadding = " ".repeat(new Date().toISOString().length + 1);
/** @internal */
exports.channelPadding = " ".repeat(7); // 6 chars channel name, 1 space
// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
function getDirectionPrefix(direction) {
    return direction === "inbound"
        ? "« "
        : direction === "outbound"
            ? "» "
            : "  ";
}
exports.getDirectionPrefix = getDirectionPrefix;
/** The space the directional arrows, grouping brackets and padding occupies */
exports.CONTROL_CHAR_WIDTH = 2;
exports.directionPrefixPadding = " ".repeat(exports.CONTROL_CHAR_WIDTH);
/**
 * The width of a log line in (visible) characters, excluding the timestamp and
 * label, but including the direction prefix
 */
exports.LOG_WIDTH = 80;
/** The width of the columns containing the timestamp and channel */
exports.LOG_PREFIX_WIDTH = 20;
/** Returns the tag used to log node related messages */
function getNodeTag(nodeId) {
    return "Node " + (0, strings_1.padStart)(nodeId.toString(), 3, "0");
}
exports.getNodeTag = getNodeTag;
/** @internal */
exports.nonUndefinedLogConfigKeys = [
    "enabled",
    "level",
    "transports",
    "logToFile",
    "maxFiles",
    "filename",
    "forceConsole",
];
/** @internal */
function stringToNodeList(nodes) {
    if (!nodes)
        return undefined;
    return nodes
        .split(",")
        .map((n) => parseInt(n))
        .filter((n) => !Number.isNaN(n));
}
exports.stringToNodeList = stringToNodeList;
//# sourceMappingURL=shared_safe.js.map