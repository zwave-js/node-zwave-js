/*******************************  ZW_PORTPIN_API.H  *************************
 *
 *          Z-Wave, the wireless lauguage.
 *
 *              Copyright (c) 2001-2011
 *              Sigma Designs, Inc.
 *
 *              All Rights Reserved
 *
 *    This source file is subject to the terms and conditions of the
 *    Sigma Designs Software License Agreement which restricts the manner
 *    in which it may be used.
 *
 *---------------------------------------------------------------------------
 *
 * Description: ZW050x Port Pin service functions module include
 *
 * Last Changed By:  $Author: jsi $
 * Revision:         $Revision: 18221 $
 * Last Changed:     $Date: 2010-07-12 14:28:35 +0200 (ma, 12 jul 2010) $
 *
 ****************************************************************************/
#ifndef _ZW_PORTPIN_API_H_
#define _ZW_PORTPIN_API_H_

/****************************************************************************/
/*                              INCLUDE FILES                               */
/****************************************************************************/

#include <ZW_typedefs.h>

/****************************************************************************/
/*                     EXPORTED TYPES and DEFINITIONS                       */
/****************************************************************************/


typedef enum
{
  PORTPIN_P0,
  PORTPIN_P1,
  PORTPIN_P2,
  PORTPIN_P3
} ENUM_PORT;

/* Chip-pin mapping*/
typedef enum
{
  PORTPIN_P0B0  = 0x80,
  PORTPIN_P0B1  = 0x81,
  PORTPIN_P0B2  = 0x82,
  PORTPIN_P0B3  = 0x83,
  PORTPIN_P0B4  = 0x84,
  PORTPIN_P0B5  = 0x85,
  PORTPIN_P0B6  = 0x86,
  PORTPIN_P0B7  = 0x87,

  PORTPIN_P1B0  = 0x90,
  PORTPIN_P1B1  = 0x91,
  PORTPIN_P1B2  = 0x92,
  PORTPIN_P1B3  = 0x93,
  PORTPIN_P1B4  = 0x94,
  PORTPIN_P1B5  = 0x95,
  PORTPIN_P1B6  = 0x96,
  PORTPIN_P1B7  = 0x97,

  PORTPIN_P2B0  = 0xA0,
  PORTPIN_P2B1  = 0xA1,
  PORTPIN_P2B2  = 0xA2,
  PORTPIN_P2B3  = 0xA3,
  PORTPIN_P2B4  = 0xA4,
  PORTPIN_P2B5  = 0xA5,
  PORTPIN_P2B6  = 0xA6,
  PORTPIN_P2B7  = 0xA7,

  PORTPIN_P3B0  = 0xB0,
  PORTPIN_P3B1  = 0xB1,
  PORTPIN_P3B2  = 0xB2,
  PORTPIN_P3B3  = 0xB3,
  PORTPIN_P3B4  = 0xB4,
  PORTPIN_P3B5  = 0xB5,
  PORTPIN_P3B6  = 0xB6,
  PORTPIN_P3B7  = 0xB7
} ENUM_PORTPINS;

typedef enum
{
  BUTTON_S1 = PORTPIN_P2B4,
  BUTTON_S2 = PORTPIN_P3B6,
  BUTTON_S3 = PORTPIN_P2B3,
  BUTTON_S4 = PORTPIN_P2B2,
  BUTTON_S5 = PORTPIN_P2B1,
  BUTTON_S6 = PORTPIN_P3B4
} ENUM_BUTTONS_ZDP03A;

typedef enum
{
  LED_D1 = PORTPIN_P0B7,
  LED_D2 = PORTPIN_P3B7,
  LED_D3 = PORTPIN_P1B0,
  LED_D4 = PORTPIN_P0B3,
  LED_D5 = PORTPIN_P1B4,
  LED_D6 = PORTPIN_P1B5,
  LED_D7 = PORTPIN_P1B6,
  LED_D8 = PORTPIN_P1B7
}ENUM_LEDS_ZDP03A;


typedef enum
{
  ID_PORT_PIN_SET = 0x01,
  ID_PORT_PIN_GET = 0x02,
  ID_PORT_GET     = 0x03,
  ID_PORT_PIN_IN  = 0x04,
  ID_PORT_PIN_OUT = 0x05
} PORT_PIN_EVENT;
/*==============================   ZW_PortPinSet   ===========================
** Function used to set Level on a specific Port pin using bPortPin
**
**    Side effects:
**
**--------------------------------------------------------------------------*/
void
ZW_PortPinSet(
  ENUM_PORTPINS bPortPin,
  BOOL bVal);


/*==============================   ZW_PortPinGet   ===========================
** Function used to get Level on a specific Port pin using bPortPin
**
**    Side effects:
**
**--------------------------------------------------------------------------*/
BOOL
ZW_PortPinGet(
  ENUM_PORTPINS bPortPin);

/*==============================   ZW_PortPinGetPort   ===========================
** Function used to get Level on a specific Port using port
**
**    Side effects:
**
**--------------------------------------------------------------------------*/
BYTE
ZW_PortGet(
  ENUM_PORT port);

/*===============================   ZW_PortPinIn   ===========================
**    Setup bPortPin portpin as Input
**
**--------------------------------------------------------------------------*/
void
ZW_PortPinIn(
  ENUM_PORTPINS bPortPin);


/*===============================   ZW_PortPinOut   ==========================
**    Setup bPortPin portpin as Output
**
**--------------------------------------------------------------------------*/
void
ZW_PortPinOut(
  ENUM_PORTPINS bPortPin);

#endif
