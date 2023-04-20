import type { JsonlDB } from "@alcalzone/jsonl-db";
import { CommandClasses, SecurityClass } from "@zwave-js/core";
import type { FileSystem } from "@zwave-js/host";
import type { Driver } from "./Driver";
/**
 * Defines the keys that are used to store certain properties in the network cache.
 */
export declare const cacheKeys: {
    readonly controller: {
        readonly provisioningList: "controller.provisioningList";
        readonly supportsSoftReset: "controller.supportsSoftReset";
    };
    readonly node: (nodeId: number) => {
        _baseKey: string;
        _securityClassBaseKey: string;
        interviewStage: string;
        deviceClass: string;
        isListening: string;
        isFrequentListening: string;
        isRouting: string;
        supportedDataRates: string;
        protocolVersion: string;
        nodeType: string;
        supportsSecurity: string;
        supportsBeaming: string;
        securityClass: (secClass: SecurityClass) => string;
        dsk: string;
        endpoint: (index: number) => {
            _baseKey: string;
            _ccBaseKey: string;
            commandClass: (ccId: CommandClasses) => string;
        };
        hasSUCReturnRoute: string;
    };
};
export declare const cacheKeyUtils: {
    readonly nodeIdFromKey: (key: string) => number | undefined;
    readonly nodePropertyFromKey: (key: string) => string | undefined;
    readonly isEndpointKey: (key: string) => boolean;
    readonly endpointIndexFromKey: (key: string) => number | undefined;
};
export declare function deserializeNetworkCacheValue(driver: Driver, key: string, value: unknown): unknown;
export declare function serializeNetworkCacheValue(driver: Driver, key: string, value: unknown): unknown;
export declare function migrateLegacyNetworkCache(driver: Driver, homeId: number, networkCache: JsonlDB, valueDB: JsonlDB, storageDriver: FileSystem, cacheDir: string): Promise<void>;
//# sourceMappingURL=NetworkCache.d.ts.map