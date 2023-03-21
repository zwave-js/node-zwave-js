import type { DeviceID } from "@zwave-js/config";
import { Firmware, RFRegion } from "@zwave-js/core";
import type { FirmwareUpdateFileInfo, FirmwareUpdateInfo } from "./_Types";
export interface GetAvailableFirmwareUpdateOptions {
    userAgent: string;
    apiKey?: string;
    includePrereleases?: boolean;
}
/**
 * Retrieves the available firmware updates for the node with the given fingerprint.
 * Returns the service response or `undefined` in case of an error.
 */
export declare function getAvailableFirmwareUpdates(deviceId: DeviceID & {
    firmwareVersion: string;
    rfRegion?: RFRegion;
}, options: GetAvailableFirmwareUpdateOptions): Promise<FirmwareUpdateInfo[]>;
export declare function downloadFirmwareUpdate(file: FirmwareUpdateFileInfo): Promise<Firmware>;
//# sourceMappingURL=FirmwareUpdateService.d.ts.map