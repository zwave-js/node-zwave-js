import type { DeviceConfigIndexEntry } from "./devices/DeviceConfig";
import type { ConfigLogger } from "./Logger";
/** The absolute path of the embedded configuration directory */
export declare const configDir: string;
/** The (optional) absolute path of an external configuration directory */
export declare function externalConfigDir(): string | undefined;
export declare function getDeviceEntryPredicate(manufacturerId: number, productType: number, productId: number, firmwareVersion?: string): (entry: DeviceConfigIndexEntry) => boolean;
export declare function getEmbeddedConfigVersion(): Promise<string>;
export type SyncExternalConfigDirResult = {
    success: false;
} | {
    success: true;
    version: string;
};
/**
 * Synchronizes or updates the external config directory and returns whether the directory is in a state that can be used
 */
export declare function syncExternalConfigDir(logger: ConfigLogger): Promise<SyncExternalConfigDirResult>;
//# sourceMappingURL=utils.d.ts.map