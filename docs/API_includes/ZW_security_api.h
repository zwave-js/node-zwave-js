/***************************************************************************
*
* Copyright (c) 2013
* Sigma Designs, Inc.
* All Rights Reserved
*
*---------------------------------------------------------------------------
*
* Description: Some nice descriptive description.
*
* Author:   Jakob Buron
*
* Last Changed By:  $Author: jdo $
* Revision:         $Revision: 1.38 $
* Last Changed:     $Date: 2005/07/27 15:12:54 $
*
****************************************************************************/
#ifndef ZW_SECURITY_API_H_
#define ZW_SECURITY_API_H_

/****************************************************************************/
/*                              INCLUDE FILES                               */
/****************************************************************************/
#include <ZW_typedefs.h>

/****************************************************************************/
/*                     EXPORTED TYPES and DEFINITIONS                       */
/****************************************************************************/
/* The security key a frame was received with or should be sent with.
 *
 * Special values:
*/
typedef enum SECURITY_KEY
{
  SECURITY_KEY_NONE = 0x00,
  SECURITY_KEY_S2_UNAUTHENTICATED = 0x01,
  SECURITY_KEY_S2_AUTHENTICATED = 0x02,
  SECURITY_KEY_S2_ACCESS = 0x03,
  SECURITY_KEY_S0 = 0x04,
} security_key_t;


/**
 * Bitmask for security keys. Used by \ref ZW_GetSecurityKeys.
 */
#define SECURITY_KEY_S2_UNAUTHENTICATED_BIT 0x01
#define SECURITY_KEY_S2_AUTHENTICATED_BIT 0x02
#define SECURITY_KEY_S2_ACCESS_BIT 0x04
#define SECURITY_KEY_S0_BIT 0x80

#define SECURITY_KEY_S2_MASK (SECURITY_KEY_S2_UNAUTHENTICATED_BIT \
                              | SECURITY_KEY_S2_AUTHENTICATED_BIT \
                              | SECURITY_KEY_S2_ACCESS_BIT)
#define SECURITY_KEY_NONE_MASK 0x00


/**
 * Security S2 Public DSK Key length
 */
#define SECURITY_KEY_S2_PUBLIC_DSK_LENGTH     16


/**
 * Security S2 Public CSA DSK Key length
 */
#define SECURITY_KEY_S2_PUBLIC_CSA_DSK_LENGTH 4


/**
 *  definitions for Security S2 inclusion Authentication
 */
typedef enum _E_SECURTIY_S2_AUTHENTICATION_
{
  SECURITY_AUTHENTICATION_SSA = 0x00,
  SECURITY_AUTHENTICATION_CSA = 0x01
} e_security_s2_authentication_t;


typedef struct _S_SECURITY_S2_INCLUSION_CSA_PUBLIC_DSK_
{
  BYTE aCSA_DSK[SECURITY_KEY_S2_PUBLIC_CSA_DSK_LENGTH];
} s_SecurityS2InclusionCSAPublicDSK_t;


/**
 * Definitions for Application bound Security events
 * Delivered from protocol to Application through the Application implmemented
 * ApplicationSecurityEvent(s_application_security_event_data_t)
 */
typedef enum _E_APPLICATION_SECURITY_EVENT_
{
  E_APPLICATION_SECURITY_EVENT_S2_INCLUSION_REQUEST_DSK_CSA
} e_application_security_event_t;


/**
 *
 *
 */
typedef struct _S_APPLICATION_SECURITY_EVENT_DATA_
{
  e_application_security_event_t event;
  BYTE eventDataLength;
  BYTE *eventData;
} s_application_security_event_data_t;


/**
* Application must implement this. Used by protocol to request/inform Application
* of Security based Events. Currently only an event for Client Side Authentication (CSA)
* has been defined - E_APPLICATION_SECURITY_EVENT_S2_INCLUSION_REQUEST_DSK_CSA.
*
* \ref E_APPLICATION_SECURITY_EVENT_S2_INCLUSION_REQUEST_DSK_CSA Security Event
*   Is posted by protocol when in S2 inclusion with CSA enabled and the
*   Server side DSK is needed.
*   Application must call ZW_SetSecurityS2InclusionCSA_DSK(s_SecurityS2InclusionCSAPublicDSK_t *)
*   with the retrieved Server/Controller side DSK.
*
*   @param[in] securityEvent  Pointer to structure containing the security event
*                             and any possible data connected to the event.
*/
void ApplicationSecurityEvent(s_application_security_event_data_t *securiyEvent);


/**
* Application must implement this function
* NOTE: If Z-Wave framework are used then ApplicationSecureCommandsSupported
*       are allready implemented in \ref ZW_TransportSecProtocol.c.
*/
void
ApplicationSecureCommandsSupported(
    enum SECURITY_KEY eKey, /* IN Security Key to report on */
    BYTE **pCmdClasses,           /* OUT Cmd classes supported by endpoint */
    BYTE *pLength);               /* OUT Length of pCmdClasses, 0 if endpoint does not exist */


/**
* Application must implement this function to return a bitmask of the
* security keys requested by the node when joining a network.
* The including controller may grant all or a subset of the requested
* keys.
* Supported keys:
* \ref SECURITY_KEY_S0_BIT;
* \ref SECURITY_KEY_S2_ACCESS_BIT;
* \ref SECURITY_KEY_S2_AUTHENTICATED_BIT;
* \ref SECURITY_KEY_S2_UNAUTHENTICATED_BIT;
* \return A bitmask of supported security keys.
*
*/
BYTE ApplicationSecureKeysRequested(void);


/**
* Application must implement this function to return a value of the
* security authentication requested by the node when joining a network.
* Supported methods:
* \ref SECURITY_AUTHENTICATION_SSA;
* \ref SECURITY_AUTHENTICATION_CSA;
*
*/
BYTE ApplicationSecureAuthenticationRequested(void);


/**
 *    @brief
 *    Set the Controller DSK requested by protocol for CSA inclusion through
 *    calling ApplicationSecurityS2InclusionRequestDSK_CSA
 *
 *    @param[in] response retrieved CSA DSK
 *
 */
void ZW_SetSecurityS2InclusionPublicDSK_CSA(s_SecurityS2InclusionCSAPublicDSK_t *response);


/*===========================   ZW_GetSecurityKeys   =========================
**
**    Returns a bitmask of security keys the application can request
**    ZW_SendDataEX() to use. When the node is excluded, no security keys
**    will be reported.
**
**    Side effects:
**
**--------------------------------------------------------------------------*/
BYTE ZW_GetSecurityKeys(void);


/*======================   ZW_SetSecurityS0NetworkKey   ======================
**    @brief
**    Set the network key S0 in the protocol.
**    This function is only to be called after a firmware update from an
**    application based upon an SDK prior to 6.70, as example 6.51, 6.60, or
**    6.61 to an application based upon SDK 6.70 or later.
**
**    Note: This is only relevant for a node that was securely included in an
**          S0 based network.
**
**    @param[in] network_key  Pointer to the S0 network key for the home
**                            network. 16 bytes long.
**
**    Side effects:
**
**--------------------------------------------------------------------------*/
void ZW_SetSecurityS0NetworkKey(BYTE * network_key);


/**
 *
 *
 */
void ZW_GetSecurityS2PublicDSK(BYTE *buf);


#ifdef ZW_SECURITY_PROTOCOL_SINGLE_NETWORK_KEY
/**
 *
 *
 */
void ZW_SetSecurityS2CriticalNodeID(BYTE bNodeID);
#endif


/*
 *
 *
 */
void ZW_s2_inclusion_init(void);


#endif /* ZW_SECURITY_API_H_ */
