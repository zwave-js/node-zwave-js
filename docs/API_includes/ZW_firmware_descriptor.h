/****************************************************************************
 *
 * Copyright (c) 2001-2012
 * Sigma Designs, Inc.
 * All Rights Reserved
 *
 *---------------------------------------------------------------------------
 *
 * Description: Declaration of Z-Wave firmware descriptor.
 *
 * Author:   Erik Friis Harck
 *
 * Last Changed By:  $Author: iza $
 * Revision:         $Revision: 22797 $
 * Last Changed:     $Date: 2012-05-10 15:55:06 +0200 (to, 10 maj 2012) $
 *
 ****************************************************************************/
#ifndef _FIRMWARE_DESCRIPTOR_H_
#define _FIRMWARE_DESCRIPTOR_H_

#include <ZW_typedefs.h>

/****************************************************************************/
/*                     EXPORTED TYPES and DEFINITIONS                       */
/****************************************************************************/

/* Firmware descriptor for firmware. Located at the end of firmware. */
typedef struct s_firmwareDescriptor_
{
  /* Total amount of code used in COMMON bank */
  WORD wFirmWareCommonSize;  /*  */
  /* Total amount of code used in BANK1 bank */
  WORD wFirmWareBank1Size;  /*  */
  /* Total amount of code used in BANK2 bank */
  WORD wFirmWareBank2Size;  /*  */
  /* Total amount of code used in BANK3 bank */
  WORD wFirmWareBank3Size;  /*  */
  WORD manufacturerID;
  WORD firmwareID;
  WORD checksum;
} t_firmwareDescriptor;


/* Firmware structure */
typedef struct s_firmware_
{
  BYTE firmwareStart[8];      /* Filler */
  WORD firmwareDescriptorOffs; /* Offset into first 32K bytes where firmwareDescriptor structure is placed */
  BYTE applicationCode[1000]; /* 1000 is just an arbitrary example */
                              /* Every field beyond this you must calculate the      */
                              /* pointer to, because the size of the application     */
                              /* is unknown at compilation time for the bootloader.  */
  t_firmwareDescriptor firmwareDescriptor;
} t_firmware;

/****************************************************************************/
/*                              EXPORTED DATA                               */
/****************************************************************************/

extern code t_firmwareDescriptor firmwareDescriptor;
extern code WORD firmwareDescriptorAddr;
extern code BYTE bBank1EndMarker;
extern code BYTE bBank2EndMarker;
extern code BYTE bBank3EndMarker;


#endif /* _FIRMWARE_DESCRIPTOR_H_ */
