import { type LogContext } from "./shared.js";
import type { LogContainer, ZWaveLogger } from "./traits.js";

export class ZWaveLoggerBase<TContext extends LogContext = LogContext> {
	constructor(loggers: LogContainer, logLabel: string) {
		this.container = loggers;
		this.logger = this.container.getLogger(logLabel);
	}

	public logger: ZWaveLogger<TContext>;
	public container: LogContainer;
}
