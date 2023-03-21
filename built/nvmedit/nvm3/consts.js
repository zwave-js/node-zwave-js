"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FragmentType = exports.ObjectType = exports.NVM3_COUNTER_SIZE = exports.NVM3_MAX_OBJ_SIZE_LARGE = exports.NVM3_MAX_OBJ_SIZE_SMALL = exports.NVM3_OBJ_HEADER_SIZE_LARGE = exports.NVM3_OBJ_HEADER_SIZE_SMALL = exports.NVM3_CODE_LARGE_SHIFT = exports.NVM3_CODE_SMALL_SHIFT = exports.NVM3_OBJ_FRAGTYPE_MASK = exports.NVM3_OBJ_FRAGTYPE_SHIFT = exports.NVM3_OBJ_LARGE_LEN_MASK = exports.NVM3_OBJ_LARGE_LEN_SIZE = exports.NVM3_OBJ_TYPE_MASK = exports.NVM3_OBJ_KEY_MASK = exports.NVM3_OBJ_KEY_SIZE = exports.NVM3_OBJ_KEY_SHIFT = exports.PageWriteSize = exports.PageStatus = exports.FLASH_MAX_PAGE_SIZE = exports.NVM3_PAGE_MAGIC = exports.NVM3_PAGE_COUNTER_MASK = exports.NVM3_PAGE_COUNTER_SIZE = exports.NVM3_PAGE_HEADER_SIZE = exports.NVM3_MIN_PAGE_SIZE = exports.NVM3_WORD_SIZE = exports.ZWAVE_PROTOCOL_NVM_SIZE = exports.ZWAVE_APPLICATION_NVM_SIZE = void 0;
// NVM area sizes
exports.ZWAVE_APPLICATION_NVM_SIZE = 0x3000;
exports.ZWAVE_PROTOCOL_NVM_SIZE = 0xc000 - exports.ZWAVE_APPLICATION_NVM_SIZE;
// Everything must be word-aligned
exports.NVM3_WORD_SIZE = 4;
// Definitions for NVM3 pages
exports.NVM3_MIN_PAGE_SIZE = 512;
exports.NVM3_PAGE_HEADER_SIZE = 20;
exports.NVM3_PAGE_COUNTER_SIZE = 27;
exports.NVM3_PAGE_COUNTER_MASK = (1 << exports.NVM3_PAGE_COUNTER_SIZE) - 1;
exports.NVM3_PAGE_MAGIC = 0xb29a;
exports.FLASH_MAX_PAGE_SIZE = 2048;
var PageStatus;
(function (PageStatus) {
    PageStatus[PageStatus["OK"] = 4294967295] = "OK";
    PageStatus[PageStatus["OK_ErasePending"] = 4294944165] = "OK_ErasePending";
    PageStatus[PageStatus["Bad"] = 65535] = "Bad";
    PageStatus[PageStatus["Bad_ErasePending"] = 42405] = "Bad_ErasePending";
})(PageStatus = exports.PageStatus || (exports.PageStatus = {}));
var PageWriteSize;
(function (PageWriteSize) {
    PageWriteSize[PageWriteSize["WRITE_SIZE_32"] = 0] = "WRITE_SIZE_32";
    PageWriteSize[PageWriteSize["WRITE_SIZE_16"] = 1] = "WRITE_SIZE_16";
})(PageWriteSize = exports.PageWriteSize || (exports.PageWriteSize = {}));
// Definitions for NVM3 objects
exports.NVM3_OBJ_KEY_SHIFT = 7;
exports.NVM3_OBJ_KEY_SIZE = 20;
exports.NVM3_OBJ_KEY_MASK = (1 << exports.NVM3_OBJ_KEY_SIZE) - 1;
exports.NVM3_OBJ_TYPE_MASK = 127;
exports.NVM3_OBJ_LARGE_LEN_SIZE = 26;
exports.NVM3_OBJ_LARGE_LEN_MASK = (1 << exports.NVM3_OBJ_LARGE_LEN_SIZE) - 1;
exports.NVM3_OBJ_FRAGTYPE_SHIFT = 27;
exports.NVM3_OBJ_FRAGTYPE_MASK = 0b11;
exports.NVM3_CODE_SMALL_SHIFT = 27;
exports.NVM3_CODE_LARGE_SHIFT = 26;
exports.NVM3_OBJ_HEADER_SIZE_SMALL = 4;
exports.NVM3_OBJ_HEADER_SIZE_LARGE = 8;
exports.NVM3_MAX_OBJ_SIZE_SMALL = 120;
exports.NVM3_MAX_OBJ_SIZE_LARGE = 1900; // 204..4096, see nvm3.h in zw_nvm_converter
exports.NVM3_COUNTER_SIZE = 204;
var ObjectType;
(function (ObjectType) {
    ObjectType[ObjectType["DataLarge"] = 0] = "DataLarge";
    ObjectType[ObjectType["CounterLarge"] = 1] = "CounterLarge";
    ObjectType[ObjectType["CounterSmall"] = 2] = "CounterSmall";
    ObjectType[ObjectType["Deleted"] = 3] = "Deleted";
    ObjectType[ObjectType["DataSmall"] = 7] = "DataSmall";
})(ObjectType = exports.ObjectType || (exports.ObjectType = {}));
var FragmentType;
(function (FragmentType) {
    FragmentType[FragmentType["None"] = 0] = "None";
    FragmentType[FragmentType["First"] = 1] = "First";
    FragmentType[FragmentType["Next"] = 2] = "Next";
    FragmentType[FragmentType["Last"] = 3] = "Last";
})(FragmentType = exports.FragmentType || (exports.FragmentType = {}));
//# sourceMappingURL=consts.js.map