import { NUM_NODEMASK_BYTES } from "@zwave-js/core/safe";
import { SUC_UPDATE_ENTRY_SIZE } from "../consts";
import type { Route, SUCUpdateEntry } from "../files";
import type {
	NVM500NodeInfo,
	NVMDescriptor,
	NVMModuleDescriptor,
} from "./EntryParsers";

export enum NVMEntryType {
	NVMModuleSize,
	Byte,
	Word,
	DWord,
	Buffer,
	NodeInfo,
	NodeMask,
	SUCUpdateEntry,
	Route,
	NVMModuleDescriptor,
	NVMDescriptor,
}

// These names are pretty bad, but they're used in Silabs nvm_converter code, so we keep them for easier lookup
export type NVMEntryName =
	| "EEOFFSET_CMDCLASS_far"
	| "EEOFFSET_CMDCLASS_LEN_far"
	| "EEOFFSET_HOST_OFFSET_START_far"
	| "EEOFFSET_MAGIC_far"
	| "EEOFFSET_MODULE_POWER_MODE_EXTINT_ENABLE_far"
	| "EEOFFSET_MODULE_POWER_MODE_far"
	| "EEOFFSET_MODULE_POWER_MODE_WUT_TIMEOUT_far"
	| "EEOFFSET_POWERLEVEL_LOW_far"
	| "EEOFFSET_POWERLEVEL_NORMAL_far"
	| "EEOFFSET_WATCHDOG_STARTED_far"
	| "EX_NVM_BRIDGE_NODEPOOL_START_far"
	| "EX_NVM_CONTROLLER_CONFIGURATION_far"
	| "EX_NVM_HOME_ID_far"
	| "EX_NVM_LAST_USED_NODE_ID_START_far"
	| "EX_NVM_MAX_NODE_ID_far"
	| "EX_NVM_NODE_TABLE_START_far"
	| "EX_NVM_PENDING_UPDATE_far"
	| "EX_NVM_RESERVED_ID_far"
	| "EX_NVM_ROUTECACHE_APP_LOCK_far"
	| "EX_NVM_ROUTECACHE_MAGIC_far"
	| "EX_NVM_ROUTECACHE_NLWR_SR_START_far"
	| "EX_NVM_ROUTECACHE_START_far"
	| "EX_NVM_ROUTING_TABLE_START_far"
	| "EX_NVM_STATIC_CONTROLLER_NODE_ID_START_far"
	| "EX_NVM_SUC_ACTIVE_START_far"
	| "EX_NVM_SUC_CONTROLLER_LIST_START_far"
	| "EX_NVM_SUC_LAST_INDEX_START_far"
	| "EX_NVM_SUC_NODE_LIST_START_far"
	| "EX_NVM_SUC_ROUTING_SLAVE_LIST_START_far"
	| "EX_NVM_ZENSOR_TABLE_START_far"
	| "NVM_CONFIGURATION_REALLYVALID_far"
	| "NVM_CONFIGURATION_VALID_far"
	| "NVM_HOMEID_far"
	| "NVM_INTERNAL_RESERVED_1_far"
	| "NVM_INTERNAL_RESERVED_2_far"
	| "NVM_INTERNAL_RESERVED_3_far"
	| "NVM_NODEID_far"
	| "NVM_PENDING_DISCOVERY_far"
	| "NVM_PREFERRED_REPEATERS_far"
	| "NVM_RTC_TIMERS_far"
	| "NVM_SECURITY0_KEY_far"
	| "NVM_SYSTEM_STATE"
	| "nvmApplicationDescriptor"
	| "nvmApplicationSize"
	| "nvmDescriptor"
	| "nvmDescriptorDescriptor"
	| "nvmDescriptorSize"
	| "nvmHostApplicationDescriptor"
	| "nvmHostApplicationSize"
	| "nvmModuleSizeEndMarker"
	| "nvmTotalEnd"
	| "nvmZWlibraryDescriptor"
	| "nvmZWlibrarySize";

// The NVM entries are organized in modules. Each module starts with 16-bit size (NVM_MODULE_SIZE)
// and ends with a module descriptor (NVM_MODULE_DESCRIPTOR).
// The offset (if specified) is used to validate the NVM format.
export interface NVMEntry {
	name: NVMEntryName;
	type: NVMEntryType;
	// Override the default size for this entry
	size?: number;
	/** The offset is only specified if it is needed for validation */
	offset?: number;
	// The actual size of this entry is size(type) * count
	count: number;
}

export type NVMData =
	| Buffer
	| number
	| NVMDescriptor
	| number[]
	| Route
	| NVMModuleDescriptor
	| SUCUpdateEntry
	| NVM500NodeInfo
	| undefined;

export interface ParsedNVMEntry extends NVMEntry {
	data: NVMData[];
}

export type NVMLayout = NVMEntry[];

export const NVMEntrySizes: Record<NVMEntryType, number> = {
	[NVMEntryType.NVMModuleSize]: 2, // Marks the start of an NVM module
	[NVMEntryType.Byte]: 1,
	[NVMEntryType.Word]: 2,
	[NVMEntryType.DWord]: 4,
	[NVMEntryType.Buffer]: 1, // The size must be specified
	[NVMEntryType.NodeInfo]: 5, // 3 bytes NodeProtocolInfo + generic + specific device class
	[NVMEntryType.NodeMask]: NUM_NODEMASK_BYTES, // Nodes bitmask
	[NVMEntryType.SUCUpdateEntry]: SUC_UPDATE_ENTRY_SIZE,
	[NVMEntryType.Route]: 5, // a Route
	[NVMEntryType.NVMModuleDescriptor]: 5, // 2 bytes module size, 1 byte module type, 2 bytes module version
	[NVMEntryType.NVMDescriptor]: 12,
};

export enum NVMModuleType {
	UNDEFINED = 0x00,
	ZW_PHY_LIBRARY = 0x01,
	ZW_LIBRARY = 0x02,
	ZW_FRAMEWORK = 0x03,
	APPLICATION = 0x04,
	HOST_APPLICATION = 0x05,
	SECURITY_2 = 0x06,
	NVM_DESCRIPTOR = 0xff,
}

export const SUC_CONTROLLER_LIST_SIZE = 232;

export const MAX_REPEATERS = 4;

/* NVM is 16KB, 32KB or even more (you decide the size of your SPI EEPROM or FLASH chip) */
/* Use only a reasonable amount of it for host application */
export const NVM_SERIALAPI_HOST_SIZE = 2048;

export const POWERLEVEL_CHANNELS = 3;
export const APPL_NODEPARM_MAX = 35;
export const RTC_TIMER_SIZE = 16;
export const TOTAL_RTC_TIMER_MAX = 8 + 2; /* max number of active RTC timers */

export const CONFIGURATION_VALID_0 = 0x54;
export const CONFIGURATION_VALID_1 = 0xa5;
export const ROUTECACHE_VALID = 0x4a;
export const MAGIC_VALUE = 0x42;
