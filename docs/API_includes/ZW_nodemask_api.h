/*******************************  ZW_NODEMASK_API.H  *******************************
 *           #######
 *           ##  ##
 *           #  ##    ####   #####    #####  ##  ##   #####
 *             ##    ##  ##  ##  ##  ##      ##  ##  ##
 *            ##  #  ######  ##  ##   ####   ##  ##   ####
 *           ##  ##  ##      ##  ##      ##   #####      ##
 *          #######   ####   ##  ##  #####       ##  #####
 *                                           #####
 *          Z-Wave, the wireless language.
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
 * Description: Functions used to manipulate bits (Node ID) in a NodeMask array.
 *
 * Author:   Ivar Jeppesen
 *
 * Last Changed By:  $Author: jbu $
 * Revision:         $Revision: 26038 $
 * Last Changed:     $Date: 2013-06-10 09:08:11 +0200 (ma, 10 jun 2013) $
 *
 ****************************************************************************/
#ifndef _ZW_NODEMASK_API_H_
#define _ZW_NODEMASK_API_H_

/****************************************************************************/
/*                              INCLUDE FILES                               */
/****************************************************************************/


/****************************************************************************/
/*                     EXPORTED TYPES and DEFINITIONS                       */
/****************************************************************************/

/*The max length of a node mask*/
#define MAX_NODEMASK_LENGTH   (ZW_MAX_NODES/8)

/****************************  NodeMask  ************************************
** Functions used to manipulate bits (Node ID) in a byte array (NodeMask array)
**
*****************************************************************************/

/*===========================   ZW_NodeMaskSetBit   =========================
**    Set the node bit in a node bitmask
**
** void           RET   Nothing
** ZW_NodeMaskSetBit(
** BYTE_P pMask,         IN   pointer nodemask
** BYTE bNodeID);        IN   node to set in nodemask
**--------------------------------------------------------------------------*/
#define ZW_NODE_MASK_SET_BIT(pMask, bNodeID) ZW_NodeMaskSetBit(pMask, bNodeID)

/*========================   NodeMaskClearBit   =============================
**    Set the node bit in a node bitmask
**
** void       RET   Nothing
** ZW_NodeMaskClearBit(
** BYTE_P pMask,     IN   nodemask
** BYTE bNodeID);    IN   node to clear in nodemask
**--------------------------------------------------------------------------*/
#define ZW_NODE_MASK_CLEAR_BIT(pMask, bNodeID) ZW_NodeMaskClearBit(pMask, bNodeID)

/*===========================   ZW_NodeMaskClear   ==========================
**    Clear all bits in a nodemask
**
** void       RET   Nothing
** ZW_NodeMaskClear(
** BYTE_P pMask,     IN   nodemask
** BYTE bLength);    IN   length of nodemask
**--------------------------------------------------------------------------*/
#define ZW_NODE_MASK_CLEAR(pMask, bLength) ZW_NodeMaskClear(pMask, bLength)

/*==========================   ZW_NodeMaskBitsIn   ==========================
**    Check is any bit is set in a nodemask
**
** BYTE       RET   Number of bits set in nodemask
** ZW_NodeMaskBitsIn(
** BYTE_P pMask,     IN   pointer to nodemask
** BYTE bLength);    IN   length of nodemask
**--------------------------------------------------------------------------*/
#define ZW_NODE_MASK_BITS_IN(pMask, bLength) ZW_NodeMaskBitsIn(pMask, bLength)

/*==========================   ZW_NodeMaskNodeIn   ==========================
**    Check if a node is in a nodemask
**
** BYTE       RET   ZERO if not in nodemask, NONEZERO if in nodemask
** ZW_NodeMaskNodeIn(
** BYTE_P pMask,     IN   pointer to nodemask to check for bNode
** BYTE bNode);      IN   bit number that should be checked
**--------------------------------------------------------------------------*/
#define ZW_NODE_MASK_NODE_IN(pMask, bNode) ZW_NodeMaskNodeIn(pMask, bNode)



/****************************************************************************/
/*                              EXPORTED DATA                               */
/****************************************************************************/

/****************************************************************************/
/*                           EXPORTED FUNCTIONS                             */
/****************************************************************************/

/*===========================   ZW_NodeMaskSetBit   =========================
**    Set the node bit in a node bitmask
**
**    Side effects
**
**--------------------------------------------------------------------------*/
extern void           /*RET   Nothing                 */
ZW_NodeMaskSetBit(
BYTE_P pMask,         /* IN   pointer nodemask        */
BYTE bNodeID);         /* IN   node to set in nodemask */

/*========================   NodeMaskClearBit   =============================
**    Set the node bit in a node bitmask
**
**    Side effects
**
**--------------------------------------------------------------------------*/
extern void       /*RET   Nothing                   */
ZW_NodeMaskClearBit(
BYTE_P pMask,     /* IN   nodemask                  */
BYTE bNodeID);     /* IN   node to clear in nodemask */

/*===========================   ZW_NodeMaskClear   ==========================
**    Clear all bits in a nodemask
**
**    Side effects
**
**--------------------------------------------------------------------------*/
extern void       /*RET   Nothing             */
ZW_NodeMaskClear(
BYTE_P pMask,     /* IN   nodemask            */
BYTE bLength);     /* IN   length of nodemask  */

/*==========================   ZW_NodeMaskBitsIn   ==========================
**    Check is any bit is set in a nodemask
**
**--------------------------------------------------------------------------*/
extern BYTE       /*RET   Number of bits set in nodemask  */
ZW_NodeMaskBitsIn(
BYTE_P pMask,     /* IN   pointer to nodemask             */
BYTE bLength);     /* IN   length of nodemask              */

/*==========================   ZW_NodeMaskNodeIn   ==========================
**    Check if a node is in a nodemask
**
**--------------------------------------------------------------------------*/
extern BYTE       /*RET   ZERO if not in nodemask, NONEZERO if in nodemask  */
ZW_NodeMaskNodeIn(
BYTE_P pMask,     /* IN   pointer to nodemask to check for bNode            */
BYTE bNode);      /* IN   bit number that should be checked                 */

/*==========================   ZW_NodeMaskGetNextNode   =====================
** Function:    Find the next NodeId that is set in a nodemask
**
** Parameters:
**   currentNodeId                  =  last NodeId found (0 for first call)
**   pMask                          -> Nodemask that should be searched
**
** Return:
**   If found                       = Next NodeId from the nodemask.
**   If not found                   = 0
**
**--------------------------------------------------------------------------*/
extern BYTE
ZW_NodeMaskGetNextNode(
  BYTE currentNodeId,
  BYTE_P pMask);

#endif /* _ZW_NODEMASK_API_H_ */
