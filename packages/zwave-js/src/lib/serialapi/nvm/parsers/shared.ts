export enum NVMEntryType {
	BYTE,
	WORD,
	EX_NVM_NODEINFO,
	NODE_MASK_TYPE,
	SUC_UPDATE_ENTRY_STRUCT,
	ROUTECACHE_LINE,
	t_nvmModuleDescriptor,
	t_NvmModuleSize,
}

export interface NVMEntry {
	name: string;
	type: NVMEntryType;
	offset: number;
	// The actual size of this entry is size(type) * count
	count: number;
}

export type NVMLayout = NVMEntry[];

export enum NVMModuleType {
	NVM_MODULE_TYPE_UNDEFINED = 0x00,
	NVM_MODULE_TYPE_ZW_PHY_LIBRARY = 0x01,
	NVM_MODULE_TYPE_ZW_LIBRARY = 0x02,
	NVM_MODULE_TYPE_ZW_FRAMEWORK = 0x03,
	NVM_MODULE_TYPE_APPLICATION = 0x04,
	NVM_MODULE_TYPE_HOST_APPLICATION = 0x05,
	NVM_MODULE_TYPE_SECURITY_2 = 0x06,
	NVM_MODULE_TYPE_NVM_DESCRIPTOR = 0xff,
}

const SUC_CONTROLLER_LIST_SIZE = 232;
const SUC_MAX_UPDATES = 64;

const MAX_REPEATERS = 4;
const SUC_UPDATE_NODEPARM_MAX = 20; /* max. number of command classes in update list */

/* NVM is 16KB, 32KB or even more (you decide the size of your SPI EEPROM or FLASH chip) */
/* Use only a reasonable amount of it for host application */
const NVM_SERIALAPI_HOST_SIZE = 2048;

const POWERLEVEL_CHANNELS = 3;
const APPL_NODEPARM_MAX = 35;
const RTC_TIMER_SIZE = 16;
const TOTAL_RTC_TIMER_MAX = 8 + 2; /* max number of active RTC timers */

const CONFIGURATION_VALID_0 = 0x54;
const CONFIGURATION_VALID_1 = 0xa5;
const ROUTECACHE_VALID = 0x4a;
const MAGIC_VALUE = 0x42;
