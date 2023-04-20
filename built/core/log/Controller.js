"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ControllerLogger = exports.CONTROLLER_LABEL = void 0;
const typeguards_1 = require("alcalzone-shared/typeguards");
const CommandClasses_1 = require("../capabilities/CommandClasses");
const InterviewStage_1 = require("../consts/InterviewStage");
const shared_1 = require("./shared");
const shared_safe_1 = require("./shared_safe");
exports.CONTROLLER_LABEL = "CNTRLR";
const CONTROLLER_LOGLEVEL = "info";
const VALUE_LOGLEVEL = "debug";
class ControllerLogger extends shared_1.ZWaveLoggerBase {
    constructor(loggers) {
        super(loggers, exports.CONTROLLER_LABEL);
        this.valueEventPrefixes = Object.freeze({
            added: "+",
            updated: "~",
            removed: "-",
            notification: "!",
        });
    }
    isValueLogVisible() {
        return this.container.isLoglevelVisible(VALUE_LOGLEVEL);
    }
    isControllerLogVisible() {
        return this.container.isLoglevelVisible(CONTROLLER_LOGLEVEL);
    }
    /**
     * Logs a message
     * @param message The message to output
     */
    print(message, level) {
        const actualLevel = level || CONTROLLER_LOGLEVEL;
        if (!this.container.isLoglevelVisible(actualLevel))
            return;
        this.logger.log({
            level: actualLevel,
            message,
            direction: (0, shared_safe_1.getDirectionPrefix)("none"),
            context: { source: "controller", type: "controller" },
        });
    }
    logNode(nodeId, messageOrOptions, logLevel) {
        if (typeof messageOrOptions === "string") {
            return this.logNode(nodeId, {
                message: messageOrOptions,
                level: logLevel,
            });
        }
        const { level, message, direction, endpoint } = messageOrOptions;
        const actualLevel = level || CONTROLLER_LOGLEVEL;
        if (!this.container.isLoglevelVisible(actualLevel))
            return;
        if (!this.container.shouldLogNode(nodeId))
            return;
        const context = {
            nodeId,
            source: "controller",
            type: "node",
            direction: direction || "none",
        };
        if (endpoint)
            context.endpoint = endpoint;
        this.logger.log({
            level: actualLevel,
            primaryTags: (0, shared_1.tagify)([(0, shared_safe_1.getNodeTag)(nodeId)]),
            message,
            secondaryTags: endpoint
                ? (0, shared_1.tagify)([`Endpoint ${endpoint}`])
                : undefined,
            direction: (0, shared_safe_1.getDirectionPrefix)(direction || "none"),
            context,
        });
    }
    formatValue(value) {
        if ((0, typeguards_1.isObject)(value))
            return JSON.stringify(value);
        if (typeof value !== "string")
            return String(value);
        return `"${value}"`;
    }
    value(change, args) {
        if (!this.isValueLogVisible())
            return;
        if (!this.container.shouldLogNode(args.nodeId))
            return;
        const context = {
            nodeId: args.nodeId,
            change,
            commandClass: args.commandClass,
            internal: args.internal,
            property: args.property,
            source: "controller",
            type: "value",
        };
        const primaryTags = [
            (0, shared_safe_1.getNodeTag)(args.nodeId),
            this.valueEventPrefixes[change],
            CommandClasses_1.CommandClasses[args.commandClass],
        ];
        const secondaryTags = [];
        if (args.endpoint != undefined) {
            context.endpoint = args.endpoint;
            secondaryTags.push(`Endpoint ${args.endpoint}`);
        }
        if (args.internal === true) {
            secondaryTags.push("internal");
        }
        let message = args.property.toString();
        if (args.propertyKey != undefined) {
            context.propertyKey = args.propertyKey;
            message += `[${args.propertyKey}]`;
        }
        switch (change) {
            case "added":
                message += `: ${this.formatValue(args.newValue)}`;
                break;
            case "updated": {
                const _args = args;
                message += `: ${this.formatValue(_args.prevValue)} => ${this.formatValue(_args.newValue)}`;
                break;
            }
            case "removed":
                message += ` (was ${this.formatValue(args.prevValue)})`;
                break;
            case "notification":
                message += `: ${this.formatValue(args.value)}`;
                break;
        }
        this.logger.log({
            level: VALUE_LOGLEVEL,
            primaryTags: (0, shared_1.tagify)(primaryTags),
            secondaryTags: (0, shared_1.tagify)(secondaryTags),
            message,
            direction: (0, shared_safe_1.getDirectionPrefix)("none"),
            context,
        });
    }
    /** Prints a log message for updated metadata of a value id */
    metadataUpdated(args) {
        if (!this.isValueLogVisible())
            return;
        if (!this.container.shouldLogNode(args.nodeId))
            return;
        const context = {
            nodeId: args.nodeId,
            commandClass: args.commandClass,
            internal: args.internal,
            property: args.property,
            source: "controller",
            type: "value",
        };
        const primaryTags = [
            (0, shared_safe_1.getNodeTag)(args.nodeId),
            CommandClasses_1.CommandClasses[args.commandClass],
        ];
        const secondaryTags = [];
        if (args.endpoint != undefined) {
            context.endpoint = args.endpoint;
            secondaryTags.push(`Endpoint ${args.endpoint}`);
        }
        if (args.internal === true) {
            secondaryTags.push("internal");
        }
        let message = args.property.toString();
        if (args.propertyKey != undefined) {
            context.propertyKey = args.propertyKey;
            message += `[${args.propertyKey}]`;
        }
        message += ": metadata updated";
        this.logger.log({
            level: VALUE_LOGLEVEL,
            primaryTags: (0, shared_1.tagify)(primaryTags),
            secondaryTags: (0, shared_1.tagify)(secondaryTags),
            message,
            direction: (0, shared_safe_1.getDirectionPrefix)("none"),
            context,
        });
    }
    /** Logs the interview progress of a node */
    interviewStage(node) {
        if (!this.isControllerLogVisible())
            return;
        if (!this.container.shouldLogNode(node.id))
            return;
        this.logger.log({
            level: CONTROLLER_LOGLEVEL,
            primaryTags: (0, shared_1.tagify)([(0, shared_safe_1.getNodeTag)(node.id)]),
            message: node.interviewStage === InterviewStage_1.InterviewStage.Complete
                ? "Interview completed"
                : `Interview stage completed: ${InterviewStage_1.InterviewStage[node.interviewStage]}`,
            direction: (0, shared_safe_1.getDirectionPrefix)("none"),
            context: {
                nodeId: node.id,
                source: "controller",
                type: "node",
                direction: "none",
            },
        });
    }
    /** Logs the interview progress of a node */
    interviewStart(node) {
        if (!this.isControllerLogVisible())
            return;
        if (!this.container.shouldLogNode(node.id))
            return;
        const message = `Beginning interview - last completed stage: ${InterviewStage_1.InterviewStage[node.interviewStage]}`;
        this.logger.log({
            level: CONTROLLER_LOGLEVEL,
            primaryTags: (0, shared_1.tagify)([(0, shared_safe_1.getNodeTag)(node.id)]),
            message,
            direction: (0, shared_safe_1.getDirectionPrefix)("none"),
            context: {
                nodeId: node.id,
                source: "controller",
                type: "node",
                direction: "none",
            },
        });
    }
}
exports.ControllerLogger = ControllerLogger;
//# sourceMappingURL=Controller.js.map