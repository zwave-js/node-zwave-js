// NVM area sizes
export const ZWAVE_APPLICATION_NVM_SIZE = 0x3000;
export const ZWAVE_PROTOCOL_NVM_SIZE = 0xc000 - ZWAVE_APPLICATION_NVM_SIZE;

// Everything must be word-aligned
export const NVM3_WORD_SIZE = 4;

// Definitions for NVM3 pages
export const NVM3_MIN_PAGE_SIZE = 512;
export const NVM3_PAGE_HEADER_SIZE = 20;
export const NVM3_PAGE_COUNTER_SIZE = 27;
export const NVM3_PAGE_COUNTER_MASK = (1 << NVM3_PAGE_COUNTER_SIZE) - 1;
export const NVM3_PAGE_MAGIC = 0xb29a;
export const FLASH_MAX_PAGE_SIZE = 2048;

export enum PageStatus {
	OK = 0xffffffff,
	OK_ErasePending = 0xffffa5a5,
	Bad = 0x0000ffff,
	Bad_ErasePending = 0x0000a5a5,
}

export enum PageWriteSize {
	WRITE_SIZE_32 = 0, // Only single writes are allowed
	WRITE_SIZE_16 = 1, // Two writes are allowed
}

// Definitions for NVM3 objects
export const NVM3_OBJ_KEY_SHIFT = 7;
export const NVM3_OBJ_KEY_SIZE = 20;
export const NVM3_OBJ_KEY_MASK = (1 << NVM3_OBJ_KEY_SIZE) - 1;
export const NVM3_OBJ_TYPE_MASK = 0b111_1111;
export const NVM3_OBJ_LARGE_LEN_SIZE = 26;
export const NVM3_OBJ_LARGE_LEN_MASK = (1 << NVM3_OBJ_LARGE_LEN_SIZE) - 1;
export const NVM3_OBJ_FRAGTYPE_SHIFT = 27;
export const NVM3_OBJ_FRAGTYPE_MASK = 0b11;
export const NVM3_CODE_SMALL_SHIFT = 27;
export const NVM3_CODE_LARGE_SHIFT = 26;

export const NVM3_OBJ_HEADER_SIZE_SMALL = 4;
export const NVM3_OBJ_HEADER_SIZE_LARGE = 8;

export const NVM3_MAX_OBJ_SIZE_SMALL = 120;
export const NVM3_MAX_OBJ_SIZE_LARGE = 1900; // 204..4096, see nvm3.h in zw_nvm_converter
export const NVM3_COUNTER_SIZE = 204;

export enum ObjectType {
	DataLarge = 0,
	CounterLarge = 1,
	CounterSmall = 2,
	Deleted = 3,
	DataSmall = 7,
}

export enum FragmentType {
	None = 0,
	First = 1,
	Next = 2,
	Last = 3,
}
