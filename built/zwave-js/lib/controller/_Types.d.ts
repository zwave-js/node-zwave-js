export type HealNodeStatus = "pending" | "done" | "failed" | "skipped";
export interface HealNetworkOptions {
    /** Whether sleeping nodes should be healed too at the end of the healing process. Default: true */
    includeSleeping?: boolean;
}
export type SDKVersion = `${number}.${number}` | `${number}.${number}.${number}`;
export interface FirmwareUpdateFileInfo {
    target: number;
    url: string;
    integrity: `sha256:${string}`;
}
export interface FirmwareUpdateInfo {
    version: string;
    changelog: string;
    channel: "stable" | "beta";
    files: FirmwareUpdateFileInfo[];
    downgrade: boolean;
    normalizedVersion: string;
}
export interface GetFirmwareUpdatesOptions {
    /** Allows overriding the API key for the firmware update service */
    apiKey?: string;
    /** Allows adding new components to the user agent sent to the firmware update service (existing components cannot be overwritten) */
    additionalUserAgentComponents?: Record<string, string>;
    /** Whether the returned firmware upgrades should include prereleases from the `"beta"` channel. Default: `false`. */
    includePrereleases?: boolean;
}
export interface ControllerFirmwareUpdateProgress {
    /** How many fragments of the firmware update have been transmitted. Together with `totalFragments` this can be used to display progress. */
    sentFragments: number;
    /** How many fragments the firmware update consists of. */
    totalFragments: number;
    /** The total progress of the firmware update in %, rounded to two digits. */
    progress: number;
}
export declare enum ControllerFirmwareUpdateStatus {
    Error_Timeout = 0,
    /** The maximum number of retry attempts for a firmware fragments were reached */
    Error_RetryLimitReached = 1,
    /** The update was aborted by the bootloader */
    Error_Aborted = 2,
    /** This controller does not support firmware updates */
    Error_NotSupported = 3,
    OK = 255
}
export interface ControllerFirmwareUpdateResult {
    success: boolean;
    status: ControllerFirmwareUpdateStatus;
}
//# sourceMappingURL=_Types.d.ts.map