/// <reference types="node" />
import type { Route, SUCUpdateEntry } from "../files";
import type { NVM500NodeInfo, NVMDescriptor, NVMModuleDescriptor } from "./EntryParsers";
export declare enum NVMEntryType {
    NVMModuleSize = 0,
    Byte = 1,
    Word = 2,
    DWord = 3,
    Buffer = 4,
    NodeInfo = 5,
    NodeMask = 6,
    SUCUpdateEntry = 7,
    Route = 8,
    NVMModuleDescriptor = 9,
    NVMDescriptor = 10
}
export type NVMEntryName = "EEOFFSET_CMDCLASS_far" | "EEOFFSET_CMDCLASS_LEN_far" | "EEOFFSET_HOST_OFFSET_START_far" | "EEOFFSET_MAGIC_far" | "EEOFFSET_MODULE_POWER_MODE_EXTINT_ENABLE_far" | "EEOFFSET_MODULE_POWER_MODE_far" | "EEOFFSET_MODULE_POWER_MODE_WUT_TIMEOUT_far" | "EEOFFSET_POWERLEVEL_LOW_far" | "EEOFFSET_POWERLEVEL_NORMAL_far" | "EEOFFSET_WATCHDOG_STARTED_far" | "EX_NVM_BRIDGE_NODEPOOL_START_far" | "EX_NVM_CONTROLLER_CONFIGURATION_far" | "EX_NVM_HOME_ID_far" | "EX_NVM_LAST_USED_NODE_ID_START_far" | "EX_NVM_MAX_NODE_ID_far" | "EX_NVM_NODE_TABLE_START_far" | "EX_NVM_PENDING_UPDATE_far" | "EX_NVM_RESERVED_ID_far" | "EX_NVM_ROUTECACHE_APP_LOCK_far" | "EX_NVM_ROUTECACHE_MAGIC_far" | "EX_NVM_ROUTECACHE_NLWR_SR_START_far" | "EX_NVM_ROUTECACHE_START_far" | "EX_NVM_ROUTING_TABLE_START_far" | "EX_NVM_STATIC_CONTROLLER_NODE_ID_START_far" | "EX_NVM_SUC_ACTIVE_START_far" | "EX_NVM_SUC_CONTROLLER_LIST_START_far" | "EX_NVM_SUC_LAST_INDEX_START_far" | "EX_NVM_SUC_NODE_LIST_START_far" | "EX_NVM_SUC_ROUTING_SLAVE_LIST_START_far" | "EX_NVM_ZENSOR_TABLE_START_far" | "NVM_CONFIGURATION_REALLYVALID_far" | "NVM_CONFIGURATION_VALID_far" | "NVM_HOMEID_far" | "NVM_INTERNAL_RESERVED_1_far" | "NVM_INTERNAL_RESERVED_2_far" | "NVM_INTERNAL_RESERVED_3_far" | "NVM_NODEID_far" | "NVM_PENDING_DISCOVERY_far" | "NVM_PREFERRED_REPEATERS_far" | "NVM_RTC_TIMERS_far" | "NVM_SECURITY0_KEY_far" | "NVM_SYSTEM_STATE" | "nvmApplicationDescriptor" | "nvmApplicationSize" | "nvmDescriptor" | "nvmDescriptorDescriptor" | "nvmDescriptorSize" | "nvmHostApplicationDescriptor" | "nvmHostApplicationSize" | "nvmModuleSizeEndMarker" | "nvmTotalEnd" | "nvmZWlibraryDescriptor" | "nvmZWlibrarySize";
export interface NVMEntry {
    name: NVMEntryName;
    type: NVMEntryType;
    size?: number;
    /** The offset is only specified if it is needed for validation */
    offset?: number;
    count: number;
}
export type NVMData = Buffer | number | NVMDescriptor | number[] | Route | NVMModuleDescriptor | SUCUpdateEntry | NVM500NodeInfo | undefined;
export interface ParsedNVMEntry extends NVMEntry {
    data: NVMData[];
}
export type NVMLayout = NVMEntry[];
export declare const NVMEntrySizes: Record<NVMEntryType, number>;
export declare enum NVMModuleType {
    UNDEFINED = 0,
    ZW_PHY_LIBRARY = 1,
    ZW_LIBRARY = 2,
    ZW_FRAMEWORK = 3,
    APPLICATION = 4,
    HOST_APPLICATION = 5,
    SECURITY_2 = 6,
    NVM_DESCRIPTOR = 255
}
export declare const SUC_CONTROLLER_LIST_SIZE = 232;
export declare const MAX_REPEATERS = 4;
export declare const NVM_SERIALAPI_HOST_SIZE = 2048;
export declare const POWERLEVEL_CHANNELS = 3;
export declare const APPL_NODEPARM_MAX = 35;
export declare const RTC_TIMER_SIZE = 16;
export declare const TOTAL_RTC_TIMER_MAX: number;
export declare const CONFIGURATION_VALID_0 = 84;
export declare const CONFIGURATION_VALID_1 = 165;
export declare const ROUTECACHE_VALID = 74;
export declare const MAGIC_VALUE = 66;
//# sourceMappingURL=shared.d.ts.map