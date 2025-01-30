import { type LogContext } from "./shared_safe.js";
import type { LogContainer, ZWaveLogger } from "./traits.js";

export class ZWaveLoggerBase<TContext extends LogContext = LogContext> {
	constructor(loggers: LogContainer<TContext>, logLabel: string) {
		this.container = loggers;
		this.logger = this.container.getLogger(logLabel);
	}

	public logger: ZWaveLogger<TContext>;
	public container: LogContainer<TContext>;
}
