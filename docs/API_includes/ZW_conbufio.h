/****************************************************************************
 *
 * Copyright (c) 2001-2013
 * Sigma Designs, Inc.
 * All Rights Reserved
 *
 *---------------------------------------------------------------------------
 *
 * Description:       Buffered transmit/receive of data through the UART
 *
 * Last Changed By:  $Author: jsi $
 * Revision:         $Revision: 7079 $
 * Last Changed:     $Date: 2005-11-14 16:57:30 +0200 (Пн, 14 Лис 2005) $
 *
 ****************************************************************************/
#ifndef _CONBUFIO_H_
#define _CONBUFIO_H_

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

#ifdef USBVCP
#define ZW_SerialTxActive() FALSE
#define ZW_SerialCheck ZW_SerialCheck_udc
#define ZW_SerialGetByte ZW_SerialGetByte_udc
#define ZW_SerialPutByte ZW_SerialPutByte_udc
#define ZW_SerialFlush ZW_SerialFlush_udc
#define ZW_InitSerialIf ZW_InitSerialIf_udc
#define ZW_FinishSerialIf ZW_FinishConfiguration_udc
#else
#define ZW_GetTxBufferFreeSize ZW_GetTxBufferFreeSize_uart
#define ZW_SerialTxActive ZW_SerialTxActive_uart
#define ZW_SerialCheck ZW_SerialCheck_uart
#define ZW_SerialGetByte ZW_SerialGetByte_uart
#define ZW_SerialPutByte ZW_SerialPutByte_uart
#define ZW_SerialFlush ZW_SerialFlush_uart
#define ZW_InitSerialIf ZW_InitSerialIf_uart
#define ZW_FinishSerialIf ZW_FinishConfiguration_uart
#endif

BYTE ZW_SerialCheck(void);
BYTE ZW_SerialGetByte(void);
BYTE ZW_SerialPutByte(BYTE ch);
void ZW_SerialFlush(void);
void ZW_InitSerialIf(
  WORD bBaudRate   /* IN  Baud rate / 100 (e.g. 96=>9600baud/s, 1152=>115200baud/s) */
);
BOOL ZW_FinishSerialIf(void);
#ifndef USBVCP
BYTE ZW_SerialTxActive_uart(void);
BYTE ZW_GetTxBufferFreeSize_uart(void);
#endif
#endif /* _CONBUFIO_H_ */
