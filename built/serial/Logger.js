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
Object.defineProperty(exports, "__esModule", { value: true });
exports.SerialLogger = void 0;
const Sentry = __importStar(require("@sentry/node"));
const core_1 = require("@zwave-js/core");
const shared_1 = require("@zwave-js/shared");
const Logger_safe_1 = require("./Logger_safe");
const MessageHeaders_1 = require("./MessageHeaders");
class SerialLogger extends core_1.ZWaveLoggerBase {
    constructor(loggers) {
        super(loggers, Logger_safe_1.SERIAL_LABEL);
    }
    isVisible() {
        return this.container.isLoglevelVisible(Logger_safe_1.SERIAL_LOGLEVEL);
    }
    /**
     * Logs transmission or receipt of an ACK frame
     * @param direction The direction this ACK was sent
     */
    ACK(direction) {
        if (this.isVisible())
            this.logMessageHeader(direction, MessageHeaders_1.MessageHeaders.ACK);
    }
    /**
     * Logs transmission or receipt of an NAK frame
     * @param direction The direction this NAK was sent
     */
    NAK(direction) {
        if (this.isVisible())
            this.logMessageHeader(direction, MessageHeaders_1.MessageHeaders.NAK);
    }
    /**
     * Logs transmission or receipt of an CAN frame
     * @param direction The direction this CAN was sent
     */
    CAN(direction) {
        if (this.isVisible())
            this.logMessageHeader(direction, MessageHeaders_1.MessageHeaders.CAN);
    }
    /**
     * Logs receipt of unexpected data while waiting for an ACK, NAK, CAN, or data frame
     */
    discarded(data) {
        if (this.isVisible()) {
            const direction = "inbound";
            this.logger.log({
                level: "warn",
                primaryTags: "[DISCARDED]",
                message: `invalid data ${(0, shared_1.buffer2hex)(data)}`,
                secondaryTags: `(${data.length} bytes)`,
                direction: (0, core_1.getDirectionPrefix)(direction),
                context: {
                    source: "serial",
                    direction,
                },
            });
        }
    }
    logMessageHeader(direction, header) {
        this.logger.log({
            level: Logger_safe_1.SERIAL_LOGLEVEL,
            primaryTags: `[${MessageHeaders_1.MessageHeaders[header]}]`,
            message: "",
            secondaryTags: `(${(0, shared_1.num2hex)(header)})`,
            direction: (0, core_1.getDirectionPrefix)(direction),
            context: {
                source: "serial",
                header: (0, shared_1.getEnumMemberName)(MessageHeaders_1.MessageHeaders, header),
                direction,
            },
        });
    }
    /**
     * Logs transmission or receipt of a data chunk
     * @param direction The direction the data was sent
     * @param data The data that was transmitted or received
     */
    data(direction, data) {
        if (this.isVisible()) {
            this.logger.log({
                level: Logger_safe_1.SERIAL_LOGLEVEL,
                message: `0x${data.toString("hex")}`,
                secondaryTags: `(${data.length} bytes)`,
                direction: (0, core_1.getDirectionPrefix)(direction),
                context: {
                    source: "serial",
                    direction,
                },
            });
        }
        if (process.env.NODE_ENV !== "test") {
            // Enrich error data in case something goes wrong
            Sentry.addBreadcrumb({
                category: "serial",
                timestamp: Date.now() / 1000,
                type: "debug",
                message: `${(0, core_1.getDirectionPrefix)(direction)}${(0, shared_1.buffer2hex)(data)}`,
            });
        }
    }
    // /**
    //  * Logs the current content of the receive buffer
    //  * @param data The data that is currently in the receive buffer
    //  */
    // export function receiveBuffer(data: Buffer, isComplete: boolean): void {
    // 	if (isVisible()) {
    // 		getLogger().log({
    // 			level: isComplete ? SERIAL_LOGLEVEL : "silly",
    // 			primaryTags: isComplete ? undefined : "[incomplete]",
    // 			message: `Buffer := 0x${data.toString("hex")}`,
    // 			secondaryTags: `(${data.length} bytes)`,
    // 			direction: getDirectionPrefix("none"),
    // 		});
    // 	}
    // }
    /**
     * Logs a message
     * @param message The message to output
     */
    message(message) {
        if (this.isVisible()) {
            this.logger.log({
                level: Logger_safe_1.SERIAL_LOGLEVEL,
                message,
                direction: (0, core_1.getDirectionPrefix)("none"),
                context: {
                    source: "serial",
                    direction: "none",
                },
            });
        }
    }
    /**
     * Prints output from the bootloader
     * @param screen The "screen" to output
     */
    bootloaderScreen(screen) {
        if (this.isVisible()) {
            this.logger.log({
                level: "silly",
                message: screen,
                direction: (0, core_1.getDirectionPrefix)("inbound"),
                context: {
                    source: "serial",
                    direction: "inbound",
                },
            });
        }
    }
}
exports.SerialLogger = SerialLogger;
//# sourceMappingURL=Logger.js.map