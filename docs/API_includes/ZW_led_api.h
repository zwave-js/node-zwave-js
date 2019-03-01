/****************************************************************************
 *           #######
 *           ##  ##
 *           #  ##    ####   #####    #####  ##  ##   #####
 *             ##    ##  ##  ##  ##  ##      ##  ##  ##
 *            ##  #  ######  ##  ##   ####   ##  ##   ####
 *           ##  ##  ##      ##  ##      ##   #####      ##
 *          #######   ####   ##  ##  #####       ##  #####
 *                                           #####
 *          Products that speak Z-Wave work together better
 *
 *              Copyright (c) 2008
 *              Zensys A/S
 *              Denmark
 *
 *              All Rights Reserved
 *
 *    This source file is subject to the terms and conditions of the
 *    Zensys Software License Agreement which restricts the manner
 *    in which it may be used.
 *
 *---------------------------------------------------------------------------
 *
 * Description: Interface driver for the 400 series built-in 4 channel LED
 *              controller
 *
 * Author:   Morten Vested Olesen
 *
 * Last Changed By:  $Author: sse $
 * Revision:         $Revision: 9465 $
 * Last Changed:     $Date: 2007-11-27 16:34:22 +0100 (Tue, 27 Nov 2007) $
 *
 ****************************************************************************/

/****************************************************************************/
/*                              INCLUDE FILES                               */
/****************************************************************************/


#ifndef _ZW_PHY_LED_050X_H_
#define _ZW_PHY_LED_050X_H_

/****************************************************************************/
/*                      PRIVATE TYPES and DEFINITIONS                       */
/****************************************************************************/

/****************************************************************************/
/*                              PRIVATE DATA                                */
/****************************************************************************/

/****************************************************************************/
/*                              EXPORTED DATA                               */
/****************************************************************************/

#define LED_MODE_NORMAL 0x00
#define LED_MODE_SKEW   0x20
#define LED_MODE_PRBS   0x40

#define LED_CHANNEL0   0x00
#define LED_CHANNEL1   0x01
#define LED_CHANNEL2   0x02
#define LED_CHANNEL3   0x03

/****************************************************************************/
/*                            PRIVATE FUNCTIONS                             */
/****************************************************************************/

/****************************************************************************/
/*                           EXPORTED FUNCTIONS                             */
/****************************************************************************/

/*============================   ZW_LED_init   =========================
**  Initializes the LED Controller
**
**  Side effects:
**--------------------------------------------------------------------------*/
void             /*RET Nothing */
ZW_LED_init(
  BYTE bMode,  /* IN  mode */
  BYTE bChannelEn);  /* IN  channel enable:
                     *        0000xxx1 channel 0 enabled
                     *        0000xx1x channel 1 enabled
                     *        0000x1xx channel 2 enabled
                     *        00001xxx channel 3 enabled */

/*============================   ZW_LED_waveform_set   =========================
**  Initializes the LED Controller. Does not wait until LED controller is ready
**  to read new data
**
**  Side effects:
**--------------------------------------------------------------------------*/
void             /*RET Nothing */
ZW_LED_waveform_set(
  BYTE bChannel, /* IN channel 0-3 */
  WORD wLevel);

/*============================   ZW_LED_waveforms_set   =========================
**  Initializes the LED Controller. Waits until LED controller is ready to read
**  new data
**
**  Side effects:
**--------------------------------------------------------------------------*/
void             /*RET Nothing */
ZW_LED_waveforms_set(
  WORD *pwLevel);

/*============================   ZW_LED_data_busy   =========================
**  Retuns TRUE when the LED controller is not ready to read new data
**
**  Side effects:
**--------------------------------------------------------------------------*/
BOOL             /*RET TRUE when busy, FALSE when ready*/
ZW_LED_data_busy( void ); /* IN Nothing */

#endif //# _ZW_PHY_LED_050X_H_
