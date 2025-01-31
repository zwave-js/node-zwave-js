import {
	type LogConfig,
	type LogContext,
	type ZWaveLogInfo,
} from "./shared.js";

export interface LogVisibility {
	isLoglevelVisible(loglevel: string): boolean;
	isNodeLoggingVisible(nodeId: number): boolean;
}

export interface GetLogger {
	getLogger<TContext extends LogContext = LogContext>(
		label: string,
	): ZWaveLogger<TContext>;
}

export interface ZWaveLogger<TContext extends LogContext = LogContext> {
	log: <T extends TContext>(info: ZWaveLogInfo<T>) => void;
}

export interface LogContainer extends GetLogger, LogVisibility {
	updateConfiguration(config: Partial<LogConfig>): void;
	getConfiguration(): LogConfig;
	destroy(): void;
}
