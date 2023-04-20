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
exports.DriverLogger = exports.DRIVER_LABEL = void 0;
const Sentry = __importStar(require("@sentry/node"));
const cc_1 = require("@zwave-js/cc");
const core_1 = require("@zwave-js/core");
const serial_1 = require("@zwave-js/serial");
const shared_1 = require("@zwave-js/shared");
const _Types_1 = require("../node/_Types");
exports.DRIVER_LABEL = "DRIVER";
const DRIVER_LOGLEVEL = "verbose";
const SENDQUEUE_LOGLEVEL = "debug";
class DriverLogger extends core_1.ZWaveLoggerBase {
    constructor(driver, loggers) {
        super(loggers, exports.DRIVER_LABEL);
        this.driver = driver;
    }
    isDriverLogVisible() {
        return this.container.isLoglevelVisible(DRIVER_LOGLEVEL);
    }
    isSendQueueLogVisible() {
        return this.container.isLoglevelVisible(SENDQUEUE_LOGLEVEL);
    }
    /**
     * Logs a message
     * @param msg The message to output
     */
    print(message, level) {
        const actualLevel = level || DRIVER_LOGLEVEL;
        if (!this.container.isLoglevelVisible(actualLevel))
            return;
        this.logger.log({
            level: actualLevel,
            message,
            direction: (0, core_1.getDirectionPrefix)("none"),
            context: { source: "driver", direction: "none" },
        });
    }
    /**
     * Serializes a message that starts a transaction, i.e. a message that is sent and may expect a response
     */
    transaction(transaction) {
        if (!this.isDriverLogVisible())
            return;
        const { message } = transaction;
        // On the first attempt, we print the basic information about the transaction
        const secondaryTags = [];
        // TODO: restore logging
        // if (transaction.sendAttempts === 1) {
        secondaryTags.push(`P: ${core_1.MessagePriority[transaction.priority]}`);
        // } else {
        // 	// On later attempts, we print the send attempts
        // 	secondaryTags.push(
        // 		`attempt ${transaction.sendAttempts}/${transaction.maxSendAttempts}`,
        // 	);
        // }
        this.logMessage(message, {
            secondaryTags,
            // Since we are programming a controller, the first message of a transaction is always outbound
            // (not to confuse with the message type, which may be Request or Response)
            direction: "outbound",
        });
    }
    /** Logs information about a message that is received as a response to a transaction */
    transactionResponse(message, originalTransaction, role) {
        if (!this.isDriverLogVisible())
            return;
        this.logMessage(message, {
            nodeId: originalTransaction?.message?.getNodeId(),
            secondaryTags: [role],
            direction: "inbound",
        });
    }
    logMessage(message, { 
    // Used to relate this log message to a node
    nodeId, secondaryTags, direction = "none", } = {}) {
        if (!this.isDriverLogVisible())
            return;
        if (nodeId == undefined)
            nodeId = message.getNodeId();
        if (nodeId != undefined && !this.container.shouldLogNode(nodeId)) {
            return;
        }
        const isCCContainer = (0, cc_1.isCommandClassContainer)(message);
        const logEntry = message.toLogEntry();
        let msg = [(0, core_1.tagify)(logEntry.tags)];
        if (logEntry.message) {
            msg.push(...(0, core_1.messageRecordToLines)(logEntry.message).map((line) => (isCCContainer ? "│ " : "  ") + line));
        }
        try {
            // If possible, include information about the CCs
            if ((0, cc_1.isCommandClassContainer)(message)) {
                // Remove the default payload message and draw a bracket
                msg = msg.filter((line) => !line.startsWith("│ payload:"));
                const logCC = (cc, indent = 0) => {
                    const isEncapCC = (0, cc_1.isEncapsulatingCommandClass)(cc) ||
                        (0, cc_1.isMultiEncapsulatingCommandClass)(cc);
                    const loggedCC = cc.toLogEntry(this.driver);
                    msg.push(" ".repeat(indent * 2) + "└─" + (0, core_1.tagify)(loggedCC.tags));
                    indent++;
                    if (loggedCC.message) {
                        msg.push(...(0, core_1.messageRecordToLines)(loggedCC.message).map((line) => `${" ".repeat(indent * 2)}${isEncapCC ? "│ " : "  "}${line}`));
                    }
                    // If this is an encap CC, continue
                    if ((0, cc_1.isEncapsulatingCommandClass)(cc)) {
                        logCC(cc.encapsulated, indent);
                    }
                    else if ((0, cc_1.isMultiEncapsulatingCommandClass)(cc)) {
                        for (const encap of cc.encapsulated) {
                            logCC(encap, indent);
                        }
                    }
                };
                logCC(message.command);
            }
            this.logger.log({
                level: DRIVER_LOGLEVEL,
                secondaryTags: secondaryTags && secondaryTags.length > 0
                    ? (0, core_1.tagify)(secondaryTags)
                    : undefined,
                message: msg,
                // Since we are programming a controller, responses are always inbound
                // (not to confuse with the message type, which may be Request or Response)
                direction: (0, core_1.getDirectionPrefix)(direction),
                context: { source: "driver", direction },
            });
        }
        catch (e) {
            // When logging fails, send the message to Sentry
            try {
                Sentry.captureException(e);
            }
            catch { }
        }
    }
    /** Logs what's currently in the driver's send queue */
    sendQueue(queue) {
        if (!this.isSendQueueLogVisible())
            return;
        let message = "Send queue:";
        if (queue.length > 0) {
            for (const trns of queue) {
                // TODO: This formatting should be shared with the other logging methods
                const node = trns.message.getNodeUnsafe(this.driver);
                const prefix = trns.message.type === serial_1.MessageType.Request
                    ? "[REQ]"
                    : "[RES]";
                const postfix = node != undefined
                    ? ` [Node ${node.id}, ${(0, shared_1.getEnumMemberName)(_Types_1.NodeStatus, node.status)}]`
                    : "";
                const command = (0, cc_1.isCommandClassContainer)(trns.message)
                    ? ` (${trns.message.command.constructor.name})`
                    : "";
                message += `\n· ${prefix} ${serial_1.FunctionType[trns.message.functionType]}${command}${postfix}`;
            }
        }
        else {
            message += " (empty)";
        }
        this.logger.log({
            level: SENDQUEUE_LOGLEVEL,
            message,
            secondaryTags: `(${queue.length} message${queue.length === 1 ? "" : "s"})`,
            direction: (0, core_1.getDirectionPrefix)("none"),
            context: { source: "driver", direction: "none" },
        });
    }
}
exports.DriverLogger = DriverLogger;
//# sourceMappingURL=Driver.js.map