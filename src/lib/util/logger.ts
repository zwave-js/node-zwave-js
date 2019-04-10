import colors = require("colors/safe");
import debug from "debug";

const defaultNamespace = "zwave";
export type SubNamespaces = "driver" | "io" | "controller" | "protocol";
export type Severity = "info" | "warn" | "debug" | "error" | "silly";

export type LoggerFunction = (message: string, severity?: Severity) => void;

let customLogger: LoggerFunction;
export function setCustomLogger(logger: LoggerFunction): void {
	customLogger = logger;
}

colors.setTheme({
	silly: "white",
	debug: "white",
	error: "red",
	warn: "yellow",
	info: "blue",
});

export function log(message: string, severity: Severity): void;
export function log(namespace: SubNamespaces, message: string, severity: Severity): void;
export function log(...args: any[]): void {

	// we only accept strings
	if (!args.length || !args.every(arg => typeof arg === "string")) {
		throw new Error("Invalid arguments passed to log()");
	}

	let namespace = "";
	let message = "";
	let severity: Severity = "info";
	if (args.length === 2) {
		([message, severity] = args);
	} else if (args.length === 3) {
		([namespace, message, severity] = args);
		// add the namespace separator to append the namespace to the default one
		if (typeof namespace === "string" && namespace !== "") namespace = ":" + namespace;
	}

	function defaultLogger(): void {
		let prefix = "";
		if (severity !== "info") {
			prefix = `[${severity.toUpperCase()}] `;
		}
		debug(defaultNamespace + namespace)(`${prefix}${(colors as any)[severity](message)}`);
	}

	(customLogger || defaultLogger)(message, severity);
}
