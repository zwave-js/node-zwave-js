/****************************************************************************
 *
 * Copyright (c) 2001-2014
 * Sigma Designs, Inc.
 * All Rights Reserved
 *
 *---------------------------------------------------------------------------
 *
 * Description: Defines the size of Library NVM allocation
 *
 * Author:   Peter Shorty
 *
 * Last Changed By:  $Author: jsi $
 * Revision:         $Revision: 14376 $
 * Last Changed:     $Date: 2009-06-29 14:04:16 +0200 (Mon, 29 Jun 2009) $
 *
 ****************************************************************************/
#ifndef _ZW_NVM_ADDR_H_
#define _ZW_NVM_ADDR_H_

/****************************************************************************/
/*                              INCLUDE FILES                               */
/****************************************************************************/


/****************************************************************************/
/*                     EXPORTED TYPES and DEFINITIONS                       */
/****************************************************************************/

/* Set defines for the type of NVM used */

#ifdef ZW_AVREMOTE
#define NVM_IS_FLASH
#endif

#ifdef ZW_CONTROLLER
#define NVM_IS_EEPROM
#endif /* ZW_CONTROLLER */

#ifdef ZW_SLAVE
#ifdef ZW_SLAVE_32
#define NVM_IS_EEPROM
#else /* ZW_SLAVE_32 */
#define NVM_IS_FLASH
#define NVM_IS_MTP
#endif /* ZW_SLAVE_32 */
#endif /* ZW_SLAVE */


#endif /* _ZW_NVM_ADDR_H_ */
