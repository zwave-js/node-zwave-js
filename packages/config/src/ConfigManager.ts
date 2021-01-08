import type { ZWaveLogContainer } from "@zwave-js/core";
import { ConfigLogger } from "./Logger";

export class ConfigManager {
	public constructor(loggers: ZWaveLogContainer) {
		this.logger = new ConfigLogger(loggers);
	}

	private logger: ConfigLogger;
}
