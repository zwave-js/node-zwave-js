import { HOMEID_BYTES, MAX_NODES, NUM_NODEMASK_BYTES } from "@zwave-js/core";
import { SUC_MAX_UPDATES } from "../../consts";
import {
	APPL_NODEPARM_MAX,
	NVMEntryType,
	NVMLayout,
	NVM_SERIALAPI_HOST_SIZE,
	RTC_TIMER_SIZE,
	SUC_CONTROLLER_LIST_SIZE,
	TOTAL_RTC_TIMER_MAX,
} from "../shared";

export const NVM_Layout_Bridge_6_6x: NVMLayout = [
	{ name: "nvmTotalEnd", type: NVMEntryType.WORD, count: 1 },
	{ name: "nvmZWlibrarySize", type: NVMEntryType.NVM_MODULE_SIZE, count: 1 },
	{ name: "NVM_INTERNAL_RESERVED_1_far", type: NVMEntryType.BYTE, count: 4 },
	{
		name: "EX_NVM_HOME_ID_far",
		type: NVMEntryType.BYTE,
		count: HOMEID_BYTES,
	},
	{ name: "NVM_INTERNAL_RESERVED_2_far", type: NVMEntryType.BYTE, count: 4 },
	{ name: "NVM_HOMEID_far", type: NVMEntryType.BYTE, count: HOMEID_BYTES },
	{ name: "NVM_NODEID_far", type: NVMEntryType.BYTE, count: 1 },
	{ name: "NVM_CONFIGURATION_VALID_far", type: NVMEntryType.BYTE, count: 1 },
	{
		name: "NVM_CONFIGURATION_REALLYVALID_far",
		type: NVMEntryType.BYTE,
		count: 1,
	},
	{ name: "NVM_INTERNAL_RESERVED_3_far", type: NVMEntryType.BYTE, count: 1 },
	{
		name: "NVM_PREFERRED_REPEATERS_far",
		type: NVMEntryType.BYTE,
		count: NUM_NODEMASK_BYTES + 3,
	},
	{
		name: "NVM_PENDING_DISCOVERY_far",
		type: NVMEntryType.BYTE,
		count: NUM_NODEMASK_BYTES + 3,
	},
	{
		name: "NVM_RTC_TIMERS_far",
		type: NVMEntryType.BYTE,
		count: TOTAL_RTC_TIMER_MAX * RTC_TIMER_SIZE,
	},
	{
		name: "EX_NVM_NODE_TABLE_START_far",
		type: NVMEntryType.EX_NVM_NODEINFO,
		count: MAX_NODES,
	},
	{
		name: "EX_NVM_ROUTING_TABLE_START_far",
		type: NVMEntryType.NODE_MASK_TYPE,
		count: MAX_NODES,
	},
	{
		name: "EX_NVM_LAST_USED_NODE_ID_START_far",
		type: NVMEntryType.BYTE,
		count: 1,
	},
	{
		name: "EX_NVM_STATIC_CONTROLLER_NODE_ID_START_far",
		type: NVMEntryType.BYTE,
		count: 1,
	},
	{
		name: "EX_NVM_PENDING_UPDATE_far",
		type: NVMEntryType.NODE_MASK_TYPE,
		count: 1,
	},
	{ name: "EX_NVM_SUC_ACTIVE_START_far", type: NVMEntryType.BYTE, count: 1 },
	{
		name: "EX_NVM_SUC_NODE_LIST_START_far",
		type: NVMEntryType.SUC_UPDATE_ENTRY_STRUCT,
		count: SUC_MAX_UPDATES,
	},
	{
		name: "EX_NVM_SUC_CONTROLLER_LIST_START_far",
		type: NVMEntryType.BYTE,
		count: SUC_CONTROLLER_LIST_SIZE,
	},
	{
		name: "EX_NVM_SUC_LAST_INDEX_START_far",
		type: NVMEntryType.BYTE,
		count: 1,
	},
	{
		name: "EX_NVM_SUC_ROUTING_SLAVE_LIST_START_far",
		type: NVMEntryType.NODE_MASK_TYPE,
		count: 1,
	},
	{
		name: "EX_NVM_ZENSOR_TABLE_START_far",
		type: NVMEntryType.NODE_MASK_TYPE,
		count: 1,
	},
	{
		name: "EX_NVM_BRIDGE_NODEPOOL_START_far",
		type: NVMEntryType.NODE_MASK_TYPE,
		count: 1,
	},
	{
		name: "EX_NVM_CONTROLLER_CONFIGURATION_far",
		type: NVMEntryType.BYTE,
		count: 1,
	},
	{ name: "EX_NVM_MAX_NODE_ID_far", type: NVMEntryType.BYTE, count: 1 },
	{ name: "EX_NVM_RESERVED_ID_far", type: NVMEntryType.BYTE, count: 1 },
	{
		name: "EX_NVM_ROUTECACHE_START_far",
		type: NVMEntryType.ROUTECACHE_LINE,
		count: MAX_NODES,
	},
	{
		name: "EX_NVM_ROUTECACHE_NLWR_SR_START_far",
		type: NVMEntryType.ROUTECACHE_LINE,
		count: MAX_NODES,
	},
	{ name: "EX_NVM_ROUTECACHE_MAGIC_far", type: NVMEntryType.BYTE, count: 1 },
	{
		name: "EX_NVM_ROUTECACHE_APP_LOCK_far",
		type: NVMEntryType.BYTE,
		count: NUM_NODEMASK_BYTES,
	},
	{
		name: "nvmZWlibraryDescriptor",
		type: NVMEntryType.NVM_MODULE_DESCRIPTOR,
		count: 1,
	},
	{
		name: "nvmApplicationSize",
		type: NVMEntryType.NVM_MODULE_SIZE,
		// The Bridge API saves an additional node mask for the virtual nodes in the
		// previous module, so we can use this offset to distinguish between the two.
		offset: 0x2fde,
		count: 1,
	},
	{ name: "EEOFFSET_MAGIC_far", type: NVMEntryType.BYTE, count: 1 },
	{ name: "EEOFFSET_CMDCLASS_LEN_far", type: NVMEntryType.BYTE, count: 1 },
	{
		name: "EEOFFSET_CMDCLASS_far",
		type: NVMEntryType.BYTE,
		count: APPL_NODEPARM_MAX,
	},
	{
		name: "EEOFFSET_WATCHDOG_STARTED_far",
		type: NVMEntryType.BYTE,
		count: 1,
	},
	{
		name: "nvmApplicationDescriptor",
		type: NVMEntryType.NVM_MODULE_DESCRIPTOR,
		count: 1,
	},
	{
		name: "nvmHostApplicationSize",
		type: NVMEntryType.NVM_MODULE_SIZE,
		count: 1,
	},
	{
		name: "EEOFFSET_HOST_OFFSET_START_far",
		type: NVMEntryType.BYTE,
		count: NVM_SERIALAPI_HOST_SIZE,
	},
	{
		name: "nvmHostApplicationDescriptor",
		type: NVMEntryType.NVM_MODULE_DESCRIPTOR,
		count: 1,
	},
	{ name: "nvmDescriptorSize", type: NVMEntryType.NVM_MODULE_SIZE, count: 1 },
	{ name: "nvmDescriptor", type: NVMEntryType.NVM_DESCRIPTOR, count: 1 },
	{
		name: "nvmDescriptorDescriptor",
		type: NVMEntryType.NVM_MODULE_DESCRIPTOR,
		count: 1,
	},
	{ name: "nvmModuleSizeEndMarker", type: NVMEntryType.WORD, count: 1 },
];
