import { ZWaveLogContainer, ZWaveLoggerBase } from "@zwave-js/core";
import { ConfigLogContext } from "./Logger_safe";
export declare class ConfigLogger extends ZWaveLoggerBase<ConfigLogContext> {
    constructor(loggers: ZWaveLogContainer);
    /**
     * Logs a message
     * @param msg The message to output
     */
    print(message: string, level?: "debug" | "verbose" | "warn" | "error" | "info"): void;
}
//# sourceMappingURL=Logger.d.ts.map