/******************************  ZW_power_api.c  *******************************
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
 *-----------------------------------------------------------------------------
 *
 * Description:  The ZW0x0x power managment library
 *
 * Author:Samer Seoud
 *
 * Last Changed By:  $Author: tro $
 * Revision:         $Revision: 27363 $
 * Last Changed:     $Date: 2013-11-01 16:08:22 +0100 (fr, 01 nov 2013) $
 *
 *****************************************************************************/


#ifndef _ZW_POWER_API_H_
#define _ZW_POWER_API_H_

/***************************************************************/
/* DEFINES                                                     */
/***************************************************************/



#define ZW_IDLE_MODE      0x00
#define ZW_STOP_MODE      0x02
#define ZW_WUT_MODE       0x03
#define ZW_WUT_FAST_MODE  0x04

#ifdef ZW_BEAM_RX_WAKEUP
#define ZW_FREQUENTLY_LISTENING_MODE 5
#endif

#define ZW_PWR_SET_STOP_MODE              ZW_SetSleepMode(ZW_STOP_MODE,FALSE,0)
#define ZW_SET_SLEEP_MODE(MODE,MASK_INT)  ZW_SetSleepMode(MODE,MASK_INT,0)
#define ZW_SET_WUT_TIMEOUT(TIME)          ZW_SetWutTimeout(TIME)


/****************************************************************************/
/*                           EXPORTED FUNCTIONS                             */
/****************************************************************************/

/*===============================   ZW_SetSleepMode   ===========================================
**    Set the Power Down mode to use.
**
**    This function is used to save (battery) power when nothing to do.
**    The ZW_WAVE power down system function in 4 different mode:
**
**    The STOP_MODE: where the All the ASIC is turn down. The ASIC can be waked up
**    again by Hardware reset or by the external interrupt INT1.
**
**    The WUT_MODE: The ASIC is powered down, and it can only be waked by the Wake Up Timer
**                  or the external interrupt INT1. The the time out value of the WUT
**                  be set by the API call ZW_SetWutTimeout. When the ASIC is waked from
**                  the WUT_MODE, the reason for wakeup will be given in the ApplicationInitHW.
**
**
**    IN interrupts Enable bitmask, Valid values are ZW_INT_MASK_EXT1 or 0x00 if no external
**                         Interrupts should wakeup
**
**    The Z-Wave RF is turned off in WUT and STOP mode so nothing can be received while in one
**     of these  modes.
**    In STOP and WUT modes the INT1 interrupt can be masked out so it cannot wake up the ASIC.
**    The Z-Wave main poll loop is stopped untill the CPU has been woken.
**
**--------------------------------------------------------------------------------------------------*/
/* TO#1753 */
BOOL                /*RET TRUE - Sleep mode can be entered, FALSE - Try again later  */
ZW_SetSleepMode(
  BYTE Mode,        /*IN the power down mode to use*/
  BYTE IntEnable,   /*IN interrupts Enable bitmask, Valid values are ZW_INT_MASK_EXT1 or 0x00 if no external
                         Interrupts should wakeup*/
  BYTE BeamCount);  /*IN The number of wakeup beam periodes before waking up the application */


/*===============================   ZW_SetWutTimeout   ===========================================
**    Set the time out value for the WUT.
**    This function set the WUT timeout value so the the ASIC wake up from the WUt power down
**    mode after the specified number of seconds.
**--------------------------------------------------------------------------------------------------*/
void              /*RET Nothing  */
ZW_SetWutTimeout(
  BYTE wutTimeout); /*the timeout value of the WUT timer, The WUT will wake up after (wutTimeout+ 1) seconds */

/*============================== ZW_power_down_wut_timeout ===================
**  Sets WUT timeout period
**
**  Side effects:
**
**--------------------------------------------------------------------------*/
void
ZW_power_down_wut_timeout(
  BYTE bTimeout);


#endif /* _ZW_POWER_API_H_ */
