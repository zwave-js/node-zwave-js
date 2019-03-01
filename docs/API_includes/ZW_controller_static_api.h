/***************************  ZW_CONTROLLER_STATIC_API.H  *******************
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
 * Description: Z-Wave Static Controller node application interface
 *
 * Author:   Johann Sigfredsson
 *
 * Last Changed By:  $Author: sse $
 * Revision:         $Revision: 28973 $
 * Last Changed:     $Date: 2014-06-03 15:14:50 +0200 (ti, 03 jun 2014) $
 *
 ****************************************************************************/
#ifndef _ZW_CONTROLLER_STATIC_API_H_
#define _ZW_CONTROLLER_STATIC_API_H_

#ifndef ZW_CONTROLLER_STATIC
#define ZW_CONTROLLER_STATIC
#endif

/****************************************************************************/
/*                              INCLUDE FILES                               */
/****************************************************************************/
/*These are a part of the standard static controller API*/
#include <ZW_controller_api.h>
/****************************************************************************/
/*                     EXPORTED TYPES and DEFINITIONS                       */
/****************************************************************************/
/****************************************************************************
* Functionality specific for the Static Controller API.
****************************************************************************/

/*========================   ZW_CreateNewPrimaryCtrl   ======================
**
**    Create a new primary controller
**
**    The modes are:
**
**    CREATE_PRIMARY_START          Start the creation of a new primary
**    CREATE_PRIMARY_STOP           Stop the creation of a new primary
**    CREATE_PRIMARY_STOP_FAILED    Report that the replication failed
**
**    ADD_NODE_OPTION_NORMAL_POWER    Set this flag in bMode for High Power inclusion.
**
**    Side effects:
**
**--------------------------------------------------------------------------*/
#define ZW_CREATE_NEW_PRIMARY_CTRL(MODE, FUNC) ZW_CreateNewPrimaryCtrl(MODE, FUNC)


/*==========================   ZW_SetPriorityRoute   =========================
**    Function description
**      Returns TRUE if specified pPriorityRoute has been saved for bNodeID.
**      Returns FALSE if specified bNodeID is NOT valid and no PriorityRoute
**      has been saved for bNodeID.
**      pPriorityRoute MUST point to a ROUTECACHE_LINE_SIZE (5) byte sized
**      byte array containing the wanted route. The first 4 bytes (index 0-3)
**      contains the repeaters active in the route and last (index 4) byte
**      contains the speed information.
**      First ZERO in repeaters (index 0-3) indicates no more repeaters in route.
**      A direct route is indicated by the first repeater (index 0) being ZERO.
**
**      Example: {0,0,0,0,ZW_PRIORITY_ROUTE_SPEED_100K} ->
**                  Direct 100K Priority route
**               {2,3,0,0,ZW_PRIORITY_ROUTE_SPEED_40K}  ->
**                  40K Priority route through repeaters 2 and 3
**               {2,3,4,0,ZW_PRIORITY_ROUTE_SPEED_9600} ->
**                  9600 Priority route through repeaters 2, 3 and 4
**
**    Side effects:
**
**--------------------------------------------------------------------------*/
#define ZW_SET_PRIORITY_ROUTE(bNodeID, pPriorityRoute) ZW_SetPriorityRoute(bNodeID, pPriorityRoute)


/* OBSOLETE */
#define ZW_SetLastWorkingRoute(bNodeID, pLastWorkingRoute) ZW_SetPriorityRoute(bNodeID, pLastWorkingRoute)
#define ZW_SET_LAST_WORKING_ROUTE(bNodeID, pLastWorkingRoute) ZW_SetPriorityRoute(bNodeID, pLastWorkingRoute)


/****************************************************************************/
/*                              EXPORTED DATA                               */
/****************************************************************************/


/****************************************************************************/
/*                           EXPORTED FUNCTIONS                             */
/*                 Implemented within the application moduls                */
/****************************************************************************/

/****************************************************************************/
/*                           EXPORTED FUNCTIONS                             */
/*                 Implemented within the Z-Wave controller modules         */
/****************************************************************************/

/*========================   ZW_CreateNewPrimaryCtrl   ======================
**
**    Create a new primary controller
**
**    The modes are:
**
**    CREATE_PRIMARY_START          Start the creation of a new primary
**    CREATE_PRIMARY_STOP           Stop the creation of a new primary
**    CREATE_PRIMARY_STOP_FAILED    Report that the replication failed
**
**    ADD_NODE_OPTION_NORMAL_POWER    Set this flag in bMode for High Power inclusion.
**
**    Side effects:
**
**--------------------------------------------------------------------------*/
void
ZW_CreateNewPrimaryCtrl(BYTE bMode,
                        VOID_CALLBACKFUNC(completedFunc)(LEARN_INFO*));


/*==========================   ZW_SetPriorityRoute   =========================
**    Function description
**      Returns TRUE if specified pPriorityRoute hasbeen saved for bNodeID.
**      Returns FALSE if specified bNodeID is NOT validand no PriorityRoute
**      has been saved for bNodeID.
**      pPriorityRoute MUST point to a ROUTECACHE_LINE_SIZE (5) byte sized
**      byte array containing the wanted route. The first 4 bytes (index 0-3)
**      contains the repeaters active in the route and last (index 4) byte
**      contains the speed information.
**      First ZERO in repeaters (index 0-3) indicates no more repeaters in route.
**      A direct route is indicated by the first repeater (index 0) being ZERO.
**
**      Example: {0,0,0,0,ZW_PRIORITY_ROUTE_SPEED_100K}->
**                  Direct 100K Priority route
**               {2,3,0,0,ZW_PRIORITY_ROUTE_SPEED_40K}  ->
**                  40K Priority route through repeaters 2 and 3
**               {2,3,4,0,ZW_PRIORITY_ROUTE_SPEED_9600} ->
**                  9600 Priority route through repeaters 2, 3 and 4
**
**    Side effects:
**
**--------------------------------------------------------------------------*/
BOOL
ZW_SetPriorityRoute( BYTE bNodeID, XBYTE *pPriorityRoute);


#endif /* _ZW_CONTROLLER_STATIC_API_H_ */

