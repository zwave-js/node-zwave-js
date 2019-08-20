/*******************************  ZW_DEBUG_API.H  *******************************
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
 * Description: Z-Wave Commandline debugger.
 * 
 * The debugger startup by displaying the help text:
 * Z-Wave Commandline debugger Vx.nn
 * Keyes(VT100): BS; ^,<,> arrows; F1.
 * H                          Help
 * D[I|E] <addr> [<length>]   Dump memory
 * E[I|E] <addr>              Edit memory
 * W[I|E] <addr>              Watch memory location
 *   I    is Internal EEPROM
 *     E  is External EEPROM
 * >
 *
 * The Watch pointer give the following logs (when memory change):
 *      RAM memory        Rnn
 *      Internal EEPROM   Inn
 *      External EEPROM   Enn
 *
 *
 * Author:   Johann Sigfredsson
 * 
 * Last Changed By:  $Author: imj $
 * Revision:         $Revision: 887 $
 * Last Changed:     $Date: 2001-10-24 09:46:57 +0200 (Wed, 24 Oct 2001) $
 * 
 ****************************************************************************/
#ifndef _ZW_DEBUG_API_H_
#define _ZW_DEBUG_API_H_

/****************************************************************************/
/*                              INCLUDE FILES                               */
/****************************************************************************/

/****************************************************************************/
/*                     EXPORTED TYPES and DEFINITIONS                       */
/****************************************************************************/

/* Macroes for command line debug */
#ifdef ZW_DEBUG_CMD
#define ZW_DEBUG_CMD_INIT(baud) ZW_DebugInit(baud)
#define ZW_DEBUG_CMD_POLL()     ZW_DebugPoll()
#else
#define ZW_DEBUG_CMD_INIT(baud)
#define ZW_DEBUG_CMD_POLL()
#endif /* ZW_DEBUG */

/****************************************************************************/
/*                              EXPORTED DATA                               */
/****************************************************************************/

/****************************************************************************/
/*                           EXPORTED FUNCTIONS                             */
/****************************************************************************/

/*==============================   ZW_DebugInit   ===========================
**    Debugger initialization
**    
**--------------------------------------------------------------------------*/
void              /*RET Nothing */
ZW_DebugInit( 
WORD baudRate);   /*IN  Baud Rate / 100 - e.g. 96, 1152 = 9600, 115200 */

/*==============================   ZW_DebugPoll   ===========================
** Debugger poll function.
** Called from the Z-Wave main poll loop.
**    
**--------------------------------------------------------------------------*/
BYTE                  /*RET Nothing */
ZW_DebugPoll( void ); /*IN  Nothing */

#endif /* _ZW_DEBUG_API_H_ */
