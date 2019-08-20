/***************************************************************************
 *
 * Copyright (c) 2001-2012
 * Sigma Designs, Inc.
 * All Rights Reserved
 *
 *---------------------------------------------------------------------------
 *
 * Description: This function calculates a crc-value for the count
 *              bytes in the input array.
 *
 * Last Changed By:  $Author: efh $
 * Revision:         $Revision: 9763 $
 * Last Changed:     $Date: 2008-01-10 11:28:42 +0100 (Thu, 10 Jan 2008) $
 *
 ****************************************************************************/
#ifndef _ZW_CRC_H_
#define _ZW_CRC_H_

#include <ZW_typedefs.h>
/****************************************************************************/
/*                              INCLUDE FILES                               */
/****************************************************************************/


/****************************************************************************/
/*                     EXPORTED TYPES and DEFINITIONS                       */
/****************************************************************************/

/****************************************************************************/
/*                              EXPORTED DATA                               */
/****************************************************************************/

/****************************************************************************/
/*                           EXPORTED FUNCTIONS                             */
/****************************************************************************/

WORD
ZW_CreateCrc16(
  BYTE *pHeadeAddr,
  BYTE bHeaderLen,
  BYTE *pPayloadAddr,
  BYTE bPayloadLen
);

/*===========================   ZW_CheckCrc16   ============================
**    CRC-CCITT (0x1D0F) calculation / check
**
**    In:  byte string excluding 16bit check field
**    Out: CRC-16 value
**  or
**    In:  byte string including 16bit check field
**    Out: zero when OK
**
**--------------------------------------------------------------------------*/
WORD
ZW_CheckCrc16(
  WORD crc,
  BYTE *pDataAddr,
  WORD bDataLen
);

#endif /* _ZW_CRC_H_ */
