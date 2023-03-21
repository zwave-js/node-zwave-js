"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConfigLogger = void 0;
const core_1 = require("@zwave-js/core");
const Logger_safe_1 = require("./Logger_safe");
class ConfigLogger extends core_1.ZWaveLoggerBase {
    constructor(loggers) {
        super(loggers, Logger_safe_1.CONFIG_LABEL);
    }
    /**
     * Logs a message
     * @param msg The message to output
     */
    print(message, level) {
        const actualLevel = level || Logger_safe_1.CONFIG_LOGLEVEL;
        if (!this.container.isLoglevelVisible(actualLevel))
            return;
        this.logger.log({
            level: actualLevel,
            message,
            direction: (0, core_1.getDirectionPrefix)("none"),
            context: { source: "config" },
        });
    }
}
exports.ConfigLogger = ConfigLogger;
//# sourceMappingURL=Logger.js.map