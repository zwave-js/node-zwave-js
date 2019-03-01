/*******************************  ZW_triac_api.h  ****************************
 *           #######
 *           ##  ##
 *           #  ##    ####   #####    #####  ##  ##   #####
 *             ##    ##  ##  ##  ##  ##      ##  ##  ##
 *            ##  #  ######  ##  ##   ####   ##  ##   ####
 *           ##  ##  ##      ##  ##      ##   #####      ##
 *          #######   ####   ##  ##  #####       ##  #####
 *                                           #####
 *          Z-Wave, the wireless language.
 *
 *              Copyright (c) 2001
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
 * Description: Interface driver for the ZW0x0x built-in TRIAC controller.
 *
 * Author:   Johann Sigfredsson & Morten Vested Olesen
 *
 * Last Changed By:  $Author: sse $
 * Revision:         $Revision: 33704 $
 * Last Changed:     $Date: 2016-05-17 16:10:48 +0200 (ti, 17 maj 2016) $
 *
 ****************************************************************************/
#ifndef _ZW_TRIAC_API_H_
#define _ZW_TRIAC_API_H_

#include <ZW_typedefs.h>

/****************************************************************************/
/*                              INCLUDE FILES                               */
/****************************************************************************/

/****************************************************************************/
/*                     EXPORTED TYPES and DEFINITIONS                       */
/****************************************************************************/


/* Z-Wave API macroes */
/* Defines used to select mains frequency when initializing TRIAC controller */
#define FREQUENCY_60HZ                        0
#define FREQUENCY_50HZ                        1

#define TRIAC_MODE             0x00
#define FET_MODE               0x01                /* obsolete - use FET_FALLING_EDGE instead */
#define FET_TRAILING_EDGE_MODE 0x01
#define FET_LEADING_EDGE_MODE  0x02

#define TRIAC_HALFBRIDGE_A                    0
#define TRIAC_HALFBRIDGE_B                    1
#define TRIAC_FULLBRIDGE                      2

/*=============================   ZW_TRIAC_init   ==============================
**  Initializes the ZW0401 ASIC's integrated TRIAC and FET Controller.
**  Sets up the control registers according to the mains frequency.
**  Only call this function when the controller is disabled
**
**--------------------------------------------------------------------------*/
BYTE                       /*RET  0x00: Parameters OK
                            *     0x01: ERROR bPulseRepLength*4 is less than
                            *                 than wPulseLength
                            *     0x02: ERROR bPulseRepLength is less than 16
                            *     0x03: ERROR bPulseRepLength*4+wPluseLength is
                            *                 larger than 500 */
ZW_TRIAC_init(
  BYTE bMode,                /* IN  Triac/FET modes.
                              *       TRIAC_MODE:             Triac mode,
                              *       FET_TRAILING_EDGE_MODE: FET trailing edge mode,
                              *       FET_LEADING_EDGE_MODE:  FET leading edge mode */
  WORD wPulseLength,         /* IN  Length of the fire pulse.
                              *     Not applicable in FET mode.
                              *     Each step equals n/32MHz
                              *     where n is
                              *     265 in 60Hz systems
                              *     318 in 50Hz systems*/
  BYTE bPulseRepLength,      /* IN  Length of pulse repetition period.
                              *     Not applicable in FET mode. 
                              *     Each step equals 4*n/32MHz
                              *     where n is
                              *     265 in 60Hz systems
                              *     318 in 50Hz systems*/
  BYTE bZeroXMode,           /* IN    TRIAC_HALFBRIDGE_A:      Half bridge mode A
                              *       TRIAC_HALFBRIDGE_B:      Half bridge mode B
                              *       TRIAC_FULLBRIDGE:        Full bridge mode
                              *      others: Illegal   */
  BYTE bInitMask,            /* IN  Initial mask enabled when set to 1      */
  BYTE bInvZerox,            /* IN  Inverse Zerox signal when set to 1      */
  BYTE bMainsFreq,           /* IN  Mains frequency
                              *     FREQUENCY_60HZ: 60Hz
                              *     FREQUENCY_50HZ: 50Hz */
  WORD wCorrection,          /* IN  Correction timer
                              *         Half bridge mode A
                              *           Value depends on duty cycle of ZeroX signal:
                              *         Half bridge mode B
                              *           Value depends on main freq:
                              *            60Hz: 607
                              *            50Hz: 728
                              *         Full bridge mode
                              *            N.A.             */
  BYTE bCorPrescale,         /* IN Correction timer prrescaler
                                     0: Disable prescaler
                                     1: Enable prescaler (divide by 3) */
  BYTE bKeepOff              /* IN  Keep off duration */
  );

/*=========================  ZW_TRIAC_dimlevel_set  ============================
**    Sets up the dim-level in the triac-controller. For both Triac mode and FET
**    mode.
**    0-1000, where 0 is shut off, 1000 is full on
**    Side effects:
**--------------------------------------------------------------------------*/
BYTE /*RET  0x00:     dim level set,
      *     non-zero: dim level not set - Triac controller has not read
      *               previous parameters yet */
ZW_TRIAC_dimlevel_set(
  WORD wLevel);                /*IN  Raw-dim level value in percentage */

/*===============================   ZW_TRIAC_enable    ==============================
**  Turns the TRIAC controller On/Off
**
**    Side effects:
**
**--------------------------------------------------------------------------*/
extern void      /* RET Nothing */
ZW_TRIAC_enable( BYTE bEnable );  /* IN TRUE enable Triac controller,
                                   *    FALSE disable Triac Controller */


/*===============================   ZW_TRIAC_int_enable   ==============================
**  Enable/Disable the the Triac Controller interrupt
**  The triac interrupt is issued when a zero cross is detected.
**    Side effects:
**
**--------------------------------------------------------------------------*/
void             /* RET Nothing */
ZW_TRIAC_int_enable(BYTE bEnable);/*IN TRUE if to enable the triac Zero-X interrupt ,
                                   *   FALSE to disable the interrupt*/


/*=============================   ZW_TRIAC_int_clear  ========================
** Clear the Triac Controller interrupt flag
**--------------------------------------------------------------------------*/
void            /* RET Nothing */
ZW_TRIAC_int_clear(void);  /* Nothing */

/*===============================   ZW_TRIAC_int_get()======================
**  Check if Zero-X has been detected
**--------------------------------------------------------------------------*/
BOOL            /* RET Boolen TRUE: interrupt flag is set
                 *            FALSE: interrupt flag is not set */
ZW_TRIAC_int_get(void);


#endif /* _ZW_TRIAC_API_H_ */
