import { DeepPartial } from "@zwave-js/shared";
import type { Format } from "logform";
import winston from "winston";
import { LogConfig, LogContext, MessageRecord, ZWaveLogger, ZWaveLogInfo } from "./shared_safe";
export declare class ZWaveLoggerBase<TContext extends LogContext = LogContext> {
    constructor(loggers: ZWaveLogContainer, logLabel: string);
    logger: ZWaveLogger<TContext>;
    container: ZWaveLogContainer;
}
export declare class ZWaveLogContainer extends winston.Container {
    private fileTransport;
    private consoleTransport;
    private loglevelVisibleCache;
    private logConfig;
    constructor(config?: DeepPartial<LogConfig>);
    getLogger(label: string): ZWaveLogger;
    updateConfiguration(config: DeepPartial<LogConfig>): void;
    getConfiguration(): LogConfig;
    /** Tests whether a log using the given loglevel will be logged */
    isLoglevelVisible(loglevel: string): boolean;
    destroy(): void;
    private getAllTransports;
    private getInternalTransports;
    private createConsoleTransport;
    private isConsoleTransportSilent;
    private isFileTransportSilent;
    private createFileTransport;
    /**
     * Checks the log configuration whether logs should be written for a given node id
     */
    shouldLogNode(nodeId: number): boolean;
}
/** Creates the common logger format for all loggers under a given channel */
export declare function createLoggerFormat(channel: string): Format;
/** Prints a formatted and colorized log message */
export declare function createLogMessagePrinter(shortTimestamps: boolean): Format;
/** Formats the log message and calculates the necessary paddings */
export declare const logMessageFormatter: Format;
/** The common logger format for built-in transports */
export declare function createDefaultTransportFormat(colorize: boolean, shortTimestamps: boolean): Format;
/**
 * Tests if a given message fits into a single log line
 * @param info The message that should be logged
 * @param messageLength The length that should be assumed for the actual message without pre and postfixes.
 * Can be set to 0 to exclude the message from the calculation
 */
export declare function messageFitsIntoOneLine(info: ZWaveLogInfo, messageLength: number): boolean;
export declare function messageToLines(message: string | string[]): string[];
/** Splits a message record into multiple lines and auto-aligns key-value pairs */
export declare function messageRecordToLines(message: MessageRecord): string[];
/** Wraps an array of strings in square brackets and joins them with spaces */
export declare function tagify(tags: string[]): string;
/** Unsilences the console transport of a logger and returns the original value */
export declare function unsilence(logger: winston.Logger): boolean;
/** Restores the console transport of a logger to its original silence state */
export declare function restoreSilence(logger: winston.Logger, original: boolean): void;
//# sourceMappingURL=shared.d.ts.map