import type { DataDirection, LogContext } from "@zwave-js/core/safe";

export const SERIAL_LABEL = "SERIAL";
export const SERIAL_LOGLEVEL = "debug";

export interface SerialLogContext extends LogContext<"serial"> {
	direction: DataDirection;
	header?: string;
}
