import type { LogContext } from "@zwave-js/core/safe";

export const CONFIG_LABEL = "CONFIG";
export const CONFIG_LOGLEVEL = "debug";

export type ConfigLogContext = LogContext<"config">;
