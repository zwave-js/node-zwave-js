/****************************************************************************
 *
 * Copyright (c) 2001-2013
 * Sigma Designs, Inc.
 * All Rights Reserved
 *
 *---------------------------------------------------------------------------
 *
 * Description: Firmware Update functionality
 *
 * Author:   Johann Sigfredsson
 *
 * Last Changed By:  $Author: jbu $
 * Revision:         $Revision: 58 $
 * Last Changed:     $Date: 2009-01-12 09:45:03 +0100 (ma, 12 jan 2009) $
 *
 ****************************************************************************/

#ifndef _ZW_FIRMWARE_UPDATE_NVM_API_H_
#define _ZW_FIRMWARE_UPDATE_NVM_API_H_

/****************************************************************************/
/*                              INCLUDE FILES                               */
/****************************************************************************/
#include <ZW_firmware_bootloader_defs.h>

/****************************************************************************/
/*                     EXPORTED TYPES and DEFINITIONS                       */
/****************************************************************************/

/* ZW_FirmwareUpdate_NVM_Init return code definitions */
#define NVM_FIRMWARE_UPDATE_NOT_SUPPORTED 0
#define NVM_FIRMWARE_UPDATE_SUPPORTED     1

/* FirmwareUpdate NEWIMAGE definitions - Use when calling ZW_FirmwareUpdate_NVM_Set_NEWIMAGE */
typedef enum
{
	FIRMWARE_UPDATE_NVM_NEWIMAGE_NOT_NEW = 0,
	FIRMWARE_UPDATE_NVM_NEWIMAGE_NEW = 1
} FIRMWARE_UPDATE_NVM_NEWIMAGE_T;

/****************************************************************************/
/*                           EXPORTED FUNCTIONS                             */
/****************************************************************************/

/****************************************************************************
**
**  NOTE:
**
**  The Firmware Update module needs ZW_FirmwareUpdate_NVM_Init to be
**  called prior to calling any other Firmware Update module function
**  as ZW_FirmwareUpdate_NVM_Init determines the external NVM attached
**  so the Application can place new Firmware the correct place in NVM
**  making it possible for the Z-Wave Bootloader to find the new firmware
**
*****************************************************************************/


/*================   ZW_FirmwareUpdate_NVM_Init   =================
**
**  Initialize FirmwareUpdate functionality
**  Determines the current attached external NVM and initializes
**  the firmware update functionality accordingly:
**  For firmware update to function (somewhat) NVM needs to be
**  a FLASH based NVM and at least have a capacity of 1MBit .
**
**  Side effects:
**
**---------------------------------------------------------------*/
BYTE /*RET NVM_FIRMWARE_UPDATE_SUPPORTED if NVM is Firmware Update compatible */
     /*    NVM_FIRMWARE_UPDATE_NOT_SUPPORTED if NVM is NOT Firmware Update compatible */
ZW_FirmwareUpdate_NVM_Init();


/*============   ZW_FirmwareUpdate_NVM_Set_NEWIMAGE   =============
**
**  Set New Firmware image available in NVM indicator
**
**  bValue == FIRMWARE_UPDATE_NVM_NEWIMAGE_NOT_NEW informs
**  the Bootloader that NO NEW firmware image exists in external NVM
**  bValue == FIRMWARE_UPDATE_NVM_NEWIMAGE_NEW informs
**  the Bootloader that a possible NEW firmware image exist in external NVM
**
**  Side effects:
**
**---------------------------------------------------------------*/
BYTE  /* RET  TRUE if specified bValue has been written to NVM */
      /*      FALSE if either NVM is not firmware update capable or */
      /*      the Firmware_NEWIMAGE value is allready set to bValue */
ZW_FirmwareUpdate_NVM_Set_NEWIMAGE(
  BYTE bValue);


/*============   ZW_FirmwareUpdate_NVM_Get_NEWIMAGE   =============
**
**  Get New Firmware image available indicator in NVM
**
**  Returns FIRMWARE_UPDATE_NVM_NEWIMAGE_NOT_NEW if either external
**          NVM is not OTA capable or if NO NEW firmware image
**          exists in external NVM
**  Returns FIRMWARE_UPDATE_NVM_NEWIMAGE_NEW if external NVM contains
**          a possible NEW firmware image
**
**  Side effects:
**
**---------------------------------------------------------------*/
BYTE  /* RET FIRMWARE_UPDATE_NVM_NEWIMAGE_NOT_NEW if either NVM */
      /*     not capable or Indicator indicates NO NEW image */
      /*     FIRMWARE_UPDATE_NVM_NEWIMAGE_NEW if Indicator */
      /*     indicates NEW image present */
ZW_FirmwareUpdate_NVM_Get_NEWIMAGE();


/*============   ZW_firmwareUpdate_NVM_UpdateCRC16   ==============
**
**  Calculate CRC16 for NVM block of data
**
**  Side effects:
**
**---------------------------------------------------------------*/
WORD  /* RET  Resulting CRC16 value after doing CRC16 calculation */
      /*      on specified block of data in extrnal NVM */
ZW_firmwareUpdate_NVM_UpdateCRC16(
  WORD crc,
  DWORD nvmOffset,
  WORD blockSize);


/*=============   ZW_FirmwareUpdate_NVM_isValidCRC16   ============
**
**  Check if NVM firmware is valid using CRC16 check of the
**  compressed firmware image in NVM. The CRC16 is matched
**  against the one in header of the compressed image.
**
**  The global variables firmwareUpdate_NVM_Offset and
**  compressionHdr must be set before calling this function.
**
**  Side effects:
**    None
**
**---------------------------------------------------------------*/
BOOL  /* RET  TRUE if NVM contains is a valid Z-Wave Bootloader upgradeable Firmware */
      /*      FALSE if NVM do NOT contain a valid Z-Wave Bootloader upgradeable Firmware */
ZW_FirmwareUpdate_NVM_isValidCRC16(void);


/*===============   ZW_FirmwareUpdate_NVM_Write   =================
**
**  Write Firmware Image block to NVM if applicable.
**  Uses variables initialized by ZW_FirmwareUpdate_NVM_Init together
**  with the specified offset to determine if and where in the external
**  NVM space the sourceBuffer contents should be written.
**
**  Side effects:
**
**---------------------------------------------------------------*/
BYTE  /* RET  TRUE if specified buffer has been written to NVM */
      /*      FALSE if either NVM is not firmware update capable or */
      /*      the sourceBuffer contents allready are present at */
      /*      specified offset in external NVM */
ZW_FirmwareUpdate_NVM_Write(
  BYTE *sourceBuffer,
  WORD fw_bufSize,
  DWORD firmwareOffset);


#endif  /* _ZW_FIRMWARE_UPDATE_NVM_API_H_ */
