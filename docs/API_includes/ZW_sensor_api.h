/*******************************  ZW_SENSOR_API.H  *******************************
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
 * Description: Z-Wave Sensor net node API functions
 *
 * Author:   Peter Shorty
 *
 * Last Changed By:  $Author: efh $
 * Revision:         $Revision: 8692 $
 * Last Changed:     $Date: 2007-02-16 10:32:24 +0100 (fr, 16 feb 2007) $
 *
 ****************************************************************************/
#ifndef _ZW_SENSOR_API_H_
#define _ZW_SENSOR_API_H_

#ifndef ZW_SLAVE_SENSOR
#define ZW_SLAVE_SENSOR
#endif

/****************************************************************************/
/*                              INCLUDE FILES                               */
/****************************************************************************/
#include <ZW_basis_api.h>
#include <ZW_slave_routing_api.h>

/****************************************************************************/
/*                     EXPORTED TYPES and DEFINITIONS                       */
/****************************************************************************/
#define BIND_MODE_MASTER        1 /* Only accept being a master */
#define BIND_MODE_BIND_SLAVE    2 /* Only accept beeing a slave */
#define BIND_MODE_BIND_ANY      3 /* Bitmask of MASTER and Slave */
#define BIND_MODE_UNBIND_SLAVE  4 /* Unbind slave from sensor net */
#define BIND_MODE_OFF           0

/* Callback values from ZW_SensorBNetBind callback function */
#define BIND_COMPLETE_SLAVE_OK        1
#define BIND_COMPLETE_MASTER_OK       2
#define BIND_COMPLETE_FAILED          3

/*============================= ZW_ZensorNetBind =========================
**    Start bind mode on the Zensor node
**
**  Side effects:
**
**--------------------------------------------------------------------------*/
BOOL ZW_ZensorNetBind(BYTE bMode, VOID_CALLBACKFUNC(completedFunc)(BYTE, BYTE));

/*============================= ZW_ZensorFloodData =========================
**    Send out a flooded zensor frmae
**
**  Side effects:
**
**--------------------------------------------------------------------------*/
BYTE ZW_ZensorSendDataFlood(
  BYTE  bNodeID,               /*IN  Destination node ID (0xFF == broadcast) */
  BYTE *pData,                /*IN  Data buffer pointer           */
  BYTE  dataLength,           /*IN  Data buffer length            */
  BYTE  txOptions,            /*IN  Transmit option flags         */
  VOID_CALLBACKFUNC(completedFunc)(BYTE)); /*IN  Transmit completed call back function  */

/*============================= ZW_ZensorNetBind =========================
**    Start bind mode on the Zensor node
**
**  Side effects:
**
**--------------------------------------------------------------------------*/
void ZW_ZensorSetDefault();

/*=============================== ZW_ZensorGetID ===========================
**    Returns the zensor ID of the node
**
**  Side effects:
**
**--------------------------------------------------------------------------*/
BYTE ZW_ZensorGetID();

#endif /* _ZW_SENSOR_API_H_ */
