/****************************************************************************
 *
 * Copyright (c) 2001-2013
 * Sigma Designs, Inc.
 * All Rights Reserved
 *
 *---------------------------------------------------------------------------
 *
 * Description: Z-Wave Controller node application interface
 *
 * Author:   Ivar Jeppesen
 *
 * Last Changed By:  $Author: jsi $
 * Revision:         $Revision: 30974 $
 * Last Changed:     $Date: 2015-02-10 15:44:10 +0100 (ti, 10 feb 2015) $
 *
 ****************************************************************************/
#ifndef _ZW_CONTROLLER_API_H_
#define _ZW_CONTROLLER_API_H_

#ifndef ZW_CONTROLLER
#define ZW_CONTROLLER
#endif

/****************************************************************************/
/*                              INCLUDE FILES                               */
/****************************************************************************/
/* These are a part of the standard controller API */
#include <ZW_basis_api.h>
#include <ZW_nodemask_api.h>
#include "ZW_typedefs.h"

/****************************************************************************/
/*                     EXPORTED TYPES and DEFINITIONS                       */
/****************************************************************************/

/* Mode parameters to ZW_AddNodeToNetwork */
#define ADD_NODE_ANY          1
#define ADD_NODE_CONTROLLER   2
#define ADD_NODE_SLAVE        3
#define ADD_NODE_EXISTING     4
#define ADD_NODE_STOP         5
#define ADD_NODE_STOP_FAILED  6
#define ADD_NODE_RESERVED     7
#define ADD_NODE_HOME_ID      8
#define ADD_NODE_SMART_START  9

#define ADD_NODE_MODE_MASK                   0x0F
#define ADD_NODE_OPTION_NORMAL_POWER         0x80
#define ADD_NODE_OPTION_NETWORK_WIDE         0x40

/* Callback states from ZW_AddNodeToNetwork */
#define ADD_NODE_STATUS_LEARN_READY          1
#define ADD_NODE_STATUS_NODE_FOUND           2
#define ADD_NODE_STATUS_ADDING_SLAVE         3
#define ADD_NODE_STATUS_ADDING_CONTROLLER    4
#define ADD_NODE_STATUS_PROTOCOL_DONE        5
#define ADD_NODE_STATUS_DONE                 6
#define ADD_NODE_STATUS_FAILED               7
#define ADD_NODE_STATUS_NOT_PRIMARY          0x23

/* Mode parameters to ZW_RemoveNodeFromNetwork/ZW_RemoveNodeIDFromNetwork */
#define REMOVE_NODE_ANY                     ADD_NODE_ANY
#define REMOVE_NODE_CONTROLLER              ADD_NODE_CONTROLLER
#define REMOVE_NODE_SLAVE                   ADD_NODE_SLAVE
#define REMOVE_NODE_STOP                    ADD_NODE_STOP

#define REMOVE_NODE_MODE_MASK               ADD_NODE_MODE_MASK
#define REMOVE_NODE_OPTION_NORMAL_POWER     ADD_NODE_OPTION_NORMAL_POWER
#define REMOVE_NODE_OPTION_NETWORK_WIDE     ADD_NODE_OPTION_NETWORK_WIDE

/* Node paramter to ZW_RemoveNodeIDFromNetwork */
#define REMOVE_NODE_ID_ANY                  0

/* Callback states from ZW_RemoveNodeFromNetwork/ZW_RemoveNodeIDFromNetwork */
#define REMOVE_NODE_STATUS_LEARN_READY          ADD_NODE_STATUS_LEARN_READY
#define REMOVE_NODE_STATUS_NODE_FOUND           ADD_NODE_STATUS_NODE_FOUND
#define REMOVE_NODE_STATUS_REMOVING_SLAVE       ADD_NODE_STATUS_ADDING_SLAVE
#define REMOVE_NODE_STATUS_REMOVING_CONTROLLER  ADD_NODE_STATUS_ADDING_CONTROLLER
#define REMOVE_NODE_STATUS_DONE                 ADD_NODE_STATUS_DONE
#define REMOVE_NODE_STATUS_FAILED               ADD_NODE_STATUS_FAILED

/* Mode parameters to ZW_CreateNewPrimary */
#define CREATE_PRIMARY_START                ADD_NODE_CONTROLLER
#define CREATE_PRIMARY_STOP                 ADD_NODE_STOP
#define CREATE_PRIMARY_STOP_FAILED          ADD_NODE_STOP_FAILED

/* Mode parameters to ZW_ControllerChange */
#define CONTROLLER_CHANGE_START             ADD_NODE_CONTROLLER
#define CONTROLLER_CHANGE_STOP              ADD_NODE_STOP
#define CONTROLLER_CHANGE_STOP_FAILED       ADD_NODE_STOP_FAILED

/* Mode parameters to ZW_SetLearnMode */
#define ZW_SET_LEARN_MODE_DISABLE             0x00
#define ZW_SET_LEARN_MODE_CLASSIC             0x01
#define ZW_SET_LEARN_MODE_NWI                 0x02
#define ZW_SET_LEARN_MODE_NWE                 0x03

/* Callback states from ZW_SetLearnMode */
#define LEARN_MODE_STARTED                  ADD_NODE_STATUS_LEARN_READY
#define LEARN_MODE_DONE                     ADD_NODE_STATUS_DONE
#define LEARN_MODE_FAILED                   ADD_NODE_STATUS_FAILED

/* Callback states from ZW_REQUEST_NODE_NEIGHBOR_UPDATE */
#define REQUEST_NEIGHBOR_UPDATE_STARTED     0x21
#define REQUEST_NEIGHBOR_UPDATE_DONE        0x22
#define REQUEST_NEIGHBOR_UPDATE_FAILED      0x23

/* ApplicationcControllerUpdate status */
#define UPDATE_STATE_SUC_ID                               0x10
#define UPDATE_STATE_DELETE_DONE                          0x20
#define UPDATE_STATE_NEW_ID_ASSIGNED                      0x40
#define UPDATE_STATE_ROUTING_PENDING                      0x80
#define UPDATE_STATE_NODE_INFO_REQ_FAILED                 0x81
#define UPDATE_STATE_NODE_INFO_REQ_DONE                   0x82
#define UPDATE_STATE_NOP_POWER_RECEIVED                   0x83
#define UPDATE_STATE_NODE_INFO_RECEIVED                   0x84
#define UPDATE_STATE_NODE_INFO_SMARTSTART_HOMEID_RECEIVED 0x85
#define UPDATE_STATE_INCLUDED_NODE_INFO_RECEIVED          0x86

/* ZW_GetNeighborCount special return values */
#define NEIGHBORS_ID_INVALID          0xFE
#define NEIGHBORS_COUNT_FAILED        0xFF  /* Could not access routing info try again later */


/* ZW_RemoveFailedNode and ZW_ReplaceFailedNode return value definitions */
#define  NOT_PRIMARY_CONTROLLER             1 /* The removing process was */
                                              /* aborted because the controller */
                                              /* is not the primary one */

#define  NO_CALLBACK_FUNCTION               2 /* The removing process was */
                                              /* aborted because no call back */
                                              /* function is used */
#define  FAILED_NODE_NOT_FOUND              3 /* The removing process aborted */
                                              /* because the node was node */
                                              /* found */
#define  FAILED_NODE_REMOVE_PROCESS_BUSY    4 /* The removing process is busy */
#define  FAILED_NODE_REMOVE_FAIL            5 /* The removing process could not */
                                              /* be started */

#define ZW_FAILED_NODE_REMOVE_STARTED       0 /* The removing/replacing failed node process started */
#define ZW_NOT_PRIMARY_CONTROLLER           (1 << NOT_PRIMARY_CONTROLLER)
#define ZW_NO_CALLBACK_FUNCTION             (1 << NO_CALLBACK_FUNCTION)
#define ZW_FAILED_NODE_NOT_FOUND            (1 << FAILED_NODE_NOT_FOUND)
#define ZW_FAILED_NODE_REMOVE_PROCESS_BUSY  (1 << FAILED_NODE_REMOVE_PROCESS_BUSY)
#define ZW_FAILED_NODE_REMOVE_FAIL          (1 << FAILED_NODE_REMOVE_FAIL)


/* ZW_RemoveFailedNode and ZW_ReplaceFailedNode callback status definitions */
#define ZW_NODE_OK                          0 /* The node is working properly (removed from the failed nodes list ) */

/* ZW_RemoveFailedNode callback status definitions */
#define ZW_FAILED_NODE_REMOVED              1 /* The failed node was removed from the failed nodes list */
#define ZW_FAILED_NODE_NOT_REMOVED          2 /* The failed node was not removed from the failing nodes list */

/* ZW_ReplaceFailedNode callback status definitions */
#define ZW_FAILED_NODE_REPLACE              3 /* The failed node are ready to be replaced and controller */
                                              /* is ready to add new node with nodeID of the failed node */
#define ZW_FAILED_NODE_REPLACE_DONE         4 /* The failed node has been replaced */
#define ZW_FAILED_NODE_REPLACE_FAILED       5 /* The failed node has not been replaced */


/* ZW_RequestNetworkUpdate callback values*/
#define ZW_SUC_UPDATE_DONE      0x00
#define ZW_SUC_UPDATE_ABORT     0x01
#define ZW_SUC_UPDATE_WAIT      0x02


#define ZW_SUC_UPDATE_DISABLED  0x03
#define ZW_SUC_UPDATE_OVERFLOW  0x04

#define ZW_SUC_SET_SUCCEEDED    0x05
#define ZW_SUC_SET_FAILED       0x06

/* SUC capabilities used in ZW_SetSUCNodeID */
#define ZW_SUC_FUNC_NODEID_SERVER   0x01

/* Defines for ZW_GetControllerCapabilities */
#define CONTROLLER_IS_SECONDARY                 0x01
#define CONTROLLER_ON_OTHER_NETWORK             0x02
#define CONTROLLER_NODEID_SERVER_PRESENT        0x04
#define CONTROLLER_IS_REAL_PRIMARY              0x08
#define CONTROLLER_IS_SUC                       0x10
#define NO_NODES_INCUDED                        0x20

/* Z-Wave RF speed definitions */
#define ZW_RF_SPEED_NONE                        0x0000
#define ZW_RF_SPEED_9600                        0x0001
#define ZW_RF_SPEED_40K                         0x0002
#define ZW_RF_SPEED_100K                        0x0003
#define ZW_RF_SPEED_MASK                        0x0007

/* ZW_GetRoutingInfo() options */
#define GET_ROUTING_INFO_REMOVE_BAD             0x80
#define GET_ROUTING_INFO_REMOVE_NON_REPS        0x40
#define ZW_GET_ROUTING_INFO_ANY                 ZW_RF_SPEED_NONE
#define ZW_GET_ROUTING_INFO_9600                ZW_RF_SPEED_9600
#define ZW_GET_ROUTING_INFO_40K                 ZW_RF_SPEED_40K
#define ZW_GET_ROUTING_INFO_100K                ZW_RF_SPEED_100K
#define ZW_GET_ROUTING_INFO_SPEED_MASK          ZW_RF_SPEED_MASK

/* Listening bit in the NODEINFO capability byte */
#define NODEINFO_LISTENING_SUPPORT          0x80
/* Routing bit in the NODEINFO capability byte */
#define NODEINFO_ROUTING_SUPPORT            0x40

/* Optional functionality bit in the NODEINFO security byte*/
#define NODEINFO_OPTIONAL_FUNC_SUPPORT      0x80

/* TO#1924 fix */
/* Beam wakeup mode type bits in the NODEINFO security byte */
#define NODEINFO_ZWAVE_SENSOR_MODE_WAKEUP_1000   0x40
#define NODEINFO_ZWAVE_SENSOR_MODE_WAKEUP_250    0x20


/* Learn node state information passed by the call back function */
typedef struct _LEARN_INFO_
{
  BYTE  bStatus;      /* Status of learn mode */
  BYTE  bSource;      /* Node id of the node that send node info */
  BYTE  *pCmd;        /* Pointer to Application Node information */
  BYTE  bLen;         /* Node info length                        */
} LEARN_INFO;


/* Learn node "Application Node information" passed by call back function */
/* to Application when controller is in SMART START mode and an aspiring */
/* nodeinformation frame is received */
typedef struct _LEARN_INFO_SMARTSTART_
{
  BYTE      homeID[4];              /* HomeID the Nodeinfo was received with */
  BYTE      nodeInfoLength;         /* Length of NodeInfo parameters */
  NODE_TYPE nodeType;               /* Basic, Generic and Specific Device Type */
  BYTE      nodeInfo[NODEPARM_MAX]; /* Device status */
} LEARN_INFO_SMARTSTART;


/**
 *
 */
#define INIF_OPTIONS_TX_REASON_MASK 0x03

/**
 *
 */
typedef struct _CONTROLLER_UPDATE_INCLUDED_NODE_INFORMATION_FRAME_
{
  BYTE                  bINIFrxStatus;
  BYTE                  abINIFsmartStartNWIHomeID[4]; /* homeID used when using Smart Start */
} CONTROLLER_UPDATE_INCLUDED_NODE_INFORMATION_FRAME;


/* Route definitions defining Route structure used in  */
/* ZW_GetPriorityRoute/ZW_GetLastWorkingRoute and ZW_SetPriorityRoute/ZW_SetLastWorkingRoute */
#define ROUTECACHE_LINE_CONF_SIZE               1
#define ROUTECACHE_LINE_SIZE                    (MAX_REPEATERS + ROUTECACHE_LINE_CONF_SIZE)

/* PriorityRoute/LastWorkingRoute index definitions */
#define ROUTECACHE_LINE_REPEATER_0_INDEX        0
#define ROUTECACHE_LINE_REPEATER_1_INDEX        1
#define ROUTECACHE_LINE_REPEATER_2_INDEX        2
#define ROUTECACHE_LINE_REPEATER_3_INDEX        3
#define ROUTECACHE_LINE_CONF_INDEX              4

/* ZW_GetPriorityRoute and ZW_SetPriorityRoute speed definitions */
#define ZW_PRIORITY_ROUTE_SPEED_9600            ZW_RF_SPEED_9600
#define ZW_PRIORITY_ROUTE_SPEED_40K             ZW_RF_SPEED_40K
#define ZW_PRIORITY_ROUTE_SPEED_100K            ZW_RF_SPEED_100K

/* ZW_GetPriorityRoute function return value definitions */
/* Route returned is a Application defined Priority Route - APP_PR */
#define ZW_PRIORITY_ROUTE_APP_PR                0x10
/* Route returned is a Last Working Route - ZW_LWR */
#define ZW_PRIORITY_ROUTE_ZW_LWR                0x01
/* Route returned is a Next to Last Working Route - ZW_NLWR */
#define ZW_PRIORITY_ROUTE_ZW_NLWR               0x02

/* Obsolete - ZW_GetLastWorkingRoute and ZW_SetLastWorkingRoute speed definitions */
#define ZW_LAST_WORKING_ROUTE_SPEED_9600        ZW_PRIORITY_ROUTE_SPEED_9600
#define ZW_LAST_WORKING_ROUTE_SPEED_40K         ZW_PRIORITY_ROUTE_SPEED_40K
#define ZW_LAST_WORKING_ROUTE_SPEED_100K        ZW_PRIORITY_ROUTE_SPEED_100K


/****************************  Z-Wave Basis API *****************************
* Functionality specific for the controller API.
****************************************************************************/

/*========================   ZW_GetNodeProtocolInfo   =======================
**
**    Copy the Node's current protocol information from the non-volatile
**    memory.
**
** void           RET  Nothing
**  ZW_GetNodeProtocolInfo(
**    BYTE  nodeID,        IN Node ID
**    NODEINFO *nodeInfo); OUT Node info buffer
**--------------------------------------------------------------------------*/
#define ZW_GET_NODE_STATE(nodeID, nodeInfo) ZW_GetNodeProtocolInfo(nodeID, nodeInfo)


/*========================   ZW_AssignReturnRoute   =========================
**
**    Assign static return routes within a Routing Slave node.
**    Calculate the shortest transport routes from the Routing Slave node
**    to the route destination node and
**    transmit the return routes to the Routing Slave node.
**
** BOOL                       RET TRUE if assign return route was initiated.
**                                FALSE if a return route assign/delete is allready active
** ZW_AssignReturnRoute(
**  BYTE  bSrcNodeID,         IN Routing Slave Node ID
**  BYTE  bDstNodeID,         IN Route destination Node ID
**  VOID_CALLBACKFUNC(completedFunc)(
**    BYTE bStatus,
**    TX_STATUS_TYPE *txStatusReport)); IN  Status of process
**--------------------------------------------------------------------------*/
#define ZW_ASSIGN_RETURN_ROUTE(routingNodeID, destNodeID, func) ZW_AssignReturnRoute(routingNodeID, destNodeID, func)


/*========================   ZW_AssignSUCReturnRoute   =========================
**
**    Assign static return routes within a Routing Slave node.
**    Calculate the shortest transport routes to a Routing Slave node
**    from the Static Update Controller Node and
**    transmit the return routes to the Routing Slave node.
**
** BOOL                       RET TRUE if assign SUC return route was initiated.
**                                FALSE if a return route assign/delete is allready active
** ZW_AssignSUCReturnRoute(
**  BYTE  bSrcNodeID,         IN Routing Slave Node ID
**  VOID_CALLBACKFUNC(completedFunc)(
**    BYTE bStatus,
**    TX_STATUS_TYPE *txStatusReport)); IN  Status of process
**--------------------------------------------------------------------------*/
#define ZW_ASSIGN_SUC_RETURN_ROUTE(routingNodeID, func) ZW_AssignSUCReturnRoute(routingNodeID, func)


/*========================   ZW_DeleteSUCReturnRoute   =========================
**
**    Delete the (Static Update Controller - SUC-) static return routes
**    within a Routing Slave node.
**    Transmit "NULL" return routes to the Routing Slave node.
**
** BOOL                       RET TRUE if delete SUC return route was initiated.
**                                FALSE if a return route assign/delete is allready active
** ZW_DeleteSUCReturnRoute(
**  BYTE  nodeID,         IN Routing Slave
**  VOID_CALLBACKFUNC(completedFunc)(
**    BYTE bStatus,
**    TX_STATUS_TYPE *txStatusReport)); IN  Transmit complete status
**--------------------------------------------------------------------------*/
#define ZW_DELETE_SUC_RETURN_ROUTE(nodeID, func) ZW_DeleteSUCReturnRoute(nodeID, func)


/*========================   ZW_DeleteReturnRoute   =========================
**
**    Delete static return routes within a Routing Slave node.
**    Transmit "NULL" return routes to the Routing Slave node.
**
** BOOL                       RET TRUE if delete return route was initiated.
**                                FALSE if a return route assign/delete is allready active
** ZW_DeleteReturnRoute(
**  BYTE  nodeID,         IN Routing Slave
**  VOID_CALLBACKFUNC(completedFunc)(
**    BYTE bStatus)); IN  Transmit complete status
**--------------------------------------------------------------------------*/
#define ZW_DELETE_RETURN_ROUTE(nodeID, func) ZW_DeleteReturnRoute(nodeID, func)


/*===========================   ZW_SetDefault   ================================
**    Remove all Nodes and timers from the EEPROM memory.
**
** void           RET  Nothing
** SetDefault(
**  VOID_CALLBACKFUNC(completedFunc)(void)); IN  Command completed call back function
**--------------------------------------------------------------------------*/
#define ZW_SET_DEFAULT(func) ZW_SetDefault(func)


/****************************************************************************
** Z-Wave Transport Application layer interface functions specific for the
** controller.
**/

/*===================   ZW_REPLICATION_COMMAND_COMPLETE =====================
**    Sends command completed to master remote. Called in replication mode
**    when a command from the sender has been processed.
**
**    Side effects:
**
**--------------------------------------------------------------------------*/
#define ZW_REPLICATION_COMMAND_COMPLETE() ZW_ReplicationReceiveComplete()


/*======================   ZW_REPLICATION_SEND_DATA   ======================
**    Used when the controller is replication mode.
**    It sends the payload and expects the receiver to respond with a
**    command complete message.
**    Side effects:
**
**--------------------------------------------------------------------------*/
#define ZW_REPLICATION_SEND_DATA(node,data,length,options,func) ZW_ReplicationSend(node,data,length,options,func)


/*==========================   ZW_GetFailedNode   ===============================
**
**    Check if a node failed is in the failed nodes table
**    Side effects:
**
**--------------------------------------------------------------------------*/
#define ZW_IS_FAILED_NODE_ID(NODEID)       (ZW_isFailedNode(NODEID) )


/*==========================   ZW_RemoveFailedNode   ===============================
**
**    remove a node from the failed node list, if it already exist.
**    A call back function should be provided otherwise the function will return
**    without removing the node.
**    If the removing process started successfully then the function will return
**    ZW_FAILED_NODE_REMOVE_STARTED        The removing process started
**
**    If the removing process can not be started then the API function will return
**    on or more of the following flags
**    ZW_NOT_PRIMARY_CONTROLLER             The removing process was aborted because the controller is not the primaray one
**    ZW_NO_CALLBACK_FUNCTION              The removing process was aborted because no call back function is used
**    ZW_FAILED_NODE_NOT_FOUND             The removing process aborted because the node was node found
**    ZW_FAILED_NODE_REMOVE_PROCESS_BUSY   The removing process is busy
**
**    The call back function parameter value is:
**
**    ZW_NODE_OK                     The node is working proppely (removed from the failed nodes list )
**    ZW_FAILED_NODE_REMOVED         The failed node was removed from the failed nodes list
**    ZW_FAILED_NODE_NOT_REMOVED     The failed node was not
**    Side effects:
**--------------------------------------------------------------------------*/
#define ZW_REMOVE_FAILED_NODE_ID(NODEID,FUNC)  (ZW_RemoveFailedNode(NODEID,FUNC))


/*=========================   ZW_ReplaceFailedNode   ==========================
**
**    Replace a node from the failed node list.
**    A call back function should be provided otherwise the function will return
**    without replacing the node.
**    If the replacing process started successfully then the function will return
**    ZW_FAILED_NODE_REPLACE         The replacing process started and now the new
**                                   node must emit its nodeinformation frame to
**                                   start the assign process
**
**    If the replace process can not be started then the API function will return
**    on or more of the following flags
**
**    ZW_NOT_PRIMARY_CONTROLLER           The replacing process was aborted because
**                                        the controller is not the primary controller
**    ZW_NO_CALLBACK_FUNCTION             The replacing process was aborted because no
**                                        call back function is used
**    ZW_FAILED_NODE_NOT_FOUND            The replacing process aborted because
**                                        the node was node found
**    ZW_FAILED_NODE_REMOVE_PROCESS_BUSY  The replacing process is busy
**    ZW_FAILED_NODE_REMOVE_FAIL          The replacing process could not be started
**                                        because of
**
**    The call back function parameter value is:
**
**    ZW_FAILED_NODE_REPLACE         The failed node are ready to be replaced and controller
**                                   is ready to add new node with nodeID of the failed node
**    ZW_FAILED_NODE_REPLACE_DONE    The failed node has been replaced
**    ZW_FAILED_NODE_REPLACE_FAILED  The failed node has not been replaced
**    Side effects:
**--------------------------------------------------------------------------*/
#define ZW_REPLACE_FAILED_NODE(NODEID,BNORMALPOWER,FUNC)  (ZW_ReplaceFailedNode(NODEID,BNORMALPOWER,FUNC))


/*============================   ZW_SetSUCNodeID  ===========================
**    Function description
**    This function enables/disables a specified static controllers
**    Static Update Controller functionality
**
**--------------------------------------------------------------------------*/
#define ZW_SET_SUC_NODEID(NODEID, SUC_STATE, TX_OPTION, CAPABILITIES, FUNC) (ZW_SetSUCNodeID(NODEID, SUC_STATE, TX_OPTION, CAPABILITIES, FUNC))


/*============================   ZW_SendSUCID   ===============================
**    Function description
**      Transmits SUC node id to the node specified. Only allowed from Primary or SUC
**    Side effects:
**
**--------------------------------------------------------------------------*/
#define ZW_SEND_SUC_ID(node,txOption, callback) ZW_SendSUCID(node,txOption, callback)



/*===========================   ZW_GET_SUC_NODEID  ===========================
**    Function description
**    This function gets the nodeID of the current Static Update Controller
**    if ZERO then no SUC is available
**
**--------------------------------------------------------------------------*/
#define ZW_GET_SUC_NODEID() ZW_GetSUCNodeID()


/*========================   ZW_REQUEST_NETWORK_UPDATE   ===================
**    Function description
**      This function resquest network update from the SUC
**      Returns: TRUE - SUC is known to this controller, FALSE - SUC unknown
**      FUNC is a call back function indicates of the update was a success
**      or failed
**    The call back function parameter value is:
**        ZW_SUC_UPDATE_DONE        The update process ended successfully
**        ZW_SUC_UPDATE_ABORT       The update process was aborted
**        ZW_SUC_UPDATE_WAIT        The SUC node is busy, try again later
**        ZW_SUC_UPDATE_DISABLED    The SUC functionality have been disabled
**        ZW_SUC_UPDATE_OVERFLOW    Too many changes to handle by automatic update
**--------------------------------------------------------------------------*/
#define ZW_REQUEST_NETWORK_UPDATE(FUNC) (ZW_RequestNetWorkUpdate(FUNC))


/*====================   ZW_RequestNodeNeighborUpdate  =======================
**
**    Request for an update of NodeID neighbors
**
**    Side effects:
**
**--------------------------------------------------------------------------*/
#define ZW_REQUEST_NODE_NEIGHBOR_UPDATE(NODEID,FUNC) ZW_RequestNodeNeighborUpdate(NODEID,FUNC)


/*========================   ZW_SetRoutingMAX   ==============================
**
**  Set the maximum number of route tries which should be done before failing
**  or resorting to explore frame if this is specified
**
**  Side effects:
**
**--------------------------------------------------------------------------*/
#define ZW_SET_ROUTING_MAX(maxRouteTries) ZW_SetRoutingMAX(maxRouteTries)

/*============================   ZW_PRIMARYCTRL   =========================
**    Function description
**      Returns TRUE When the controller is a primary.
**              FALSE if it is a slave
**    Side effects:
**
**--------------------------------------------------------------------------*/
#define ZW_PRIMARYCTRL() ZW_IsPrimaryCtrl()


/*========================   GetNeighborCount   =============================
**
**  Get number of neighbors the specified Node ID has registered
**
**  Returns:
**    0x00-0xE7               - Number of neighbors registered
**    NEIGHBORS_ID_INVALID    - specified node ID invalid
**    NEIGHBORS_COUNT_FAILED  - Could not access routeing information - try again later
**
**  Side effects:
**
**--------------------------------------------------------------------------*/
#define ZW_GET_NEIGHBOR_COUNT(NODEID) ZW_GetNeighborCount(NODEID)

/*=====================   ZW_ARE_NODES_NEIGHBOURS   ============================
**
**  Are two specific nodes neighbours
**  returns TRUE if they are FALSE if not
**
**  Side effects:
**
**--------------------------------------------------------------------------*/
#define ZW_ARE_NODES_NEIGHBOURS(a,b) ZW_AreNodesNeighbours(a,b)

/*============================   ZW_RequestNodeInfo   ======================
**    Function description.
**     Request a node to send it's node information.
**     Function return TRUE if the request is send, else it return FALSE.
**     FUNC is a callback function, which is called with the status of the
**     Request nodeinformation frame transmission.
**     If a node sends its node info, ApplicationControllerUpdate will be called
**     with UPDATE_STATE_NODE_INFO_RECEIVED as status together with the received
**     nodeinformation.
**
**    Side effects:
**
**--------------------------------------------------------------------------*/
#define ZW_REQUEST_NODE_INFO(NODEID, FUNC)  ZW_RequestNodeInfo(NODEID, FUNC)


/*======================   ZW_GetControllerCapabilities  =====================
**    Function description
**      Returns the Controller capabilities
**      The returned capability is a bitmask where folowing bits are defined :
**       CONTROLLER_IS_SECONDARY
**       CONTROLLER_ON_OTHER_NETWORK
**       CONTROLLER_NODEID_SERVER_PRESENT
**       CONTROLLER_IS_REAL_PRIMARY
**       CONTROLLER_IS_SUC
**       NO_NODES_INCUDED
**
**    Side effects:
**
**--------------------------------------------------------------------------*/
#define ZW_GET_CONTROLLER_CAPABILITIES ZW_GetControllerCapabilities

/*===========================   SetLearnMode   ==============================
**    Enable/Disable home/node ID learn mode.
**    When learn mode is enabled, received "Assign ID's Command" are handled:
**    If the current stored ID's are zero, the received ID's will be stored.
**    If the received ID's are zero the stored ID's will be set to zero.
**
**    Side effects:
**
**--------------------------------------------------------------------------*/
#define ZW_SET_LEARN_MODE(mode, func) ZW_SetLearnMode(mode, func)

/*==========================   ZW_AddNodeToNetwork   ========================
**
**    Add any type of node to the network
**
**    The modes are:
**
**    ADD_NODE_ANY            Add any node to the network
**    ADD_NODE_CONTROLLER     Add a controller to the network
**    ADD_NODE_SLAVE          Add a slaev node to the network
**    ADD_NODE_STOP           Stop learn mode without reporting an error.
**    ADD_NODE_STOP_FAILED    Stop learn mode and report an error to the
**                            new controller.
**    ADD_NODE_RESERVED       Reserved
**    ADD_NODE_HOME_ID        Smart Start include the node matching specified DSK
**                            only use through ZW_AddNodeDskToNetwork
**    ADD_NODE_SMART_START    Smart Start search for aspiring node to include
**
**    ADD_NODE_OPTION_NORMAL_POWER  Set this flag in bMode for Normal Power inclusion.
**
**    Side effects:
**
**--------------------------------------------------------------------------*/
#define ZW_ADD_NODE_TO_NETWORK(mode, func) ZW_AddNodeToNetwork(mode, func)

#ifdef ZW_SMARTSTART_ENABLED
#define ZW_ADD_NODE_DSK_TO_NETWORK(mode, pDSK, func) ZW_AddNodeDskToNetwork(mode, pDSK, func)
#endif

/*==========================   ZW_RemoveNodeFromNetwork   ========================
**
**    Remove any type of node from the network
**
**    The modes are:
**
**    REMOVE_NODE_ANY            Remove any node from the network
**    REMOVE_NODE_CONTROLLER     Remove a controller from the network
**    REMOVE_NODE_SLAVE          Remove a slaev node from the network
**
**    REMOVE_NODE_STOP           Stop learn mode without reporting an error.
**
**    REMOVE_NODE_OPTION_NORMAL_POWER Set this flag in bMode for Normal Power exclusion.
**
**    Side effects:
**
**--------------------------------------------------------------------------*/
#define ZW_REMOVE_NODE_FROM_NETWORK(mode, func) ZW_RemoveNodeFromNetwork(mode, func)

/*======================   ZW_RemoveNodeIDFromNetwork   ======================
**
**    Remove specific node ID from the network
**
**    - If valid nodeID (1-232) is specified then only the specified nodeID
**     matching the mode settings can be removed.
**    - If REMOVE_NODE_ID_ANY or none valid nodeID (0, 233-255) is specified
**     then any node which matches the mode settings can be removed.
**
**    The modes are:
**
**    REMOVE_NODE_ANY            Remove Specified nodeID (any type) from the network
**    REMOVE_NODE_CONTROLLER     Remove Specified nodeID (controller) from the network
**    REMOVE_NODE_SLAVE          Remove Specified nodeID (slave) from the network
**
**    REMOVE_NODE_STOP           Stop learn mode without reporting an error.
**
**    REMOVE_NODE_OPTION_NORMAL_POWER   Set this flag in bMode for Normal Power
**                                      exclusion.
**    REMOVE_NODE_OPTION_NETWORK_WIDE   Set this flag in bMode for enabling
**                                      Networkwide explore via explore frames
**
**    Side effects:
**
**--------------------------------------------------------------------------*/
#define ZW_REMOVE_NODE_ID_FROM_NETWORK(mode, nodeid, func) ZW_RemoveNodeIDFromNetwork(mode, nodeid, func)

/*========================   ZW_ControllerChange   ======================
**
**    Transfer the role as primary controller to another controller
**
**    The modes are:
**
**    CONTROLLER_CHANGE_START          Start the creation of a new primary
**    CONTROLLER_CHANGE_STOP           Stop the creation of a new primary
**    CONTROLLER_CHANGE_STOP_FAILED    Report that the replication failed
**
**    ADD_NODE_OPTION_NORMAL_POWER       Set this flag in bMode for High Power exchange.
**
**    Side effects:
**
**--------------------------------------------------------------------------*/
#define ZW_CONTROLLER_CHANGE(mode, func) ZW_ControllerChange(mode, func)

/*========================   ZW_GET_ROUTING_INFO   ==========================
**
**   Wrapper for ZW_GetRoutingInfo().
**
**--------------------------------------------------------------------------*/
#define ZW_GET_ROUTING_INFO(bNodeID, pMask, bOptions) ZW_GetRoutingInfo(bNodeID, pMask, bOptions)


/*==========================   ZW_GetPriorityRoute   ======================
**    Function description
**      Returns NON ZERO if a Priority Route is found. Priority route is either
**        an Application injected Route or a LWR.
**        ZW_PRIORITY_ROUTE_APP_PR = Route is an App defined Priority Route
**        ZW_PRIORITY_ROUTE_ZW_LWR = Route is a Last Working Route
**        ZW_PRIORITY_ROUTE_ZW_NLWR = Route is a Next to Last Working Route
**      Returns FALSE if no Priority Route is found.
**      If Route is found then the found route is copied into the specified
**      ROUTECACHE_LINE_SIZE (5) byte sized byte array, where the first
**      4 bytes (index 0-3) contains the repeaters active in the route and
**      the last (index 4) byte contains the speed information.
**      First ZERO in repeaters (index 0-3) indicates no more repeaters in route
**      A direct route is indicated by the first repeater (index 0) being ZERO.
**
**      Example: 0,0,0,0,ZW_PRIORITY_ROUTE_SPEED_100K ->
**                  Direct 100K
**               2,3,0,0,ZW_PRIORITY_ROUTE_SPEED_40K  ->
**                  40K route through repeaters 2 and 3
**
**    Side effects:
**
**--------------------------------------------------------------------------*/
#define ZW_GET_PRIORITY_ROUTE(bNodeID, pPriorityRoute) ZW_GetPriorityRoute(bNodeID, pPriorityRoute)


/* OBSOLETE */
#define ZW_GetLastWorkingRoute(bNodeID, pLastWorkingRoute) ZW_GetPriorityRoute(bNodeID, pLastWorkingRoute)
#define ZW_GET_LAST_WORKING_ROUTE(bNodeID, pLastWorkingRoute) ZW_GetPriorityRoute(bNodeID, pLastWorkingRoute)


/****************************************************************************/
/*                              EXPORTED DATA                               */
/****************************************************************************/


/****************************************************************************/
/*                           EXPORTED FUNCTIONS                             */
/*                 Implemented within the application moduls                */
/****************************************************************************/


/*=====================   ApplicationControllerUpdate   =================*/
/**
 * \ingroup COMMON
 *
 * A controller application MAY use the information provided by
 * \ref ApplicationControllerUpdate to update local data structures.
 *
 * The Z Wave protocol MUST notify a controller application by calling
 * \ref ApplicationControllerUpdate when a new node has been added or deleted
 * from the controller through the network management features.
 *
 * The Z Wave protocol MUST call \ref ApplicationControllerUpdate in response
 * to \ref ZW_RequestNodeInfo being called by the controller application.
 * The Z Wave protocol MAY notify a controller application by calling
 * \ref ApplicationControllerUpdate when a Node Information Frame has been received.
 * The Z Wave protocol MAY refrain from calling the function if the protocol
 * is currently expecting a Node Information frame.
 *
 * \ref ApplicationControllerUpdate MUST be called in a controller node operating
 * as SIS each time a node is added or deleted by the primary controller.
 * \ref ApplicationControllerUpdate MUST be called in a controller node operating
 * as SIS each time a node is added/deleted by an inclusion controller.
 *
 * The Z Wave protocol MAY notify a controller application by calling
 * \ref ApplicationControllerUpdate when a Node Information Frame has been received.
 * The Z Wave protocol MAY refrain from calling the function if the protocol
 * is currently expecting node information.
 *
 * A controller application MAY send a \ref ZW_RequestNetWorkUpdate command
 * to a SIS or SIS node. In response, the SIS MUST return update information
 * for each node change since the last update handled by the requesting
 * controller node.
 * The application of the requesting controller node MAY receive multiple calls
 * to \ref ApplicationControllerUpdate in response to \ref ZW_RequestNetWorkUpdate.
 *
 * The Z Wave protocol MUST NOT call \ref ApplicationControllerUpdate in a
 * controller node acting as primary controller or inclusion controller
 * when a node is added or deleted.
 *
 * Any controller application MUST implement this function.
 *
 * Declared in: ZW_controller_api.h
 *
 * \param[in] bStatus   The status of the update process, value could be one of the following:
 * - \ref UPDATE_STATE_ADD_DONE A new node has been added to the network.
 * - \ref UPDATE_STATE_DELETE_DONE A node has been deleted from the network.
 * - \ref UPDATE_STATE_NODE_INFO_RECEIVED A node has sent its node info either unsolicited
 *                                        or as a response to a ZW_RequestNodeInfo call.
 * - \ref UPDATE_STATE_SUC_ID The SIS node Id was updated.
 * \param[in] bNodeID  The updated node's node ID (1..232).
 * \param[in] pCmd Pointer of the updated node's node info.
 * \param[in] bLen The length of the pCmd parameter.
 *
 * \serialapi{ZW->HOST: REQ | 0x49 | bStatus | bNodeID | bLen | basic | generic | specific | commandclasses[ ]}
 *
 * ApplicationControllerUpdate via the Serial API also have the possibility for
 * receiving the status UPDATE_STATE_NODE_INFO_REQ_FAILED, which means that a node
 * did not acknowledge a \ref ZW_RequestNodeInfo call.
 *
 */
extern void
ApplicationControllerUpdate(
  BYTE bStatus,     /*IN  Status of learn mode */
  BYTE bNodeID,     /*IN  Node id of the node that send node info */
  BYTE* pCmd,       /*IN  Pointer to Application Node information */
  BYTE bLen);       /*IN  Node info length                        */


/**
 * Defines for ApplicationNetworkLearnModeCompleted psLearnInfo->bSource.
 * if not 0-232 then following values are defined
 */
#define APPLICATION_NETWORK_LEARN_MODE_COMPLETED_FAILED                   0xFF
#define APPLICATION_NETWORK_LEARN_MODE_COMPLETED_SMART_START_IN_PROGRESS  0xFE
#define APPLICATION_NETWORK_LEARN_MODE_COMPLETED_TIMEOUT                  0xFD


/**
 * @brief ApplicationNetworkLearnModeCompleted
 * Should be implemented by the Application. Called when node have started
 * inclusion/exclusion through ZW_NetworkLearnModeStart and node has been
 * included, excluded or learnmode either failed or timed out:
 * valid values for psLearnInfo->bSource parameter:
 *  - 0      node has been Excluded and has been assigned this nodeID
 *  - 1-232  node has been Included and has been assigned this nodeID
 *  APPLICATION_NETWORK_LEARN_MODE_COMPLETED_FAILED
 *  - Slave only return value - Smart Start secure inclusion failed
 *  APPLICATION_NETWORK_LEARN_MODE_COMPLETED_SMART_START_IN_PROGRESS
 *  - A nodeID has been assigned do not go into sleepmode. Another call to
 *    ApplicationNetworkLearnModeCompleted will come with final result.
 *  APPLICATION_NETWORK_LEARN_MODE_COMPLETED_TIMEOUT
 *  - LearnMode process timeout inclusion/exclusion did not start.
 * @param LEARN_INFO* psLearnInfo IN pointer to struct containing
 */
extern void
ApplicationNetworkLearnModeCompleted(
  LEARN_INFO* psLearnInfo);


/****************************************************************************/
/*                           EXPORTED FUNCTIONS                             */
/*                 Implemented within the Z-Wave controller modules         */
/****************************************************************************/
/*========================   ZW_GetRoutingInfo   ==========================
**
**  Get a list of routing information for a node from the routing table.
**  Only include neighbor nodes supporting a certain speed.
**  Assumes that nodes support all lower speeds in addition to the advertised
**  highest speed.
**
**  Side effects:
**
**--------------------------------------------------------------------------*/
void
ZW_GetRoutingInfo(        /*RET  Nothing */
  BYTE   bNodeID,         /* IN  Node ID on node whom routing info is needed on */
  BYTE_P pMask,           /*OUT  Pointer where routing info should be put */
  BYTE   bOptions);       /* IN  Upper nibble is bit flag options, lower nibble is speed */
                          /*     Combine exactly one speed with any number of options */
                          /*     Bit flags options for upper nibble: */
                          /*       GET_ROUTING_INFO_REMOVE_BAD      - Remove bad link from routing info */
                          /*       GET_ROUTING_INFO_REMOVE_NON_REPS  - Remove non-repeaters from the routing info */
                          /*     Speed values for lower nibble:     */
                          /*       ZW_GET_ROUTING_INFO_ANY  - Return all nodes regardless of speed */
                          /*       ZW_GET_ROUTING_INFO_9600 - Return nodes supporting 9.6k    */
                          /*       ZW_GET_ROUTING_INFO_40K  - Return nodes supporting 40k     */
                          /*       ZW_GET_ROUTING_INFO_100K - Return nodes supporting 100k    */

/*========================   ZW_SetRoutingInfo   ==========================
**
**  Save a list of routing information for a node in the routing table
**
**  Side effects:
**
**--------------------------------------------------------------------------*/
BOOL              /*RET TRUE The info contained changes and was physically written to EEPROM */
ZW_SetRoutingInfo(       /* RET  Nothing */
  BYTE bNode,               /* IN   Node number */
  BYTE bLength,             /* IN   Length of pMask in bytes */
  BYTE_P pMask);            /* IN   pointer to routing info */


/*===================   ZW_ReplicationReceiveComplete   ========================
**    Sends command completed to primary controller. Called in replication mode
**    when a command from the sender has been processed.
**
**    Side effects:
**
**--------------------------------------------------------------------------*/
extern void
ZW_ReplicationReceiveComplete(void);


/*============================ ZW_ReplicationSend   ======================
**    Used when the controller is replication mode.
**    It sends the payload and expects the receiver to respond with a
**    command complete message.
**    Side effects:
**
**--------------------------------------------------------------------------*/
extern BYTE                   /*RET  FALSE if transmitter busy      */
ZW_ReplicationSend(
  BYTE  destNodeID,             /*IN  Destination node ID. Only single cast allowed*/
  BYTE *pData,                  /*IN  Data buffer pointer           */
  BYTE  dataLength,             /*IN  Data buffer length            */
  BYTE  txOptions,              /*IN  Transmit option flags         */
  VOID_CALLBACKFUNC(completedFunc)(BYTE)); /*IN  Transmit completed call back function  */


/*========================   ZW_GetNodeProtocolInfo   =======================
**
**    Copy the Node's current protocol information from the non-volatile
**    memory.
**
**--------------------------------------------------------------------------*/
extern void             /*RET Nothing        */
ZW_GetNodeProtocolInfo(
  BYTE  bNodeID,        /* IN Node ID */
  NODEINFO *nodeInfo);  /*OUT Node info buffer */


/*========================   ZW_AssignReturnRoute   =========================
**
**    Assign static return routes within a Routing Slave node.
**    Calculate the shortest transport routes from the Routing Slave node
**    to the route destination node and
**    transmit the return routes to the Routing Slave node.
**
**--------------------------------------------------------------------------*/
BOOL                         /*RET TRUE if assign was initiated. FALSE if not */
ZW_AssignReturnRoute(
  BYTE  bSrcNodeID,                 /* IN Routing Slave Node ID */
  BYTE  bDstNodeID,                 /* IN Route destination Node ID */
  VOID_CALLBACKFUNC(completedFunc)( /* IN Callback function called when done */
    BYTE bStatus,
    TX_STATUS_TYPE *txStatusReport));

/*=====================   ZW_AssignPriorityReturnRoute   ======================
**
**    Assign static return routes within a Routing Slave node.
**    Calculate the shortest transport routes from the Routing Slave node
**    to the route destination node and
**    transmit the return routes to the Routing Slave node.
**
**--------------------------------------------------------------------------*/
extern BOOL                         /*RET TRUE if assign was initiated. FALSE if not */
ZW_AssignPriorityReturnRoute(
  BYTE  bSrcNodeID,                 /* IN Routing Slave Node ID */
  BYTE  bDstNodeID,                 /* IN Route destination Node ID */
  XBYTE *pPriorityRoute,            /* IN Route to be assigned */
  VOID_CALLBACKFUNC(completedFunc)( /* IN Callback function called when done */
    BYTE bStatus,
    TX_STATUS_TYPE *txStatusReport));

/*========================   ZW_DeleteReturnRoute   =========================
**
**    Delete static return routes within a Routing Slave node.
**    Transmit "NULL" routes to the Routing Slave node.
**
**--------------------------------------------------------------------------*/
extern BOOL                  /*RET TRUE if delete return routes was initiated. FALSE if not */
ZW_DeleteReturnRoute(
  BYTE  nodeID,        /*IN Routing Slave */
  VOID_CALLBACKFUNC(completedFunc)(     /*IN Callback function  */
    BYTE bStatus,                       /*IN  Transmit complete status */
    TX_STATUS_TYPE *txStatusReport));   /*IN  Detailed transmit information */


/*===========================   ZW_SetDefault   =============================
**    Remove all Nodes and timers from the EEPROM memory.
**
**--------------------------------------------------------------------------*/
extern void                         /*RET Nothing */
ZW_SetDefault(
  VOID_CALLBACKFUNC(completedFunc)( /* IN Command completed call back function */
    void));


/*==========================   ZW_GetFailedNode   ===============================
**
**    Check if a node failed is in the failed nodes table
**    Side effects:
**
**--------------------------------------------------------------------------*/
BYTE              /*RET true if node in failed node table, else false */
ZW_isFailedNode(
  BYTE nodeID);   /* IN the failed node ID */


/*==========================   ZW_RemoveFailedNode   ===============================
**
**    remove a node from the failed node list, if it already exist.
**    A call back function should be provided otherwise the function will return
**    without removing the node.
**    If the removing process started successfully then the function will return
**    ZW_FAILED_NODE_REMOVE_STARTED        The removing process started
**
**    If the removing process can not be started then the API function will return
**    on or more of the following flags
**    ZW_NOT_PRIMARY_CONTROLLER             The removing process was aborted because the controller is not the primaray one
**    ZW_NO_CALLBACK_FUNCTION              The removing process was aborted because no call back function is used
**    ZW_FAILED_NODE_NOT_FOUND             The removing process aborted because the node was node found
**    ZW_FAILED_NODE_REMOVE_PROCESS_BUSY   The removing process is busy
**
**    The call back function parameter value is:
**
**    ZW_NODE_OK                     The node is working proppely (removed from the failed nodes list )
**    ZW_FAILED_NODE_REMOVED         The failed node was removed from the failed nodes list
**    ZW_FAILED_NODE_NOT_REMOVED     The failed node was not
**    Side effects:
**--------------------------------------------------------------------------*/
BYTE                                /*RET function return code */
ZW_RemoveFailedNode(
  BYTE NodeID,                      /* IN the failed nodeID */
  VOID_CALLBACKFUNC(completedFunc)( /* IN callback function to be called */
    BYTE));                         /*    when the remove process end. */


/*=========================   ZW_ReplaceFailedNode   ==========================
**
**    Replace a node from the failed node list.
**    A call back function should be provided otherwise the function will return
**    without replacing the node.
**    If the replacing process started successfully then the function will return
**    ZW_FAILED_NODE_REMOVE_STARTED  The replacing process started and now the new
**                                   node must emit its nodeinformation frame to
**                                   start the assign process
**
**    If the replace process can not be started then the API function will return
**    on or more of the following flags
**
**    ZW_NOT_PRIMARY_CONTROLLER           The replacing process was aborted because
**                                        the controller is not the primary controller
**    ZW_NO_CALLBACK_FUNCTION             The replacing process was aborted because no
**                                        call back function is used
**    ZW_FAILED_NODE_NOT_FOUND            The replacing process aborted because
**                                        the node was node found
**    ZW_FAILED_NODE_REMOVE_PROCESS_BUSY  The replacing process is busy
**    ZW_FAILED_NODE_REMOVE_FAIL          The replacing process could not be started
**                                        because of
**
**    The call back function parameter value is:
**
**    ZW_NODE_OK                     The node is working proppely (removed from the failed nodes list )
**    ZW_FAILED_NODE_REPLACE         The failed node are ready to be replaced and controller
**                                   is ready to add new node with nodeID of the failed node
**    ZW_FAILED_NODE_REPLACE_DONE    The failed node has been replaced
**    ZW_FAILED_NODE_REPLACE_FAILED  The failed node has not been replaced
**    Side effects:
**--------------------------------------------------------------------------*/
BYTE                                       /*RET return the result of the function call */
ZW_ReplaceFailedNode(
  BYTE bNodeID,                            /* IN the nodeID on the failed node to replace */
  /* TO#2177 fix - ZW_ReplaceFailedNodeID can now be instructed to */
  /* use NormalPower when doing the potential Replace */
  BOOL bNormalPower,                        /* IN TRUE the replacement is included with normal power */
  VOID_CALLBACKFUNC(completedFunc)(BYTE)); /* IN call back function to be called when the */
                                           /*    the replace process end. */


/*============================   ZW_SetSUCNodeID  ===========================
**    Function description
**    This function enable /disable a specified static controller
**    of functioning as the Static Update Controller
**
**--------------------------------------------------------------------------*/
BYTE                 /*RET TRUE target is a static controller*/
                     /*    FALSE if the target is not a static controller,  */
                     /*    the source is not primary or the SUC functinality is not enabled.*/
ZW_SetSUCNodeID(
  BYTE nodeID,       /* IN the node ID of the static controller to be a SUC */
  BYTE SUCState,     /* IN TRUE enable SUC, FALSE disable */
  BYTE bTxOption,    /* IN TRUE if to use low poer transmition, FALSE for normal Tx power */
  BYTE bCapabilities,             /* The capabilities of the new SUC */
  VOID_CALLBACKFUNC(completedFunc)(BYTE txStatus, TX_STATUS_TYPE *txStatusReport)); /* IN a call back function */


/*============================   ZW_SendSUCID   =============================
**    Function description
**      Transmits SUC node id to the node specified. Only allowed from Primary or SUC
**    Side effects:
**
**--------------------------------------------------------------------------*/
BYTE ZW_SendSUCID(
  BYTE node,
  BYTE txOption,
  VOID_CALLBACKFUNC(callfunc)(BYTE, TX_STATUS_TYPE *));


/*============================   ZW_GetSUCNodeID  ===========================
**    Function description
**    This function gets the nodeID of the current Static Update Controller
**    if ZERO then no SUC is available
**
**--------------------------------------------------------------------------*/
BYTE                     /*RET nodeID on SUC, if ZERO -> no SUC */
ZW_GetSUCNodeID( void ); /* IN Nothing */


/*========================   ZW_RequestNetWorkUpdate   ======================*/
/**
 * \ingroup BASIS
 * \macro{ZW_REQUEST_NETWORK_UPDATE (func)}
 *
 * Used to request network topology updates from the SUC/SIS node. The update
 * is done on protocol level and any changes are notified to the application by
 * calling the ApplicationControllerUpdate).
 *
 * Secondary controllers can only use this call when a SUC is present in the network.
 * All controllers can use this call in case a SUC ID Server (SIS) is available.
 *
 * Routing Slaves can only use this call, when a SUC is present in the network.
 * In case the Routing Slave has called ZW_RequestNewRouteDestinations prior to
 * ZW_RequestNetWorkUpdate, then Return Routes for the destinations specified by
 * the application in ZW_RequestNewRouteDestinations will be updated along with
 * the SUC Return Route.
 *
 * \note The SUC can only handle one network update at a time, so care should be taken
 * not to have all the controllers in the network ask for updates at the same time.
 *
 * \warning This API call will generate a lot of network activity that will use
 * bandwidth and stress the SUC in the network. Therefore, network updates should
 * be requested as seldom as possible and never more often that once every hour
 * from a controller.
 *
 * \return TRUE If the updating process is started.
 * \return FALSE If the requesting controller is the SUC node or the SUC node is unknown.
 *
 * \param[in] completedFunc IN  Transmit complete call back.
 *
 * Callback function Parameters:
 * \param[in] txStatus IN Status of command:
 * -ZW_SUC_UPDATE_DONE  The update process succeeded.
 * -ZW_SUC_UPDATE_ABORT The update process aborted because of an error.
 * -\ref ZW_SUC_UPDATE_WAIT  The SUC node is busy.
 * -\ref ZW_SUC_UPDATE_DISABLED  The SUC functionality is disabled.
 * - \ref ZW_SUC_UPDATE_OVERFLOW  The controller requested an update after more than 64 changes have occurred in the network. The update information is then out of date in respect to that controller. In this situation the controller have to make a replication before trying to request any new network updates.

Timeout: 65s
Exption recovery: Resume normal operation, no recovery needed

Serial API:
HOST->ZW: REQ | 0x53 | funcID
ZW->HOST: RES | 0x53 | retVal
ZW->HOST: REQ | 0x53 | funcID | txStatus
*/
BYTE                    /* RET:  TRUE - SUC is known to this controller, FALSE - SUC unknown*/
ZW_RequestNetWorkUpdate(
  VOID_CALLBACKFUNC(completedFunc)(BYTE txStatus)); /* call back function indicates of the update sucessed or failed*/

/*=====================   ZW_AssignSUCReturnRoute   ========================
**
**    Assign static return routes within a Routing Slave node.
**    Calculate the shortest transport routes to a Routing Slave node
**    from the Static Update Controller Node and
**    transmit the return routes to the Routing Slave node.
**
** void           RET  TRUE if process is started. FALSE if not
** ZW_AssignSUCReturnRoute(
**  BYTE  bSrcNodeID,        IN Routing Slave Node ID
**  VOID_CALLBACKFUNC(completedFunc)(
**    BYTE bStatus,
**    TX_STATUS_TYPE *txStatusReport)); IN  Status of process
**--------------------------------------------------------------------------*/
extern BOOL                         /*RET TRUE if process is started. FALSE if not*/
ZW_AssignSUCReturnRoute(
  BYTE  bSrcNodeID,                 /* IN Routing Slave Node ID */
  VOID_CALLBACKFUNC(completedFunc)( /* IN Callback function called when done */
    BYTE bStatus,
    TX_STATUS_TYPE *txStatusReport));

/*====================   ZW_AssignPrioritySUCReturnRoute   ====================
**
**    Assign static return routes within a Routing Slave node.
**    Calculate the shortest transport routes to a Routing Slave node
**    from the Static Update Controller Node and
**    transmit the return routes to the Routing Slave node.
**
** void           RET  TRUE if process is started. FALSE if not
** ZW_AssignPrioritySUCReturnRoute(
**  BYTE  bSrcNodeID,        IN Routing Slave Node ID
**  VOID_CALLBACKFUNC(completedFunc)(
**    BYTE bStatus,
**    TX_STATUS_TYPE *txStatusReport)); IN  Status of process
**--------------------------------------------------------------------------*/
extern BOOL                         /*RET TRUE if process is started. FALSE if not*/
ZW_AssignPrioritySUCReturnRoute(
  BYTE  bSrcNodeID,                 /* IN Routing Slave Node ID */
  XBYTE *pPriorityRoute,   /* IN Route to be assigned */
  VOID_CALLBACKFUNC(completedFunc)( /* IN Callback function called when done */
    BYTE bStatus,
    TX_STATUS_TYPE *txStatusReport));


/*========================   ZW_DeleteSUCReturnRoute   =======================
**
**    Delete Static Update Controller (SUC) static return routes within a
**    Routing Slave node. Transmit "NULL" routes to the Routing Slave node.
**
**--------------------------------------------------------------------------*/
extern BOOL             /*RET TRUE if delete SUC return routes was initiated. */
                        /*    FALSE if a return route assign/delete is allready active */
ZW_DeleteSUCReturnRoute(
  BYTE  bNodeID,        /*IN Routing Slave Node ID */
  VOID_CALLBACKFUNC(completedFunc)(     /*IN Callback function */
      BYTE bStatus,                     /*IN  Status of process */
      TX_STATUS_TYPE *txStatusReport)); /*IN  Detailed status info */


/*=====================   ZW_RequestNodeNeighborUpdate  ======================
**
**    Start neighbor discovery for bNodeID, if any other nodes present.
**
**    Side effects:
**
**--------------------------------------------------------------------------*/
BYTE                                /*RET TRUE neighbor discovery started */
ZW_RequestNodeNeighborUpdate(
  BYTE bNodeID,                     /* IN Node id */
  VOID_CALLBACKFUNC(completedFunc)(BYTE));/* IN Function to be called when the done */


/*============================   ZW_IsPrimaryCtrl   =========================
**    Function description
**      Returns TRUE When the controller is a primary.
**              FALSE if it is a slave
**    Side effects:
**
**--------------------------------------------------------------------------*/
BOOL ZW_IsPrimaryCtrl(void);


/*======================   ZW_GetControllerCapabilities  =====================
**    Function description
**      Returns the Controller capabilities
**      The returned capability is a bitmask where folowing bits are defined :
**       CONTROLLER_IS_SECONDARY
**       CONTROLLER_ON_OTHER_NETWORK
**       CONTROLLER_NODEID_SERVER_PRESENT
**       CONTROLLER_IS_REAL_PRIMARY
**       CONTROLLER_IS_SUC
**       NO_NODES_INCUDED
**
**    Side effects:
**
**--------------------------------------------------------------------------*/
BYTE
ZW_GetControllerCapabilities(void);


/*========================   ZW_GetNeighborCount   ===========================
**
**  Get number of neighbors the specified Node ID has registered
**
**  Returns:
**    0x00-0xE7               - Number of neighbors registered
**    NEIGHBORS_ID_INVALID    - specified node ID invalid
**    NEIGHBORS_COUNT_FAILED  - Could not access routeing information - try again later
**
**  Side effects:
**
**--------------------------------------------------------------------------*/
BYTE                  /*RET Number of neighbors */
ZW_GetNeighborCount(
  BYTE bNodeID);      /* IN Node ID on node to count neighbors on */


/*============================   ZW_RequestNodeInfo   ======================
**    Function description.
**     Request a node to send it's node information.
**     Function return TRUE if the request is send, else it return FALSE.
**     FUNC is a callback function, which is called with the status of the
**     Request nodeinformation frame transmission.
**     If a node sends its node info, ApplicationControllerUpdate will be called
**     with UPDATE_STATE_NODE_INFO_RECEIVED as status together with the received
**     nodeinformation.
**
**    Side effects:
**
**--------------------------------------------------------------------------*/
BOOL                      /*RET FALSE if transmitter busy */
ZW_RequestNodeInfo(
  BYTE nodeID,                     /*IN: node id of the node to request node info from it.*/
  VOID_CALLBACKFUNC(completedFunc)(BYTE, TX_STATUS_TYPE *)); /* IN Callback function */


/*===========================   SetLearnMode   ==============================
**    Enable/Disable home/node ID learn mode.
**    When learn mode is enabled, received "Assign ID's Command" are handled:
**    If the current stored ID's are zero, the received ID's will be stored.
**    If the received ID's are zero the stored ID's will be set to zero.
**
**    Side effects:
**
**--------------------------------------------------------------------------*/
void
ZW_SetLearnMode( /*RET  Nothing        */
  BYTE mode,                                       /* IN  learnMode bitmask */
  VOID_CALLBACKFUNC(completedFunc)(LEARN_INFO*));  /* IN Callback function */


/*==========================   ZW_AddNodeToNetwork   ========================
**
**    Add any type of node to the network
**
**    The modes are:
**
**    ADD_NODE_ANY            Add any node to the network
**    ADD_NODE_CONTROLLER     Add a controller to the network
**    ADD_NODE_SLAVE          Add a slave node to the network
**    ADD_NODE_STOP           Stop learn mode without reporting an error.
**    ADD_NODE_STOP_FAILED    Stop learn mode and report an error to the
**                            new controller.
**    ADD_NODE_RESERVED       Reserved
**    ADD_NODE_HOME_ID        Smart Start include the node matching specified DSK.
**                            Only applicable if used through ZW_AddNodeDskToNetwork
**    ADD_NODE_SMART_START    Smart Start search for aspiring node to include
**
**    ADD_NODE_OPTION_NORMAL_POWER    Set this flag in bMode for High Power inclusion.
**
**    Side effects:
**
**--------------------------------------------------------------------------*/
void
ZW_AddNodeToNetwork(
  BYTE bMode,
  VOID_CALLBACKFUNC(completedFunc)(LEARN_INFO*));

#ifdef ZW_SMARTSTART_ENABLED
void
ZW_AddNodeDskToNetwork(
  BYTE bMode,
  BYTE *pDsk,
  VOID_CALLBACKFUNC(completedFunc)(LEARN_INFO*));
#endif

/*==========================   ZW_RemoveNodeFromNetwork   ========================
**
**    Remove any type of node from the network
**
**    The modes are:
**
**    REMOVE_NODE_ANY            Remove any node from the network
**    REMOVE_NODE_CONTROLLER     Remove a controller from the network
**    REMOVE_NODE_SLAVE          Remove a slaev node from the network
**
**    REMOVE_NODE_STOP           Stop learn mode without reporting an error.
**
**    ADD_NODE_OPTION_NORMAL_POWER    Set this flag in bMode for High Power exclusion.
**
**    Side effects:
**
**--------------------------------------------------------------------------*/
void
ZW_RemoveNodeFromNetwork(
  BYTE bMode,
  VOID_CALLBACKFUNC(completedFunc)(LEARN_INFO*));


/*======================   ZW_RemoveNodeIDFromNetwork   ======================
**
**    Remove specific node ID from the network
**
**    - If valid nodeID (1-232) is specified then only the specified nodeID
**     matching the mode settings can be removed.
**    - If REMOVE_NODE_ID_ANY or none valid nodeID (0, 233-255) is specified
**     then any node which matches the mode settings can be removed.
**
**    The modes are:
**
**    REMOVE_NODE_ANY            Remove Specified nodeID (any type) from the network
**    REMOVE_NODE_CONTROLLER     Remove Specified nodeID (controller) from the network
**    REMOVE_NODE_SLAVE          Remove Specified nodeID (slave) from the network
**
**    REMOVE_NODE_STOP           Stop learn mode without reporting an error.
**
**    REMOVE_NODE_OPTION_NORMAL_POWER   Set this flag in bMode for Normal Power
**                                      exclusion.
**    REMOVE_NODE_OPTION_NETWORK_WIDE   Set this flag in bMode for enabling
**                                      Networkwide explore via explore frames
**
**    Side effects:
**
**--------------------------------------------------------------------------*/
void
ZW_RemoveNodeIDFromNetwork(
  BYTE bMode,
  BYTE bNodeID,
  VOID_CALLBACKFUNC(completedFunc)(LEARN_INFO*));


/*========================   ZW_ControllerChange   ======================
**
**    Transfer the role as primary controller to another controller
**
**    The modes are:
**
**    CONTROLLER_CHANGE_START          Start the creation of a new primary
**    CONTROLLER_CHANGE_STOP           Stop the creation of a new primary
**    CONTROLLER_CHANGE_STOP_FAILED    Report that the replication failed
**
**    ADD_NODE_OPTION_NORMAL_POWER       Set this flag in bMode for High Power exchange.
**
**    Side effects:
**
**--------------------------------------------------------------------------*/
void
ZW_ControllerChange(
  BYTE bMode,
  VOID_CALLBACKFUNC(completedFunc)(LEARN_INFO*));


/*==========================   ZW_AreNodesNeighbours   ============================
**
**  Are two specific nodes neighbours
**
**
**  Side effects:
**
**--------------------------------------------------------------------------*/
BOOL                     /*RET NONE ZERO if nodes are neighbours else ZERO  */
ZW_AreNodesNeighbours(
  BYTE bNodeA,           /* IN first node id */
  BYTE bNodeB);          /* IN second node id */


/*========================   ZW_SetRoutingMAX   ==============================
**
**  Set the maximum number of route tries which should be done before failing
**  or resorting to explore frame if this is specified
**
**  Side effects:
**
**--------------------------------------------------------------------------*/
void
ZW_SetRoutingMAX(
  BYTE maxRouteTries);


/*==========================   ZW_GetPriorityRoute   ======================
**    Function description
**
**      Returns NON ZERO if a Priority Route is found.
**        ZW_PRIORITY_ROUTE_APP_PR if Route is an App defined Priority Route
**        ZW_PRIORITY_ROUTE_ZW_LWR = Route is a Last Working Route
**        ZW_PRIORITY_ROUTE_ZW_NLWR = Route is a Next to Last Working Route
**
**      Returns FALSE if no Priority Route is found.
**
**      If Route is found then the found route is copied into the specified
**      ROUTECACHE_LINE_SIZE (5) byte sized byte array, where the first
**      4 bytes (index 0-3) contains the repeaters active in the route and
**      the last (index 4) byte contains the speed information.
**      First ZERO in repeaters (index 0-3) indicates no more repeaters in route
**      A direct route is indicated by the first repeater (index 0) being ZERO.
**
**      Example: 0,0,0,0,ZW_PRIORITY_ROUTE_SPEED_100K ->
**                  Direct 100K
**               2,3,0,0,ZW_PRIORITY_ROUTE_SPEED_40K  ->
**                  40K route through repeaters 2 and 3
**
**    Side effects:
**
**--------------------------------------------------------------------------*/
BYTE
ZW_GetPriorityRoute(
  BYTE bNodeID,
  XBYTE *pPriorityRoute);


#define ZW_STORE_NODE_INFO(bNodeID, pNodeInfo, func) ZW_StoreNodeInfo(bNodeID, pNodeInfo, func)
/*==========================   ZW_StoreNodeInfo   ===============================
**
**    Add node info to node info list in EEPROM
**
**    Side effects:
**
**-------------------------------------------------------------------------------*/
BOOL ZW_StoreNodeInfo(  /*  RET  TRUE if stored*/
  BYTE bNodeID,         /*  IN   Node ID */
  BYTE *pNodeInfo,      /*  IN   Pointer to node info frame */
  void (CODE *func)());  /* IN   callback function. Called when data has been stored*/

#define ZW_STORE_HOME_ID(homeID, nodeID) ZW_StoreHomeID(homeID, nodeID)
/*==========================   ZW_StoreHomeID   ===============================
**
**    Save the homeID and node ID in EEPROM
**
**    Side effects:
**
**-------------------------------------------------------------------------------*/
BYTE               /*RET FALSE if write buffer full         */
ZW_StoreHomeID(
  BYTE *homeID,    /* IN Home-ID            */
  BYTE  nodeID );  /* IN Node-ID            */


#endif /* _ZW_CONTROLLER_API_H_ */

