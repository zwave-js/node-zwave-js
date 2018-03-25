export declare type LoggerFunction = (message: string, severity?: "info" | "warn" | "debug" | "error" | "silly") => void;
export declare function setCustomLogger(logger: LoggerFunction): void;
export declare function log(message: string, severity?: "info" | "warn" | "debug" | "error" | "silly"): void;
