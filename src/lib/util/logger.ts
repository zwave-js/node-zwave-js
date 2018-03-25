import * as debugPackage from "debug";
const _debug = debugPackage("zwave");

export type LoggerFunction = (message: string, severity?: "info" | "warn" | "debug" | "error" | "silly") => void;

let customLogger: LoggerFunction;
export function setCustomLogger(logger: LoggerFunction): void {
	customLogger = logger;
}

export function log(message: string, severity: "info" | "warn" | "debug" | "error" | "silly" = "info") {
	function defaultLogger() {
		let prefix: string = "";
		if (severity !== "info") {
			prefix = `[${severity.toUpperCase()}] `;
		}
		_debug(`${prefix}${message}`);
	}

	(customLogger || defaultLogger)(message, severity);
}
