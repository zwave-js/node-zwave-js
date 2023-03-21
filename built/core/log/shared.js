"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.restoreSilence = exports.unsilence = exports.tagify = exports.messageRecordToLines = exports.messageToLines = exports.messageFitsIntoOneLine = exports.createDefaultTransportFormat = exports.logMessageFormatter = exports.createLogMessagePrinter = exports.createLoggerFormat = exports.ZWaveLogContainer = exports.ZWaveLoggerBase = void 0;
const shared_1 = require("@zwave-js/shared");
const path = __importStar(require("path"));
const triple_beam_1 = require("triple-beam");
const winston_1 = __importDefault(require("winston"));
const winston_daily_rotate_file_1 = __importDefault(require("winston-daily-rotate-file"));
const Colorizer_1 = require("./Colorizer");
const shared_safe_1 = require("./shared_safe");
const { combine, timestamp, label } = winston_1.default.format;
const loglevels = triple_beam_1.configs.npm.levels;
const isTTY = process.stdout.isTTY;
const isUnitTest = process.env.NODE_ENV === "test";
class ZWaveLoggerBase {
    constructor(loggers, logLabel) {
        this.container = loggers;
        this.logger = this.container.getLogger(logLabel);
    }
}
exports.ZWaveLoggerBase = ZWaveLoggerBase;
class ZWaveLogContainer extends winston_1.default.Container {
    constructor(config = {}) {
        super();
        this.loglevelVisibleCache = new Map();
        this.logConfig = {
            enabled: true,
            level: getTransportLoglevel(),
            logToFile: !!process.env.LOGTOFILE,
            maxFiles: 7,
            nodeFilter: (0, shared_safe_1.stringToNodeList)(process.env.LOG_NODES),
            transports: undefined,
            filename: require.main
                ? path.join(path.dirname(require.main.filename), `zwavejs_%DATE%.log`)
                : path.join(__dirname, "../../..", `zwavejs_%DATE%.log`),
            forceConsole: false,
        };
        this.updateConfiguration(config);
    }
    getLogger(label) {
        if (!this.has(label)) {
            this.add(label, {
                transports: this.getAllTransports(),
                format: createLoggerFormat(label),
                // Accept all logs, no matter what. The individual loggers take care
                // of filtering the wrong loglevels
                level: "silly",
            });
        }
        return this.get(label);
    }
    updateConfiguration(config) {
        // Avoid overwriting configuration settings with undefined if they shouldn't be
        for (const key of shared_safe_1.nonUndefinedLogConfigKeys) {
            if (key in config && config[key] === undefined) {
                delete config[key];
            }
        }
        const changedLoggingTarget = (config.logToFile != undefined &&
            config.logToFile !== this.logConfig.logToFile) ||
            (config.forceConsole != undefined &&
                config.forceConsole !== this.logConfig.forceConsole);
        if (typeof config.level === "number") {
            config.level = loglevelFromNumber(config.level);
        }
        const changedLogLevel = config.level != undefined && config.level !== this.logConfig.level;
        if (config.filename != undefined &&
            !config.filename.includes("%DATE%")) {
            config.filename += "_%DATE%.log";
        }
        const changedFilename = config.filename != undefined &&
            config.filename !== this.logConfig.filename;
        if (config.maxFiles != undefined) {
            if (typeof config.maxFiles !== "number" ||
                config.maxFiles < 1 ||
                config.maxFiles > 365) {
                delete config.maxFiles;
            }
        }
        const changedMaxFiles = config.maxFiles != undefined &&
            config.maxFiles !== this.logConfig.maxFiles;
        this.logConfig = Object.assign(this.logConfig, config);
        // If the loglevel changed, our cached "is visible" info is out of date
        if (changedLogLevel) {
            this.loglevelVisibleCache.clear();
        }
        // When the log target (console, file, filename) was changed, recreate the internal transports
        // because at least the filename does not update dynamically
        // Also do this when configuring the logger for the first time
        const recreateInternalTransports = (this.fileTransport == undefined &&
            this.consoleTransport == undefined) ||
            changedLoggingTarget ||
            changedFilename ||
            changedMaxFiles;
        if (recreateInternalTransports) {
            this.fileTransport?.destroy();
            this.fileTransport = undefined;
            this.consoleTransport?.destroy();
            this.consoleTransport = undefined;
        }
        // When the internal transports or the custom transports were changed, we need to update the loggers
        if (recreateInternalTransports || config.transports != undefined) {
            this.loggers.forEach((logger) => logger.configure({ transports: this.getAllTransports() }));
        }
    }
    getConfiguration() {
        return this.logConfig;
    }
    /** Tests whether a log using the given loglevel will be logged */
    isLoglevelVisible(loglevel) {
        // If we are not connected to a TTY, not logging to a file and don't have any custom transports, we won't see anything
        if (!this.fileTransport &&
            !this.consoleTransport &&
            (!this.logConfig.transports ||
                this.logConfig.transports.length === 0)) {
            return false;
        }
        if (!this.loglevelVisibleCache.has(loglevel)) {
            this.loglevelVisibleCache.set(loglevel, loglevel in loglevels &&
                loglevels[loglevel] <= loglevels[this.logConfig.level]);
        }
        return this.loglevelVisibleCache.get(loglevel);
    }
    destroy() {
        for (const key in this.loggers) {
            this.close(key);
        }
        this.fileTransport = undefined;
        this.consoleTransport = undefined;
        this.logConfig.transports = [];
    }
    getAllTransports() {
        return [
            ...this.getInternalTransports(),
            ...(this.logConfig.transports ?? []),
        ];
    }
    getInternalTransports() {
        const ret = [];
        if (this.logConfig.enabled && this.logConfig.logToFile) {
            if (!this.fileTransport) {
                this.fileTransport = this.createFileTransport();
            }
            ret.push(this.fileTransport);
        }
        else if (!isUnitTest && (isTTY || this.logConfig.forceConsole)) {
            if (!this.consoleTransport) {
                this.consoleTransport = this.createConsoleTransport();
            }
            ret.push(this.consoleTransport);
        }
        return ret;
    }
    createConsoleTransport() {
        return new winston_1.default.transports.Console({
            format: createDefaultTransportFormat(
            // Only colorize the output if logging to a TTY, otherwise we'll get
            // ansi color codes in logfiles or redirected shells
            isTTY || isUnitTest, 
            // Only use short timestamps if logging to a TTY
            isTTY),
            silent: this.isConsoleTransportSilent(),
        });
    }
    isConsoleTransportSilent() {
        return process.env.NODE_ENV === "test" || !this.logConfig.enabled;
    }
    isFileTransportSilent() {
        return !this.logConfig.enabled;
    }
    createFileTransport() {
        const ret = new winston_daily_rotate_file_1.default({
            filename: this.logConfig.filename,
            auditFile: `${this.logConfig.filename
                .replace("_%DATE%", "_logrotate")
                .replace(/\.log$/, "")}.json`,
            datePattern: "YYYY-MM-DD",
            createSymlink: true,
            symlinkName: path
                .basename(this.logConfig.filename)
                .replace(`_%DATE%`, "_current"),
            zippedArchive: true,
            maxFiles: `${this.logConfig.maxFiles}d`,
            format: createDefaultTransportFormat(false, false),
            silent: this.isFileTransportSilent(),
        });
        ret.on("new", (newFilename) => {
            console.log(`Logging to file:
	${newFilename}`);
        });
        return ret;
    }
    /**
     * Checks the log configuration whether logs should be written for a given node id
     */
    shouldLogNode(nodeId) {
        // If no filters are set, every node gets logged
        if (!this.logConfig.nodeFilter)
            return true;
        return this.logConfig.nodeFilter.includes(nodeId);
    }
}
exports.ZWaveLogContainer = ZWaveLogContainer;
function getTransportLoglevel() {
    return process.env.LOGLEVEL in loglevels ? process.env.LOGLEVEL : "debug";
}
/** Performs a reverse lookup of the numeric loglevel */
function loglevelFromNumber(numLevel) {
    if (numLevel == undefined)
        return;
    for (const [level, value] of Object.entries(loglevels)) {
        if (value === numLevel)
            return level;
    }
}
/** Creates the common logger format for all loggers under a given channel */
function createLoggerFormat(channel) {
    return combine(
    // add the channel as a label
    label({ label: channel }), 
    // default to short timestamps
    timestamp());
}
exports.createLoggerFormat = createLoggerFormat;
/** Prints a formatted and colorized log message */
function createLogMessagePrinter(shortTimestamps) {
    return {
        transform: ((info) => {
            // The formatter has already split the message into multiple lines
            const messageLines = messageToLines(info.message);
            // Also this can only happen if the user forgot to call the formatter first
            if (info.secondaryTagPadding == undefined)
                info.secondaryTagPadding = -1;
            // Format the first message line
            let firstLine = [
                info.primaryTags,
                messageLines[0],
                info.secondaryTagPadding < 0
                    ? undefined
                    : " ".repeat(info.secondaryTagPadding),
                // If the secondary tag padding is zero, the previous segment gets
                // filtered out and we have one less space than necessary
                info.secondaryTagPadding === 0 && info.secondaryTags
                    ? " " + info.secondaryTags
                    : info.secondaryTags,
            ]
                .filter((item) => !!item)
                .join(" ");
            // The directional arrows and the optional grouping lines must be prepended
            // without adding spaces
            firstLine = `${info.timestamp} ${info.label} ${info.direction}${firstLine}`;
            const lines = [firstLine];
            if (info.multiline) {
                // Format all message lines but the first
                lines.push(...messageLines.slice(1).map((line) => 
                // Skip the columns for the timestamp and the channel name
                (shortTimestamps
                    ? shared_safe_1.timestampPaddingShort
                    : shared_safe_1.timestampPadding) +
                    shared_safe_1.channelPadding +
                    // Skip the columns for directional arrows
                    shared_safe_1.directionPrefixPadding +
                    line));
            }
            info[triple_beam_1.MESSAGE] = lines.join("\n");
            return info;
        }),
    };
}
exports.createLogMessagePrinter = createLogMessagePrinter;
/** Formats the log message and calculates the necessary paddings */
exports.logMessageFormatter = {
    transform: ((info) => {
        const messageLines = messageToLines(info.message);
        const firstMessageLineLength = messageLines[0].length;
        info.multiline =
            messageLines.length > 1 ||
                !messageFitsIntoOneLine(info, info.message.length);
        // Align postfixes to the right
        if (info.secondaryTags) {
            // Calculate how many spaces are needed to right-align the postfix
            // Subtract 1 because the parts are joined by spaces
            info.secondaryTagPadding = Math.max(
            // -1 has the special meaning that we don't print any padding,
            // because the message takes all the available space
            -1, shared_safe_1.LOG_WIDTH -
                1 -
                calculateFirstLineLength(info, firstMessageLineLength));
        }
        if (info.multiline) {
            // Break long messages into multiple lines
            const lines = [];
            let isFirstLine = true;
            for (let message of messageLines) {
                while (message.length) {
                    const cut = Math.min(message.length, isFirstLine
                        ? shared_safe_1.LOG_WIDTH - calculateFirstLineLength(info, 0) - 1
                        : shared_safe_1.LOG_WIDTH - shared_safe_1.CONTROL_CHAR_WIDTH);
                    isFirstLine = false;
                    lines.push(message.substr(0, cut));
                    message = message.substr(cut);
                }
            }
            info.message = lines.join("\n");
        }
        return info;
    }),
};
/** The common logger format for built-in transports */
function createDefaultTransportFormat(colorize, shortTimestamps) {
    const formats = [
        // overwrite the default timestamp format if necessary
        shortTimestamps
            ? timestamp({ format: shared_safe_1.timestampFormatShort })
            : undefined,
        exports.logMessageFormatter,
        colorize ? (0, Colorizer_1.colorizer)() : undefined,
        createLogMessagePrinter(shortTimestamps),
    ].filter((f) => !!f);
    return combine(...formats);
}
exports.createDefaultTransportFormat = createDefaultTransportFormat;
/**
 * Calculates the length the first line of a log message would occupy if it is not split
 * @param info The message and information to log
 * @param firstMessageLineLength The length of the first line of the actual message text, not including pre- and postfixes.
 */
function calculateFirstLineLength(info, firstMessageLineLength) {
    return ([
        shared_safe_1.CONTROL_CHAR_WIDTH - 1,
        firstMessageLineLength,
        (info.primaryTags || "").length,
        (info.secondaryTags || "").length,
    ]
        // filter out empty parts
        .filter((len) => len > 0)
        // simulate adding spaces between parts
        .reduce((prev, val) => prev + (prev > 0 ? 1 : 0) + val));
}
/**
 * Tests if a given message fits into a single log line
 * @param info The message that should be logged
 * @param messageLength The length that should be assumed for the actual message without pre and postfixes.
 * Can be set to 0 to exclude the message from the calculation
 */
function messageFitsIntoOneLine(info, messageLength) {
    const totalLength = calculateFirstLineLength(info, messageLength);
    return totalLength <= shared_safe_1.LOG_WIDTH;
}
exports.messageFitsIntoOneLine = messageFitsIntoOneLine;
function messageToLines(message) {
    if (typeof message === "string") {
        return message.split("\n");
    }
    else if (message.length > 0) {
        return message;
    }
    else {
        return [""];
    }
}
exports.messageToLines = messageToLines;
/** Splits a message record into multiple lines and auto-aligns key-value pairs */
function messageRecordToLines(message) {
    const entries = Object.entries(message);
    if (!entries.length)
        return [];
    const maxKeyLength = Math.max(...entries.map(([key]) => key.length));
    return (0, shared_1.flatMap)(entries, ([key, value]) => `${key}:${" ".repeat(Math.max(maxKeyLength - key.length + 1, 1))}${value}`
        .split("\n")
        .map((line) => line.trimRight()));
}
exports.messageRecordToLines = messageRecordToLines;
/** Wraps an array of strings in square brackets and joins them with spaces */
function tagify(tags) {
    return tags.map((pfx) => `[${pfx}]`).join(" ");
}
exports.tagify = tagify;
/** Unsilences the console transport of a logger and returns the original value */
function unsilence(logger) {
    const consoleTransport = logger.transports.find((t) => t.name === "console");
    if (consoleTransport) {
        const ret = !!consoleTransport.silent;
        consoleTransport.silent = false;
        return ret;
    }
    return false;
}
exports.unsilence = unsilence;
/** Restores the console transport of a logger to its original silence state */
function restoreSilence(logger, original) {
    const consoleTransport = logger.transports.find((t) => t.name === "console");
    if (consoleTransport) {
        consoleTransport.silent = original;
    }
}
exports.restoreSilence = restoreSilence;
//# sourceMappingURL=shared.js.map