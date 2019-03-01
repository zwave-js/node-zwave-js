/****************************************************************************
 *
 * Copyright (c) 2001-2013
 * Sigma Designs, Inc.
 * All Rights Reserved
 *
 *---------------------------------------------------------------------------
 *
 * Description: High level NVR interface functions
 *
 * Author:   Peter Shorty
 *
 * Last Changed By:  $Author: jbu $
 * Revision:         $Revision: 58 $
 * Last Changed:     $Date: 2009-01-12 09:45:03 +0100 (ma, 12 jan 2009) $
 *
 ****************************************************************************/

#ifndef _ZW_NVR_API_H_
#define _ZW_NVR_API_H_

/****************************************************************************/
/*                              INCLUDE FILES                               */
/****************************************************************************/

/****************************************************************************/
/*                     EXPORTED TYPES and DEFINITIONS                       */
/****************************************************************************/
/* Start address of the application data in NVR */
#define NVR_APP_START_ADDRESS             0x80
#define NVR_APP_END_ADDRESS               0xFF

/* Size definitions for the NVR structure */
#define NVR_SAW_CENTER_FREQ_SIZE      0x03
#define NVR_NVM_SIZE_SIZE             0x02
#define NVR_NVM_PAGE_SIZE_SIZE        0x02
#define NVR_UUID_SIZE                 0x10
#define NVR_USBID_SIZE                0x02
#define NVR_SECURITY_PUBLIC_KEY_SIZE  0x20
#define NVR_SECURITY_PRIVATE_KEY_SIZE 0x20
#define NVR_CRC16_SIZE                0x02

/* Structure of the data in the NVR flash page */
typedef struct _NVR_FLASH_STRUCT_
{
  BYTE  bRevision;
  BYTE  bCrystalCalibration;
  BYTE  bPinSwap;
  BYTE  bNVMChipSelect;
  BYTE  abSAWCenterFreq[NVR_SAW_CENTER_FREQ_SIZE];
  BYTE  bSAWBandwidth;
  BYTE  bNVMType;
  BYTE  bNVMSize[NVR_NVM_SIZE_SIZE];
  BYTE  bNVMPageSize[NVR_NVM_PAGE_SIZE_SIZE];
  BYTE  abUUID[NVR_UUID_SIZE];
  BYTE  idVendorUsb[NVR_USBID_SIZE]; /*idVendor if 0xff -> use sigma Vendor ID (Assigned by USB Org)*/
  BYTE  idProductUsb[NVR_USBID_SIZE];/*idProduct  if 0xff -> use sigma Product ID (Assigned by Manufacturer)*/
  BYTE  bTxCalibration1;
  BYTE  bTxCalibration2;
  BYTE  aSecurityPublicKey[NVR_SECURITY_PUBLIC_KEY_SIZE];
  BYTE  aSecurityPrivateKey[NVR_SECURITY_PRIVATE_KEY_SIZE];
} NVR_FLASH_STRUCT;


/****************************************************************************/
/*                              EXPORTED DATA                               */
/****************************************************************************/

/****************************************************************************/
/*                           EXPORTED FUNCTIONS                             */
/****************************************************************************/

/*===============================   NVRGetValue   ===========================
**    Get a value fron the NVR flash page.
**
**    Offset 0 is the first byte in the protocol NVR area.
**
**    Offset from NVR_APP_START_ADDRESS to NVR_APP_END_ADDRESS
**    are NVR memory reserved for the application
**
**    If the CRC16 field in the protocol area of the NVR is not correct
**    all fields will return the value 0xFF when read with this function.
**
**    Side effects:  None
**
**--------------------------------------------------------------------------*/
void
ZW_NVRGetValue(BYTE bOffset, BYTE bLength, BYTE *bRetBuffer);


/*================================   ZW_NVRCheck   ==========================
**    Check if the NVR Flash page contains a valid CRC field
**
**    Returns:  FALSE, NVR Flash contens is not valid
**              TRUE,  NVR Flash contens is valid
**
**    Side effects:  Sets the bNVRValid variable
**
**--------------------------------------------------------------------------*/
BOOL
ZW_NVRCheck();


/*==============================   ZW_IsNVRValid   ===========================
**    Check if the NVR Flash page has been tested to contain a valid CRC field
**
**    Returns:  FALSE, NVR Flash contents is not valid
**              TRUE,  NVR Flash contents is valid
**
**--------------------------------------------------------------------------*/
BOOL
ZW_IsNVRValid();

/*============================   ZW_GetNVRRevision   =========================
**    Get the NVR layout revision of the NVR flash page
**
**    Returns:  The NVR layout revision of 0xFF is unknown.
**
**--------------------------------------------------------------------------*/
BYTE
ZW_GetNVRRevision();

#endif /* _ZW_NVR_API__H_ */
