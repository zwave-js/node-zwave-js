import { type LogContext, type ZWaveLogInfo } from "./shared_safe.js";

export interface LogVisibility {
	isLoglevelVisible(loglevel: string): boolean;
	isNodeLoggingVisible(nodeId: number): boolean;
}

export interface GetLogger<TContext extends LogContext = LogContext> {
	getLogger(label: string): ZWaveLogger<TContext>;
}

export interface ZWaveLogger<TContext extends LogContext = LogContext> {
	log: <T extends TContext>(info: ZWaveLogInfo<T>) => void;
}
export type LogContainer<TContext extends LogContext = LogContext> =
	& GetLogger<TContext>
	& LogVisibility;
