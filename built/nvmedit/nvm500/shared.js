"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MAGIC_VALUE = exports.ROUTECACHE_VALID = exports.CONFIGURATION_VALID_1 = exports.CONFIGURATION_VALID_0 = exports.TOTAL_RTC_TIMER_MAX = exports.RTC_TIMER_SIZE = exports.APPL_NODEPARM_MAX = exports.POWERLEVEL_CHANNELS = exports.NVM_SERIALAPI_HOST_SIZE = exports.MAX_REPEATERS = exports.SUC_CONTROLLER_LIST_SIZE = exports.NVMModuleType = exports.NVMEntrySizes = exports.NVMEntryType = void 0;
const safe_1 = require("@zwave-js/core/safe");
const consts_1 = require("../consts");
var NVMEntryType;
(function (NVMEntryType) {
    NVMEntryType[NVMEntryType["NVMModuleSize"] = 0] = "NVMModuleSize";
    NVMEntryType[NVMEntryType["Byte"] = 1] = "Byte";
    NVMEntryType[NVMEntryType["Word"] = 2] = "Word";
    NVMEntryType[NVMEntryType["DWord"] = 3] = "DWord";
    NVMEntryType[NVMEntryType["Buffer"] = 4] = "Buffer";
    NVMEntryType[NVMEntryType["NodeInfo"] = 5] = "NodeInfo";
    NVMEntryType[NVMEntryType["NodeMask"] = 6] = "NodeMask";
    NVMEntryType[NVMEntryType["SUCUpdateEntry"] = 7] = "SUCUpdateEntry";
    NVMEntryType[NVMEntryType["Route"] = 8] = "Route";
    NVMEntryType[NVMEntryType["NVMModuleDescriptor"] = 9] = "NVMModuleDescriptor";
    NVMEntryType[NVMEntryType["NVMDescriptor"] = 10] = "NVMDescriptor";
})(NVMEntryType = exports.NVMEntryType || (exports.NVMEntryType = {}));
exports.NVMEntrySizes = {
    [NVMEntryType.NVMModuleSize]: 2,
    [NVMEntryType.Byte]: 1,
    [NVMEntryType.Word]: 2,
    [NVMEntryType.DWord]: 4,
    [NVMEntryType.Buffer]: 1,
    [NVMEntryType.NodeInfo]: 5,
    [NVMEntryType.NodeMask]: safe_1.NUM_NODEMASK_BYTES,
    [NVMEntryType.SUCUpdateEntry]: consts_1.SUC_UPDATE_ENTRY_SIZE,
    [NVMEntryType.Route]: 5,
    [NVMEntryType.NVMModuleDescriptor]: 5,
    [NVMEntryType.NVMDescriptor]: 12,
};
var NVMModuleType;
(function (NVMModuleType) {
    NVMModuleType[NVMModuleType["UNDEFINED"] = 0] = "UNDEFINED";
    NVMModuleType[NVMModuleType["ZW_PHY_LIBRARY"] = 1] = "ZW_PHY_LIBRARY";
    NVMModuleType[NVMModuleType["ZW_LIBRARY"] = 2] = "ZW_LIBRARY";
    NVMModuleType[NVMModuleType["ZW_FRAMEWORK"] = 3] = "ZW_FRAMEWORK";
    NVMModuleType[NVMModuleType["APPLICATION"] = 4] = "APPLICATION";
    NVMModuleType[NVMModuleType["HOST_APPLICATION"] = 5] = "HOST_APPLICATION";
    NVMModuleType[NVMModuleType["SECURITY_2"] = 6] = "SECURITY_2";
    NVMModuleType[NVMModuleType["NVM_DESCRIPTOR"] = 255] = "NVM_DESCRIPTOR";
})(NVMModuleType = exports.NVMModuleType || (exports.NVMModuleType = {}));
exports.SUC_CONTROLLER_LIST_SIZE = 232;
exports.MAX_REPEATERS = 4;
/* NVM is 16KB, 32KB or even more (you decide the size of your SPI EEPROM or FLASH chip) */
/* Use only a reasonable amount of it for host application */
exports.NVM_SERIALAPI_HOST_SIZE = 2048;
exports.POWERLEVEL_CHANNELS = 3;
exports.APPL_NODEPARM_MAX = 35;
exports.RTC_TIMER_SIZE = 16;
exports.TOTAL_RTC_TIMER_MAX = 8 + 2; /* max number of active RTC timers */
exports.CONFIGURATION_VALID_0 = 0x54;
exports.CONFIGURATION_VALID_1 = 0xa5;
exports.ROUTECACHE_VALID = 0x4a;
exports.MAGIC_VALUE = 0x42;
//# sourceMappingURL=shared.js.map