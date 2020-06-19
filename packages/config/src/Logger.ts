import {
	createLoggerFormat,
	createLogTransports,
	getDirectionPrefix,
	isLoglevelVisible,
	ZWaveLogger,
} from "@zwave-js/core";
import winston from "winston";

export const CONFIG_LABEL = "CONFIG";
const CONFIG_LOGLEVEL = "debug";

let _logger: ZWaveLogger | undefined;
function getLogger(): ZWaveLogger {
	if (!_logger) {
		if (!winston.loggers.has("config")) {
			winston.loggers.add("config", {
				transports: createLogTransports(),
				format: createLoggerFormat(CONFIG_LABEL),
			});
		}
		_logger = (winston.loggers.get("config") as unknown) as ZWaveLogger;
	}
	return _logger;
}

/**
 * Logs a message
 * @param msg The message to output
 */
function print(
	message: string,
	level?: "debug" | "verbose" | "warn" | "error" | "info",
): void {
	const actualLevel = level || CONFIG_LOGLEVEL;
	if (!isLoglevelVisible(actualLevel)) return;

	getLogger().log({
		level: actualLevel,
		message,
		direction: getDirectionPrefix("none"),
	});
}

const log = { config: { print } };
export default log;
