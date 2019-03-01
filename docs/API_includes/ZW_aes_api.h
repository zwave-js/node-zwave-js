/***************************************************************************
*
* Copyright (c) 2001-2012
* Sigma Designs, Inc.
* All Rights Reserved
*
*---------------------------------------------------------------------------
*
* Description: Interface driver for the 500 Series Z-Wave Single Chip
*              built-in AES-128 engine
*
* Author:      Morten Vested Olesen 
*
* Last Changed By:  $Author: jdo $
* Revision:         $Revision: 1.38 $
* Last Changed:     $Date: 2005/07/27 15:12:54 $
*
****************************************************************************/
#ifndef _ZW_AES_API_H_
#define _ZW_AES_API_H_

/***************************************************************************/
/*                              INCLUDE FILES                              */
/***************************************************************************/


/***************************************************************************/
/*                      PRIVATE TYPES and DEFINITIONS                      */
/***************************************************************************/

/***************************************************************************/
/*                              EXPORTED DATA                              */
/***************************************************************************/

/***************************************************************************/
/*                           EXPORTED FUNCTIONS                            */
/***************************************************************************/

/*============================   ZW_AES_ecb_set   =========================
**  Runs the AES in ECB mode (Eletronic Cookbook mode)
**
**  Side effects: Waits until the AES block is idle before starting
**--------------------------------------------------------------------------*/
void             /*RET Nothing */
ZW_AES_ecb_set(
  BYTE *bData,  /* IN  pointer to byte array containing the data (16 bytes)*/
  BYTE *bKey);  /* IN  pointer to byte array containing the  key (16 bytes) */

/*============================   ZW_AES_ecb_get   =========================
**  Reads result of AES run in ECB mode (Eletronic Cookbook mode)
**
**  Side effects:
**--------------------------------------------------------------------------*/
void             /*RET Nothing */
ZW_AES_ecb_get(
  BYTE *bData);  /* IN  pointer to byte array buffer to store data (16 bytes)*/

/*=============================   ZW_AES_enable ==========================
**  Enables or disables the AES
**
**  Side effects:
**--------------------------------------------------------------------------*/
void         /*RET Nothing */
ZW_AES_enable(BYTE bState); /* IN  TRUE: enables AES, FLASE: disables AES  */


/*=============================   ZW_AES_int_clear ==========================
**  Clears AES interrupt flag
**
**  Side effects:
**--------------------------------------------------------------------------*/
void         /*RET Nothing */
ZW_AES_int_clear(void); /* IN  Nothing */

/*=============================   ZW_AES_int_get ==========================
**  Returns the state of the AES interrupt flag
**
**  Side effects:
**--------------------------------------------------------------------------*/
BYTE         /*RET byte interrupt flag state */
ZW_AES_int_get(void); /* IN  Nothing */

/*=============================   ZW_AES_int_enable ==========================
**  Enables/disables AES interrupt
**
**  Side effects:
**--------------------------------------------------------------------------*/
void         /*RET Nothing */
ZW_AES_int_enable(BYTE bState); /* IN  byte interrupt enable state
                                 *     TRUE:  interrupt enabled
                                 *     FLASE: interrupt disabled */

/*=============================   ZW_AES_active_get ==========================
**  Returns the active state of the AES block
**
**  Side effects:
**--------------------------------------------------------------------------*/
BYTE         /*RET byte active flag state */
ZW_AES_active_get(void); /* IN  Nothing */

void         /*RET Nothing */
ZW_AES_swap_data(BYTE bState); /* IN  TRUE: swapping enabled, FALSE swapping disabled */
/*===============================   AES_ECB   ================================
**    AES ECB - Electronic CodeBook Mode Block
**
**    Side effects :
**
**--------------------------------------------------------------------------*/
void
ZW_AES_ecb(
  BYTE *bKey,             /* IN  pointer to byte array containing the input data (16 bytes)*/
  BYTE *bInput,           /* IN  pointer to byte array containing the key (16 bytes)*/
  BYTE *bOutput);         /* OUT  pointer to byte array containing the output data (16 bytes)*/

#define ZW_AES_ECB ZW_AES_ecb /* back-ward compatible name */

void
ZW_AES_ecb_dma(
  BYTE *bKey,             /* IN key - 16 bytes array */
  BYTE *bInput,           /* IN input data - 16 bytes array */
  BYTE *bOutput);          /* OUT output data- 16 bytes array */
#endif /* _ZW_AES_API_H_ */
