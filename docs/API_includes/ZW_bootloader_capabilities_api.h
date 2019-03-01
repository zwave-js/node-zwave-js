/*************************************************************************** 
* 
* Copyright (c) 2016
* Sigma Designs, Inc. 
* All Rights Reserved 
* 
*--------------------------------------------------------------------------- 
* 
* Description: Bootloader Capabilities API
* 
* Author:   Jakob Buron 
* 
****************************************************************************/
#ifndef ZW_BOOTLOADER_CAPABILITIES_API_H_
#define ZW_BOOTLOADER_CAPABILITIES_API_H_

/* Defines for Capabilities */
#define BOOT_NVM_SLEEP_SUPPORTED        0x0001
#define BOOT_FASTLZ_COMPRESSION         0x0002

#ifndef ZW_bootloader_ZW050x
/*============================   ZW_BootIsSupported   ===========================
**    Check if the bootloader supports the given functionality
**
**    Side effects:  None
**
**--------------------------------------------------------------------------*/
BOOL
ZW_BootIsSupported(WORD wSupportedCapability);

/*==========================   ZW_BootloaderPresent   ===========================
**    Check if we are running in a system with bootloader
**
**    Side effects:  None
**
**--------------------------------------------------------------------------*/
BOOL
ZW_BootloaderPresent();

#endif

#endif /* ZW_BOOTLOADER_CAPABILITIES_API_H_ */
