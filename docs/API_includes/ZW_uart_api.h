/***************************************************************************
*
* Copyright (c) 2001-2012
* Sigma Designs, Inc.
* All Rights Reserved
*
*---------------------------------------------------------------------------
*
* Description: Interface driver for the 500 Series Z-Wave Single Chip
*              built-in UART's
*
* Author:      Morten Vested Olesen and Jess Christensen
*
* Last Changed By:  $Author: jsi $
* Revision:         $Revision: 30544 $
* Last Changed:     $Date: 2015-01-09 14:18:09 +0100 (fr, 09 jan 2015) $
*
****************************************************************************/
#ifndef _ZW_UART_API_H_
#define _ZW_UART_API_H_

/***************************************************************************/
/*                              INCLUDE FILES                              */
/***************************************************************************/
#include <ZW_typedefs.h>

/****************************************************************************/
/*                     EXPORTED TYPES and DEFINITIONS                       */
/****************************************************************************/

/* Macroes for debug output */
#define ZW_DEBUG_BAUD_RATE    1152

#ifdef ZW_DEBUG
#ifdef ZW_DEBUG_UART0
#define ZW_DEBUG_INIT(baud)       ZW_UART0_init(baud, TRUE, FALSE)
#define ZW_DEBUG_SEND_BYTE(bData) ZW_UART0_tx_send_byte(bData)
#define ZW_DEBUG_SEND_NUM(bData)  ZW_UART0_tx_send_num(bData)
#define ZW_DEBUG_SEND_WORD_NUM(bData)  ZW_UART0_tx_send_w_num(bData)
#define ZW_DEBUG_SEND_NL()        ZW_UART0_tx_send_nl()
#define ZW_DEBUG_SEND_STR(STR)    ZW_UART0_tx_send_str(STR)
#define ZW_DEBUG_TX_STATUS()      ZW_UART0_tx_active_get()
#else
#ifdef ZW_DEBUG_UART1
#define ZW_DEBUG_INIT(baud)       ZW_UART1_init(baud, TRUE, FALSE)
#define ZW_DEBUG_SEND_BYTE(bData) ZW_UART1_tx_send_byte(bData)
#define ZW_DEBUG_SEND_NUM(bData)  ZW_UART1_tx_send_num(bData)
#define ZW_DEBUG_SEND_WORD_NUM(bData)  ZW_UART1_tx_send_w_num(bData)
#define ZW_DEBUG_SEND_NL()        ZW_UART1_tx_send_nl()
#define ZW_DEBUG_SEND_STR(STR)    ZW_UART1_tx_send_str(STR)
#define ZW_DEBUG_TX_STATUS()      ZW_UART1_tx_active_get()
#else
#define ZW_DEBUG_INIT(baud)       ZW_UART_init(baud, TRUE, FALSE)
#define ZW_DEBUG_SEND_BYTE(bData) ZW_UART_tx_send_byte(bData)
#define ZW_DEBUG_SEND_NUM(bData)  ZW_UART_tx_send_num(bData)
#define ZW_DEBUG_SEND_WORD_NUM(bData)  ZW_UART_tx_send_w_num(bData)
#define ZW_DEBUG_SEND_NL()        ZW_UART_tx_send_nl()
#define ZW_DEBUG_SEND_STR(STR)    ZW_UART_tx_send_str(STR)
#define ZW_DEBUG_TX_STATUS()      ZW_UART_tx_active_get()
#endif
#endif
#else
#ifdef ZW_DEBUG_USB
#include <ZW_usb_api.h>
#include <ZW_usb_man_api.h>
#define ZW_DEBUG_INIT(baud)       ZW_USB_debug_init(baud); ZW_FinishConfiguration()
#define ZW_DEBUG_SEND_BYTE(bData) ZW_USB_tx_send_byte(bData)
#define ZW_DEBUG_SEND_NUM(bData)  ZW_USB_tx_send_num(bData)
#define ZW_DEBUG_SEND_WORD_NUM(bData) ZW_USB_tx_send_w_num(bData)
#define ZW_DEBUG_SEND_NL()        ZW_USB_tx_send_nl()
#define ZW_DEBUG_SEND_STR(STR)    ZW_USB_tx_send_str(STR)
#define ZW_DEBUG_TX_STATUS()
#else
#ifdef ZW_DEBUG_UART0
#define ZW_DEBUG_INIT(baud)       ZW_UART0_init(baud, TRUE, FALSE)
#define ZW_DEBUG_SEND_BYTE(bData) ZW_UART0_tx_send_byte(bData)
#define ZW_DEBUG_SEND_NUM(bData)  ZW_UART0_tx_send_num(bData)
#define ZW_DEBUG_SEND_WORD_NUM(bData)  ZW_UART0_tx_send_w_num(bData)
#define ZW_DEBUG_SEND_NL()        ZW_UART0_tx_send_nl()
#define ZW_DEBUG_SEND_STR(STR)    ZW_UART0_tx_send_str(STR)
#define ZW_DEBUG_TX_STATUS()      ZW_UART0_tx_active_get()
#else
#define ZW_DEBUG_INIT(baud)
#define ZW_DEBUG_SEND_BYTE(bData)
#define ZW_DEBUG_SEND_NUM(bData)
#define ZW_DEBUG_SEND_WORD_NUM(bData)
#define ZW_DEBUG_SEND_NL()
#define ZW_DEBUG_SEND_STR(STR)
#define ZW_DEBUG_TX_STATUS()
#endif /* ZW_DEBUG_UART0*/
#endif /* ZW_DEBUG_USB */
#endif /* ZW_DEBUG */

#define ZW_UART0_INIT(baud)        ZW_UART0_init(baud, TRUE, FALSE)
#define ZW_UART0_SEND_BYTE(bData)  ZW_UART0_tx_send_byte(bData)
#define ZW_UART0_SEND_NUM(bData)   ZW_UART0_tx_send_num(bData)
#define ZW_UART0_SEND_DEC(bData)   ZW_UART0_tx_send_dec(bData)
#define ZW_UART0_REC_STATUS        (ZW_UART0_rx_int_get())
#define ZW_UART0_REC_BYTE          (ZW_UART0_rx_data_wait_get())
#define ZW_UART0_SEND_NL()         ZW_UART0_tx_send_nl()
#define ZW_UART0_SEND_STATUS       (ZW_UART0_tx_active_get())
#define ZW_UART0_SEND_STR(STR)     (ZW_UART0_tx_send_str(STR))

#define ZW_UART_INIT(baud)        ZW_UART1_init(baud, TRUE, FALSE)
#define ZW_UART_SEND_BYTE(bData)  ZW_UART1_tx_send_byte(bData)
#define ZW_UART_SEND_NUM(bData)   ZW_UART1_tx_send_num(bData)
#define ZW_UART_REC_STATUS        (ZW_UART1_rx_int_get())
#define ZW_UART_REC_BYTE          (ZW_UART1_rx_data_wait_get())
#define ZW_UART_SEND_NL()         ZW_UART1_tx_send_nl()
#define ZW_UART_SEND_STATUS       (ZW_UART1_tx_int_get())
#define ZW_UART_SEND_STR(STR)     (ZW_UART1_tx_send_str(STR))

#define UART_RX_DMA_STATUS_LOD       0x80
#define UART_RX_DMA_STATUS_EOR       0x40
#define UART_RX_DMA_STATUS_BUFFULL   0x20
#define UART_RX_DMA_STATUS_RUNNING   0x10
#define UART_RX_DMA_STATUS_CURBUF1   0x02

#define UART_RX_DMA_LOD_INT_EN       0x20
#define UART_RX_DMA_SWITCH_COUNT     0x08
#define UART_RX_DMA_SWITCH_FULL      0x04
#define UART_RX_DMA_SWITCH_EOR       0x01

#define UART_TX_DMA_STATUS_SLOW_XRAM 0x80
#define UART_TX_DMA_STATUS_RUNNING   0x10

/***************************************************************************/
/*                              EXPORTED DATA                              */
/***************************************************************************/

/***************************************************************************/
/*                           EXPORTED FUNCTIONS                            */
/***************************************************************************/

/*===============================   ZW_UART_init   =============================
**  Initializes UART0.
**  Optionally enables transmit and/or receive, clears the rx and tx interrupt
**  flags, and sets the specified baudrate.
**
**  Side effects:
**--------------------------------------------------------------------------*/
void             /*RET Nothing */
ZW_UART_init(
  WORD bBaudRate,  /* IN  Baud rate / 100 (e.g. 96 => 9600baud/s, 1152 => 115200baud/s) */
  BYTE bEnableTx,  /* IN  TRUE: Tx enabled, FALSE: Tx disabled */
  BYTE bEnableRx); /* IN  TRUE: Rx enabled, FALSE: Rx disabled */

/*===============================   ZW_UART0_init   =============================
**  Initializes UART0.
**  Optionally enables transmit and/or receive, clears the rx and tx interrupt
**  flags, and sets the specified baudrate.
**
**  Side effects:
**--------------------------------------------------------------------------*/
void             /*RET Nothing */
ZW_UART0_init(
  WORD bBaudRate,  /* IN  Baud rate / 100 (e.g. 96 => 9600baud/s, 1152 => 115200baud/s) */
  BYTE bEnableTx,  /* IN  TRUE: Tx enabled, FALSE: Tx disabled */
  BYTE bEnableRx); /* IN  TRUE: Rx enabled, FALSE: Rx disabled */

/*==============================   ZW_UART0_INT_ENABLE  =============================
**  Enables UART0 interrupt
**
**    Side effects:
**--------------------------------------------------------------------------*/

#define ZW_UART0_INT_ENABLE  ES0=1

/*==============================   ZW_UART0_INT_DISABLE  =============================
**  Disables UART0 interrupt
**
**    Side effects:
**--------------------------------------------------------------------------*/

#define ZW_UART0_INT_DISABLE ES0=0

/*===============================   ZW_UART_tx_send_byte   ========================
**  Wait until UART0 Tx is idle, then write data byte to UART0 transmit register
**
**    Side effects: waits until UART0 Tx is idle
**--------------------------------------------------------------------------*/
void
ZW_UART_tx_send_byte(
  BYTE bData);  /* IN a byte to written to the UART transmit register.*/

/*===========================  ZW_UART_tx_send_dec  ==========================
**  Converts a byte to a two-digit decimal ASCII representation,
**  and transmits it over UART0.
**
**    Side effects:
**
**--------------------------------------------------------------------------*/
void            /*RET Nothing */
ZW_UART_tx_send_dec(
  BYTE bData);  /* IN data to send */

/*===========================  ZW_UART_tx_send_hex  ==========================
**  Converts a byte to a two-byte hexadecimal ASCII representation,
**  and transmits it over UART0.
**
**    Side effects:
**
**--------------------------------------------------------------------------*/
#define ZW_UART_tx_send_num ZW_UART_tx_send_hex

void            /*RET Nothing */
ZW_UART_tx_send_hex(
  BYTE bData);   /* IN data to send */


/*===========================  ZW_UART_tx_send_w_num  ==========================
**  Converts a WORD to a 4-byte hexadecimal ASCII representation,
**  and transmits it over UART0.
**
**    Side effects:
**
**--------------------------------------------------------------------------*/
void            /*RET Nothing */
ZW_UART_tx_send_w_num(
  WORD bData);   /* IN data to send */

/*============================   ZW_UART_tx_send_str   ========================
**  Transmit a null terminated string over UART0.
**  The null data is not transmitted.
**
**    Side effects:
**
**--------------------------------------------------------------------------*/
void          /*RET Nothing */
ZW_UART_tx_send_str(
  BYTE_P str); /* IN String pointer */

/*=============================   ZW_UART_send_nl   =========================
**  Transmit CR + LF over UART0.
**
**    Side effects:
**
**--------------------------------------------------------------------------*/
void                /*RET Nothing */
ZW_UART_tx_send_nl( void ); /*IN Nothing */

/*===============================   ZW_UART_tx_active_get   ========================
**  This function checks if the UART0 is sending.
**
**    Side effects:
**--------------------------------------------------------------------------*/

BYTE    /* RET zero (0x00): UART0 tx is idle,
         *     non-zero:  : UART0 tx is active     */
ZW_UART_tx_active_get(void);


/*===============================   ZW_UART0_rx_int_clear   ========================
**  Clear the UART0 Rx interrupt flag
**
**    Side effects:
**--------------------------------------------------------------------------*/
void
ZW_UART0_rx_int_clear(void);

/*=============================   ZW_UART0_tx_int_clear   ========================
**  Clear the UART0 Tx interrupt flag
**
**    Side effects:
**--------------------------------------------------------------------------*/
void
ZW_UART0_tx_int_clear(void);

/*===============================   ZW_UART0_rx_data_wait_get   ========================
**  Read the content of the UART0 receive register
**
**    Side effects:
**--------------------------------------------------------------------------*/
BYTE    /* RET the content of the receive register*/
ZW_UART0_rx_data_wait_get(void);

/*===============================   ZW_UART0_rx_data_get   ========================
**  Read the content of the UART0 receive register
**
**    Side effects:
**--------------------------------------------------------------------------*/

BYTE    /* RET the content of the receive register*/
ZW_UART0_rx_data_get(void);

/*===============================   ZW_UART0_tx_data_set   ========================
**  Write data byte to UART0 transmit register
**
**    Side effects:
**--------------------------------------------------------------------------*/
void
ZW_UART0_tx_data_set(
  BYTE txByte);  /* IN a byte to written to the UART transmit register.*/

/*===============================   ZW_UART0_tx_send_byte   ========================
**  Wait until UART0 Tx is idle, then write data byte to UART0 transmit register
**
**    Side effects: waits until UART0 Tx is idle
**--------------------------------------------------------------------------*/
void
ZW_UART0_tx_send_byte(
  BYTE bData);  /* IN a byte to written to the UART transmit register.*/

/*===============================   ZW_UART0_rx_enable   ========================
**  Enable the UART receiver and reserve IO.
**
**    Side effects:
**--------------------------------------------------------------------------*/
void
ZW_UART0_rx_enable(
  BYTE bState); /* IN  TRUE: enables UART0 rx function, FALSE: disables UART0 rx function */

/*===============================   ZW_UART0_tx_enable   ========================
**  Enable the UART transmitter and reserve IO.
**
**    Side effects:
**--------------------------------------------------------------------------*/
void
ZW_UART0_tx_enable(
  BYTE bState); /* IN  TRUE: enables UART0 tx function, FALSE: disables UART0 tx function */


/*===============================   ZW_UART0_tx_int_get   ========================
**  This function checks if the UART0 has sent a byte.
**
**    Side effects:
**--------------------------------------------------------------------------*/

BYTE    /* RET zero (0x00): tx interrupt flag is not set,
         *     non-zero:  : tx interrupt flag is set      */
ZW_UART0_tx_int_get(void);

/*===============================   ZW_UART0_tx_active_get   ========================
**  This function checks if the UART0 is sending.
**
**    Side effects:
**--------------------------------------------------------------------------*/

BYTE    /* RET zero (0x00): UART0 tx is idle,
         *     non-zero:  : UART0 tx is active     */
ZW_UART0_tx_active_get(void);

/*===============================   ZW_UART0_rx_int_get   ========================
**  This function checks if the UART0 has received a byte.
**
**    Side effects:
**--------------------------------------------------------------------------*/
BYTE    /* RET zero (0x00): rx interrupt flag is not set,
         *     non-zero:  : rx interrupt flag is set      */
ZW_UART0_rx_int_get(void);


/*===========================  ZW_UART0_tx_send_dec  ==========================
**  Converts a byte to a two-digit decimal ASCII representation,
**  and transmits it over UART0.
**
**    Side effects:
**
**--------------------------------------------------------------------------*/
void            /*RET Nothing */
ZW_UART0_tx_send_dec(
  BYTE bData);  /* IN data to send */

/*===========================  ZW_UART0_tx_send_hex  ==========================
**  Converts a byte to a two-byte hexadecimal ASCII representation,
**  and transmits it over UART0.
**
**    Side effects:
**
**--------------------------------------------------------------------------*/
#define ZW_UART0_tx_send_num ZW_UART0_tx_send_hex

void            /*RET Nothing */
ZW_UART0_tx_send_hex(
  BYTE bData);   /* IN data to send */


/*===========================  ZW_UART0_tx_send_w_num  ==========================
**  Converts a WORD to a 4-byte hexadecimal ASCII representation,
**  and transmits it over UART0.
**
**    Side effects:
**
**--------------------------------------------------------------------------*/
void            /*RET Nothing */
ZW_UART0_tx_send_w_num(
  WORD bData);   /* IN data to send */

/*============================   ZW_UART0_tx_send_str   ========================
**  Transmit a null terminated string over UART0.
**  The null data is not transmitted.
**
**    Side effects:
**
**--------------------------------------------------------------------------*/
void          /*RET Nothing */
ZW_UART0_tx_send_str(
  BYTE_P str); /* IN String pointer */

/*=============================   ZW_UART0_send_nl   =========================
**  Transmit CR + LF over UART0.
**
**    Side effects:
**
**--------------------------------------------------------------------------*/
void                /*RET Nothing */
ZW_UART0_tx_send_nl( void ); /*IN Nothing */


/*===============================   ZW_UART1_init   =============================
**  Initializes UART1.
**  Optionally enables transmit and/or receive, clears the rx and tx interrupt
**  flags, and sets the specified baudrate.
**
**  Side effects:
**--------------------------------------------------------------------------*/
void             /*RET Nothing */
ZW_UART1_init(
  WORD bBaudRate,  /* IN  Baud rate / 100 (e.g. 96 => 9600baud/s, 1152 => 115200baud/s) */
  BYTE bEnableTx,  /* IN  TRUE: Tx enabled, FALSE: Tx disabled */
  BYTE bEnableRx); /* IN  TRUE: Rx enabled, FALSE: Rx disabled */

/*==============================   ZW_UART1_INT_ENABLE  =============================
**  Enables UART0 interrupt
**
**    Side effects:
**--------------------------------------------------------------------------*/

#define ZW_UART1_INT_ENABLE  ES1=1

/*==============================   ZW_UART1_INT_DISABLE  =============================
**  Disables UART0 interrupt
**
**    Side effects:
**--------------------------------------------------------------------------*/

#define ZW_UART1_INT_DISABLE ES1=0

/*===============================   ZW_UART1_rx_int_clear   ========================
**  Clear the UART1 Rx interrupt flag
**
**    Side effects:
**--------------------------------------------------------------------------*/
void
ZW_UART1_rx_int_clear(void);

/*=============================   ZW_UART1_tx_int_clear   ========================
**  Clear the UART1 Tx interrupt flag
**
**    Side effects:
**--------------------------------------------------------------------------*/
void
ZW_UART1_tx_int_clear(void);

/*===============================   ZW_UART1_rx_data_wait_get   ========================
**  Read the content of the UART1 receive register
**
**    Side effects:
**--------------------------------------------------------------------------*/
BYTE    /* RET the content of the receive register*/
ZW_UART1_rx_data_wait_get(void);

/*===============================   ZW_UART1_rx_data_get   ========================
**  Read the content of the UART1 receive register
**
**    Side effects:
**--------------------------------------------------------------------------*/

BYTE    /* RET the content of the receive register*/
ZW_UART1_rx_data_get(void);

/*===============================   ZW_UART1_tx_data_set   ========================
**  Write data byte to UART1 transmit register
**
**    Side effects:
**--------------------------------------------------------------------------*/
void
ZW_UART1_tx_data_set(
  BYTE txByte);  /* IN a byte to written to the UART transmit register.*/

/*===============================   ZW_UART1_tx_send_byte   ========================
**  Wait until UART1 Tx is idle, then write data byte to UART1 transmit register
**
**    Side effects: waits until UART1 Tx is idle
**--------------------------------------------------------------------------*/
void
ZW_UART1_tx_send_byte(
  BYTE bData);  /* IN a byte to written to the UART transmit register.*/

/*===============================   ZW_UART1_rx_enable   ========================
**  Enable the UART receiver and reserve IO.
**
**    Side effects:
**--------------------------------------------------------------------------*/
void
ZW_UART1_rx_enable(
  BYTE bState); /* IN  TRUE: enables UART1 rx function, FALSE: disables UART1 rx function */

/*===============================   ZW_UART1_tx_enable   ========================
**  Enable the UART transmitter and reserve IO.
**
**    Side effects:
**--------------------------------------------------------------------------*/
void
ZW_UART1_tx_enable(
  BYTE bState); /* IN  TRUE: enables UART1 tx function, FALSE: disables UART1 tx function */


/*===============================   ZW_UART1_tx_int_get   ========================
**  This function checks if the UART1 has sent a byte.
**
**    Side effects:
**--------------------------------------------------------------------------*/

BYTE    /* RET zero (0x00): tx interrupt flag is not set,
         *     non-zero:  : tx interrupt flag is set      */
ZW_UART1_tx_int_get(void);

/*===============================   ZW_UART1_tx_active_get   ========================
**  This function checks if the UART1 is sending.
**
**    Side effects:
**--------------------------------------------------------------------------*/

BYTE    /* RET zero (0x00): UART1 tx is idle,
         *     non-zero:  : UART1 tx is active     */
ZW_UART1_tx_active_get(void);


/*===============================   ZW_UART1_rx_int_get   ========================
**  This function checks if the UART1 has received a byte.
**
**    Side effects:
**--------------------------------------------------------------------------*/
BYTE    /* RET zero (0x00): rx interrupt flag is not set,
         *     non-zero:  : rx interrupt flag is set      */
ZW_UART1_rx_int_get(void);


/*===========================  ZW_UART1_tx_send_num  ==========================
**  Converts a byte to a two-byte hexadecimal ASCII representation,
**  and transmits it over UART1.
**
**
**    Side effects:
**
**--------------------------------------------------------------------------*/
#define ZW_UART1_tx_send_num ZW_UART1_tx_send_hex

void            /*RET Nothing */
ZW_UART1_tx_send_hex(BYTE bData);   /* IN data to send */

/*===========================  ZW_UART1_tx_send_num  ==========================
**  Converts a WORD to a 4-byte hexadecimal ASCII representation,
**  and transmits it over UART1.
**
**    Side effects:
**
**--------------------------------------------------------------------------*/
void            /*RET Nothing */
ZW_UART1_tx_send_w_num(
  WORD bData);   /* IN data to send */

/*============================   ZW_UART1_tx_send_str   ========================
**  Transmit a null terminated string over UART1.
**  The null data is not transmitted.
**
**    Side effects:
**
**--------------------------------------------------------------------------*/
void          /*RET Nothing */
ZW_UART1_tx_send_str(BYTE_P str); /* IN String pointer */

/*=============================   ZW_UART1_send_nl   =========================
**  Transmit CR + LF over UART1.
**
**    Side effects:
**
**--------------------------------------------------------------------------*/
void                /*RET Nothing */
ZW_UART1_tx_send_nl( void ); /*IN Nothing */


/*--------------------------------------------------------------------------
**--------------------------------------------------------------------------
**
**  WARNING - WARNING - WARNING - WARNING - WARNING - WARNING - WARNING

** The following API calls are obsolete and should NOT be used.
** The API calls will be removed in a later developers kit release.
**
**--------------------------------------------------------------------------
**--------------------------------------------------------------------------*/

/*===============================   ZW_UART0_tx_dma_int_byte_count  ========================
**  Set interrupt tx byte count
**
**  Parameters
**
**   bByteCount: IN Interrupt is issued when this number of bytes has been DMA'ed to the UART
**                    Disabled when set to 0x00 which is default after reset
**   Side effects:
**--------------------------------------------------------------------------*/
void                    /*RET Nothing */
ZW_UART0_tx_dma_int_byte_count( BYTE bByteCount);   /*IN Number of tx'ed bytes */

/*===============================   ZW_UART0_tx_dma_inter_byte_delay  ========================
**  Set Tx inter byte delay
**  Parameters
**
**   bDelay:   IN Sets the inter byte delay 0x00 no delay (default after reset)
**                                          0x01  125ns delay
**                                          0x02  250ns delay
**                                                 :
**                                          0x0F 1875ns delay
**   Side effects:
**--------------------------------------------------------------------------*/
void                    /*RET Nothing */
ZW_UART0_tx_dma_inter_byte_delay( BYTE bDelay);   /*IN inter byte delay */

/*===============================   ZW_UART0_tx_dma_data  ========================
**  Set buffer address and length and then start UART0 DMA
**  Parameters
**
**   pbAddress:  IN pointer to Tx buffer in lower 4kB XRAM
**   bBufferLen: IN length of Tx buffer in bytes
**
**   Side effects:
**       Discards any ongoing UART TX DMA process
**--------------------------------------------------------------------------*/
void                    /*RET Nothing */
ZW_UART0_tx_dma_data( XBYTE *pbAddress,    /*IN buffer base address */
                      BYTE bBufferLen); /*IN buffer len */

/*===============================   ZW_UART0_tx_dma_status  ========================
**  If the UART0 DMA process is ongoing this function Returns the status of this ongoing
**  process. Returns the status of the latest UART0 DMA process if the DMA has stopped.
**
**  Returned values:
**       UART_TX_DMA_STATUS_SLOW_XRAM: DMA can not keep up with configured inter byte
**                                     process because of congestion in XRAM access
**       UART_TX_DMA_STATUS_RUNNING:   The DMA is transferring data to UART0
**
**  Parameters: None
**
**   Side effects:
**--------------------------------------------------------------------------*/
BYTE                    /*RET status */
ZW_UART0_tx_dma_status(void); /*IN Nothing */

/*===============================   ZW_UART0_tx_dma_bytes_transferred  ========================
**  Returns the number of bytes that has been transferred to UART0 from XRAM for the ongoing DMA
**  process. If no transfer is ongoing the number of bytes that has been transferred to UART0
**  from XRAM from the latest process is returned.
**
**  Parameters: None
**
**   Side effects:
**--------------------------------------------------------------------------*/
BYTE                    /*RET bytes transferred */
ZW_UART0_tx_dma_bytes_transferred(void); /*IN Nothing */

/*===============================   ZW_UART0_tx_dma_cancel  ========================
**  Cancels any ongoing DMA process and brings UART TX DMA to idle state
**
**  Parameters: None
**
**   Side effects:
**--------------------------------------------------------------------------*/
void                    /*RET nothing */
ZW_UART0_tx_dma_cancel(void); /*IN Nothing */



/*===============================   ZW_UART0_rx_dma_init  ===============================
**  Initialize the buffers and setup for the UART0 Rx DMA
**
**  Parameters
**     pbAddress:  IN pointer to the base address of the two Rx buffers
**     bBufLength: IN length of UART0 RX Buffer - must be greater than 0
**     bBitMask:   IN bit mask contains the setting of the Rx DMA
**                      UART_RX_DMA_LOD_INT_EN    Enable Loss Of Data interrupt
**                      UART_RX_DMA_SWITCH_COUNT  Switch buffer when byte count is reached
**                      UART_RX_DMA_SWITCH_FULL   Switch buffer when buffer full
**                      UART_RX_DMA_SWITCH_EOR    Switch buffer when EOR is received
**
**    Side effects:
**       Discards any ongoing UART RX DMA process
**       Clears status information
**-------------------------------------------------------------------------------------*/
void                    /*RET Nothing */
ZW_UART0_rx_dma_init( XBYTE *pbAddress,   /* IN pointer to base address of RX buffers */
                      BYTE bBufLength, /* IN byte length of each of the two buffers*/
                      BYTE bBitMask);  /* IN see above */

/*===============================   ZW_UART0_rx_dma_int_byte_count  ===============================
**  Set interrupt rx byte count. A value of 0x00 means disabled
**
**   bByteCount: IN Interrupt is issued when this number of bytes has been DMA'ed from the UART
**                  Disabled when set to 0x00
**    Side effects:
**-------------------------------------------------------------------------------------*/
void                    /*RET Nothing */
ZW_UART0_rx_dma_int_byte_count(BYTE bByteCount); /*IN */


/*===============================   ZW_UART0_rx_dma_status  ========================
**  If the UART0 RX DMA process is ongoing this function returns the status of this ongoing
**  process. Returns the status of the latest UART0 RX DMA process if the DMA has stopped.
**
**  Returned values:
**       UART_RX_DMA_STATUS_EOR:     The DMA switched RX buffer because it has
**                                   recieved an End of Record char
**       UART_RX_DMA_STATUS_LOD:     DMA can not keep up with the speed of the incomming data
**       UART_RX_DMA_STATUS_CURBUF1: Set when the UART0 RX DMA currently is transferring data
**                                   from buffer 1. When cleared the UART0 RX DMA currently is
**                                   transferring data from buffer 0
**       UART_RX_DMA_STATUS_BUFFULL: Set when a buffer has been filled to the limit
**       UART_RX_DMA_STATUS_RUNNING: The DMA is enabled
**
**  Parameters: None
**
**   Side effects:
**--------------------------------------------------------------------------*/
BYTE                    /*RET status */
ZW_UART0_rx_dma_status(void); /*IN Nothing */

/*===============================   ZW_UART0_rx_dma_bytes_transferred  ========================
**  Returns the number of bytes that has been transferred to UART0 to XRAM for the ongoing DMA
**  process.
**
**  Parameters: None
**
**   Side effects:
**--------------------------------------------------------------------------*/
BYTE                    /*RET bytes transferred */
ZW_UART0_rx_dma_bytes_transferred(void); /*IN Nothing */

/*===============================   ZW_UART0_rx_dma_cancel  ========================
**  Cancels any ongoing DMA process and brings UART RX DMA to idle state
**
**  Parameters: None
**
**   Side effects:
**--------------------------------------------------------------------------*/
void                    /*RET nothing */
ZW_UART0_rx_dma_cancel(void); /*IN Nothing */

/*=============================   ZW_UART0_rx_dma_eor_set =======================
**
**  Sets the End of Record (EoR) character. The EoR function makes it possible
**  to switch receive buffer when a certain character is recieved, .e.g Linefeed.
**  UART_RX_DMA_SWITCH_EOR must have been set in the ZW_UART0_rx_dma_init call
**  for the function to be enabled.
**
**  Parameters:
**
**   Side effects:
**--------------------------------------------------------------------------*/
void                    /*RET nothing */
ZW_UART0_rx_dma_eor_set(BYTE bChar);  /*IN EoR character */

/*=====================   ZW_UART0_rx_dma_byte_count_enable  =====================
**
**  Enables or disabled the function switch buffer when a certain byte count is
**  reached
**
**  Parameters: None
**
**   Side effects:
**--------------------------------------------------------------------------*/
void                    /*RET nothing */
ZW_UART0_rx_dma_byte_count_enable(BYTE bEnable); /* IN TRUE bute count switch is enabled */





/*===============================   ZW_UART1_tx_dma_int_byte_count  ========================
**  Set interrupt tx byte count
**
**  Parameters
**
**   bByteCount: IN Interrupt is issued when this number of bytes has been DMA'ed to the UART
**                    Disabled when set to 0x00
**   Side effects:
**--------------------------------------------------------------------------*/
void                    /*RET Nothing */
ZW_UART1_tx_dma_int_byte_count( BYTE bByteCount);   /*IN Number of tx'ed bytes */

/*===============================   ZW_UART1_tx_dma_inter_byte_delay  ========================
**  Set Tx inter byte delay
**  Parameters
**
**   bDelay:   IN Sets the inter byte delay 0x00 no delay (default after reset)
**                                          0x01  125ns delay
**                                          0x02  250ns delay
**                                                 :
**                                          0x0F 1875ns delay
**   Side effects:
**--------------------------------------------------------------------------*/
void                    /*RET Nothing */
ZW_UART1_tx_dma_inter_byte_delay( BYTE bDelay);   /*IN inter byte delay */

/*===============================   ZW_UART1_tx_dma_data  ========================
**  Set buffer address and length and then start UART1 DMA
**  Parameters
**
**   pbAddress:  IN pointer to Tx buffer in lower 4kB XRAM
**   bBufferLen: IN length of Tx buffer in bytes
**
**   Side effects:
**       Discards any ongoing UART TX DMA process
**--------------------------------------------------------------------------*/
void                    /*RET Nothing */
ZW_UART1_tx_dma_data( XBYTE *pbAddress,    /*IN buffer base address */
                      BYTE bBufferLen); /*IN buffer len */

/*===============================   ZW_UART1_tx_dma_status  ========================
**  If the UART1 DMA process is ongoing this function Returns the status of this ongoing
**  process. Returns the status of the latest UART1 DMA process if the DMA has stopped.
**
**  Returned values:
**       UART_TX_DMA_STATUS_SLOW_XRAM: DMA can not keep up with configured inter byte
**                                     process because of congestion in XRAM access
**       UART_TX_DMA_STATUS_RUNNING:   The DMA is transferring data to UART1
**
**  Parameters: None
**
**   Side effects:
**--------------------------------------------------------------------------*/
BYTE                    /*RET status */
ZW_UART1_tx_dma_status(void); /*IN Nothing */

/*===============================   ZW_UART1_tx_dma_bytes_transferred  ========================
**  Returns the number of bytes that has been transferred to UART1 from XRAM for the ongoing DMA
**  process. If no transfer is ongoing the number of bytes that has been transferred to UART1
**  from XRAM from the latest process is returned.
**
**  Parameters: None
**
**   Side effects:
**--------------------------------------------------------------------------*/
BYTE                    /*RET bytes transferred */
ZW_UART1_tx_dma_bytes_transferred(void); /*IN Nothing */

/*===============================   ZW_UART1_tx_dma_cancel  ========================
**  Cancels any ongoing DMA process and brings UART TX DMA to idle state
**
**  Parameters: None
**
**   Side effects:
**--------------------------------------------------------------------------*/
void                    /*RET nothing */
ZW_UART1_tx_dma_cancel(void); /*IN Nothing */

/*===============================   ZW_UART1_rx_dma_init  ===============================
**  Initialize the buffers and setup for the UART1 Rx DMA
**
**  Parameters
**     pbAddress:  IN pointer to the base address of the two Rx buffers
**     bBufLength: IN length of UART1 RX Buffer - must be greater than 0
**     bBitMap:    IN bit mask contains the setting of the Rx DMA
**                      UART_RX_DMA_LOD_INT_EN    Enable Loss Of Data interrupt
**                      UART_RX_DMA_SWITCH_COUNT  Switch buffer when byte count is reached
**                      UART_RX_DMA_SWITCH_FULL   Switch buffer when buffer full
**
**    Side effects:
**       Discards any ongoing UART RX DMA process
**       Clears status information
**-------------------------------------------------------------------------------------*/
void                    /*RET Nothing */
ZW_UART1_rx_dma_init( XBYTE *pbAddress, /*IN pointer to base address of RX buffers */
                      BYTE bBufLength, /* IN buffer byte length */
                      BYTE bBitMap); /*IN the rx dmaBuf's threshold value of the almost full flag*/

/*===============================   ZW_UART1_rx_dma_int_byte_count  ===============================
**  Set interrupt rx byte count. A value of 0x00 means disabled
**
**   bByteCount: IN Interrupt is issued when this number of bytes has been DMA'ed from the UART
**                  Disabled when set to 0x00
**    Side effects:
**-------------------------------------------------------------------------------------*/
void                    /*RET Nothing */
ZW_UART1_rx_dma_int_byte_count(BYTE bByteCount); /*IN */

/*===============================   ZW_UART1_rx_dma_status  ========================
**  If the UART1 RX DMA process is ongoing this function returns the status of this ongoing
**  process. Returns the status of the latest UART1 RX DMA process if the DMA has stopped.
**
**  Returned values:
**       UART_RX_DMA_STATUS_EOR:     The DMA switched RX buffer because it has
**                                   recieved an End of Record char
**       UART_RX_DMA_STATUS_LOD:     DMA can not keep up with the speed of the incomming data
**       UART_RX_DMA_STATUS_CURBUF1: Set when the UART1 RX DMA currently is transferring data
**                                   from buffer 1. When cleared the UART1 RX DMA currently is
**                                   transferring data from buffer 0
**       UART_RX_DMA_STATUS_BUFFULL: Set when a buffer has been filled to the limit
**       UART_RX_DMA_STATUS_RUNNING: The DMA is enabled
**
**  Parameters: None
**
**   Side effects:
**--------------------------------------------------------------------------*/
BYTE                    /*RET status */
ZW_UART1_rx_dma_status(void); /*IN Nothing */

/*===============================   ZW_UART1_rx_dma_bytes_transferred  ========================
**  Returns the number of bytes that has been transferred to UART1 to XRAM for the ongoing DMA
**  process.
**
**  Parameters: None
**
**   Side effects:
**--------------------------------------------------------------------------*/
BYTE                    /*RET bytes transferred */
ZW_UART1_rx_dma_bytes_transferred(void); /*IN Nothing */

/*===============================   ZW_UART1_rx_dma_cancel  ========================
**  Cancels any ongoing DMA process and brings UART RX DMA to idle state
**
**  Parameters: None
**
**   Side effects:
**--------------------------------------------------------------------------*/
void                    /*RET nothing */
ZW_UART1_rx_dma_cancel(void); /*IN Nothing */


/*=============================   ZW_UART1_rx_dma_eor_set =======================
**
**  Sets the End of Record (EoR) character. The EoR function makes it possible
**  to switch receive buffer when a certain character is recieved, .e.g Linefeed.
**  UART_RX_DMA_SWITCH_EOR must have been set in the ZW_UART1_rx_dma_init call
**  for the function to be enabled.
**
**  Parameters:
**
**   Side effects:
**--------------------------------------------------------------------------*/
void                    /*RET nothing */
ZW_UART1_rx_dma_eor_set(BYTE bChar);  /*IN EoR character */

/*=====================   ZW_UART1_rx_dma_byte_count_enable  =====================
**
**  Enables or disabled the function switch buffer when a certain byte count is
**  reached
**
**  Parameters: None
**
**   Side effects:
**--------------------------------------------------------------------------*/
void                    /*RET nothing */
ZW_UART1_rx_dma_byte_count_enable(BYTE bEnable); /* IN TRUE bute count switch is enabled */


#endif /* _ZW_UART_API_H_ */
