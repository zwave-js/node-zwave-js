import { MAX_NODES, NUM_NODEMASK_BYTES } from "@zwave-js/core";
import { SUC_MAX_UPDATES } from "../../consts";
import type { NVMParserImplementation } from "../NVMParser";
import {
	APPL_NODEPARM_MAX,
	NVMEntryType,
	NVMLayout,
	NVM_SERIALAPI_HOST_SIZE,
	RTC_TIMER_SIZE,
	SUC_CONTROLLER_LIST_SIZE,
	TOTAL_RTC_TIMER_MAX,
} from "../shared";

const NVM_Layout_Static_6_6x: NVMLayout = [
	{ name: "nvmTotalEnd", type: NVMEntryType.Word, count: 1 },
	{ name: "nvmZWlibrarySize", type: NVMEntryType.NVMModuleSize, count: 1 },
	{ name: "NVM_INTERNAL_RESERVED_1_far", type: NVMEntryType.Byte, count: 4 },
	{
		name: "EX_NVM_HOME_ID_far",
		type: NVMEntryType.DWord,
		count: 1,
	},
	{ name: "NVM_INTERNAL_RESERVED_2_far", type: NVMEntryType.Byte, count: 4 },
	{ name: "NVM_HOMEID_far", type: NVMEntryType.DWord, count: 1 },
	{ name: "NVM_NODEID_far", type: NVMEntryType.Byte, count: 1 },
	{ name: "NVM_CONFIGURATION_VALID_far", type: NVMEntryType.Byte, count: 1 },
	{
		name: "NVM_CONFIGURATION_REALLYVALID_far",
		type: NVMEntryType.Byte,
		count: 1,
	},
	{ name: "NVM_INTERNAL_RESERVED_3_far", type: NVMEntryType.Byte, count: 1 },
	{
		name: "NVM_PREFERRED_REPEATERS_far",
		type: NVMEntryType.NodeMask,
		size: NUM_NODEMASK_BYTES + 3,
		count: 1,
	},
	{
		name: "NVM_PENDING_DISCOVERY_far",
		type: NVMEntryType.NodeMask,
		size: NUM_NODEMASK_BYTES + 3,
		count: 1,
	},
	{
		name: "NVM_RTC_TIMERS_far",
		type: NVMEntryType.Byte,
		count: TOTAL_RTC_TIMER_MAX * RTC_TIMER_SIZE,
	},
	{
		name: "EX_NVM_NODE_TABLE_START_far",
		type: NVMEntryType.NodeInfo,
		count: MAX_NODES,
	},
	{
		name: "EX_NVM_ROUTING_TABLE_START_far",
		type: NVMEntryType.NodeMask,
		count: MAX_NODES,
	},
	{
		name: "EX_NVM_LAST_USED_NODE_ID_START_far",
		type: NVMEntryType.Byte,
		count: 1,
	},
	{
		name: "EX_NVM_STATIC_CONTROLLER_NODE_ID_START_far",
		type: NVMEntryType.Byte,
		count: 1,
	},
	{
		name: "EX_NVM_PENDING_UPDATE_far",
		type: NVMEntryType.NodeMask,
		count: 1,
	},
	{ name: "EX_NVM_SUC_ACTIVE_START_far", type: NVMEntryType.Byte, count: 1 },
	{
		name: "EX_NVM_SUC_NODE_LIST_START_far",
		type: NVMEntryType.SUCUpdateEntry,
		count: SUC_MAX_UPDATES,
	},
	{
		name: "EX_NVM_SUC_CONTROLLER_LIST_START_far",
		type: NVMEntryType.Byte,
		count: SUC_CONTROLLER_LIST_SIZE,
	},
	{
		name: "EX_NVM_SUC_LAST_INDEX_START_far",
		type: NVMEntryType.Byte,
		count: 1,
	},
	{
		name: "EX_NVM_SUC_ROUTING_SLAVE_LIST_START_far",
		type: NVMEntryType.NodeMask,
		count: 1,
	},
	{
		name: "EX_NVM_ZENSOR_TABLE_START_far",
		type: NVMEntryType.NodeMask,
		count: 1,
	},
	{
		name: "EX_NVM_CONTROLLER_CONFIGURATION_far",
		type: NVMEntryType.Byte,
		count: 1,
	},
	{ name: "EX_NVM_MAX_NODE_ID_far", type: NVMEntryType.Byte, count: 1 },
	{ name: "EX_NVM_RESERVED_ID_far", type: NVMEntryType.Byte, count: 1 },
	{
		name: "EX_NVM_ROUTECACHE_START_far",
		type: NVMEntryType.Route,
		count: MAX_NODES,
	},
	{
		name: "EX_NVM_ROUTECACHE_NLWR_SR_START_far",
		type: NVMEntryType.Route,
		count: MAX_NODES,
	},
	{ name: "EX_NVM_ROUTECACHE_MAGIC_far", type: NVMEntryType.Byte, count: 1 },
	{
		name: "EX_NVM_ROUTECACHE_APP_LOCK_far",
		type: NVMEntryType.NodeMask,
		count: 1,
	},
	{
		name: "nvmZWlibraryDescriptor",
		type: NVMEntryType.NVMModuleDescriptor,
		count: 1,
	},
	{
		name: "nvmApplicationSize",
		type: NVMEntryType.NVMModuleSize,
		// The Bridge API saves an additional node mask for the virtual nodes in the
		// previous module, so we can use this offset to distinguish between the two.
		offset: 0x2fc1,
		count: 1,
	},
	{ name: "EEOFFSET_MAGIC_far", type: NVMEntryType.Byte, count: 1 },
	{ name: "EEOFFSET_CMDCLASS_LEN_far", type: NVMEntryType.Byte, count: 1 },
	{
		name: "EEOFFSET_CMDCLASS_far",
		type: NVMEntryType.Byte,
		count: APPL_NODEPARM_MAX,
	},
	{
		name: "EEOFFSET_WATCHDOG_STARTED_far",
		type: NVMEntryType.Byte,
		count: 1,
	},
	{
		name: "nvmApplicationDescriptor",
		type: NVMEntryType.NVMModuleDescriptor,
		count: 1,
	},
	{
		name: "nvmHostApplicationSize",
		type: NVMEntryType.NVMModuleSize,
		count: 1,
	},
	{
		name: "EEOFFSET_HOST_OFFSET_START_far",
		type: NVMEntryType.Buffer,
		size: NVM_SERIALAPI_HOST_SIZE,
		count: 1,
	},
	{
		name: "nvmHostApplicationDescriptor",
		type: NVMEntryType.NVMModuleDescriptor,
		count: 1,
	},
	{ name: "nvmDescriptorSize", type: NVMEntryType.NVMModuleSize, count: 1 },
	{ name: "nvmDescriptor", type: NVMEntryType.NVMDescriptor, count: 1 },
	{
		name: "nvmDescriptorDescriptor",
		type: NVMEntryType.NVMModuleDescriptor,
		count: 1,
	},
	{ name: "nvmModuleSizeEndMarker", type: NVMEntryType.Word, count: 1 },
];

export const Static_6_6x: NVMParserImplementation = {
	name: "Static 6.6x",
	protocolVersions: ["4.33", "4.62"],
	layout: NVM_Layout_Static_6_6x,
};
