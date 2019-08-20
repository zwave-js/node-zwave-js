/********************************  ZW_RF050X.H  *****************************
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
 * Description: Application flash ROM RF table offset for ZW050x
 *
 * Author:   Samer Seoud
 *
 * Last Changed By:  $Author: sse $
 * Revision:         $Revision: 10862 $
 * Last Changed:     $Date: 2008-08-04 16:27:12 +0200 (Mon, 04 Aug 2008) $
 *
 ****************************************************************************/
#ifndef _ZW_RF050X_H_
#define _ZW_RF050X_H_

/****************************************************************************/
/*                              INCLUDE FILES                               */
/****************************************************************************/


/****************************************************************************/
/*                     EXPORTED TYPES and DEFINITIONS                       */
/****************************************************************************/


#define RF_MAGIC_VALUE          0x42

typedef struct _FLASH_APPL_TABLE_
{
  unsigned char dummy1;
  unsigned char dummy2;
  /* Normal power setting offset */
  unsigned char FLASH_APPL_NORM_POWER_OFFS_0;
  unsigned char FLASH_APPL_NORM_POWER_OFFS_1;
  unsigned char FLASH_APPL_NORM_POWER_OFFS_2;
  /* Low power setting offset */
  unsigned char FLASH_APPL_LOW_POWER_OFFS_0;
  unsigned char FLASH_APPL_LOW_POWER_OFFS_1;
  unsigned char FLASH_APPL_LOW_POWER_OFFS_2;
} tsFlashApplTable;


/* Valid values for FLASH_FREQ */
typedef enum _RF_ID_ENUM_
{
  RF_EU = 0,          /* EU frequency (868.42MHz) */
  RF_US = 1,          /* US frequency (908.42MHz) */
  RF_ANZ = 2,         /* Australia/Newzealand frequency (921.42MHz) */
  RF_HK = 3,          /* hongkong frequency (919.82MHz) */
  RF_TF_866 = 4,      /* test frequency (866.xxMHz) */
  RF_TF_870 = 5,      /* test frequency (870.xxMHz) */
  RF_TF_906 = 6,      /* test frequency (906.xxMHz) */
  RF_TF_910 = 7,      /* test frequency (910.xxMHz) */
  RF_MY = 8,          /* Maylasyia frequency (868.2MHz) */
  RF_IN = 9,          /* Indian frequency (865.22MHz) */
  RF_JP = 10,         /* Japan frequency (920.1MHz) */
  RF_TF_878 = 11,     /* test frequency (878.xxMHz) */
  RF_TF_882 = 12,     /* test frequency (882.xxMHz) */
  RF_TF_886 = 13,     /* test frequency (886.xxMHz) */
  RF_TF_932_3CH = 14, /* test frequency (932.xxMHz) */
  RF_TF_940_3CH = 15, /* test frequency (940.xxMHz) */
  RF_TF_840_3CH = 16, /* test frequency (840.xxMHz) */
  RF_TF_850_3CH = 17, /* test frequency (850.xxMHz) */
  RF_JP_32MHZ = 18,   /* Japan frequency (xxx.xxMHz) */
  RF_TF_836_3CH = 19, /* test frequency (836.xxMHz) */
  RF_TF_841_3CH = 20, /* test frequency (841.xxMHz) */
  RF_TF_851_3CH = 21, /* test frequency (851.xxMHz) */
  RF_TF_933_3CH = 22, /* test frequency (933.xxMHz) */
  RF_TF_941_3CH = 23, /* test frequency (941.xxMHz) */
  RF_TF_835_3CH = 24, /* test frequency (835.xxMHz) */
  RF_JP_950 = 25,     /* Japan frequency (951.1MHz) */
  RF_RU = 26,         /* Russia Frequency */
  RF_IL = 27,         /* Israelian frequency (916.0xMHz) */
  RF_KR = 28,         /* Korean Republic frequency (919.7xMHz) */
  RF_CN = 29,         /* Chinese (PRC) frequency (868.40MHz) */
  RF_ID_MAX
} eRF_ID;

extern tsFlashApplTable code sFlashApplTable;

/* Use default defined in Z-WAVE lib */
#define APP_DEFAULT_NORM_POWER  0xFF
/* Use default defined in Z-WAVE lib */
#define APP_DEFAULT_LOW_POWER   0xFF
/* Application RF const table offsets */

#endif
