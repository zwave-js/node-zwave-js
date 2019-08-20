/***************************************************************************
*
* Copyright (c) 2001-2012
* Sigma Designs, Inc.
* All Rights Reserved
*
*---------------------------------------------------------------------------
*
* Description: Interface driver for the 400 and 500 Series Z-Wave Single Chips
*              built-in IR controller
*
* Author:      Morten Vested Olesen 
*
* Last Changed By:  $Author: jdo $
* Revision:         $Revision: 1.38 $
* Last Changed:     $Date: 2005/07/27 15:12:54 $
*
****************************************************************************/
#ifndef _ZW_INFRARED_API_H_
#define _ZW_INFRARED_API_H_

/***************************************************************************/
/*                              INCLUDE FILES                              */
/***************************************************************************/
#include <ZW_basis_api.h>
#include <ZW_pindefs.h>

/***************************************************************************/
/*                      PRIVATE TYPES and DEFINITIONS                      */
/***************************************************************************/
#define IRSTAT_RXBUFOVERFLOW       0x20
#define IRSTAT_MSOVERFLOW          0x10
#define IRSTAT_COF                 0x08
#define IRSTAT_CDONE               0x04
#define IRSTAT_MSSTARV             0x02
#define IRSTAT_ACTIVE              0x01

#define IR_IDLE                   0x00
#define IR_TX_TRANSMITTING        0x01
#define IR_LEARN_DETECT_CARRIER_1 0x02
#define IR_LEARN_DETECT_CARRIER_2 0x03
#define IR_RX_CAPTURE_MS          0x04
#define IR_RX_WAIT_FOR_RX_IDLE    0x05
#define IR_LEARN_CARRIER_OVERFLOW 0x06

/***************************************************************************/
/*                              EXPORTED DATA                              */
/***************************************************************************/
extern BOOL ir_tx_flag;
extern BOOL ir_rx_flag;
extern BYTE ir_state;

/***************************************************************************/
/*                           EXPORTED FUNCTIONS                            */
/***************************************************************************/


/*=========================   ZW_IR_tx_init     ============================
**    Initialize Infrared transmitter
**
**    Side effects:
**      Disables Infrared controller
**--------------------------------------------------------------------------*/
void
ZW_IR_tx_init(BYTE boMSTimer,         /* IN TRUE:  MS generator runs on carrier period count
                                       *    FALSE: MS generator runs on timer value */
              BYTE bMSPrescaler,      /* IN Mark Space generator prescaler
                                       *    Valid values: 0-7
                                       *    Not appliable when boMSTimer is true
                                       *    Resulting timer clock frequency:
                                       *               0:   32MHz
                                       *               1:   16MHz
                                       *               2:    8MHz
                                       *               3:    4MHz
                                       *               4:    2MHz
                                       *               5:    1MHz
                                       *               6:  500kHz
                                       *               7:  250kHz  */
              BYTE boInvertOutput,    /* IN TRUE:  output is inverted
                                       *    FALSE: output is not inverted */
              BYTE boHighDrive,       /* IN TRUE:  use 12mA drive strength of IR Tx IO
                                       *           output buffers
                                       *    FALSE: use 8mA drive strength of IR Tx IO
                                       *           output buffers */
              BYTE boIdleState,       /* IN TRUE:  Idle state is high
                                       *    FALSE: Idle state is low */
              BYTE bOutputEnable,     /* IN Outputs enabled.
                                       *    Valid values: 0-7
                                       *               000: All outputs disabled
                                       *               xx1: P3.4 enabled
                                       *               x1x: P3.5 enabled
                                       *               1xx: P3.6 enabled */
              BYTE bCarrierPrescaler, /* IN Carrier generator prescaler
                                       *    Valid values: 0-3
                                       *    Resulting timer clock frequency:
                                       *               0:   32MHz
                                       *               1:   32MHz/2
                                       *               2:   32MHz/3
                                       *                    :
                                       *               7:   32MHz/8  */
              BYTE bCarrierLow,       /* IN Carrier low width
                                       *               0:   1 prescaled clock period
                                       *               1:   2 prescaled clock periods
                                       *                         :
                                       *             255: 256 prescaled clock periods        */
              BYTE bCarrierHigh       /* IN Carrier High width
                                       *               0:   1 prescaled clock period
                                       *               1:   2 prescaled clock periods
                                       *                         :
                                       *             255: 256 prescaled clock periods        */
          );


/*=========================   ZW_IR_tx_data     ============================
**    Transmits Tx data
**
**    Side effects:
**      Clears tx interrupt flag (ir_tx_flag)
**--------------------------------------------------------------------------*/
void
ZW_IR_tx_data(WORD pBufferAddress, /* IN Address of Tx buffer in lower XRAM memory */
              WORD wBufferLength   /* IN Number of bytes in TX buffer. valid values (1-511) */
              );

  /*=========================   ZW_IR_tx_status_get    ============================
**    Returns IR Tx status as a bit mask:
**       IRSTAT_MSSTARV : Data was not transmitted in time due to slow XRAM access
**       IRSTAT_MSOVERFLOW: Data format error
**       IRSTAT_ACTIVE: IR controller is active
**
**    Side effects:
**--------------------------------------------------------------------------*/
BYTE
ZW_IR_tx_status_get(void);

/*=========================   ZW_IR_learn_init     ============================
**    Initialize Infrared receiver for learn mode
**
**    Side effects:
**      Disables Infrared controller
**--------------------------------------------------------------------------*/
void
ZW_IR_learn_init(WORD pBufferAddress, /* IN Address of Rx buffer in lower XRAM memory */
                 WORD wBufferLength,  /* IN Size of RX buffer in bytes.
                                       *    Valid values: 1-511 */
                 BYTE bMSPrescaler,   /* IN Mark Space generator prescaler
                                       *    Valid values 0-7
                                       *    Resulting timer clock frequency:
                                       *                       0:   32MHz
                                       *                       1:   16MHz
                                       *                       2:    8MHz
                                       *                       3:    4MHz
                                       *                       4:    2MHz
                                       *                       5:    1MHz
                                       *                       6:  500kHz
                                       *                       7:  250kHz  */
                 BYTE bTrailSpace,    /* IN Trailing space after last Mark.
                                       *    After the incoming IR signal has been
                                       *    low for this period of time the IR receiver
                                       *    stops.
                                       *    Valid values: 0-7
                                       *                       0:   2^9 prescaled clock periods
                                       *                       1:   2^10 prescaled clock periods
                                       *                       2:   2^11 prescaled clock periods
                                       *                       3:   2^12 prescaled clock periods
                                       *                       4:   2^13 prescaled clock periods
                                       *                       5:   2^14 prescaled clock periods
                                       *                       6:   2^15 prescaled clock periods
                                       *                       7:   2^16 prescaled clock periods */
                 BYTE bCAverager,     /* IN Average Carrier high/low detection over
                                       *    multiple carrier periods.
                                       *    Valid values: 0-3
                                       *                       0: 1 carrier period
                                       *                       1: 2 carrier periods
                                       *                       2: 4 carrier periods
                                       *                       3: 8 carrier periods */
                 BYTE bCGlitchRemover,/* IN Remove glitches from incoming IR signal
                                       *    Valid values: 0-3
                                       *                       0: disabled
                                       *                       1: Removes glitches < 125ns
                                       *                       2: Removes glitches < 250ns
                                       *                       3: Removes glitches < 500ns */
                 BYTE boInvertInput   /* IN TRUE:  IR input is inverted
                                       *    FALSE: IR input is not inverted */
                 );

/*=========================   ZW_IR_learn_data     ============================
**    Start the Infrared Controller in RX learn mode
**
**    Side effects:
**      Clears rx interrupt flag (ir_rx_flag)
**--------------------------------------------------------------------------*/
void
ZW_IR_learn_data(void);


  /*=========================   ZW_IR_learn_status_get    ============================
**    Returns Rx/learn status information
**
**    Side effects:
**--------------------------------------------------------------------------*/
void
ZW_IR_learn_status_get(WORD *wDataLength,      /* OUT The number of bytes that
                                                *     has been used to store
                                                *     the received data in the Rx
                                                *     Buffer */
                       BYTE *bCarrierPrescaler,/* OUT Carrier generator prescaler
                                                *     Valid values: 0-3
                                                *     Resulting timer clock frequency:
                                                *                0:   32MHz
                                                *                1:   32MHz/2
                                                *                2:   32MHz/3
                                                *                     :
                                                *                7:   32MHz/8  */
                       BYTE *bCarrierLow,      /* OUT Carrier low width
                                                *                0:   1 prescaled clock period
                                                *                1:   2 prescaled clock periods
                                                *                          :
                                                *              255: 256 prescaled clock periods        */
                       BYTE *bCarrierHigh,     /* OUT Carrier High width
                                                *                0:   1 prescaled clock period
                                                *                1:   2 prescaled clock periods
                                                *                          :
                                                *              255: 256 prescaled clock periods        */
                       BYTE *bStatus           /* OUT Rx status (bitmask)
                                                *           IRSTAT_MSOVERFLOW:
                                                *             A mark/space width could not be
                                                *             stored within 16 bit
                                                *             ( Change the MSPrescaler value)
                                                *           IRSTAT_RXBUFOVERFLOW:
                                                *             RX buffer overflow
                                                *           IRSTAT_MSSTARV :
                                                *             Data was lost due to slow
                                                *             XRAM access
                                                *           IRSTAT_COF:
                                                *             Carrier high/low width overflow
                                                *           IRSTAT_CDONE:
                                                *             Carrier has been detected
                                                *           IRSTAT_ACTIVE:
                                                *             IR learn active        */
                       );


/*=========================   ZW_IR_status_clear    ============================
**    Clears Infrared Controller status register
**
**    Side effects:
**--------------------------------------------------------------------------*/
void
ZW_IR_status_clear(void);

/*=========================   ZW_IR_data_compress    ============================
**    Compresses learned data to a data format where the Tx engine uses the
**    carrier generator as prescaler for the mark/sopace timing instead of
**    a fixed prescaler setting.
**
**    Side effects:
**--------------------------------------------------------------------------*/
BYTE                                         /* RET  0x00: compress operation passed
                                                     0x01: compress operation failed */
ZW_IR_data_compress(BYTE *InBuffer,          /* IN  Address pointer to input buffer */
                    WORD wInBufferLen,       /* IN  Size of input buffer            */
                    BYTE bMSPrescaler,       /* IN  Mark Space generator prescaler
                                              *     Valid values 0-7
                                              *     Resulting timer clock frequency:
                                              *                       0:   32MHz
                                              *                       1:   16MHz
                                              *                       2:    8MHz
                                              *                       3:    4MHz
                                              *                       4:    2MHz
                                              *                       5:    1MHz
                                              *                       6:  500kHz
                                              *                       7:  250kHz  */
                    BYTE bRxCarrierHigh,     /* IN  Carrier High width
                                              *                0:   1 prescaled clock period
                                              *                1:   2 prescaled clock periods
                                              *                          :
                                              *              255: 256 prescaled clock periods        */
                    BYTE bRxCarrierLow,      /* IN  Carrier low width
                                              *                0:   1 prescaled clock period
                                              *                1:   2 prescaled clock periods
                                              *                          :
                                              *              255: 256 prescaled clock periods        */
                    BYTE bCarrierPrescaler,  /* IN  Carrier generator prescaler
                                              *     Valid values: 0-3
                                              *     Resulting timer clock frequency:
                                              *                0:   32MHz
                                              *                1:   32MHz/2
                                              *                2:   32MHz/3
                                              *                     :
                                              *                7:   32MHz/8  */
                    BYTE *OutBuffer,         /* IN  Address pointer to output buffer              */
                    WORD *wOutBufferLen      /* OUT Number of data bytes in output buffer         */
                   );



/*=========================   ZW_IR_disable    ============================
**    Disables Infrared Controller
**
**    Side effects:
**--------------------------------------------------------------------------*/
void
ZW_IR_disable(void);


#endif /* _ZW_INFRARED_API_H_ */
