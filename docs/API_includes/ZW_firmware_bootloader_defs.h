/****************************************************************************
 *
 * Copyright (c) 2001-2014
 * Sigma Designs, Inc.
 * All Rights Reserved
 *
 *---------------------------------------------------------------------------
 *
 * Description: Declaration of Z-Wave firmware bootloader defines.
 *
 * Last Changed By:  $Author: jsi $
 * Revision:         $Revision: 22797 $
 * Last Changed:     $Date: 2012-05-10 15:55:06 +0200 (to, 10 maj 2012) $
 *
 ****************************************************************************/
#ifndef _FIRMWARE_BOOTLOADER_DEFS_H_
#define _FIRMWARE_BOOTLOADER_DEFS_H_

/****************************************************************************/
/*                              INCLUDE FILES                               */
/****************************************************************************/
#include <ZW_nvm_ext_api.h>


/****************************************************************************/
/*                              EXPORTED DATA                               */
/****************************************************************************/


/****************************************************************************/
/*                     EXPORTED TYPES and DEFINITIONS                       */
/****************************************************************************/

/*************************************************************************************/
/* Definitions used by Bootloader library and the NVM Firmware Image functionality   */
/* Firmware Image is written by NVM Firmware Image functionality in NVM according to */
/* the detected NVM Size:                                                            */
/* NVM Size <  128KB NO Firmware Image can/will be saved/flashed                     */
/* NVM Size =  128KB, Firmware Image is partly saved in NVM                           */
/*             - Firmware Image offset 0x01800-0x1A000                               */
/*             - Uses NVM range 0x77FF-0x1FFFF                                       */
/* NVM Size >= 256KB, Firmware Image is fully saved in NVM                            */
/*             - Firmware Image offset 0x00000-0x1FFFF                               */
/*             - Uses NVM range 0x1FFFF-0x3FFFF                                      */
/*************************************************************************************/
/* MCU internal flash size is 128kbytes */
#define FIRMWARE_MCU_SIZE                 0x20000

/* A MCU flash BANK is 32kbytes */
#define MCU_BANK_SIZE                     0x8000

/* Bootloader occupies the first 6kbytes in the MCU address space */
#define FIRMWARE_BOOTLOADER_SIZE          0x1800

/* Firmware boot/start address */
#define FIRMWARE_START_OFFSET             FIRMWARE_BOOTLOADER_SIZE

#define FIRMWARE_BANK1_START              (DWORD)MCU_BANK_SIZE
#define FIRMWARE_BANK2_START              ((DWORD)FIRMWARE_BANK1_START + MCU_BANK_SIZE)
#define FIRMWARE_BANK3_START              ((DWORD)FIRMWARE_BANK2_START + MCU_BANK_SIZE)

/* Current NVM is the m25pe10 1mbit FLASH */
#define NVM_SIZE_1MBIT                    0x20000

/* NVM offset for the New Firmware Image present indicator */
#define FIRMWARE_NVM_IMAGE_NEW      (firmwareUpdate_NVM_Offset - 1)
/* Firmware Image address offset of the first byte written/read in the NVM firmware COMMON area */
//#define FIRMWARE_START_OFFSET_1MBIT       FIRMWARE_BOOTLOADER_SIZE


/* The COMMON BANK in Firmware image consist of the Firmware range FIRMWARE_BOOTLOADER_SIZE-0x7FFF and starts at FIRMWARE_NVM_OFFSET_1MBIT */
#define FIRMWARE_NVM_COMMON_CRC16_1MBIT   (FIRMWARE_NVM_OFFSET_1MBIT + FIRMWARE_COMMON_NVM_OFFSET_1MBIT)
/* Only 26KB of the COMMON BANK are saved we therefore need to offset accordingly when defining the placement of the other BANKs in NVM */
#define FIRMWARE_NVM_BANK1_1MBIT          (FIRMWARE_NVM_OFFSET_1MBIT - FIRMWARE_START_OFFSET_1MBIT + FIRMWARE_BANK1_START)
#define FIRMWARE_NVM_BANK2_1MBIT          (FIRMWARE_NVM_OFFSET_1MBIT - FIRMWARE_START_OFFSET_1MBIT + FIRMWARE_BANK2_START)
#define FIRMWARE_NVM_BANK3_1MBIT          (FIRMWARE_NVM_OFFSET_1MBIT - FIRMWARE_START_OFFSET_1MBIT + FIRMWARE_BANK3_START)

/* Current NVM is the m25pe20 2mbit FLASH or bigger */
#define NVM_SIZE_2MBIT                    0x40000
#define NVM_SIZE_4MBIT                    0x80000
#define NVM_SIZE_8MBIT                    0x100000
#define NVM_SIZE_16MBIT                   0x200000

/* Firmware Image address offset of the first byte written/read in the NVM firmware COMMON area */
//#define FIRMWARE_START_OFFSET_2MBIT       0x0000

/* The COMMON BANK in Firmware image consist of the Firmware range 0x0000-0x7FFF and starts at FIRMWARE_NVM_OFFSET_2MBIT */
/* The first 0x1800 of the COMMON BANK is skipped when calculating the Firmware CRC16 */
#define FIRMWARE_NVM_COMMON_CRC16_2MBIT   (FIRMWARE_NVM_OFFSET_2MBIT + FIRMWARE_COMMON_NVM_OFFSET_2MBIT)
#define FIRMWARE_NVM_BANK1_2MBIT          (FIRMWARE_NVM_OFFSET_2MBIT - FIRMWARE_START_OFFSET_2MBIT + FIRMWARE_BANK1_START)
#define FIRMWARE_NVM_BANK2_2MBIT          (FIRMWARE_NVM_OFFSET_2MBIT - FIRMWARE_START_OFFSET_2MBIT + FIRMWARE_BANK2_START)
#define FIRMWARE_NVM_BANK3_2MBIT          (FIRMWARE_NVM_OFFSET_2MBIT - FIRMWARE_START_OFFSET_2MBIT + FIRMWARE_BANK3_START)



#endif /* _FIRMWARE_BOOTLOADER_DEFS_H_ */
