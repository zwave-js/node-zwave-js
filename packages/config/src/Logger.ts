import {
	ZWaveLoggerBase,
	getDirectionPrefix,
	type ZWaveLogContainer,
} from "@zwave-js/core";
import {
	CONFIG_LABEL,
	CONFIG_LOGLEVEL,
	type ConfigLogContext,
} from "./Logger_safe";

export class ConfigLogger extends ZWaveLoggerBase<ConfigLogContext> {
	constructor(loggers: ZWaveLogContainer) {
		super(loggers, CONFIG_LABEL);
	}

	/**
	 * Logs a message
	 * @param msg The message to output
	 */
	public print(
		message: string,
		level?: "debug" | "verbose" | "warn" | "error" | "info",
	): void {
		const actualLevel = level || CONFIG_LOGLEVEL;
		if (!this.container.isLoglevelVisible(actualLevel)) return;

		this.logger.log({
			level: actualLevel,
			message,
			direction: getDirectionPrefix("none"),
			context: { source: "config" },
		});
	}
}
