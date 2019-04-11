export declare type SubNamespaces = "driver" | "io" | "controller" | "protocol";
export declare type Severity = "info" | "warn" | "debug" | "error" | "silly";
export declare type LoggerFunction = (message: string, severity?: Severity) => void;
export declare function setCustomLogger(logger: LoggerFunction): void;
export declare function log(message: string, severity: Severity): void;
export declare function log(namespace: SubNamespaces, message: string, severity: Severity): void;
