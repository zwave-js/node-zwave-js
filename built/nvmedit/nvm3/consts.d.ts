export declare const ZWAVE_APPLICATION_NVM_SIZE = 12288;
export declare const ZWAVE_PROTOCOL_NVM_SIZE: number;
export declare const NVM3_WORD_SIZE = 4;
export declare const NVM3_MIN_PAGE_SIZE = 512;
export declare const NVM3_PAGE_HEADER_SIZE = 20;
export declare const NVM3_PAGE_COUNTER_SIZE = 27;
export declare const NVM3_PAGE_COUNTER_MASK: number;
export declare const NVM3_PAGE_MAGIC = 45722;
export declare const FLASH_MAX_PAGE_SIZE = 2048;
export declare enum PageStatus {
    OK = 4294967295,
    OK_ErasePending = 4294944165,
    Bad = 65535,
    Bad_ErasePending = 42405
}
export declare enum PageWriteSize {
    WRITE_SIZE_32 = 0,
    WRITE_SIZE_16 = 1
}
export declare const NVM3_OBJ_KEY_SHIFT = 7;
export declare const NVM3_OBJ_KEY_SIZE = 20;
export declare const NVM3_OBJ_KEY_MASK: number;
export declare const NVM3_OBJ_TYPE_MASK = 127;
export declare const NVM3_OBJ_LARGE_LEN_SIZE = 26;
export declare const NVM3_OBJ_LARGE_LEN_MASK: number;
export declare const NVM3_OBJ_FRAGTYPE_SHIFT = 27;
export declare const NVM3_OBJ_FRAGTYPE_MASK = 3;
export declare const NVM3_CODE_SMALL_SHIFT = 27;
export declare const NVM3_CODE_LARGE_SHIFT = 26;
export declare const NVM3_OBJ_HEADER_SIZE_SMALL = 4;
export declare const NVM3_OBJ_HEADER_SIZE_LARGE = 8;
export declare const NVM3_MAX_OBJ_SIZE_SMALL = 120;
export declare const NVM3_MAX_OBJ_SIZE_LARGE = 1900;
export declare const NVM3_COUNTER_SIZE = 204;
export declare enum ObjectType {
    DataLarge = 0,
    CounterLarge = 1,
    CounterSmall = 2,
    Deleted = 3,
    DataSmall = 7
}
export declare enum FragmentType {
    None = 0,
    First = 1,
    Next = 2,
    Last = 3
}
//# sourceMappingURL=consts.d.ts.map