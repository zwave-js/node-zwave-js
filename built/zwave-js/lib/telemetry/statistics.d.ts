/// <reference types="node" />
import type { Driver } from "../driver/Driver";
export interface AppInfo {
    driverVersion: string;
    applicationName: string;
    applicationVersion: string;
    nodeVersion: string;
    os: NodeJS.Platform;
    arch: string;
}
export declare function compileStatistics(driver: Driver, appInfo: AppInfo): Promise<Record<string, any>>;
/**
 * Sends the statistics to the statistics backend. Returns:
 * - `true` when sending succeeded
 * - The number of seconds to wait before trying again when hitting the rate limiter
 * - `false` for any other errors
 */
export declare function sendStatistics(statistics: Record<string, any>): Promise<boolean | number>;
//# sourceMappingURL=statistics.d.ts.map