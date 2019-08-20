/***************************************************************************
*
* Copyright (c) 2001-2012
* Sigma Designs, Inc.
* All Rights Reserved
*
*---------------------------------------------------------------------------
*
* Description: Interface driver for the 400 and 500 Series Z-Wave Single Chips
*              built-in Keypad Scanner
*
* Author:      Morten Vested Olesen 
*
* Last Changed By:  $Author: jdo $
* Revision:         $Revision: 1.38 $
* Last Changed:     $Date: 2005/07/27 15:12:54 $
*
****************************************************************************/
#ifndef _ZW_KEYPAD_SCANNER_API_H_
#define _ZW_KEYPAD_SCANNER_API_H_

/***************************************************************************/
/*                              INCLUDE FILES                              */
/***************************************************************************/


/***************************************************************************/
/*                      PRIVATE TYPES and DEFINITIONS                      */
/***************************************************************************/
#define ZW_KS_KEYPRESS_VALID    0x01
#define ZW_KS_KEYPRESS_INVALID  0x02
#define ZW_KS_KEYPRESS_RELEASED 0x03

/***************************************************************************/
/*                              EXPORTED DATA                              */
/***************************************************************************/

/***************************************************************************/
/*                           EXPORTED FUNCTIONS                            */
/***************************************************************************/

/*=========================   ZW_KS_init     ============================
**    Initialize Keypad Scanner
**
**    Side effects: Disables keypad scanner
**--------------------------------------------------------------------------*/
void           /*RET Nothing */
ZW_KS_init(BYTE bCols,          /* IN Number of Columns
                                            0:  1 column
                                            1:  2 columns
                                                  :
                                           15: 16 columns     */
           BYTE bScanDelay,     /* IN Column scan delay (0-15)
                                            0:   2ms
                                            1:   4ms
                                                 :
                                            15: 32ms  */
           BYTE bDebounceDelay, /* IN Debounce delay
                                            0:   2ms
                                            1:   4ms
                                                 :
                                            15: 32ms  */
           BYTE bStableDelay,   /* IN Row Stable delay
                                            0:   2ms
                                            1:   4ms
                                                 :
                                            15: 32ms  */
           BYTE bReportWaitTimeout,   /* IN timeout value in (10 * ms) to
                                           wait before reporting keys changes*/
           VOID_CALLBACKFUNC(KeyPadCallBack)(BYTE_P pbKeyMatrix, BYTE bStatus)
           );

/*=========================   ZW_KS_enable     ============================
**    Enable/disable Keypad Scanner
**
**    Side effects: enables extern interrupt 1 when called with the parameter TRUE
**                  disables extern interrupt 1 when called with the parameter FALSE
**                  
**--------------------------------------------------------------------------*/
void           /*RET Nothing */
ZW_KS_enable(BYTE enable);     /* IN TRUE: to enable the keypad Scanner,
                                *    FALSE: to disable it*/

/*=========================    ZW_KS_pd_enable   ============================
**    Enable/disable Keypad Scanner powerdown mode
**    Side effects:
**--------------------------------------------------------------------------*/
void           /*RET Nothing */
ZW_KS_pd_enable(BYTE boEnable); /* IN TRUE: enable power down mode of Keypad Scanner,
                                 *    FALSE: disable power down mode Keypad Scanner */


#endif /*_ZW_KEYPAD_SCANNER_API_H_*/
