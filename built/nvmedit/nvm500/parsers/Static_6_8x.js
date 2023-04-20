"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Static_6_8x = void 0;
const safe_1 = require("@zwave-js/core/safe");
const consts_1 = require("../../consts");
const shared_1 = require("../shared");
const NVM_Layout_Static_6_8x = [
    { name: "nvmTotalEnd", type: shared_1.NVMEntryType.Word, count: 1 },
    { name: "nvmZWlibrarySize", type: shared_1.NVMEntryType.NVMModuleSize, count: 1 },
    { name: "NVM_INTERNAL_RESERVED_1_far", type: shared_1.NVMEntryType.Byte, count: 4 },
    {
        name: "EX_NVM_HOME_ID_far",
        type: shared_1.NVMEntryType.DWord,
        count: 1,
    },
    { name: "NVM_INTERNAL_RESERVED_2_far", type: shared_1.NVMEntryType.Byte, count: 4 },
    { name: "NVM_HOMEID_far", type: shared_1.NVMEntryType.DWord, count: 1 },
    { name: "NVM_NODEID_far", type: shared_1.NVMEntryType.Byte, count: 1 },
    { name: "NVM_CONFIGURATION_VALID_far", type: shared_1.NVMEntryType.Byte, count: 1 },
    {
        name: "NVM_CONFIGURATION_REALLYVALID_far",
        type: shared_1.NVMEntryType.Byte,
        count: 1,
    },
    { name: "NVM_INTERNAL_RESERVED_3_far", type: shared_1.NVMEntryType.Byte, count: 1 },
    {
        name: "NVM_PREFERRED_REPEATERS_far",
        type: shared_1.NVMEntryType.NodeMask,
        size: safe_1.NUM_NODEMASK_BYTES + 3,
        count: 1,
    },
    {
        name: "NVM_PENDING_DISCOVERY_far",
        type: shared_1.NVMEntryType.NodeMask,
        size: safe_1.NUM_NODEMASK_BYTES + 3,
        count: 1,
    },
    {
        name: "NVM_RTC_TIMERS_far",
        type: shared_1.NVMEntryType.Byte,
        count: shared_1.TOTAL_RTC_TIMER_MAX * shared_1.RTC_TIMER_SIZE,
    },
    {
        name: "EX_NVM_NODE_TABLE_START_far",
        type: shared_1.NVMEntryType.NodeInfo,
        count: safe_1.MAX_NODES,
    },
    {
        name: "EX_NVM_ROUTING_TABLE_START_far",
        type: shared_1.NVMEntryType.NodeMask,
        count: safe_1.MAX_NODES,
    },
    {
        name: "EX_NVM_LAST_USED_NODE_ID_START_far",
        type: shared_1.NVMEntryType.Byte,
        count: 1,
    },
    {
        name: "EX_NVM_STATIC_CONTROLLER_NODE_ID_START_far",
        type: shared_1.NVMEntryType.Byte,
        count: 1,
    },
    {
        name: "EX_NVM_PENDING_UPDATE_far",
        type: shared_1.NVMEntryType.NodeMask,
        count: 1,
    },
    { name: "EX_NVM_SUC_ACTIVE_START_far", type: shared_1.NVMEntryType.Byte, count: 1 },
    {
        name: "EX_NVM_SUC_NODE_LIST_START_far",
        type: shared_1.NVMEntryType.SUCUpdateEntry,
        count: consts_1.SUC_MAX_UPDATES,
    },
    {
        name: "EX_NVM_SUC_CONTROLLER_LIST_START_far",
        type: shared_1.NVMEntryType.Byte,
        count: shared_1.SUC_CONTROLLER_LIST_SIZE,
    },
    {
        name: "EX_NVM_SUC_LAST_INDEX_START_far",
        type: shared_1.NVMEntryType.Byte,
        count: 1,
    },
    {
        name: "EX_NVM_SUC_ROUTING_SLAVE_LIST_START_far",
        type: shared_1.NVMEntryType.NodeMask,
        count: 1,
    },
    {
        name: "EX_NVM_ZENSOR_TABLE_START_far",
        type: shared_1.NVMEntryType.NodeMask,
        count: 1,
    },
    {
        name: "EX_NVM_CONTROLLER_CONFIGURATION_far",
        type: shared_1.NVMEntryType.Byte,
        count: 1,
    },
    { name: "EX_NVM_MAX_NODE_ID_far", type: shared_1.NVMEntryType.Byte, count: 1 },
    { name: "EX_NVM_RESERVED_ID_far", type: shared_1.NVMEntryType.Byte, count: 1 },
    {
        name: "EX_NVM_ROUTECACHE_START_far",
        type: shared_1.NVMEntryType.Route,
        offset: 0x268e,
        count: safe_1.MAX_NODES,
    },
    {
        name: "EX_NVM_ROUTECACHE_NLWR_SR_START_far",
        type: shared_1.NVMEntryType.Route,
        count: safe_1.MAX_NODES,
    },
    { name: "EX_NVM_ROUTECACHE_MAGIC_far", type: shared_1.NVMEntryType.Byte, count: 1 },
    {
        name: "EX_NVM_ROUTECACHE_APP_LOCK_far",
        type: shared_1.NVMEntryType.NodeMask,
        count: 1,
    },
    {
        name: "NVM_SECURITY0_KEY_far",
        type: shared_1.NVMEntryType.Buffer,
        size: 16,
        count: 1,
    },
    { name: "NVM_SYSTEM_STATE", type: shared_1.NVMEntryType.Byte, count: 1 },
    {
        name: "nvmZWlibraryDescriptor",
        type: shared_1.NVMEntryType.NVMModuleDescriptor,
        count: 1,
    },
    {
        name: "nvmApplicationSize",
        type: shared_1.NVMEntryType.NVMModuleSize,
        // The Bridge API saves an additional node mask for the virtual nodes in the
        // previous module, so we can use this offset to distinguish between the two.
        offset: 0x2fd2,
        count: 1,
    },
    { name: "EEOFFSET_MAGIC_far", type: shared_1.NVMEntryType.Byte, count: 1 },
    { name: "EEOFFSET_CMDCLASS_LEN_far", type: shared_1.NVMEntryType.Byte, count: 1 },
    {
        name: "EEOFFSET_CMDCLASS_far",
        type: shared_1.NVMEntryType.Byte,
        count: shared_1.APPL_NODEPARM_MAX,
    },
    {
        name: "EEOFFSET_WATCHDOG_STARTED_far",
        type: shared_1.NVMEntryType.Byte,
        count: 1,
    },
    {
        name: "EEOFFSET_POWERLEVEL_NORMAL_far",
        type: shared_1.NVMEntryType.Byte,
        count: shared_1.POWERLEVEL_CHANNELS,
    },
    {
        name: "EEOFFSET_POWERLEVEL_LOW_far",
        type: shared_1.NVMEntryType.Byte,
        count: shared_1.POWERLEVEL_CHANNELS,
    },
    {
        name: "EEOFFSET_MODULE_POWER_MODE_EXTINT_ENABLE_far",
        type: shared_1.NVMEntryType.Byte,
        count: 1,
    },
    {
        name: "EEOFFSET_MODULE_POWER_MODE_far",
        type: shared_1.NVMEntryType.Byte,
        count: 1,
    },
    {
        name: "EEOFFSET_MODULE_POWER_MODE_WUT_TIMEOUT_far",
        type: shared_1.NVMEntryType.DWord,
        count: 1,
    },
    {
        name: "nvmApplicationDescriptor",
        type: shared_1.NVMEntryType.NVMModuleDescriptor,
        count: 1,
    },
    {
        name: "nvmHostApplicationSize",
        type: shared_1.NVMEntryType.NVMModuleSize,
        count: 1,
    },
    {
        name: "EEOFFSET_HOST_OFFSET_START_far",
        type: shared_1.NVMEntryType.Buffer,
        size: shared_1.NVM_SERIALAPI_HOST_SIZE,
        count: 1,
    },
    {
        name: "nvmHostApplicationDescriptor",
        type: shared_1.NVMEntryType.NVMModuleDescriptor,
        count: 1,
    },
    { name: "nvmDescriptorSize", type: shared_1.NVMEntryType.NVMModuleSize, count: 1 },
    { name: "nvmDescriptor", type: shared_1.NVMEntryType.NVMDescriptor, count: 1 },
    {
        name: "nvmDescriptorDescriptor",
        type: shared_1.NVMEntryType.NVMModuleDescriptor,
        count: 1,
    },
    { name: "nvmModuleSizeEndMarker", type: shared_1.NVMEntryType.Word, count: 1 },
];
exports.Static_6_8x = {
    name: "Static 6.8x",
    library: "static",
    protocolVersions: [
        "6.01",
        "6.02",
        "6.03",
        "6.04",
        "6.05",
        "6.06",
        "6.07",
        "6.08",
        "6.09",
        "6.10",
    ],
    layout: NVM_Layout_Static_6_8x,
};
//# sourceMappingURL=Static_6_8x.js.map