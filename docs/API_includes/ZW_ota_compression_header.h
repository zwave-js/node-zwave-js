/*************************************************************************** 
* 
* Copyright (c) 2016
* Sigma Designs, Inc. 
* All Rights Reserved 
* 
*--------------------------------------------------------------------------- 
* 
* Description: Definition of the compression header format for OTA updates.
* 
* Author:   Jakob Buron
* 
****************************************************************************/
#ifndef ZW_OTA_COMPRESSION_HEADER_H_
#define ZW_OTA_COMPRESSION_HEADER_H_
#ifdef __C51__
#include <ZW_stdint.h>
#else
#include <stdint.h>
#define BYTE BYTE /* This prevents subsequent includes of ZW_typedef from redefining BYTE/WORD/DWORD...*/
typedef uint8_t BYTE;
typedef uint16_t WORD;
#ifndef _ZW_TYPEDEFS_H_
typedef uint32_t DWORD;
#endif
typedef uint8_t BOOL;
typedef BYTE * BYTE_P;
// code is a reserved word in Keil C51, ignore with gcc
#define code
#endif
#include <ZW_typedefs.h>
#include "ZW_firmware_descriptor.h"
#include "ZW_firmware_bootloader_defs.h"

#ifdef __C51__
#define PACKED
#else
# ifdef __GNUC__
#  ifdef __MINGW32__
    /* mingw 4.7 and newer miscompiles packed structures in MS-bitfield mode */
#   define PACKED __attribute__((packed,gcc_struct))
#  else
#   define PACKED __attribute__((packed))
#  endif
# else
#  error "Need to define PACKED for this compiler"
# endif
#endif

/* Compression Header types */
#define COMPRESSION_HEADER_TYPE_V1 0x80    /* V1 using FastLZ compression. Arbitrary numbering, not starting from zero because NVM could be initialized to that value*/

//#define ANYSIZE_ARRAY 1

/* Header preceeding the compressed firmware. */
typedef struct s_compressedFirmwareHeader
{
  /* All fields are BIG ENDIAN */
  /* Type of the following header and compression format*/
  uint8_t compressionHeaderType;
  /* Total length of compressed data */
  uint32_t compressedLength;
  /* CRC16 covering this header and the compressed data */
  uint16_t compressedCrc16;
  /* CRC16 covering the uncompressed image.
   * Can be compared to the firmwaredescriptor ApplicationImageCrcValue in code flash. */
  uint16_t uncompressedCrc16;
  /* The scrambling key used for scrambling security keys in the compressed firmware */
  uint8_t scramblingKey[16];
  /* Variable length compressed data follows next */
  uint16_t firmwareDescriptorChecksum;
  /* uint8_t compressedData[ANYSIZE_ARRAY]; */
} PACKED t_compressedFirmwareHeader;

// Used for asserting struct is indeed packed
#define COMPRESSED_FIRMWARE_HEADER_PACKED_LENGTH 27

#endif /* ZW_OTA_COMPRESSION_HEADER_H_ */
