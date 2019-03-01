/****************************************************************************
 *
 * Copyright (c) 2001-2014
 * Sigma Designs, Inc.
 * All Rights Reserved
 *
 *---------------------------------------------------------------------------
 *
 * Description: Declaration of external NVM application interface.
 *
 * Last Changed By:  $Author: jsi $
 * Revision:         $Revision: 22797 $
 * Last Changed:     $Date: 2012-05-10 15:55:06 +0200 (to, 10 maj 2012) $
 *
 ****************************************************************************/
#ifndef _ZW_NVM_EXT_API_H_
#define _ZW_NVM_EXT_API_H_

/****************************************************************************/
/*                              INCLUDE FILES                               */
/****************************************************************************/


/****************************************************************************/
/*                              EXPORTED DATA                               */
/****************************************************************************/


/****************************************************************************/
/*                     EXPORTED TYPES and DEFINITIONS                       */
/****************************************************************************/


/* ------------------------------------------------------------------------ */
/* NVM NVR specific definitions - MUST be set in NVR                        */
/* ------------------------------------------------------------------------ */

/* ------------------------------------------------------------------------ */
/* NVR field NVMT - NVM type - used by this SPI NVM driver for selecting    */
/* the correct number of address bytes                                      */

/* Current supported NVR NVMT settings */

/* ------------------------------------------------------------------------ */
/* NVR field NVMS - NVM size - used to set the correct Memorycapacity       */

/* Current supported NVR NVMS settings */

/* ------------------------------------------------------------------------ */
/* NVR field NVMP - NVM page size - used to control the NVM buffer boundary */

/* Current supported NVR NVMP settings */

/* ------------------------------------------------------------------------ */
/* NVR field NVMCS - NVM Chip Select used to control which pin is used for  */
/* chip select of the external SPI NVM                                      */

/* Current supported NVR NVMCS settings */
/*    NVMCS = 0x04  - PORT0.4           */
/*    NVMCS = 0x14  - PORT1.4           */
/*    NVMCS = 0x15  - PORT1.5           */
/*    NVMCS = 0x25  - PORT2.5           */
/*    NVMCS = 0x30  - PORT3.0           */
/*    NVMCS = 0x34  - PORT3.4           */
/*    NVMCS = 0x36  - PORT3.6           */
/*    NVMCS = 0x37  - PORT3.7           */

/* ------------------------------------------------------------------------ */
/* NVM Definitions                                                          */
/* ------------------------------------------------------------------------ */

typedef struct _NVM_TYPE_T_
{
  BYTE manufacturerID;
  BYTE memoryType;
  BYTE memoryCapacity;
} NVM_TYPE_T;


/* --------------------- List of recognized NVM chips -------------------------------------------------------------- */
/*                              manufacturerID  memoryType      memoryCapacity   NVMT     NVMS    NVMP   Adressbytes */
/* at25128a                     0xFF            0xFF            0xFF             0x01    0x0010  0x0040     0x02     */
/* M25PE10VP (SGS Thomson)      0x20            0x80            0x11             0x02    0x0080  0x0100     0x03     */
/* M25PE10VP (Micron)           0x20            0x80            0x11             0x02    0x0080  0x0100     0x03     */
/* M25PE20VP (Micron)           0x20            0x80            0x12             0x02    0x0100  0x0100     0x03     */
/* M25PE40VP (?)                0x20            0x80            0x13?            0x02    0x0200  0x0100     0x03     */
/* 25PE80VP  (STMicro)          0x20            0x80            0x14             0x02    0x0400  0x0100     0x03     */
/* 25PE16VP  (STMicro)          0x20            0x80            0x15             0x02    0x0800  0x0100     0x03     */
/* S25CM01A  (SeikoInstruments) 0xFF            0xFF            0xFF             0x03    0x0080  0x0100     0x03     */
/* CAT25M01  (ON Semiconductor) 0xFF            0xFF            0xFF             0x03    0x0080  0x0100     0x03     */

 typedef enum
{
  NVM_MANUFACTURER          = 0x20,
  NVM_MANUFACTURER_UNKNOWN  = 0xFF
} ENVM_MANUFACTURER_T;


/*  memoryType    NVM type */
/*     0xFF        EEPROM  */
/*     0x80        FLASH   */
typedef enum
{
  NVM_TYPE_FLASH        = 0x80,  /* NVM is a FLASH */
  NVM_TYPE_DATA_FLASH   = 0x81,  /* NVM is a DATAFLASH */
  NVM_TYPE_EEPROM       = 0xFF   /* NVM is probably an EEPROM */
} ENVM_TYPE_T;


/* memoryCapacity       NVM size   */
/*     0x0A          128kbit(16kB) */
/*     0x10          256kbit(32kB) */
/*     0x11          1mbit(128kB)  */
/*     0x12          2mbit(256kB)  */
/*     0x13          4mbit(512kB)  */
/*     0x14          8mbit(1MB)    */
/*     0x15          16mbit(2MB)   */
/*     0x16          32mbit(4MB)   */
/*     0x17          64mbit(8MB)   */
typedef enum
{
  NVM_SIZE_16KB    = 0x0E,  /* NVM is a known type and the size of 16KByte */
  NVM_SIZE_32KB    = 0x0F,  /* NVM is a known type and the size of 32KByte */
  NVM_SIZE_64KB    = 0x10,  /* NVM is a known type and the size of 32KByte */
  NVM_SIZE_128KB   = 0x11,  /* NVM is a known type and the size of 128KByte */
  NVM_SIZE_256KB   = 0x12,  /* NVM is a known type and the size of 256KByte */
  NVM_SIZE_512KB   = 0x13,  /* NVM is a known type and the size of 512KByte */
  NVM_SIZE_1MB     = 0x14,  /* NVM is a known type and the size of 1MByte */
  NVM_SIZE_2MB     = 0x15,  /* NVM is a known type and the size of 2MByte */
  NVM_SIZE_4MB     = 0x16,  /* NVM is a known type and the size of 4MByte */
  NVM_SIZE_8MB     = 0x17,  /* NVM is a known type and the size of 8MByte */
  NVM_SIZE_16MB    = 0x18,  /* NVM is a known type and the size of 16MByte */
  NVM_SIZE_UNKNOWN = 0xFF   /* NVM is a type unknown and size could not be determined */
} ENVM_CAPACITY_T;


/****************************************************************************/
/*                           EXPORTED FUNCTIONS                             */
/****************************************************************************/

/*===============================   NVM_get_id   =============================
**  Get the NVM ID
**
**  Returns the NVM ID info in NVM_TYPE structure specified
**
**--------------------------------------------------------------------------*/
void
NVM_get_id(
  NVM_TYPE_T *pNVM_type);


/*=======================   NVM_ext_read_long_byte   =========================
**    Read one byte from the External NVM
**
**--------------------------------------------------------------------------*/
BYTE            /*RET External EEPROM data */
NVM_ext_read_long_byte(
  DWORD offset);   /*IN offset in the External NVM */


/*========================   NVM_ext_read_long_buffer   ======================
**    Read an array of bytes from the External NVM to data buffer
**
**--------------------------------------------------------------------------*/
void            /*RET Nothing */
NVM_ext_read_long_buffer(
  DWORD offset,   /*IN offset in the External NVM */
  BYTE *buf,      /*IN destination buffer pointer */
  WORD length);   /*IN number of bytes to read */


/*=========================   NVM_ext_write_long_byte   ======================
**    Write one byte to the External EEPROM
**
**--------------------------------------------------------------------------*/
BOOL           /*RET FALSE if value is identical to value in EEPROM else TRUE*/
NVM_ext_write_long_byte(
  DWORD offset,  /*IN offset in the External NVM */
  BYTE bData);   /*IN data to write */


/*======================   NVM_ext_write_long_buffer   =======================
**    Write an array of up to 64kbytes to the External EEPROM
**
**--------------------------------------------------------------------------*/
BOOL              /*RET false if buffer is identical to buffer in EEPROM */
NVM_ext_write_long_buffer(
  DWORD offset,   /*IN offset in the External NVM */
  BYTE *buf,      /*IN source buffer pointer */
  WORD length);   /*IN number of bytes to write */


#endif /* _ZW_NVM_EXT_API_H_ */

