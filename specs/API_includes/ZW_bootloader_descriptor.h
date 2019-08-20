/****************************************************************************
 *
 * Copyright (c) 2001-2012
 * Sigma Designs, Inc.
 * All Rights Reserved
 *
 *---------------------------------------------------------------------------
 *
 * Description: Declaration of Z-Wave bootloader descriptor.
 *
 * Last Changed By:  $Author: iza $
 * Revision:         $Revision: 22797 $
 * Last Changed:     $Date: 2012-05-10 15:55:06 +0200 (to, 10 maj 2012) $
 *
 ****************************************************************************/
#ifndef _BOOTLOADER_DESCRIPTOR_H_
#define _BOOTLOADER_DESCRIPTOR_H_

/****************************************************************************/
/*                              INCLUDE FILES                               */
/****************************************************************************/


/****************************************************************************/
/*                              EXPORTED DATA                               */
/****************************************************************************/

/* Bootloader descriptor for OTA firmware update. Located at the end of bootloader. */
typedef struct s_bootloaderDescriptor_
{
  WORD manufacturerID;
  WORD firmwareID;
  WORD checksum;
} t_bootloaderDescriptor;

#endif /* _FIRMWARE_DESCRIPTOR_H_ */
