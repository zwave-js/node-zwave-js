/****************************************************************************
 *
 * Copyright (c) 2001-2013
 * Sigma Designs, Inc.
 * All Rights Reserved
 *
 *---------------------------------------------------------------------------
 *
 * Description: Z-Wave Transport Application layer interface
 *
 * Author:   Ivar Jeppesen
 *
 * Last Changed By:  $Author: jsi $
 * Revision:         $Revision: 31344 $
 * Last Changed:     $Date: 2015-04-17 13:53:23 +0200 (fr, 17 apr 2015) $
 *
 ****************************************************************************/
/**
 * \file ZW_transport_api.h
 * \brief Z-Wave Transport Application layer interface.
 *
 * The Z Wave transport layer controls transfer of data between Z Wave nodes
 * including retransmission, frame check and acknowledgement. The Z Wave
 * transport interface includes functions for transfer of data to other Z Wave
 * nodes. Application data received from other nodes is handed over to the
 * application via the \ref ApplicationCommandHandler function. The ZW_MAX_NODES
 * define defines the maximum of nodes possible in a Z Wave network.
 */
#ifndef _ZW_TRANSPORT_API_H_
#define _ZW_TRANSPORT_API_H_
#include <ZW_security_api.h>
#include <ZW_nodemask_api.h>

/****************************************************************************/
/*                              INCLUDE FILES                               */
/****************************************************************************/

/****************************************************************************/
/*                     EXPORTED TYPES and DEFINITIONS                       */
/****************************************************************************/

/* Max number of nodes in a Z-wave system */
#define ZW_MAX_NODES        232

/************************************************************/
/* Node Information frame*/
/************************************************************/
#define NODEPARM_MAX  35   /* max. number of parameters */


/* Transmit frame option flags */
#define TRANSMIT_OPTION_ACK                     0x01    /* request acknowledge from destination node */
#define TRANSMIT_OPTION_LOW_POWER               0x02    /* transmit at low output power level (1/3 of normal RF range) */
#define TRANSMIT_OPTION_MULTICAST_AS_BROADCAST  0x02    /* The multicast frame should be send as a broadcast */
#ifdef ZW_SLAVE
#define TRANSMIT_OPTION_RETURN_ROUTE            0x04    /* request transmission via return route */
#endif
#define TRANSMIT_OPTION_AUTO_ROUTE              0x04    /* request retransmission via repeater nodes */
/* do not use response route - Even if available */
#define TRANSMIT_OPTION_NO_ROUTE                0x10
/* Use explore frame if needed */
#define TRANSMIT_OPTION_EXPLORE                 0x20

/* Transmit frame option flag which are valid when sending explore frames  */
#define TRANSMIT_EXPLORE_OPTION_ACK         TRANSMIT_OPTION_ACK
#define TRANSMIT_EXPLORE_OPTION_LOW_POWER   TRANSMIT_OPTION_LOW_POWER

/* Allow Transport Service segmentation of long messages */
#define TRANSMIT_OPTION_2_TRANSPORT_SERVICE 0x01
#define TRANSMIT_OPTION_2_FOLLOWUP          0x08

/* Received frame status flags */
/**
 *  \defgroup RECEIVE_STATUS Status codes for receiving frames.
 * \addtogroup RECEIVE_STATUS
 * @{
 */

/**
 * A response route is locked by the application
 */
#define RECEIVE_STATUS_ROUTED_BUSY    0x01
/**
 * Received at low output power level, this must
 * have the same value as TRANSMIT_OPTION_LOW_POWER
 */
#define RECEIVE_STATUS_LOW_POWER      0x02
/**
 * Mask for masking out the received frametype bits
 */
#define RECEIVE_STATUS_TYPE_MASK      0x0C
/**
 * Received frame is singlecast frame (rxOptions == xxxx00xx)
 */
#define RECEIVE_STATUS_TYPE_SINGLE    0x00
/**
 * Received frame is broadcast frame  (rxOptions == xxxx01xx)
 */
#define RECEIVE_STATUS_TYPE_BROAD     0x04
/**
 * Received frame is multicast frame (rxOptions == xxxx10xx)
 */
#define RECEIVE_STATUS_TYPE_MULTI     0x08
/**
 * Received frame is an explore frame (rxOptions == xxx1xxxx)
 * Only TYPE_BROAD can be active at the same time as TYPE_EXPLORE
 */
#define RECEIVE_STATUS_TYPE_EXPLORE   0x10
/**
 * Received frame is not send to me (rxOptions == x1xxxxxx)
 * - useful only in promiscuous mode
 */
#define RECEIVE_STATUS_FOREIGN_FRAME  0x40
/**
 * Received frame is send on another network (rxOptions == 1xxxxxxx)
 * - useful only in Smart Start - used when receiving INIF from another network
 */
#define RECEIVE_STATUS_FOREIGN_HOMEID 0x80

/**
 * @}
 */

/* Predefined Node ID's */
#define NODE_BROADCAST              0xFF    /* broadcast */
#define ZW_TEST_NOT_A_NODEID        0x00    /* */

/* Transmit complete codes */
#define TRANSMIT_COMPLETE_OK      0x00
#define TRANSMIT_COMPLETE_NO_ACK  0x01  /* retransmission error */
#define TRANSMIT_COMPLETE_FAIL    0x02  /* transmit error */
#define TRANSMIT_ROUTING_NOT_IDLE 0x03  /* transmit error */
#ifdef ZW_CONTROLLER
/* Assign route transmit complete but no routes was found */
#define TRANSMIT_COMPLETE_NOROUTE 0x04  /* no route found in assignroute */
                                        /* therefore nothing was transmitted */
#define TRANSMIT_COMPLETE_VERIFIED 0x05 /* Verified delivery */
#endif

/* ZW_REDISCOVERY_NEEDED callback values. */
/* Note that they are different from ZW_REQUEST_NETWORK_UPDATE callbacks */
#define ZW_ROUTE_LOST_FAILED      0x04  /*Node Asked wont help us*/
#define ZW_ROUTE_LOST_ACCEPT      0x05  /*Accepted to help*/


#ifdef ZW_ROUTING_DEMO
/* Max hops in route */
#define TRANSMIT_ROUTED_ATTEMPT   0x08
#endif /*ZW_ROUTING_DEMO*/

#define ZW_MAX_CACHED_RETURN_ROUTE_DESTINATIONS  5

#define ZW_RF_TEST_SIGNAL_CARRIER              0x00
#define ZW_RF_TEST_SIGNAL_CARRIER_MODULATED    0x01

/* Max hops in route */
#define MAX_REPEATERS      4


/* TX_STATUS_TYPE Last Used Route array size definitions */
#define LAST_USED_ROUTE_CONF_SIZE               1
#define LAST_USED_ROUTE_SIZE                    (MAX_REPEATERS + LAST_USED_ROUTE_CONF_SIZE)

/* TX_STATUS_TYPE Last Used Route array index definitions */
#define LAST_USED_ROUTE_REPEATER_0_INDEX        0
#define LAST_USED_ROUTE_REPEATER_1_INDEX        1
#define LAST_USED_ROUTE_REPEATER_2_INDEX        2
#define LAST_USED_ROUTE_REPEATER_3_INDEX        3
#define LAST_USED_ROUTE_CONF_INDEX              4


/* RSSI feedback constants */
/* This is a signed 8-bit value. Note that values from RSSI_RESERVED_START to
 * 124 are reserved. All values below RSSI_RESERVED_START are received power
 * in dBms. Other values are defined below. */
#define RSSI_NOT_AVAILABLE 127       /* RSSI measurement not available */
#define RSSI_MAX_POWER_SATURATED 126 /* Receiver saturated. RSSI too high to measure precisely. */
#define RSSI_BELOW_SENSITIVITY 125   /* No signal detected. The RSSI is too low to measure precisely. */
#define RSSI_RESERVED_START    11    /* All values above and including RSSI_RESERVED_START are reserved,
                                        except those defined above. */


/* RSSI value array used in TX_STATUS_TYPE.
 * Each value is an RSSI feedback constant defined above. */
struct rssi_val {
  signed char incoming[MAX_REPEATERS + 1];
};

typedef struct _S_ROUTE_LINK_
{
  BYTE from;
  BYTE to;
} S_ROUTE_LINK;

/* Transport routing scheme state define definitions */
/* 1 = direct, 2 = ApplicationStaticRoute, 3 = responseRoute/lastworkingRoute, */
/* 4 = Next to LastWorkingRoute(controller), 5 = returnRoute/controllerAutoRoute, 6 = directResort and 7 = explore */
typedef enum _E_ROUTING_SCHEME_
{
  ROUTINGSCHEME_IDLE = 0,
  ROUTINGSCHEME_DIRECT = 1,
  ROUTINGSCHEME_CACHED_ROUTE_SR = 2,
  ROUTINGSCHEME_CACHED_ROUTE = 3,
  ROUTINGSCHEME_CACHED_ROUTE_NLWR = 4,
  ROUTINGSCHEME_ROUTE = 5,
  ROUTINGSCHEME_RESORT_DIRECT = 6,
  ROUTINGSCHEME_RESORT_EXPLORE = 7
} E_ROUTING_SCHEME;


typedef struct _TX_STATUS_TYPE_
{
  WORD wTransmitTicks;  /* Passed 10ms ticks */
  BYTE bRepeaters;         /* Repeaters in route, zero for direct range */
  /* rssi_values per hop for direct and routed frames.
   * Contains repeaters + 1 values. */
  struct rssi_val rssi_values;
  BYTE bACKChannelNo;
  BYTE bLastTxChannelNo;
  E_ROUTING_SCHEME bRouteSchemeState;
  BYTE pLastUsedRoute[LAST_USED_ROUTE_SIZE];
  BYTE bRouteTries;
  S_ROUTE_LINK bLastFailedLink;
} TX_STATUS_TYPE;


typedef struct _RECEIVE_OPTIONS_TYPE
{
  /* Frame header info */
  BYTE  rxStatus;
  /* Command sender Node ID */
  BYTE  sourceNode;
  /* Frame destination ID, only valid when frame is not Multicast*/
  BYTE  destNode;
  /* Average RSSI val in dBm as defined in RSSI feedback constants above */
  signed char rxRSSIVal;
  /* Security key frame was received with. */
  enum SECURITY_KEY securityKey;
} RECEIVE_OPTIONS_TYPE;


#if defined(ZW_SLAVE_ENHANCED_232) || defined(ZW_SLAVE_ROUTING)
enum ZW_SENDDATA_EX_RETURN_CODES
{
    ZW_TX_FAILED = 0,
    ZW_TX_IN_PROGRESS = 1
} ;


/**
* This flag will activate frame delivery.
*
* In this transmission mode the S2_send_data will try
* to verify that the receiver understood the sent message.
* This is done by waiting a little to see if the node will
* respond nonce report to the encrypted message. If the node
* does respond with a nonce report then the S2_send_data
* call will automatically cause the system to re-sync the node,
* and deliver the message
*
*/
#define S2_TXOPTION_VERIFY_DELIVERY 1

/**
* This flag must be present on all single cast followup messages.
*/
#define S2_TXOPTION_SINGLECAST_FOLLOWUP 2

/**
* This flag must be present on the first, and only the first single
* cast followup message in a S2 multicast transmission.
*/
#define S2_TXOPTION_FIRST_SINGLECAST_FOLLOWUP 4


/* Transmit options for ZW_SendDataEx */
typedef struct _TRANSMIT_OPTIONS_TYPE
{
  /* Destination node ID - 0xFF == all nodes */
  BYTE destNode;
  /* Reserved */
  BYTE bSrcNode;
  /* Transmit options*/
  BYTE txOptions;
  /* Options for enabling specific Security scheme functionality */
  BYTE txSecOptions;
  /* Security key to use for sending. */
  enum SECURITY_KEY securityKey;
  /* More transmit options */
  BYTE txOptions2;
} TRANSMIT_OPTIONS_TYPE;

/* Transmit options for ZW_SendDataMultiEx */
typedef struct _TRANSMIT_MULTI_OPTIONS_TYPE
{
  /* Destination group ID */
  BYTE groupID;
  /* Reserved */
  BYTE bSrcNode;
  /* Transmit options*/
  BYTE txOptions;
  /* Security key to use for sending - only S2 keys are valid. */
  enum SECURITY_KEY securityKey;
} TRANSMIT_MULTI_OPTIONS_TYPE;

typedef BYTE nodemask_t[MAX_NODEMASK_LENGTH];

#endif /* #if defined(ZW_SLAVE_ENHANCED_232) || defined(ZW_SLAVE_ROUTING) */



#ifdef ZW_SLAVE_ROUTING

/*============================   ZW_RouteDestinations   ======================
**    Structure description
**      This contains a list of nodes that currently can be reached via
**      return routes.
**      This list MUST not be altered by the Application
**
**--------------------------------------------------------------------------*/
extern BYTE ZW_RouteDestinations[ZW_MAX_CACHED_RETURN_ROUTE_DESTINATIONS];

#endif  /* ZW_SLAVE_ROUTING */

#if defined(ZW_CONTROLLER) && !defined(ZW_CONTROLLER_BRIDGE) || (defined(ZW_SLAVE) && !defined(ZW_SLAVE_ROUTING) && !defined(ZW_SLAVE_ENHANCED_232))
/*==============================   ZW_SendData   ============================
**    Transmit data buffer to a single ZW-node or all ZW-nodes (broadcast).
**
**
**    txOptions:
**          TRANSMIT_OPTION_LOW_POWER   transmit at low output power level (1/3 of
**                                      normal RF range).
**          TRANSMIT_OPTION_ACK         the multicast frame will be followed by a
**                                      singlecast frame to each of the destination nodes
**                                      and request acknowledge from each destination node.
**          TRANSMIT_OPTION_AUTO_ROUTE  request retransmission on singlecast frames
**                                      via repeater nodes (at normal output power level).
**          TRANSMIT_OPTION_EXPLORE     Use explore frame route resolution if all else fails
**
** extern BYTE             RET  FALSE if transmitter queue overflow
** ZW_SendData(
**   BYTE  nodeID,          IN  Destination node ID (0xFF == broadcast)
**   BYTE *pData,           IN  Data buffer pointer
**   BYTE  dataLength,      IN  Data buffer length
**   BYTE  txOptions,       IN  Transmit option flags
**   VOID_CALLBACKFUNC(completedFunc)( IN  Transmit completed call back function
**     BYTE txStatus,       IN  Transmit status
**     TX_STATUS_TYPE*));   IN  Transmit status report
**--------------------------------------------------------------------------*/
#define ZW_SEND_DATA(node,data,length,options,func) ZW_SendData(node,data,length,options,func)

#endif /* #if defined(ZW_CONTROLLER) && !defined(ZW_CONTROLLER_BRIDGE) || (defined(ZW_SLAVE) && !defined(ZW_SLAVE_ROUTING) && !defined(ZW_SLAVE_ENHANCED_232)) */

#ifdef ZW_CONTROLLER_BRIDGE

/*===============================   ZW_SendData_Bridge   =======================
**    Transmit data buffer to a single ZW-node or all ZW-nodes (broadcast).
**
**
**    txOptions:
**          TRANSMIT_OPTION_LOW_POWER   transmit at low output power level (1/3 of
**                                      normal RF range).
**          TRANSMIT_OPTION_ACK         The destination is asked to acknowledge the reception
**                                      of the frame. A maximum of 2 retries are done if no
**                                      ACK received.
**          TRANSMIT_OPTION_AUTO_ROUTE  request retransmission on singlecast frames
**                                      via repeater nodes (at normal output power level).
**          TRANSMIT_OPTION_EXPLORE     Use explore frame route resolution if all else fails
**
** extern BYTE             RET  FALSE if transmitter queue overflow
** ZW_SendData_Bridge(
**   BYTE  bSrcNodeID,      IN  Source node ID
**   BYTE  nodeID,          IN  Destination node ID (0xFF == broadcast)
**   BYTE *pData,           IN  Data buffer pointer
**   BYTE  dataLength,      IN  Data buffer length
**   BYTE  txOptions,       IN  Transmit option flags
**   VOID_CALLBACKFUNC(completedFunc)( IN  Transmit completed call back function
**     BYTE txStatus,       IN  Transmit status
**     TX_STATUS_TYPE*));   IN  Transmit status report
**--------------------------------------------------------------------------*/
/* For backward compilability */
#define ZW_SendData(node,data,length,options,func) ZW_SendData_Bridge(0xff,node,data,length,options,func)
#define ZW_SEND_DATA(node,data,length,options,func) ZW_SendData_Bridge(0xff,node,data,length,options,func)
/* Use this */
#define ZW_SEND_DATA_BRIDGE(srcnode,node,data,length,options,func) ZW_SendData_Bridge(srcnode,node,data,length,options,func)

#endif  /* ZW_CONTROLLER_BRIDGE */


#if defined(ZW_CONTROLLER) || defined(ZW_SLAVE_ROUTING)

/*============================   ZW_SendDataAbort   ========================
**    Abort the ongoing transmit started with ZW_SendData()
**
**    Side effects:
**
**--------------------------------------------------------------------------*/
#define ZW_SEND_DATA_ABORT() ZW_SendDataAbort()


#ifndef ZW_CONTROLLER_BRIDGE
/*===============================   ZW_SendDataMulti   ======================
**    Transmit data buffer to a list of Z-Wave Nodes (multicast frame).
**
**
**    txOptions:
**          TRANSMIT_OPTION_LOW_POWER   transmit at low output power level (1/3 of
**                                      normal RF range).
**          TRANSMIT_OPTION_ACK         the multicast frame will be followed by a
**                                      singlecast frame to each of the destination nodes
**                                      and request acknowledge from each destination node.
**          TRANSMIT_OPTION_AUTO_ROUTE  request retransmission on singlecast frames
**                                      via repeater nodes (at normal output power level).
**
** extern BYTE            RET  FALSE if transmitter queue overflow
** ZW_SendDataMulti(
**  BYTE *pNodeIDList,     IN  List of destination node ID's
**  BYTE  numberNodes,     IN  Number of Nodes
**  BYTE *pData,           IN  Data buffer pointer
**  BYTE  dataLength,      IN  Data buffer length
**  BYTE  txOptions,       IN  Transmit option flags
**  VOID_CALLBACKFUNC(completedFunc)( IN  Transmit completed call back function
**    BYTE txStatus));     IN  Transmit status
**--------------------------------------------------------------------------*/
#define ZW_SEND_DATA_MULTI(nodelist,data,length,options,func) ZW_SendDataMulti(nodelist,data,length,options,func)

#else

/*=============================   ZW_SendDataMulti_Bridge   ====================
**    Transmit data buffer to a list of Z-Wave Nodes (multicast frame).
**
**
**    txOptions:
**          TRANSMIT_OPTION_LOW_POWER   transmit at low output power level (1/3 of
**                                      normal RF range).
**          TRANSMIT_OPTION_ACK         the multicast frame will be followed by a
**                                      singlecast frame to each of the destination nodes
**                                      and request acknowledge from each destination node.
**          TRANSMIT_OPTION_AUTO_ROUTE  request retransmission on singlecast frames
**                                      via repeater nodes (at normal output power level).
**          TRANSMIT_OPTION_EXPLORE     Use explore frame route resolution if all else fails
**
** extern BYTE            RET  FALSE if transmitter queue overflow
** ZW_SendDataMulti_Bridge(
**  BYTE bSrcNodeID,       IN  Source NodeID - if 0xFF then controller ID is set as source
**  BYTE *pNodeIDList,     IN  List of destination node ID's
**  BYTE  numberNodes,     IN  Number of Nodes
**  BYTE *pData,           IN  Data buffer pointer
**  BYTE  dataLength,      IN  Data buffer length
**  BYTE  txOptions,       IN  Transmit option flags
**  VOID_CALLBACKFUNC(completedFunc)( IN  Transmit completed call back function
**    BYTE txStatus));     IN  Transmit status
**--------------------------------------------------------------------------*/
#define ZW_SendDataMulti(nodelist,data,length,options,func) ZW_SendDataMulti_Bridge(0xff,nodelist,data,length,options,func)
#define ZW_SEND_DATA_MULTI(nodelist,data,length,options,func) ZW_SendDataMulti_Bridge(0xff,nodelist,data,length,options,func)
#define ZW_SEND_DATA_MULTI_BRIDGE(srcId,nodelist,data,length,options,func) ZW_SendDataMulti_Bridge(srcId,nodelist,data,length,options,func)

#endif  /* !ZW_CONTROLLER_BRIDGE */

#endif  /* ZW_CONTROLLER || ZW_SLAVE_ROUTING */


/*============================   ZW_SEND_CONST =============================
**    Function description
**      If production test is enabled during start up.
**      Calling this function will transmit a constant signal until a new
**      RF function is called
**
**--------------------------------------------------------------------------*/
#define ZW_SEND_CONST() ZW_SendConst(TRUE, 1, ZW_RF_TEST_SIGNAL_CARRIER)


#ifdef ZW_SLAVE
/*============================ ZW_LOCK_RESPONSE_ROUTE ========================
**    Function description
**      This function locks and unlocks all return routes
**      IN  nodeID  != 0x00 lock route to node
**          nodeDI == 0x00 unlock entry
**    Side effects:
**
**--------------------------------------------------------------------------*/
#define ZW_LOCK_RESPONSE_ROUTE(node) ZW_LockRoute(node)

#else

/*============================ ZW_LOCK_RESPONSE_ROUTE ========================
**    Function description
**      This function locks and unlocks all Last Working Routes for purging
**      IN  bLockRoute == TRUE lock all Last Working Routes - no purging allowed
**          bLockRoute == FALSE unlock purging of Last Working Routes
**
**    Side effects:
**
**--------------------------------------------------------------------------*/
#define ZW_LOCK_RESPONSE_ROUTE(bLockRoute) ZW_LockRoute(bLockRoute)
#define ZW_LOCK_ROUTE(bLockRoute) ZW_LockRoute(bLockRoute)

#endif  /* ZW_SLAVE */


/****************************************************************************/
/*                              EXPORTED DATA                               */
/****************************************************************************/

/****************************************************************************/
/*                           EXPORTED FUNCTIONS                             */
/****************************************************************************/

#ifdef ZW_SLAVE
/* TO#2133 fix - Keil compiler >7.50(8.xx) seems to have been changed somehow */
/* in the preprocessor part as if the 2 ZW_LockRoute definitions was ifdefed */
/* by ifdef ZW_SLAVE ... endif and ifdef ZW_CONTROLLER ... endif instead of */
/* ifdef ZW_SLAVE ... else ... endif, the Keil >7.50 reports Warning C235 */
/* on slave/slave routing/slave enhanced targets. */
/*============================   ZW_LockRoute   ==============================
**    Function description
**      This function locks and unlocks any temporary route to a specific nodeID
**    Side effects:
**
**--------------------------------------------------------------------------*/
void
ZW_LockRoute(
  BYTE bNodeID);          /* IN if nonezero lock bNodeID entry, */
                          /*    zero unlock entry */

#else  /* ZW_SLAVE */

/*=============================   ZW_LockRoute   ============================
**    Function description
**      IF bLockRoute TRUE then any attempt to purge a LastWorkingRoute entry
**      is denied.
**
**    Side effects:
**
**
**--------------------------------------------------------------------------*/
void
ZW_LockRoute(
  BOOL bLockRoute);       /* IN TRUE lock LastWorkingRoute entry purging */
                          /*    FALSE unlock LastWorkingRoute entry purging */
#endif  /* ZW_SLAVE */


/**============================   ZW_SendConst  =============================
**    Function description
**      Start/Stop generate RF test signal in a desired channel
**      Signal can be
**                a carrier only
**                a modulated carrier
**
**      Side effects:
**-------------------------------------------------------------------------------------------------*/

void
ZW_SendConst(
              BYTE bStart,  /*IN TRUE start sending RF test signal, FALSE disable RF test signal*/
              BYTE bChNo,   /*IN channle number to send RF test signal on*/
              BYTE bSignalType ); /*IN The RF test signal type.*/

#if defined(ZW_CONTROLLER) && !defined(ZW_CONTROLLER_BRIDGE) || (defined(ZW_SLAVE) && !defined(ZW_SLAVE_ROUTING) && !defined(ZW_SLAVE_ENHANCED_232))
/*===============================   ZW_SendData   ===========================
**    Transmit data buffer to a single ZW-node or all ZW-nodes (broadcast).
**
**
**    txOptions:
**          TRANSMIT_OPTION_LOW_POWER     transmit at low output power level
**                                        (1/3 of normal RF range).
**          TRANSMIT_OPTION_ACK           request destination node for an acknowledge
**                                        that the frame has been received;
**                                        completedFunc (if NONE NULL) will return result.
**          TRANSMIT_OPTION_AUTO_ROUTE    request retransmission via repeater
**                                        nodes/return routes (at normal output power level).
**          TRANSMIT_OPTION_EXPLORE       Use explore frame route resolution if all else fails
**
** extern BYTE            RET  FALSE if transmitter queue overflow
** ZW_SendData(
** BYTE  destNodeID,      IN  Destination node ID (0xFF == broadcast)
** BYTE *pData,           IN  Data buffer pointer
** BYTE  dataLength,      IN  Data buffer length
** BYTE  txOptions,       IN  Transmit option flags
** VOID_CALLBACKFUNC(completedFunc)( IN  Transmit completed call back function
**   BYTE txStatus,       IN  Transmit status
**   TX_STATUS_TYPE*));   IN  Transmit status report
**--------------------------------------------------------------------------*/
BYTE            /*RET  FALSE if transmitter busy      */
ZW_SendData(
  BYTE  destNodeID,           /*IN  Destination node ID (0xFF == broadcast) */
  BYTE *pData,                /*IN  Data buffer pointer           */
  BYTE  dataLength,           /*IN  Data buffer length            */
  BYTE  txOptions,            /*IN  Transmit option flags         */
  VOID_CALLBACKFUNC(completedFunc)(BYTE, TX_STATUS_TYPE*)); /*IN  Transmit completed call back function  */

#endif /* #if defined(ZW_CONTROLLER) && !defined(ZW_CONTROLLER_BRIDGE) || (defined(ZW_SLAVE) && !defined(ZW_SLAVE_ROUTING) && !defined(ZW_SLAVE_ENHANCED_232)) */

#ifdef ZW_CONTROLLER_BRIDGE

/*============================   ZW_SendData_Bridge   ========================
**    Transmit data buffer to a single ZW-node or all ZW-nodes (broadcast).
**
**
**    txOptions:
**          TRANSMIT_OPTION_LOW_POWER     transmit at low output power level
**                                        (1/3 of normal RF range).
**          TRANSMIT_OPTION_ACK           request destination node for an acknowledge
**                                        that the frame has been received;
**                                        completedFunc (if NONE NULL) will return result.
**          TRANSMIT_OPTION_AUTO_ROUTE    request retransmission via repeater
**                                        nodes (at normal output power level).
**
** extern BYTE            RET FALSE if transmitter queue overflow
** ZW_SendData_Bridge(
**  BYTE  bSrcNodeID,      IN Source NodeID - if 0xFF then controller ID is set as source
**  BYTE  nodeID,          IN Destination node ID (0xFF == broadcast)
**  BYTE *pData,           IN Data buffer pointer
**  BYTE  dataLength,      IN Data buffer length
**  BYTE  txOptions,       IN Transmit option flags
**  VOID_CALLBACKFUNC(completedFunc)( IN  Transmit completed call back function
**    BYTE txStatus,       IN  Transmit status
**    TX_STATUS_TYPE*));   IN  Transmit status report
**--------------------------------------------------------------------------*/
extern BYTE                   /*RET FALSE if transmitter busy      */
ZW_SendData_Bridge(
  BYTE  bSrcNodeID,           /*IN  Source NodeID - if 0xFF then controller ID is set as source */
  BYTE  nodeID,               /*IN  Destination node ID (0xFF == broadcast) */
  BYTE *pData,                /*IN  Data buffer pointer           */
  BYTE  dataLength,           /*IN  Data buffer length            */
  BYTE  txOptions,            /*IN  Transmit option flags         */
  VOID_CALLBACKFUNC(completedFunc)(BYTE, TX_STATUS_TYPE*)); /*IN  Transmit completed call back function  */

#endif  /* !ZW_CONTROLLER_BRIDGE */


/*============================   ZW_SendDataAbort   ========================
**    Abort the ongoing transmit started with ZW_SendData()
**
**    Side effects:
**
**--------------------------------------------------------------------------*/
void                /*RET FALSE if transmitter busy      */
ZW_SendDataAbort(void);


#ifndef ZW_CONTROLLER_BRIDGE
/*===============================   ZW_SendDataMulti   ======================
**    Transmit data buffer to a list of Z-Wave Nodes (multicast frame).
**
**
**    txOptions:
**          TRANSMIT_OPTION_LOW_POWER   transmit at low output power level (1/3 of
**                                      normal RF range).
**          TRANSMIT_OPTION_ACK         the multicast frame will be followed by a
**                                      singlecast frame to each of the destination nodes
**                                      and request acknowledge from each destination node.
**          TRANSMIT_OPTION_AUTO_ROUTE  request retransmission on singlecast frames via
**                                      repeater nodes/return routes (at normal output power level).
**
**--------------------------------------------------------------------------*/
extern BYTE            /*RET  FALSE if transmitter busy      */
ZW_SendDataMulti(
  BYTE *pNodeIDList,          /*IN  List of destination node ID's */
  BYTE *pData,                /*IN  Data buffer pointer           */
  BYTE  dataLength,           /*IN  Data buffer length            */
  BYTE  txOptions,            /*IN  Transmit option flags         */
  VOID_CALLBACKFUNC(completedFunc)(BYTE)); /*IN  Transmit completed call back function  */

#else

/*===============================   ZW_SendDataMulti_Bridge   ================
**    Transmit data buffer to a list of Z-Wave Nodes (multicast frame).
**
**
**    txOptions:
**          TRANSMIT_OPTION_LOW_POWER   transmit at low output power level (1/3 of
**                                      normal RF range).
**          TRANSMIT_OPTION_ACK         the multicast frame will be followed by a
**                                      singlecast frame to each of the destination nodes
**                                      and request acknowledge from each destination node.
**          TRANSMIT_OPTION_AUTO_ROUTE  request retransmission on singlecast frames
**                                      via repeater nodes (at normal output power level).
**
**--------------------------------------------------------------------------*/
extern BYTE            /*RET  FALSE if transmitter busy      */
ZW_SendDataMulti_Bridge(
  BYTE bSrcNodeID,     /*IN Source nodeID - if 0xFF then controller is set as source */
  BYTE *pNodeIDList,   /*IN List of destination node ID's */
  BYTE *pData,         /*IN Data buffer pointer           */
  BYTE  dataLength,    /*IN Data buffer length            */
  BYTE  txOptions,     /*IN Transmit option flags         */
  VOID_CALLBACKFUNC(completedFunc)(BYTE)); /*IN  Transmit completed call back function  */
#endif  /* !ZW_CONTROLLER_BRIDGE */

#if defined(ZW_SLAVE_ENHANCED_232) || defined(ZW_SLAVE_ROUTING)
/**
 * Send multicast security s2 encrypted frame.
 * Only the MultiCast/Groupcast frame itself will be transmitted. There will be no single cast follow ups.
 *
 * \param pData             plaintext to which is going to be sent.
 * \param dataLength        length of data to be sent.
 * \param pTxOptionMultiEx  Transmit options structure containing the transmission source, transmit options and
 *                          the groupID which is the connection handle for the mulicast group to use,
 *
 */
enum ZW_SENDDATA_EX_RETURN_CODES                /*RET Return code      */
ZW_SendDataMultiEx(
  BYTE *pData,            /* IN Data buffer pointer           */
  BYTE  dataLength,       /* IN Data buffer length            */
  TRANSMIT_MULTI_OPTIONS_TYPE *pTxOptionsMultiEx,
  VOID_CALLBACKFUNC(completedFunc)(BYTE)); /* IN Transmit completed call back function */


/*===============================   ZW_SendDataEx   ===========================
**    Transmit data buffer to a single ZW-node or all ZW-nodes (broadcast).
**
**  This supersedes the old ZW_SendData and adds support for secure
**  transmissions.
**
**    pData                             Pointer to the payload data to be transmitted
**
**    dataLength                        Payload data length
**
**    pTxOptionsEx                      Points to Transmit options structure containing:
**
**      destNode
**        destination node id - 0xFF means broadcast to all nodes
**
**      bSrcNode
**        Reserved for future use.
**
**      txOptions:
**        TRANSMIT_OPTION_LOW_POWER     transmit at low output power level
**                                      (1/3 of normal RF range).
**        TRANSMIT_OPTION_ACK           the destination nodes
**                                      and request acknowledge from each
**                                      destination node.
**        TRANSMIT_OPTION_AUTO_ROUTE    request retransmission via return route.
**        TRANSMIT_OPTION_EXPLORE       Use explore frame route resolution if all else fails
**
**
**      securityKeys:
**
**
**      txOptions2
**
**
**--------------------------------------------------------------------------*/
enum ZW_SENDDATA_EX_RETURN_CODES                /*RET Return code      */
ZW_SendDataEx(
  BYTE *pData,      /* IN Data buffer pointer           */
  BYTE  dataLength, /* IN Data buffer length            */
  TRANSMIT_OPTIONS_TYPE *pTxOptionsEx,
  VOID_CALLBACKFUNC(completedFunc)(BYTE, TX_STATUS_TYPE*));
#endif /* #if defined(ZW_SLAVE_ENHANCED_232) || defined(ZW_SLAVE_ROUTING) */


#ifdef ZW_PROMISCUOUS_MODE
/*===============================   ZW_GetNodeIDMaskList   ======================
**    Get the recieved multicast frame's destinations nodes mask list
**    Side effects:
**            The API should only be called before returning from ApplicationCommandHandler
**------------------------------------------------------------------------------------------------------*/
BYTE                            /*RET: nodeID mask offset*/
ZW_GetNodeIDMaskList(
  BYTE **pNodeIDMaskList,      /* OUT destinations nodes mask list*/
  BYTE  *pMaskListLen);        /* OUTthe destinations nodes mask list length*/

#endif

/*=======================   ZW_SetListenBeforeTalkThreshold   =================
**    Set the threshold that should be added to the standard -75dBm used
**    in JP listen before talk.
**
**    Side effects:
**
**--------------------------------------------------------------------------*/
void                              /*RET: Nothing */
ZW_SetListenBeforeTalkThreshold(
  BYTE bChannel,                  /*IN: RF channel to set the threshold for */
  BYTE bThreshold);               /*IN: Threshold to be added to RSSI limit */

/**
 * Return Version on supplied Command Class if supported by protocol.
 * If supplied Command Class not supported by protocol then UNKNOWN_VERSION is returned.
 *
 * \param commandClass    command class to query for version.
 *
 */
BYTE                                  /*RET Version of supplied command class */
ZW_Transport_CommandClassVersionGet(
  BYTE commandClass);                 /* IN Command class to query for version */


#endif /* _ZW_TRANSPORT_API_H_ */

