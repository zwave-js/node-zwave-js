/****************************************************************************
 *
 * Copyright (c) 2001-2013
 * Sigma Designs, Inc.
 * All Rights Reserved
 *
 *---------------------------------------------------------------------------
 *
 * Description: Z-Wave Bridge Controller node application interface
 *
 * Author:   Johann Sigfredsson
 *
 * Last Changed By:  $Author: jsi $
 * Revision:         $Revision: 31344 $
 * Last Changed:     $Date: 2015-04-17 13:53:23 +0200 (fr, 17 apr 2015) $
 *
 ****************************************************************************/
#ifndef _ZW_CONTROLLER_BRIDGE_API_H_
#define _ZW_CONTROLLER_BRIDGE_API_H_

#ifndef ZW_CONTROLLER_BRIDGE
#define ZW_CONTROLLER_BRIDGE
#endif

/****************************************************************************/
/*                              INCLUDE FILES                               */
/****************************************************************************/
/* A Bridge Controller is a Static Controller with BRIDGE functionality but */
/* without repeater fundtionality */
#include <ZW_controller_static_api.h>

/****************************************************************************/
/*                     EXPORTED TYPES and DEFINITIONS                       */
/****************************************************************************/

/****************************************************************************
* Functionality specific for the Bridge Controller API.
****************************************************************************/

/*===============================   ZW_SendSlaveData   ===========================
**    Transmit data buffer to a single ZW-node or all ZW-nodes (broadcast).
**
**
**    txOptions:
**          TRANSMIT_OPTION_LOW_POWER   transmit at low output power level (1/3 of
**                                      normal RF range).
**          TRANSMIT_OPTION_ACK         request acknowledge from destination node.
**
** BYTE                                 RET  FALSE if transmitter queue overflow
** ZW_SendSlaveData(
**    BYTE  srcNode                      IN  Source node ID
**    BYTE  destNode,                    IN  Destination node ID (0xFF == broadcast)
**    BYTE *pData,                       IN  Data buffer pointer
**    BYTE  dataLength,                  IN  Data buffer length
**    BYTE  txOptions,                   IN  Transmit option flags
**    VOID_CALLBACKFUNC(completedFunc)(  IN  Transmit completed call back function
**        BYTE txStatus));                  IN Transmit status
**--------------------------------------------------------------------------*/
#define ZW_SEND_SLAVE_DATA(srcnode,destnode,data,length,options,func) ZW_SendSlaveData(srcnode,destnode,data,length,options,func)


/*=========================   ZW_SEND_SLAVE_NODE_INFO   =====================
** Create and transmit a slave node informations frame
**
** void                                    RET FALSE if transmitter queue overflow
** ZW_SEND_SLAVE_NODE_INFO(
** BYTE sourcenode                         IN  Source Node ID - Who is transmitting
** BYTE destnode                           IN  Destination Node ID (0xff = broadcast)
** BYTE txOptions,                         IN  Transmit option flags
** VOID_CALLBACKFUNC(completedFunc)(BYTE)) IN  Transmit completed call back function
**--------------------------------------------------------------------------*/
#define ZW_SEND_SLAVE_NODE_INFO(sourcenode,destnode,option,func) ZW_SendSlaveNodeInformation(sourcenode,destnode,option,func)


/* Defines used to handle inclusion and exclusion of virtual slave nodes */
/* Are returned as callback parameter when callback, setup with */
/* ZW_SetSlaveLearnMode, is called during inclusion/exclusion process */
#define ASSIGN_COMPLETE             0x00
#define ASSIGN_NODEID_DONE          0x01  /* Node ID have been assigned */
#define ASSIGN_RANGE_INFO_UPDATE    0x02  /* Node is doing Neighbor discovery */

/* Defines defining modes possible in ZW_SetSlaveLearnMode : */

/* Disable SlaveLearnMode (disable possibility to add/remove Virtual Slave nodes) */
/* Allowed when bridge is a primary controller, an inclusion controller or a secondary controller */
#define VIRTUAL_SLAVE_LEARN_MODE_DISABLE  0x00

/* Enable SlaveLearnMode - Enable possibility for including/excluding a */
/* Virtual Slave node by an external primary/inclusion controller */
/* Allowed when bridge is an inclusion controller or a secondary controller */
#define VIRTUAL_SLAVE_LEARN_MODE_ENABLE   0x01

/* Add new Virtual Slave node if possible */
/* Allowed when bridge is a primary or an inclusion controller */
#define VIRTUAL_SLAVE_LEARN_MODE_ADD      0x02

/* Remove existing Virtual Slave node */
/* Allowed when bridge is a primary or an inclusion controller */
#define VIRTUAL_SLAVE_LEARN_MODE_REMOVE   0x03


/*===========================   ZW_SetSlaveLearnMode   =======================
**    Enable/Disable home/node ID learn mode.
**    When learn mode is enabled, received "Assign ID's Command" are handled:
**    If the current stored ID's are zero, the received ID's will be stored.
**    If the received ID's are zero the stored ID's will be set to zero.
**
**    The learnFunc is called when the received assign command has been handled.
**    The returned parameter is the learned Node ID.
**
** void           RET  Nothing
** ZW_SetSlaveLearnMode(
**   BYTE node,                IN  nodeID on node to set Learn Node Mode -
**                               ZERO if new node is to be learned
**   BYTE mode,                IN  VIRTUAL_SLAVE_LEARN_MODE_DISABLE: Disable
**                               VIRTUAL_SLAVE_LEARN_MODE_ENABLE:  Enable
**                               VIRTUAL_SLAVE_LEARN_MODE_ADD:     Create New Virtual Slave Node
**                               VIRTUAL_SLAVE_LEARN_MODE_REMOVE:  Remove Virtual Slave Node
**   VOID_CALLBACKFUNC(learnFunc)(BYTE bStatus, BYTE orgId, BYTE newID)); IN  Node learn call back function.
**--------------------------------------------------------------------------*/
#define ZW_SET_SLAVE_LEARN_MODE(node, mode, func) ZW_SetSlaveLearnMode(node, mode, func)


/*============================   ZW_IsVirtualNode   ======================
**    Function description.
**      Returns TRUE if bNodeID is a virtual slave node
**              FALSE if it is not a virtual slave node
**    Side effects:
**--------------------------------------------------------------------------*/
#define ZW_IS_VIRTUAL_NODE(bNodeID) ZW_IsVirtualNode(bNodeID)


/*===========================   ZW_GetVirtualNodes   =========================
**    Request nodemask containing virtual nodes in controller bridge.
**
**    The nodemask points to nodemask structure where the current virtual node
**    nodemask is to be copied.
**
**--------------------------------------------------------------------------*/
#define ZW_GET_VIRTUAL_NODES(nodemask) ZW_GetVirtualNodes(nodemask)


/****************************************************************************/
/*                              EXPORTED DATA                               */
/****************************************************************************/


/* Masks for masking the relevant bits out of the multiDestsOffset_NodeMaskLen */
/* byte in the ZW_MULTI_DEST structure */
/* Mask masking the number of bytes in multiDestNodeMask array */
/* - valid value range [0 - 29] */
#define MULTI_DEST_MASK_LEN_MASK      0x1F
/* Mask masking the nodeID-1 represented by the first bit in the first byte */
/* in the multiDestNodeMask */
/* - valid value range [0, 32, 64, 96...] */
#define MULTI_DEST_MASK_OFFSET_MASK   0xE0

typedef struct _ZW_MULTI_DEST_
{
  BYTE multiDestsOffset_NodeMaskLen; /* bit 5-7 states the nodeId-1 (offset 0, 32, 64, 96... - translates into */
                                     /* respectively nodeID 1, 33, 65, 97...), which is represented by the */
                                     /* first bit in the multiDestsNodeMask. */
                                     /* bit 0-4 is the size of the multicast nodemask. */
  BYTE multiDestsNodeMask;           /* first byte in the multicast nodemask containing local nodes */
                                     /* which are to receive the received multicast frame. */
                                     /* Following bytes can be accessed *(&multiDestsNodeMask + n) */
                                     /* where n is index. */
} ZW_MULTI_DEST;


/****************************************************************************/
/*                           EXPORTED FUNCTIONS                             */
/****************************************************************************/

#ifdef ZW_EXPLORE
/*=======================   ApplicationCommandHandler_Bridge   ===============*/
/**
 * \ingroup COMMON
 *
 * The Z Wave protocol MUST call the \ref ApplicationCommandHandler_Bridge function
 * when an application command has been received from another node to the
 * Bridge Controller or an existing virtual slave node. The Z Wave protocol
 * MUST NOT reuse the receive buffer until the application has exited this function.
 *
 * A bridge controller application MUST implement this function.
 *
 * Declared in: ZW_controller_bridge_api.h
 *
 * \param[in] Multi If received frame is, a multicast frame then multi points
 *                  at the multicast structure containing the destination Node IDs.
 * \param[in] pCmd Payload from the received frame. The command class is the very first byte.
 * \param[in] cmdLength Number of Command class bytes.
 * \param[in] rxopt IN RECEIVE_OPTIONS_TYPE struct.
 * |RECEIVE_OPTIONS_TYPE struct member|RECEIVE_OPTIONS_TYPE struct description see \ref RECEIVE_OPTIONS_TYPE            |
 * |----------------------------------|---------------------------------------------------------------------------------|
 * |\ref destNode                     |Command receiving Node ID. Either Bridge Controller Node ID or                   |
 * |                                  |virtual slave Node ID. If received frame is a multicast frame then destNode is   |
 * |                                  |not valid and multi points to a multicast structure containing the               |
 * |                                  |destination nodes.                                                               |
 * |\ref sourceNode                   |Command sender Node ID.                                                          |
 * |\ref rxRSSIVal                    |RSSI val in dBm with which frame was received with.                              |
 * |\ref rxStatus                     |Received frame status flags, see \ref RECEIVE_STATUS                             |
 *  |Flag Name                         |Flag Mask|Flag description                                                                 |
 *  |----------------------------------|---------|---------------------------------------------------------------------------------|
 *  |\ref RECEIVE_STATUS_ROUTED_BUSY   |xxxxxxx1 |A response route is locked by the application                                    |
 *  |\ref RECEIVE_STATUS_LOW_POWER     |xxxxxx1x |Received at low output power level                                               |
 *  |\ref RECEIVE_STATUS_TYPE_SINGLE   |xxxx00xx |Received a single cast frame                                                     |
 *  |\ref RECEIVE_STATUS_TYPE_BROAD    |xxxx01xx |Received a broadcast frame                                                       |
 *  |\ref RECEIVE_STATUS_TYPE_MULTI    |xxxx10xx |Received a multicast frame                                                       |
 *  |\ref RECEIVE_STATUS_TYPE_EXPLORE  |xxx10xxx |Received an explore frame                                                        |
 *
 * \serialapi{ZW->HOST: REQ | 0xA8 | rxopt->rxStatus | rxopt->destNode | rxopt->sourceNode | cmdLength | pCmd[ ] | multiDestsOffset_NodeMaskLen | multiDestsNodeMask | rxopt->rxRSSIVal }
 *
 */
extern  void    /*RET Nothing  */
ApplicationCommandHandler_Bridge(
  ZW_MULTI_DEST *multiMask,         /* IN  Pointer to multicast destination structure containing, which */
                                    /*     local nodes are destination in a received multicast frame. */
                                    /*     NULL if received not a multicast frame */
  ZW_APPLICATION_TX_BUFFER *pCmd,   /* IN  Payload from the received frame, the union */
                                    /*      should be used to access the fields */
  BYTE   cmdLength,                 /* IN  Number of command bytes including the command */
  RECEIVE_OPTIONS_TYPE *rxopt);     /* IN  rxopt struct contains rxStatus, sourceNode, destNode and rssiVal */

/* ApplicationSlaveCommandHandler is obsoleted */

/* ZW_SendSlaveData is obsoleted */
#define ZW_SendSlaveData(srcnode,destnode,data,length,options,func) ZW_SendData_Bridge(srcnode,destnode,data,length,options,func)

#else /* ZW_EXPLORE */


/*===========================   ApplicationSlaveCommandHandler   =================
**    The Application command handler function will be called from the Z-Wave
**    command handler when an application command or request has been received.
**
**--------------------------------------------------------------------------*/
extern void    /*RET Nothing  */
ApplicationSlaveCommandHandler(
  BYTE  rxStatus,                   /*IN  Frame header info */
  BYTE  destNode,     /* To whom it might concern - which node is to receive the frame */
  BYTE  sourceNode,                 /*IN  Command sender Node ID */
  ZW_APPLICATION_TX_BUFFER *pCmd,   /*IN  Payload from the received frame, the union
                                          should be used to access the fields*/
  BYTE   cmdLength                  /*IN  Number of command bytes including the command */
);

/*===============================   ZW_SendSlaveData   ===========================
**    Transmit data buffer to a single Z-Wave node or all Z-Wave nodes - broadcast
**    and transmit it from srcNodeID
**
**
**    txOptions:
**          TRANSMIT_OPTION_LOW_POWER   transmit at low output power level (1/3 of
**                                      normal RF range).
**          TRANSMIT_OPTION_ACK         the multicast frame will be followed by a
**                                      singlecast frame to each of the destination nodes
**                                      and request acknowledge from each destination node.
**
**    RET  TRUE  if data buffer was successfully put into the transmit queue
**         FALSE if transmitter queue overflow or if controller primary or srcNodeID invalid
**               then completedFunc will NOT be called
**
** BYTE                                 RET  FALSE if transmitter queue overflow or srcNodeID invalid or controller primary
** ZW_SendSlaveData(
**    BYTE  srcNodeID,                   IN  Source node ID - Virtuel nodeID
**    BYTE  destNodeID,                  IN  Destination node ID - 0xFF == Broadcast
**    BYTE *pData,                       IN  Data buffer pointer
**    BYTE  dataLength,                  IN  Data buffer length
**    BYTE  txOptions,                   IN  Transmit option flags
**    VOID_CALLBACKFUNC(completedFunc)(  IN  Transmit completed call back function
**        BYTE txStatus));                  IN Transmit status
**--------------------------------------------------------------------------------*/
BYTE                /*RET FALSE if transmitter busy or srcNodeID invalid or controller primary */
ZW_SendSlaveData(
  BYTE  srcNodeID,  /* IN Source node ID - Virtuel nodeID */
  BYTE  destNodeID, /* IN Destination node ID - 0xFF == all nodes */
  BYTE *pData,      /* IN Data buffer pointer           */
  BYTE  dataLength, /* IN Data buffer length            */
  BYTE  txOptions,  /* IN Transmit option flags         */
  VOID_CALLBACKFUNC(completedFunc)(BYTE)); /* IN Transmit completed call back function  */
#endif  /* ZW_EXPLORE */


/*==========================   ApplicationSlaveNodeInformation   =============*/
/**
 * \ingroup COMMON
 *
 * Request Application Virtual Slave Node information. The Z Wave protocol layer calls
 * ApplicationSlaveNodeInformation just before transmitting a "Node Information" frame.
 *
 * The Z Wave Bridge Controller library requires this function implemented within the Application layer.
 *
 * Declared in: ZW_controller_bridge_api.h
 *
 * \param[in] destNode    Which Virtual Node do we want the node information from.
 * \param[out] listening  TRUE if this node is always listening and not moving.
 * \param[out] nodeType   Pointer to structure with the Device Class:
 * - (*nodeType).generic  The Generic Device Class [5]. Do not enter zero in this field.
 * - (*nodeType).specific The Specific Device Class [5].
 * \param[out] nodeParm   Command Class buffer pointer. Command Classes [9] supported
 *                        by the device itself and optional Command Classes the device
 *                        can control in other devices.
 * \param[out] parmLength Number of Command Class bytes.
 *
 * \b Serial API
 *
 * The ApplicationSlaveNodeInformation is replaced by SerialAPI_ApplicationSlaveNodeInformation.
 * Used to set node information for the Virtual Slave Node in the embedded module this node
 * information will then be used in subsequent calls to ZW_SendSlaveNodeInformation.
 * Replaces the functionality provided by the ApplicationSlaveNodeInformation() callback function.
 * \code
void SerialAPI_ApplicationSlaveNodeInformation(BYTE destNode,
       BYTE            listening,
       APPL_NODE_TYPE *nodeType,
       BYTE           *nodeParm,
       BYTE            parmLength)
\endcode
 * \serialapi{ HOST->ZW:REQ | 0xA0 | destNode | listening | genericType | specificType | parmLength | nodeParm[ ]}
 *
 */
extern void                 /*RET Nothing */
ApplicationSlaveNodeInformation(
  BYTE      destNode,       /* IN Which node do we want the nodeinfo on */
  BYTE      *listening,     /*OUT TRUE if this node is always on air */
  APPL_NODE_TYPE *nodeType, /*OUT Generic and Specific Device Type   */
  BYTE      **nodeParm,     /*OUT Device parameter buffer pointer    */
  BYTE      *parmLength     /*OUT Number of Device parameter bytes   */
);

/*============================   ZW_SendSlaveNodeInformation   ============================
**    Create and transmit a slave node information frame
**    RET  TRUE  if Slave NodeInformation frame was successfully put into the transmit queue
**         FALSE if transmitter queue overflow or if controller primary or destNode invalid
**               then completedFunc will NOT be called
**---------------------------------------------------------------------------------------*/
BYTE                              /*RET FALSE if SlaveNodeinformation not in transmit queue */
ZW_SendSlaveNodeInformation(
  BYTE sourceNode,                /* IN Which node is to transmit the nodeinfo */
  BYTE destNode,                  /* IN Destination Node ID  */
  BYTE txOptions,                 /* IN Transmit option flags */
  VOID_CALLBACKFUNC(completedFunc)(BYTE, TX_STATUS_TYPE *));  /*IN  Transmit completed call back function  */


/*===========================   ZW_SetSlaveLearnMode   =======================
**    Enable/Disable home/node ID learn mode.
**    When learn mode is enabled, received "Assign ID's Command" are handled:
**    If the current stored ID's are zero, the received ID's will be stored.
**    If the received ID's are zero the stored ID's will be set to zero.
**
**    The learnFunc is called when the received assign command has been handled.
**    The returned parameter is the learned Node ID.
**
** void           RET  Nothing
** ZW_SetSlaveLearnMode(
**   BYTE node,                IN  nodeID on node to set Learn Node Mode -
**                               ZERO if new node is to be learned
**   BYTE mode,                IN  VIRTUAL_SLAVE_LEARN_MODE_DISABLE: Disable
**                               VIRTUAL_SLAVE_LEARN_MODE_ENABLE:  Enable
**                               VIRTUAL_SLAVE_LEARN_MODE_ADD:     Create New Virtual Slave Node
**                               VIRTUAL_SLAVE_LEARN_MODE_REMOVE:  Remove Virtual Slave Node
**   VOID_CALLBACKFUNC(learnFunc)(BYTE bStatus, BYTE orgId, BYTE newID)); IN  Node learn call back function.
**--------------------------------------------------------------------------*/
BYTE                  /*RET Returns TRUE if successful or FALSE if node invalid or controller is primary */
ZW_SetSlaveLearnMode(
  BYTE node,          /* IN nodeID on Virtual node to set in Learn Node Mode - if new node wanted then it must be ZERO */
  BYTE mode,          /* IN TRUE  Enable, FALSE  Disable */
  VOID_CALLBACKFUNC(learnFunc)(BYTE bStatus, BYTE orgID, BYTE newID));  /* IN Slave node learn call back function. */


/*============================   ZW_IsVirtualNode   ======================
**    Function description.
**      Returns TRUE if bNodeID is a virtual slave node
**              FALSE if it is not a virtual slave node
**    Side effects:
**--------------------------------------------------------------------------*/
BOOL                      /*RET TRUE if virtual slave node, FALSE if not */
ZW_IsVirtualNode(BYTE bNodeID);


/*===========================   ZW_GetVirtualNodes   =========================
**    Request nodemask containing virtual nodes in controller bridge.
**
**    The nodemask points to nodemask structure where the current virtual node
**    nodemask is to be copied.
**
**--------------------------------------------------------------------------*/
void
ZW_GetVirtualNodes(
  BYTE *nodeMask);

#endif /* _ZW_CONTROLLER_BRIDGE_API_H_ */

