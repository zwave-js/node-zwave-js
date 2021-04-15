// @ts-nocheck

import { HOMEID_BYTES, MAX_NODES, NUM_NODEMASK_BYTES } from "@zwave-js/core";
import { NVMJSON, NVMParser } from "./NVMParser";
import { NVMEntryType, NVMLayout } from "./shared";

export class NVMParser_Static_6_6x extends NVMParser {
	public constructor() {
		super(0x0107, 0x040a);
	}

	public nvmToJSON(nvm: Buffer): NVMJSON {
		throw new Error("Method not implemented.");
	}

	public jsonToNVM(json: NVMJSON): Buffer {
		throw new Error("Method not implemented.");
	}
}

const layout: NVMLayout = [
	{ name: "nvmTotalEnd", type: NVMEntryType.WORD, offset: 0x0000, count: 1 },
	{
		name: "nvmZWlibrarySize",
		type: NVMEntryType.WORD,
		offset: 0x0002,
		count: 1,
	},
	{
		name: "NVM_INTERNAL_RESERVED_1_far",
		type: NVMEntryType.BYTE,
		offset: 0x0004,
		count: 4,
	},
	{
		name: "EX_NVM_HOME_ID_far",
		type: NVMEntryType.BYTE,
		offset: 0x0008,
		count: HOMEID_BYTES,
	},
	{
		name: "NVM_INTERNAL_RESERVED_2_far",
		type: NVMEntryType.BYTE,
		offset: 0x000c,
		count: 4,
	},
	{
		name: "NVM_HOMEID_far",
		type: NVMEntryType.BYTE,
		offset: 0x0010,
		count: HOMEID_BYTES,
	},
	{
		name: "NVM_NODEID_far",
		type: NVMEntryType.BYTE,
		offset: 0x0014,
		count: 1,
	},
	{
		name: "NVM_CONFIGURATION_VALID_far",
		type: NVMEntryType.BYTE,
		offset: 0x0015,
		count: 1,
	},
	{
		name: "NVM_CONFIGURATION_REALLYVALID_far",
		type: NVMEntryType.BYTE,
		offset: 0x0016,
		count: 1,
	},
	{
		name: "NVM_INTERNAL_RESERVED_3_far",
		type: NVMEntryType.BYTE,
		offset: 0x0017,
		count: 1,
	},
	{
		name: "NVM_PREFERRED_REPEATERS_far",
		type: NVMEntryType.BYTE,
		offset: 0x0018,
		count: NUM_NODEMASK_BYTES + 3,
	},
	{
		name: "NVM_PENDING_DISCOVERY_far",
		type: NVMEntryType.BYTE,
		offset: 0x0038,
		count: NUM_NODEMASK_BYTES + 3,
	},
	{
		name: "NVM_RTC_TIMERS_far",
		type: NVMEntryType.BYTE,
		offset: 0x0058,
		count: TOTAL_RTC_TIMER_MAX * RTC_TIMER_SIZE,
	},
	{
		name: "EX_NVM_NODE_TABLE_START_far",
		type: NVMEntryType.EX_NVM_NODEINFO,
		offset: 0x00f8,
		count: MAX_NODES,
	},
	{
		name: "EX_NVM_ROUTING_TABLE_START_far",
		type: NVMEntryType.NODE_MASK_TYPE,
		offset: 0x0580,
		count: MAX_NODES,
	},
	{
		name: "EX_NVM_LAST_USED_NODE_ID_START_far",
		type: NVMEntryType.BYTE,
		offset: 0x1fc8,
		count: 1,
	},
	{
		name: "EX_NVM_STATIC_CONTROLLER_NODE_ID_START_far",
		type: NVMEntryType.BYTE,
		offset: 0x1fc9,
		count: 1,
	},
	{
		name: "EX_NVM_PENDING_UPDATE_far",
		type: NVMEntryType.NODE_MASK_TYPE,
		offset: 0x1fca,
		count: 1,
	},
	{
		name: "EX_NVM_SUC_ACTIVE_START_far",
		type: NVMEntryType.BYTE,
		offset: 0x1fe7,
		count: 1,
	},
	{
		name: "EX_NVM_SUC_NODE_LIST_START_far",
		type: NVMEntryType.SUC_UPDATE_ENTRY_STRUCT,
		offset: 0x1fe8,
		count: SUC_MAX_UPDATES,
	},
	{
		name: "EX_NVM_SUC_CONTROLLER_LIST_START_far",
		type: NVMEntryType.BYTE,
		offset: 0x2568,
		count: SUC_CONTROLLER_LIST_SIZE,
	},
	{
		name: "EX_NVM_SUC_LAST_INDEX_START_far",
		type: NVMEntryType.BYTE,
		offset: 0x2650,
		count: 1,
	},
	{
		name: "EX_NVM_SUC_ROUTING_SLAVE_LIST_START_far",
		type: NVMEntryType.NODE_MASK_TYPE,
		offset: 0x2651,
		count: 1,
	},
	{
		name: "EX_NVM_ZENSOR_TABLE_START_far",
		type: NVMEntryType.NODE_MASK_TYPE,
		offset: 0x266e,
		count: 1,
	},
	{
		name: "EX_NVM_CONTROLLER_CONFIGURATION_far",
		type: NVMEntryType.BYTE,
		offset: 0x268b,
		count: 1,
	},
	{
		name: "EX_NVM_MAX_NODE_ID_far",
		type: NVMEntryType.BYTE,
		offset: 0x268c,
		count: 1,
	},
	{
		name: "EX_NVM_RESERVED_ID_far",
		type: NVMEntryType.BYTE,
		offset: 0x268d,
		count: 1,
	},
	{
		name: "EX_NVM_ROUTECACHE_START_far",
		type: NVMEntryType.ROUTECACHE_LINE,
		offset: 0x268e,
		count: MAX_NODES,
	},
	{
		name: "EX_NVM_ROUTECACHE_NLWR_SR_START_far",
		type: NVMEntryType.ROUTECACHE_LINE,
		offset: 0x2b16,
		count: MAX_NODES,
	},
	{
		name: "EX_NVM_ROUTECACHE_MAGIC_far",
		type: NVMEntryType.BYTE,
		offset: 0x2f9e,
		count: 1,
	},
	{
		name: "EX_NVM_ROUTECACHE_APP_LOCK_far",
		type: NVMEntryType.BYTE,
		offset: 0x2f9f,
		count: NUM_NODEMASK_BYTES,
	},
	{
		name: "nvmZWlibraryDescriptor",
		type: NVMEntryType.t_nvmModuleDescriptor,
		offset: 0x2fbc,
		count: 1,
	},
	{
		name: "nvmApplicationSize",
		type: NVMEntryType.WORD,
		offset: 0x2fc1,
		count: 1,
	},
	{
		name: "EEOFFSET_MAGIC_far",
		type: NVMEntryType.BYTE,
		offset: 0x2fc3,
		count: 1,
	},
	{
		name: "EEOFFSET_CMDCLASS_LEN_far",
		type: NVMEntryType.BYTE,
		offset: 0x2fc4,
		count: 1,
	},
	{
		name: "EEOFFSET_CMDCLASS_far",
		type: NVMEntryType.BYTE,
		offset: 0x2fc5,
		count: APPL_NODEPARM_MAX,
	},
	{
		name: "EEOFFSET_WATCHDOG_STARTED_far",
		type: NVMEntryType.BYTE,
		offset: 0x2fe8,
		count: 1,
	},
	{
		name: "nvmApplicationDescriptor",
		type: NVMEntryType.t_nvmModuleDescriptor,
		offset: 0x2fe9,
		count: 1,
	},
	{
		name: "nvmHostApplicationSize",
		type: NVMEntryType.WORD,
		offset: 0x2fee,
		count: 1,
	},
	{
		name: "EEOFFSET_HOST_OFFSET_START_far",
		type: NVMEntryType.BYTE,
		offset: 0x2ff0,
		count: NVM_SERIALAPI_HOST_SIZE,
	},
	{
		name: "nvmHostApplicationDescriptor",
		type: NVMEntryType.t_nvmModuleDescriptor,
		offset: 0x37f0,
		count: 1,
	},
	{
		name: "nvmDescriptorSize",
		type: NVMEntryType.WORD,
		offset: 0x37f5,
		count: 1,
	},
	{
		name: "nvmDescriptor",
		type: NVMEntryType.t_NvmModuleSize,
		offset: 0x37f7,
		count: 1,
	},
	{
		name: "nvmDescriptorDescriptor",
		type: NVMEntryType.t_nvmModuleDescriptor,
		offset: 0x3803,
		count: 1,
	},
	{
		name: "nvmModuleSizeEndMarker",
		type: NVMEntryType.WORD,
		offset: 0x3808,
		count: 1,
	},
];
