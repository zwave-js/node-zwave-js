/*******************************  ZW_MEM_API.H  *******************************
 *           #######
 *           ##  ##
 *           #  ##    ####   #####    #####  ##  ##   #####
 *             ##    ##  ##  ##  ##  ##      ##  ##  ##
 *            ##  #  ######  ##  ##   ####   ##  ##   ####
 *           ##  ##  ##      ##  ##      ##   #####      ##
 *          #######   ####   ##  ##  #####       ##  #####
 *                                           #####
 *          Z-Wave, the wireless lauguage.
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
 * Description: Copy of data to/from non-volatile memory (EEPROM)
 *              Standard memory functions.
 *
 * Author:   Ivar Jeppesen
 *
 * Last Changed By:  $Author: efh $
 * Revision:         $Revision: 29682 $
 * Last Changed:     $Date: 2014-10-06 15:12:09 +0200 (ma, 06 okt 2014) $
 *
 ****************************************************************************/
#ifndef _ZW_MEM_API_H_
#define _ZW_MEM_API_H_

/****************************************************************************/
/*                              INCLUDE FILES                               */
/****************************************************************************/
#include <ZW_typedefs.h>

#ifdef NO_MEM_FUNCTIONS
#include<string.h>
#else
#define memcpy(dst, src, len)  __ZW_memcpy(len, dst, src)
#define memcmp(dst, src, len)  __ZW_memcmp(len, dst, src)
#define memset(dst, val, len)  __ZW_memset(val, len, dst)
#endif
#define ZW_memcpy(dst, src, len)  __ZW_memcpy(len, dst, src)
#define ZW_memcmp(dst, src, len)  __ZW_memcmp(len, dst, src)
#define ZW_memset(dst, val, len)  __ZW_memset(val, len, dst)

/****************************************************************************/
/*                     EXPORTED TYPES and DEFINITIONS                       */
/****************************************************************************/
/****************************  Memory  **************************************
** Copy of data to non-volatile memory (FLASH) only valid for slave and
** slave_routing libraries
**
**  Side effects: The non-volatile memory write operation is delayed via a timer.
**                The physical write is delayed about 200 msec.
**/

/*============================   MemoryGetID   ===============================
**  Copy the Home-ID and Node-ID to the specified RAM addresses
**  BYTE *homeid pointer to RAM were the home ID should be placed
**  BYTE *nodeid pointer to RAM were the Node ID should be placed.
**--------------------------------------------------------------------------*/
#define ZW_MEMORY_GET_ID(homeid,nodeid)   MemoryGetID(homeid,nodeid)

/*============================   MemoryGetByte   ============================
**    Read one byte from the EEPROM
**
** BYTE               RET Data
** MemoryGetByte(
** WORD  offset );    IN   Application area offset
**--------------------------------------------------------------------------*/
#define ZW_MEM_GET_BYTE(offset) MemoryGetByte(offset)

/*============================   MemoryPutByte   ============================
**    Write one byte to the EEPROM
**
** BYTE               RET False if write buffer full
** MemoryPutByte(
** WORD  offset,      IN   Application area offset
** BYTE  data );      IN   Data to store
**--------------------------------------------------------------------------*/
#define ZW_MEM_PUT_BYTE(offset,data) MemoryPutByte(offset,data)

/*============================   MemoryGetBuffer   =============================
**    Read number of bytes from the EEPROM to a RAM buffer
**
** void               RET Nothing
** MemoryGetBuffer(
** WORD  offset,      IN   Application area offset
** BYTE  *buffer,     IN   Buffer pointer
** WORD  length );    IN   Number of bytes to read
**--------------------------------------------------------------------------*/
#define ZW_MEM_GET_BUFFER(offset,buffer,length) MemoryGetBuffer(offset,buffer,length)

/*============================   MemoryPutBuffer   =============================
**    Copy number of bytes from a RAM buffer to the EEPROM
**
**  Side effects: The EEPROM write operation has been done when function returns
**                and the callback is called max 10ms later via a timer
**
** BYTE               RET FALSE if the buffer put queue is full
** MemoryPutBuffer(
** WORD  offset,          IN   Application area offset
** BYTE  *buffer,         IN   Buffer pointer
** WORD  length,          IN   Number of bytes to read
** VOID_CALLBACKFUNC(func)( void) ); IN   Buffer write completed function pointer
**--------------------------------------------------------------------------*/
#define ZW_MEM_PUT_BUFFER(offset,buffer,length, func) MemoryPutBuffer(offset,buffer,length, func)


/*============================   ZW_MemoryPutBuffer   ========================
**    Copy number of bytes from a RAM buffer to the EEPROM
**
**  Side effects: The EEPROM write operation has been done when function returns
**                and the callback is called max 10ms later via a timer
**
** BYTE               RET FALSE if the buffer put queue is full
** ZW_MemoryPutBuffer(
** WORD  offset,          IN   Application area offset
** BYTE  length,          IN   Number of bytes to write
** BYTE  *buffer,         IN   Buffer pointer
**--------------------------------------------------------------------------*/
#define ZW_MEM_PUT_BUFFER_NO_CB(offset,buffer,length) ZW_MemoryPutBuffer(offset,buffer,length)


/*===============================   ZW_EepromInit   ====================================
** This function writes ZEROs in the entire EEPROM, then it write the homeID
** if it different from ZERO. This function will only operate in the production mode.
**-----------------------------------------------------------------------------------*/
#define ZW_EEPROM_INIT(HOMEID)       ZW_EepromInit(HOMEID)

/*============================   MemoryFlush   =============================
**    Write the content of the FLASH RAM buffer to the FLASH.
**
**  Side effects: During the write process the CPU wuill be in idle state.
**--------------------------------------------------------------------------*/
#define ZW_MEM_FLUSH()   ZW_MemoryFlush()


/****************************************************************************/
/*                              EXPORTED DATA                               */
/****************************************************************************/

/****************************************************************************/
/*                           LOW LEVEL EXPORTED FUNCTIONS                   */
/****************************************************************************/


/****************************************************************************/
/*                           EXPORTED FUNCTIONS                             */
/****************************************************************************/

/*============================   MemoryGetID   ===============================
**    Copy the Home-ID and Node-ID to the specified RAM addresses
**
**--------------------------------------------------------------------------*/
extern void               /*RET Nothing          */
MemoryGetID(
  BYTE *homeID,           /*OUT  Home-ID pointer            */
  BYTE *nodeID );         /*OUT  Node-ID pointer            */

/*============================   MemoryGetByte   =============================
**  Read one byte from the EEPROM
**
**  Side effects:
**--------------------------------------------------------------------------*/
extern BYTE               /*RET Data          */
MemoryGetByte(
  WORD  offset );         /*IN   Application area offset            */

/*============================   MemoryPutByte   =============================
**  Add one byte to the EEPROM write queue
**
**  Side effects:
**
**--------------------------------------------------------------------------*/
extern BYTE               /*RET FALSE if write buffer full    */
MemoryPutByte(
  WORD  offset,           /*IN   Application area offset   */
  BYTE  bData );          /*IN   Data to store             */

/*============================   MemoryGetBuffer   =============================
**    Read number of bytes from the EEPROM to a RAM buffer
**
**  Side effects:
**  Note: API is not supported in 400 series slave and routing slave targets
**--------------------------------------------------------------------------*/
extern void               /*RET Nothing          */
MemoryGetBuffer(
  WORD  offset,           /*IN   Application area offset   */
  BYTE  *buffer,          /*IN   Buffer pointer            */
  BYTE  length );         /*IN   Number of bytes to read  */

/*============================   MemoryPutBuffer   =============================
**    Copy number of bytes from a RAM buffer to the EEPROM
**
**  Side effects: Write has been executed when function returns and callback
**                is called via a timer max 10ms later
**  Note: API is not supported in 400 series slave and routing slave targets
**--------------------------------------------------------------------------*/
extern BYTE               /*RET FALSE if the buffer put queue is full          */
MemoryPutBuffer(
  WORD  offset,           /*IN   Application area offset   */
  BYTE  *buffer,          /*IN   Buffer pointer            */
  WORD  length,           /*IN   Number of bytes to copy   */
  VOID_CALLBACKFUNC(func)( void) );  /*IN   Buffer write completed function pointer */


/*==========================   ZW_MemoryPutBuffer   ==========================
**    Copy number of bytes from a RAM buffer to the EEPROM
**
**  Side effects: Write has been executed when function returns
**  Note: API is not supported in 400 series slave and routing slave targets
**--------------------------------------------------------------------------*/
extern BYTE               /*RET FALSE if the buffer put queue is full       */
ZW_MemoryPutBuffer(
  WORD  offset,           /* IN Application area offset   */
  BYTE  *buffer,          /* IN Buffer pointer            */
  WORD  length);          /* IN Number of bytes to copy   */


/*===========================   MemoryGetStatus   ============================
**  Read status from the NVM
**
**  Side effects:
**--------------------------------------------------------------------------*/
extern BYTE               /*RET Data FALSE = 0 = OK, TRUE = 1 = read operation disturbed */
MemoryGetStatus(void);    /*IN  none          */

/*==========================   MemoryClearStatus   ===========================
**  Clear status for the NVM
**
**  Side effects:
**--------------------------------------------------------------------------*/
extern void               /*RET none          */
MemoryClearStatus(void);  /*IN  none          */

/*=============================   ZW_memcpy   ===============================
**    Copies length bytes from src to dst
**
**--------------------------------------------------------------------------*/
extern void       /* RET  Nothing */
__ZW_memcpy(
  BYTE length,    /* IN   Number of bytes to copy */
  BYTE *dst,      /* IN   Pointer to destination */
  BYTE *src);     /* IN   Pointer to source */


/*=============================   ZW_memcmp   ===============================
**    Compares length bytes of src and dest
**
**--------------------------------------------------------------------------*/
extern BYTE       /* RET  0 if *src and *dst are equal, else 1 */
__ZW_memcmp(
  BYTE length,    /* IN   Number of bytes to compare */
  BYTE *dst,      /* IN   Pointer to buffer 1 */
  BYTE *src);     /* IN   Pointer to buffer 2 */


/*===============================   ZW_memset   ==============================
**    Fill length bytes in dst with val
**
**--------------------------------------------------------------------------*/
void           /*RET Nothing */
__ZW_memset(
  BYTE val,    /* IN Value to fill buffer with */
  BYTE length, /* IN Number of bytes to set */
  BYTE *dst);  /* IN Pointer to buffer to set/fill */


#ifdef NVM_IS_EEPROM
/*===============================   ZW_EepromInit   ====================================
** This function writes ZEROs in the entire EEPROM, then it write the homeID
** if it different from ZERO. This function will only operate in the production mode.
**-----------------------------------------------------------------------------------*/
BOOL           /*RET: TRUE if the EEPROM was initialized else , FALSE*/
ZW_EepromInit(BYTE *pHomeID);    /* IN Pointer to home ID to be written to EEPROM */
#endif

//#ifdef NVM_IS_FLASH
// NVM_IS_FLASH is defined in ZW_nvm_addr.h, which is not included by ZW_mem_api.h
// As ZW_nvm_addr.h is a basis-include, it cannot be used by an application.
#if defined(ZW_SLAVE_ROUTING) && !defined(ZW_SLAVE_32)
/*============================   ZW_MemoryFlush   =============================
**    Write the content of the FLASH RAM buffer to the FLASH.
**
**  Side effects: During the write process the CPU wuill be in idle state.
**--------------------------------------------------------------------------*/
void                         /*RET nothing */
ZW_MemoryFlush(void);
#endif

#endif /* _ZW_MEM_API_H_ */
