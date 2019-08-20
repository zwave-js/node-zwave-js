/**
 * @file
 * This file contains a Sigma Designs implementation of how learn mode should
 * be implemented according to Classic, Network wide and Smart Start modes.
 * @copyright Copyright (c) 2001-2017, Sigma Designs Inc., All Rights Reserved
 */

#ifndef _NETWORK_MANAGEMENT_API_H_
#define _NETWORK_MANAGEMENT_API_H_
/****************************************************************************/
/*                              INCLUDE FILES                               */
/****************************************************************************/
#include <ZW_typedefs.h>
#include <ZW_basis_api.h>

/****************************************************************************/
/*                     EXPORTED TYPES and DEFINITIONS                       */
/****************************************************************************/
typedef enum
{
  STATE_LEARN_IDLE,
  STATE_LEARN_STOP,
  STATE_LEARN_CLASSIC,
  STATE_LEARN_NWI
} learn_state_t;


/****************************************************************************/
/*                              EXPORTED DATA                               */
/****************************************************************************/

/****************************************************************************/
/*                           EXPORTED FUNCTIONS                             */
/****************************************************************************/


BYTE
ZW_NetworkLearnModeStart(
  E_NETWORK_LEARN_MODE_ACTION bMode);

/**
 * Return learn state for learn mode process. Return STATE_LEARN_IDLE if process is not
 * started.
 * @return learn state of type learn_state_t
 */
learn_state_t
GetLearnState();

#endif /* _NETWORK_MANAGE_API_H_ */
