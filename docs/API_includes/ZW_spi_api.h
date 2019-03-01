/***************************************************************************
*
* Copyright (c) 2001-2012
* Sigma Designs, Inc.
* All Rights Reserved
*
*---------------------------------------------------------------------------
*
* Description: Interface driver for the 400 and 500 Series Z-Wave
*              Single Chip built-in SPI controllers
*
* Author:      Morten Vested Olesen
*
* Last Changed By:  $Author: jdo $
* Revision:         $Revision: 1.38 $
* Last Changed:     $Date: 2005/07/27 15:12:54 $
*
****************************************************************************/
#ifndef _ZW_SPI_API_H_
#define _ZW_SPI_API_H_
/****************************************************************************/
/*                              INCLUDE FILES                               */
/****************************************************************************/

/****************************************************************************/
/*                     EXPORTED TYPES and DEFINITIONS                       */
/****************************************************************************/

/* SPI clock speed */
#define SPI_SPEED_8_MHZ   0x00
#define SPI_SPEED_4_MHZ   0x01
#define SPI_SPEED_2_MHZ   0x02
#define SPI_SPEED_1_MHZ   0x03

/* SPI standard compliant mode numbering */
#define  SPI_MODE_0       0x00      /*(spi clock idle low, data sampled at rising edge and clocked at falling edge)*/
#define  SPI_MODE_1       0x04      /*(spi clock idle low, data sampled at falling edge and clocked at rising edge)*/
#define  SPI_MODE_2       0x08      /*(spi clock idle high, data sampled at falling edge and clocked at rising edge)*/
#define  SPI_MODE_3       0x0C      /*(spi clock idle high, data sampled at rising edge and clocked at falling edge)*/
/* SPI signaling mode - *Obsolete* only for backward compatibility with prior Z-Wave code */
#define  SPI_SIG_MODE_1   0x00 /*(spi clock idle low, data sampled at rising edge and clocked at falling edge)*/
#define  SPI_SIG_MODE_2   0x04 /*(spi clock idle low, data sampled at falling edge and clocked at rising edge)*/
#define  SPI_SIG_MODE_3   0x08     /*(spi clock idle high, data sampled at falling edge and clocked at rising edge)*/
#define  SPI_SIG_MODE_4   0x0C     /*(spi clock idle high, data sampled at rising edge and clocked at falling edge)*/

/* SPI data order */
#define SPI_MSB_FIRST     0x10
#define SPI_LSB_FIRST     0x00

/* SPI master/slave */
#define SPI_MASTER        0x20
#define SPI_SLAVE         0x00

/* SPI slave select */
#define SPI_SS_N_SS        0x08
#define SPI_SS_N_GPIO      0x00

/* SPI DMA status and control defines */
#define SPI_TX_DMA_STATUS_SLOW_XRAM 0x80
#define SPI_TX_DMA_STATUS_RUNNING   0x10
#define SPI_RX_DMA_STATUS_LOD       0x80
#define SPI_RX_DMA_STATUS_EOR       0x40
#define SPI_RX_DMA_STATUS_BUFFULL   0x20
#define SPI_RX_DMA_STATUS_RUNNING   0x10
#define SPI_RX_DMA_STATUS_CURBUF1   0x02
#define SPI_RX_DMA_LOD_INT_EN       0x20
#define SPI_RX_DMA_SWITCH_COUNT     0x08
#define SPI_RX_DMA_SWITCH_FULL      0x04
#define SPI_RX_DMA_SWITCH_EOR       0x01

/***************************************************************************/
/*                              EXPORTED DATA                              */
/***************************************************************************/

/***************************************************************************/
/*                           EXPORTED FUNCTIONS                            */
/***************************************************************************/

/****************************************************************************/
/*                           EXPORTED FUNCTIONS                             */
/****************************************************************************/


/*==============================   ZW_SPI1_int_enable   ============================
**    Enable the SPI1 interrupt
**
**--------------------------------------------------------------------------*/
void   /*RET Nothing */
ZW_SPI1_int_enable(BYTE bState); /*IN  TRUE: enable SPI1 interrupt ,
                                  *    FALSE: disable SPI1 interrupt */

/*==============================   ZW_SPI1_int_clear   ==============================
**    This function clears the SPI1 interface interrupt flag
**
**--------------------------------------------------------------------------*/
void   /*RET Nothing */
ZW_SPI1_int_clear(void); /*IN  Nothing */

/*==============================  ZW_SPI1_int_get   ==============================
**   Returns the state of the SPI1 interrupt flag
**
**--------------------------------------------------------------------------*/

BYTE /* RET  zero (0x00): interrupt flag is not set , none-zero: Interrupt flag is set . */
ZW_SPI1_int_get(void);

/*==============================   ZW_SPI1_coll_get   ==============================
**    This function returns the state of the SPI1 collision flag
**
**    Side effects: clears the collision flag after it has been read
**--------------------------------------------------------------------------*/
BYTE   /*RET  Byte with state bit mask */
ZW_SPI1_coll_get(void); /*IN  Nothing */

/*==============================  ZW_SPI1_active_get   ==============================
**   Returns the active state is the SPI1 controller
**
**--------------------------------------------------------------------------*/

BYTE /* RET  zero (0x00): SPI1 is idle, non-zero: SPI1 is active. */
ZW_SPI1_active_get(void);

/*==============================   ZW_SPI1_enable   ==============================
**    Enable the SPI interface
**
**--------------------------------------------------------------------------*/
void   /*RET Nothing */
ZW_SPI1_enable(BYTE bState); /*IN  TRUE: enable SPI1, FALSE: disable SPI1 */

/*===============================   ZW_SPI1_init   ==============================
**    ZW_SPI1_init the SPI interface
**
**    Parameters:
**
**      bSpiInit IN: Bit mask that defines the setting of the spi controller
**
**        Speed of the SPI clock (master only)
**                - SPI_SPEED_8_MHZ
**                - SPI_SPEED_4_MHZ
**                - SPI_SPEED_2_MHZ
**                - SPI_SPEED_1_MHZ
**        SPI signaling modes
**                - SPI_MODE_0   (spi clock idle low, data sampled at rising edge and clocked at falling edge)
**                - SPI_MODE_1   (spi clock idle low, data sampled at falling edge and clocked at rising edge)
**                - SPI_MODE_2   (spi clock idle high, data sampled at falling edge and clocked at rising edge)
**                - SPI_MODE_3   (spi clock idle high, data sampled at rising edge and clocked at falling edge)
**        Data order
**                - SPI_MSB_FIRST (send MSB bit first)
**                - SPI_LSB_FIRST (Send LSB bit first)
**
**
** Side effects: Enables the SPI controller
**
**--------------------------------------------------------------------------*/
void                /*RET  Nothing        */
ZW_SPI1_init(BYTE bSpiInit);    /*IN: bit mask that define the setting of the spi controller*/

/*===============================   ZW_SPI1_rx_get   ==============================
**    Returns a received byte from the Serial Peripheral Interface
**
**    Side effects:
**
**--------------------------------------------------------------------------*/
BYTE               /*RET  Received SPI data        */
ZW_SPI1_rx_get( void );   /*IN   Nothing        */

/*===============================   ZW_SPI1_tx_set  ==============================
**    This functions waits until the SPI1 is idle, then it writes a byte to the
**    SPI1 transmit register. It will start to transmit the data and the
**    function will return immediatly after the transmission is started.
**
**    Side effects:
**
**--------------------------------------------------------------------------*/
void          /*RET  Nothing        */
ZW_SPI1_tx_set(BYTE bData);   /*IN   SPI data to be transmitted       */

/*==============================   ZW_SPI0_int_enable   ============================
**    Enable the SPI0 interrupt
**
**--------------------------------------------------------------------------*/
void   /*RET Nothing */
ZW_SPI0_int_enable(BYTE bState); /*IN  TRUE: enable SPI0 interrupt ,
                                  *    FALSE: disable SPI0 interrupt */

  /*==============================   ZW_SPI0_int_clear   ==============================
**    This function clears the SPI0 interface interrupt flag
**
**--------------------------------------------------------------------------*/
void   /*RET Nothing */
ZW_SPI0_int_clear(void); /*IN  Nothing */

/*==============================   ZW_SPI0_coll_get   ==============================
**    This function returns the state of the SPI0 collision flag
**
**    Side effects: clears the collision flag after it has been read
**--------------------------------------------------------------------------*/
BYTE   /*RET  Byte with state bit mask */
ZW_SPI0_coll_get(void); /*IN  Nothing */

/*==============================  ZW_SPI0_active_get   ==============================
**   Returns the active state is the SPI0 controller
**
**--------------------------------------------------------------------------*/

BYTE /* RET  zero (0x00): SPI0 is idle, non-zero: SPI0 is active. */
ZW_SPI0_active_get(void);

/*==============================  ZW_SPI0_int_get   ==============================
**   Returns the state of the SPI0 interrupt flag
**
**--------------------------------------------------------------------------*/

BYTE /* RET  zero (0x00): interrupt flag is not set , none-zero: Interrupt flag is set . */
ZW_SPI0_int_get(void);


/*==============================   ZW_SPI0_enable   ==============================
**    Enable the SPI interface
**
**--------------------------------------------------------------------------*/
void   /*RET Nothing */
ZW_SPI0_enable(BYTE bState); /*IN  TRUE: enable SPI0, FALSE: disable SPI0 */

/*===============================   ZW_SPI0_init   ==============================
**    ZW_SPI0_init the SPI interface
**
**    Parameters:
**
**      bSpiInit IN: Bit mask that defines the setting of the spi controller
**
**        Speed of the SPI clock (master only)
**                - SPI_SPEED_8_MHZ
**                - SPI_SPEED_4_MHZ
**                - SPI_SPEED_2_MHZ
**                - SPI_SPEED_1_MHZ
**        SPI signaling modes
**                - SPI_MODE_0   (spi clock idle low, data sampled at rising edge and clocked at falling edge)
**                - SPI_MODE_1   (spi clock idle low, data sampled at falling edge and clocked at rising edge)
**                - SPI_MODE_2   (spi clock idle high, data sampled at falling edge and clocked at rising edge)
**                - SPI_MODE_3   (spi clock idle high, data sampled at rising edge and clocked at falling edge)
**        Data order
**                - SPI_MSB_FIRST (send MSB bit first)
**                - SPI_LSB_FIRST (Send LSB bit first)
**        Master/slave
**                - SPI_MASTER (use SPI master mode)
**                - SPI_SLAVE (use SPI slave mode)
**        Slave select
**                - SPI_SS_N_SS (use io SS_N as the slave select when the ZW050x is a SPI slave)
**                - SPI_SS_N_GPIO (use SS_N as normal GPIO or for other functions)
**
**
** Side effects: Enables the SPI controller
**
**--------------------------------------------------------------------------*/
void                /*RET  Nothing        */
ZW_SPI0_init(BYTE bSpiInit);    /*IN: bit mask that define the setting of the spi controller*/

/*===============================   ZW_SPI0_rx_get   ==============================
**    Returns a received byte from the Serial Peripheral Interface
**
**    Side effects:
**
**--------------------------------------------------------------------------*/
BYTE               /*RET  Received SPI data        */
ZW_SPI0_rx_get( void );   /*IN   Nothing        */

/*===============================   ZW_SPI0_tx_set  ==============================
**    This functions waits until the SPI0 is idle, then it writes a byte to the
**    SPI0 transmit register. It will start to transmit the data and the
**    function will return immediatly after the transmission is started.
**
**    Side effects:
**
**--------------------------------------------------------------------------*/
void          /*RET  Nothing        */
ZW_SPI0_tx_set(BYTE bData);   /*IN   SPI data to be transmitted       */

/*--------------------------------------------------------------------------
**--------------------------------------------------------------------------
**
**  WARNING - WARNING - WARNING - WARNING - WARNING - WARNING - WARNING

** The following API calls are obsolete and should NOT be used.
** The API calls will be removed in a later developers kit release.
**
**--------------------------------------------------------------------------
**--------------------------------------------------------------------------*/

/*===============================   ZW_SPI0_tx_dma_int_byte_count  ========================
**  Sets interrupt tx byte count. Only applicable when SPI0 Tx DMA is enabled.
**
**  Parameters
**
**   bByteCount: IN Interrupt is issued when this number of bytes has been DMA'ed to the SPI
**                    Disabled when set to 0x00
**   Side effects:
**--------------------------------------------------------------------------*/
void                    /*RET Nothing */
ZW_SPI0_tx_dma_int_byte_count( BYTE bByteCount);   /*IN Number of tx'ed bytes */

/*===============================   ZW_SPI0_tx_dma_inter_byte_delay  ========================
**  Sets Tx inter byte delay
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
ZW_SPI0_tx_dma_inter_byte_delay( BYTE bDelay);   /*IN inter byte delay */

/*===============================   ZW_SPI0_tx_dma_data  ========================
**  Sets buffer address and length and then starts SPI0 DMA
**  Parameters
**
**   pbAddress:   IN pointer to Tx buffer in lower 4kB XRAM
**   bBufferLen:  IN length of Tx buffer in bytes
**
**   Side effects:
**       Discards any ongoing SPI TX DMA process
**--------------------------------------------------------------------------*/
void                    /*RET Nothing */
ZW_SPI0_tx_dma_data( XBYTE *pbAddress,    /*IN buffer base address */
                     BYTE bBufferLen); /*IN buffer len */

/*===============================   ZW_SPI0_tx_dma_status  ========================
**  If the SPI0 DMA process is ongoing this function Returns the status of this ongoing
**  process. Returns the status of the latest SPI0 DMA process if the DMA has stopped.
**
**  Returned values:
**       SPI_TX_DMA_STATUS_SLOW_XRAM: DMA can not keep up with configured inter byte
**                                     process because of congestion in XRAM access
**       SPI_TX_DMA_STATUS_RUNNING:   The DMA is transferring data to SPI0
**
**  Parameters: None
**
**   Side effects:
**--------------------------------------------------------------------------*/
BYTE                    /*RET status */
ZW_SPI0_tx_dma_status(void); /*IN Nothing */

/*===============================   ZW_SPI0_tx_dma_bytes_transferred  ========================
**  Returns the number of bytes that has been transferred to SPI0 from XRAM for the ongoing DMA
**  process. If no transfer is ongoing the number of bytes that has been transferred to SPI0
**  from XRAM from the latest process is returned.
**
**  Parameters: None
**
**   Side effects:
**--------------------------------------------------------------------------*/
BYTE                    /*RET bytes transferred */
ZW_SPI0_tx_dma_bytes_transferred(void); /*IN Nothing */

/*===============================   ZW_SPI0_tx_dma_cancel  ========================
**  Cancels any ongoing DMA process and brings SPI TX DMA to idle state
**
**  Parameters: None
**
**   Side effects:
**--------------------------------------------------------------------------*/
void                    /*RET nothing */
ZW_SPI0_tx_dma_cancel(void); /*IN Nothing */


/*===============================   ZW_SPI0_rx_dma_init  ===============================
**  Initializes the buffers and setup for the SPI0 Rx DMA
**
**  Parameters
**     pbAddress:  IN pointer to the base address of the two Rx buffers
**     bBufLength: IN length of SPI0 RX Buffer - must be greater than 0
**     bBitMask:   IN bit mask contains the setting of the Rx DMA
**                      SPI_RX_DMA_LOD_INT_EN    Enable Loss Of Data interrupt
**                      SPI_RX_DMA_SWITCH_COUNT  Switch buffer when byte count is reached
**                      SPI_RX_DMA_SWITCH_FULL   Switch buffer when buffer full
**                      SPI_RX_DMA_SWITCH_EOR    Switch buffer when End-Of_Record char has
**                                               been received
**
**    Side effects:
**       Discards any ongoing SPI RX DMA process
**       Clears status information
**-------------------------------------------------------------------------------------*/
void                    /*RET Nothing */
ZW_SPI0_rx_dma_init( XBYTE *pbAddress, /*IN pointer to base address of RX buffers */
                     BYTE bBufLength, /* IN buffer byte length */
                     BYTE bBitMask); /*IN the rx dma control bitmask */

/*===============================   ZW_SPI0_rx_dma_int_byte_count  ===============================
**  Sets interrupt rx byte count. A value of 0x00 means disabled
**
**   bByteCount: IN Interrupt is issued when this number of bytes has been DMA'ed from the SPI
**                  Disabled when set to 0x00
**    Side effects:
**-------------------------------------------------------------------------------------*/
void                    /*RET Nothing */
ZW_SPI0_rx_dma_int_byte_count(BYTE bByteCount); /*IN */

/*===============================   ZW_SPI0_rx_dma_status  ========================
**  If the SPI0 RX DMA process is ongoing this function returns the status of this ongoing
**  process. Returns the status of the latest SPI0 RX DMA process if the DMA has stopped.
**
**  Returned values:
**       SPI_RX_DMA_STATUS_EOR:     The DMA switched RX buffer because it has
**                                  recieved an End of Record char
**       SPI_RX_DMA_STATUS_LOD:     DMA can not keep up with the speed of the incomming data
**       SPI_RX_DMA_STATUS_CURBUF1: Set when the SPI0 RX DMA currently is transferring data
**                                  to buffer 1. When cleared the SPI0 RX DMA currently is
**                                  transferring data to buffer 0
**       SPI_RX_DMA_STATUS_BUFFULL: Set when the SPI0 DMA has filled a buffer to the limit
**       SPI_RX_DMA_STATUS_RUNNING: The DMA is enabled
**
**  Parameters: None
**
**   Side effects:
**--------------------------------------------------------------------------*/
BYTE                    /*RET status */
ZW_SPI0_rx_dma_status(void); /*IN Nothing */

/*===============================   ZW_SPI0_rx_dma_bytes_transferred  ========================
**  Returns the number of bytes that has been transferred to SPI0 to XRAM for the ongoing DMA
**  process.
**
**  Parameters: None
**
**   Side effects:
**--------------------------------------------------------------------------*/
BYTE                    /*RET bytes transferred */
ZW_SPI0_rx_dma_bytes_transferred(void); /*IN Nothing */

/*===============================   ZW_SPI0_rx_dma_cancel  ========================
**  Cancels any ongoing DMA process and brings SPI RX DMA
**  to idle state
**
**  Parameters: None
**
**   Side effects:
**--------------------------------------------------------------------------*/
void                    /*RET nothing */
ZW_SPI0_rx_dma_cancel(void); /*IN Nothing */

/*===============================   ZW_SPI0_rx_dma_eor_set ====================
**  Sets SPI0 RX DMA End-Of-Record character
**
**  Parameters:
**    bEorChar: End Of Record character
**
**   Side effects:
**--------------------------------------------------------------------------*/
void                    /*RET nothing */
ZW_SPI0_rx_dma_eor_set(BYTE bEorChar);  /*IN EOR char */



/*===============================   ZW_SPI1_tx_dma_int_byte_count  ========================
**  Sets interrupt tx byte count. Only applicable when SPI1 Tx DMA is enabled.
**
**  Parameters
**
**   bByteCount: IN Interrupt is issued when this number of bytes has been DMA'ed to the SPI
**                    Disabled when set to 0x00
**   Side effects:
**--------------------------------------------------------------------------*/
void                    /*RET Nothing */
ZW_SPI1_tx_dma_int_byte_count( BYTE bByteCount);   /*IN Number of tx'ed bytes */

/*===============================   ZW_SPI1_tx_dma_inter_byte_delay  ========================
**  Sets Tx inter byte delay
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
ZW_SPI1_tx_dma_inter_byte_delay( BYTE bDelay);   /*IN inter byte delay */

/*===============================   ZW_SPI1_tx_dma_data  ========================
**  Sets buffer address and length and then start SPI1 DMA
**  Parameters
**
**   pbAddress:  IN pointer to Tx buffer in lower 4kB XRAM
**   bBufferLen: IN length of Tx buffer in bytes
**
**   Side effects:
**       Discards any ongoing SPI TX DMA process
**--------------------------------------------------------------------------*/
void                    /*RET Nothing */
ZW_SPI1_tx_dma_data( XBYTE *pbAddress,    /*IN buffer base address */
                     BYTE bBufferLen); /*IN buffer len */

/*===============================   ZW_SPI1_tx_dma_status  ========================
**  If the SPI1 DMA process is ongoing this function Returns the status of this ongoing
**  process. Returns the status of the latest SPI1 DMA process if the DMA has stopped.
**
**  Returned values:
**       SPI_TX_DMA_STATUS_SLOW_XRAM: DMA can not keep up with configured inter byte
**                                     process because of congestion in XRAM access
**       SPI_TX_DMA_STATUS_RUNNING:   The DMA is transferring data to SPI1
**
**  Parameters: None
**
**   Side effects:
**--------------------------------------------------------------------------*/
BYTE                    /*RET status */
ZW_SPI1_tx_dma_status(void); /*IN Nothing */

/*===============================   ZW_SPI1_tx_dma_bytes_transferred  ========================
**  Returns the number of bytes that has been transferred to SPI1 from XRAM for the ongoing DMA
**  process. If no transfer is ongoing the number of bytes that has been transferred to SPI1
**  from XRAM from the latest process is returned.
**
**  Parameters: None
**
**   Side effects:
**--------------------------------------------------------------------------*/
BYTE                    /*RET bytes transferred */
ZW_SPI1_tx_dma_bytes_transferred(void); /*IN Nothing */

/*===============================   ZW_SPI1_tx_dma_cancel  ========================
**  Cancels any ongoing DMA process and brings SPI TX DMA to idle state
**
**  Parameters: None
**
**   Side effects:
**--------------------------------------------------------------------------*/
void                    /*RET nothing */
ZW_SPI1_tx_dma_cancel(void); /*IN Nothing */

/*===============================   ZW_SPI1_rx_dma_init  ===============================
**  Initializes the buffers and setup for the SPI1 Rx DMA
**
**  Parameters
**     pbAddress:  IN pointer to the base address of the two Rx buffers
**     bBufLength: IN length of SPI1 RX Buffer - must be greater than 0
**     bBitMask:   IN bit mask contains the setting of the Rx DMA
**                      SPI_RX_DMA_LOD_INT_EN    Enable Loss Of Data interrupt
**                      SPI_RX_DMA_SWITCH_COUNT  Switch buffer when byte count is reached
**                      SPI_RX_DMA_SWITCH_FULL   Switch buffer when buffer full
**                      SPI_RX_DMA_SWITCH_EOR    Switch buffer when End-Of_Record char has
**                                               been received
**
**    Side effects:
**       Discards any ongoing SPI RX DMA process
**       Clears status information
**-------------------------------------------------------------------------------------*/
void                    /*RET Nothing */
ZW_SPI1_rx_dma_init( XBYTE *pbAddress, /*IN pointer to base address of RX buffers */
                     BYTE bBufLength, /* IN buffer byte length */
                     BYTE bBitMask); /*IN the rx dma control bitmask */

/*===============================   ZW_SPI1_rx_dma_int_byte_count  ===============================
**  Sets interrupt rx byte count. A value of 0x00 means disabled
**
**   bByteCount: IN Interrupt is issued when this number of bytes has been DMA'ed from the SPI
**                  Disabled when set to 0x00
**    Side effects:
**-------------------------------------------------------------------------------------*/
void                    /*RET Nothing */
ZW_SPI1_rx_dma_int_byte_count(BYTE bByteCount); /*IN */

/*===============================   ZW_SPI1_rx_dma_status  ========================
**  If the SPI1 RX DMA process is ongoing this function returns the status of this ongoing
**  process. Returns the status of the latest SPI1 RX DMA process if the DMA has stopped.
**
**  Returned values:
**       SPI_RX_DMA_STATUS_EOR:     The DMA switched RX buffer because it has
**                                  recieved an End of Record char
**       SPI_RX_DMA_STATUS_LOD:     DMA can not keep up with the speed of the incomming data
**       SPI_RX_DMA_STATUS_CURBUF1: Set when the SPI1 RX DMA currently is transferring data
**                                  to buffer 1. When cleared the SPI1 RX DMA currently is
**                                  transferring data to buffer 0
**       SPI_RX_DMA_STATUS_BUFFULL: Set when the SPI1 DMA has filled a buffer to the limit
**       SPI_RX_DMA_STATUS_RUNNING: The DMA is enabled
**
**  Parameters: None
**
**   Side effects:
**--------------------------------------------------------------------------*/
BYTE                    /*RET status */
ZW_SPI1_rx_dma_status(void); /*IN Nothing */

/*===============================   ZW_SPI1_rx_dma_bytes_transferred  ========================
**  Returns the number of bytes that has been transferred to SPI1 to XRAM for the ongoing DMA
**  process.
**
**  Parameters: None
**
**   Side effects:
**--------------------------------------------------------------------------*/
BYTE                    /*RET bytes transferred */
ZW_SPI1_rx_dma_bytes_transferred(void); /*IN Nothing */

/*===============================   ZW_SPI1_rx_dma_cancel  ========================
**  Cancels any ongoing DMA process and brings SPI RX DMA
**  to idle state
**
**  Parameters: None
**
**   Side effects:
**--------------------------------------------------------------------------*/
void                    /*RET nothing */
ZW_SPI1_rx_dma_cancel(void); /*IN Nothing */


/*===============================   ZW_SPI1_rx_dma_eor_set ====================
**  Sets SPI1 RX DMA End-Of-Record character
**
**  Parameters:
**    bEorChar: End Of Record character
**
**   Side effects:
**--------------------------------------------------------------------------*/
void                    /*RET nothing */
ZW_SPI1_rx_dma_eor_set(BYTE bEorChar);  /*IN EOR char */

#endif /* _ZW_SPI_API_H_ */
