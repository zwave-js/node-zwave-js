/***************************************************************************
*
* Copyright (c) 2001-2012
* Sigma Designs, Inc.
* All Rights Reserved
*
*---------------------------------------------------------------------------
*
* Description: Interface driver for the 500 Series Z-Wave Single Chip
*              built-in Flash code and NVR spaces
*
* Author:      Morten Vested Olesen
*
* Last Changed By:  $Author: jdo $
* Revision:         $Revision: 1.38 $
* Last Changed:     $Date: 2005/07/27 15:12:54 $
*
****************************************************************************/
#ifndef _ZW_FLASH_API_H_
#define _ZW_FLASH_API_H_

/***************************************************************************/
/*                              INCLUDE FILES                              */
/***************************************************************************/
#include <ZW_basis_api.h>

/***************************************************************************/
/*                      PRIVATE TYPES and DEFINITIONS                      */
/***************************************************************************/
#define  FLASH_STATE_DONE     0x04
#define  FLASH_STATE_LOCK     0x02
#define  FLASH_STATE_ERR      0x01

/***************************************************************************/
/*                              EXPORTED DATA                              */
/***************************************************************************/

/***************************************************************************/
/*                           EXPORTED FUNCTIONS                            */
/***************************************************************************/

#ifndef ZW_bootloader_ZW050x
/*=========================   ZW_FLASH_nvr0_get   ============================
**    Reads byte from NVR0
**
**    Side effects: will halt MCU for 3 clock periods
**--------------------------------------------------------------------------*/
BYTE /* return:  data read from NVR0 mem*/
ZW_FLASH_nvr0_get(BYTE bNvrAddress);
#endif

/*=========================   ZW_FLASH_code_prog_unlock   ============================
**    Enables code area erase and program
**
**    Side effects:
**--------------------------------------------------------------------------*/
BYTE /* return:  0x00 when unclocked */
ZW_FLASH_code_prog_unlock(BYTE *pbUnlockString);

/*=========================   ZW_FLASH_code_prog_lock   ============================
**    Disables code area erase and program
**
**    Side effects:
**--------------------------------------------------------------------------*/
BYTE /* return:  0x00 when locked */
ZW_FLASH_code_prog_lock(void);

/*=========================   ZW_FLASH_code_sector_erase   ============================
**    Erase code sector
**
**    Side effects: halts MCU for 4ms
**--------------------------------------------------------------------------*/
BYTE /* return:  0x00: page prog OK, non-0x00: failed */
ZW_FLASH_code_sector_erase(BYTE bSector);

/*=========================   ZW_FLASH_code_page_prog   ============================
**    Program code page
**
**    Side effects: halts MCU for 6us per programemd byte that is different from 0xFF
**--------------------------------------------------------------------------*/
BYTE /* return:  0x00: page prog passed, non-0x00:  page progfailed */
ZW_FLASH_code_page_prog(BYTE *pbRamAddress,
                        BYTE bSector,
                        BYTE bPage);

#ifndef ZW_bootloader_ZW050x
/*=========================   ZW_FLASH_auto_prog_set   ============================
**    Sets auto prog mode register bit
**
**    Side effects:
**--------------------------------------------------------------------------*/
void /* return:  nothing */
ZW_FLASH_auto_prog_set(void);


/*=========================   ZW_FLASH_prog_status_get   ============================
**    Reads the status of the flash programming state machine
**       Returns bitmask:     FLASH_STATE_LOCK Programming is locked
**                            FLASH_STATE_ERR  Programming is in error state
**
**    Side effects:
**--------------------------------------------------------------------------*/
BYTE /* return:  flash state */
ZW_FLASH_prog_state(void);
#endif

#endif //  _ZW_FLASH_API_H_
