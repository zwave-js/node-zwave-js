import type { DataDirection, LogContext } from "@zwave-js/core/safe";
export declare const SERIAL_LABEL = "SERIAL";
export declare const SERIAL_LOGLEVEL = "debug";
export interface SerialLogContext extends LogContext<"serial"> {
    direction: DataDirection;
    header?: string;
}
//# sourceMappingURL=Logger_safe.d.ts.map