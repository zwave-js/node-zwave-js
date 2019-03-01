/****************************************************************************
 *
 * Copyright (c) 2001-2014
 * Sigma Designs, Inc.
 * All Rights Reserved
 *
 *---------------------------------------------------------------------------
 *
 * Description: Declaration of Z-Wave NVM descriptor.
 *
 * Author:   Erik Friis Harck
 *
 * Last Changed By:  $Author: iza $
 * Revision:         $Revision: 22797 $
 * Last Changed:     $Date: 2012-05-10 15:55:06 +0200 (to, 10 maj 2012) $
 *
 ****************************************************************************/
#ifndef _NVM_DESCRIPTOR_H_
#define _NVM_DESCRIPTOR_H_
#include <ZW_typedefs.h>

/****************************************************************************/
/*                              EXTERNALS                                   */
/****************************************************************************/

/* Make _ZW_VERSION_ public, so that Z-Wave application code can access it.              */
/* Use it from C-code like this:                                                         */
extern unsigned char _ZW_VERSION_;      /* referenced with = (WORD)&_ZW_VERSION_);       */
/* Make _APP_VERSION_ public, so that Z-Wave protocol code can access it.                */
/* Use it from C-code like this:                                                         */
extern unsigned char _APP_VERSION_;     /* referenced with = (WORD)&_APP_VERSION_);      */

/****************************************************************************/
/*                              EXPORTED DATA                               */
/****************************************************************************/

typedef enum _eNvmModuleType
{
  NVM_MODULE_TYPE_UNDEFINED = 0x00,
  NVM_MODULE_TYPE_ZW_PHY_LIBRARY = 0x01,
  NVM_MODULE_TYPE_ZW_LIBRARY = 0x02,
  NVM_MODULE_TYPE_ZW_FRAMEWORK = 0x03,
  NVM_MODULE_TYPE_APPLICATION  = 0x04,
  NVM_MODULE_TYPE_HOST_APPLICATION = 0x05,
  NVM_MODULE_TYPE_SECURITY_2 = 0x06,
  NVM_MODULE_TYPE_NVM_DESCRIPTOR = 0xFF
} eNvmModuleType;

typedef WORD t_NvmModuleSize;

/* NVM module descriptor for module. Located at the end of NVM module. */
typedef struct s_nvmModuleDescriptor_
{
  t_NvmModuleSize wNvmModuleSize;       /* Used to compare with nvmModuleSize for validation   */
  eNvmModuleType bNvmModuleType;        /* Used to compare with other firmware module type     */
  WORD wNvmModuleVersion;               /* Used to compare with other firmware version         */
} t_nvmModuleDescriptor;

typedef t_nvmModuleDescriptor * p_nvmModuleDescriptor;

/* NVM module structure */
typedef struct s_nvmModule_
{
  t_NvmModuleSize nvmModuleSize; /* Offset from &nvmModule where nvmModuleDescriptor structure is placed */
  BYTE nvmModuleVariables[1000];        /* 1000 is just an arbitrary example                   */
                                        /* Every field beyond this you must calculate the      */
                                        /* pointer to, because the size of the mvmModule       */
                                        /* is unknown at compilation time for other versions   */
                                        /* of the firmware.                                    */
  t_nvmModuleDescriptor nvmModuleDescriptor;
} t_nvmModule;

typedef t_nvmModule * p_nvmModule;

/* NVM module update structure */
typedef struct s_nvmModuleUpdate_
{
  p_nvmModule nvmModulePtr;   /* Pointer to where nvmModule structure will be placed in NVM memory */
  t_NvmModuleSize wNvmModuleSizeOld;    /* Size of the old NVM data from previous version of   */
                                        /* firmware, which may not be prepared for keeping old */
                                        /* NVM data across firmware updates.                   */
                                        /* Set this to the beginning of new NVM data.          */
  t_nvmModuleDescriptor nvmModuleDescriptor;
} t_nvmModuleUpdate;

/* NVM descriptor for OTA firmware update. Located at the end of NVM. */
typedef struct s_nvmDescriptor_
{
  WORD manufacturerID;
  WORD firmwareID;
  WORD productTypeID;
  WORD productID;
  WORD applicationVersion;
  WORD zwaveProtocolVersion;
} t_nvmDescriptor;

typedef t_nvmDescriptor * p_nvmDescriptor;

/* Note from Keil knowledgebase: http://www.keil.com/support/docs/901.htm   */
/* "The order is not necessarily taken from the variable declarations, but  */
/* the first use of the variables."                                         */
/* Therefore, when using #pragma ORDER to order variables, declare them in  */
/* the order they should be in a collection. And none of them may be        */
/* declared or known in any way from other header files.                    */
/* As nvmDescriptor shall be loacated last, the declaration below must not  */
/* be done here, when someone includes this file to get knowledge of the    */
/* struct t_nvmDescriptor for its size.                                     */
/* "extern t_nvmDescriptor far nvmDescriptor;"                              */

/* NVM layout of NVM descriptor for firmware */
extern t_NvmModuleSize far nvmDescriptorSize;
extern t_nvmDescriptor far nvmDescriptor;
extern t_nvmModuleDescriptor far nvmDescriptorDescriptor;
extern WORD far nvmModuleSizeEndMarker; /* Marks the end of NVM (no more NVM modules) with a zero WORD */

/* The starting address of the segment ?FD?ZW_NVM_DESCRIPTOR (to be used as a constant as (WORD)&_FD_ZW_NVM_DESCRIPTOR_S_) */
extern unsigned char _FD_ZW_NVM_DESCRIPTOR_S_;
/* The length of the segment ?FD?ZW_NVM_DESCRIPTOR in bytes (to be used as a constant as (WORD)&_FD_ZW_NVM_DESCRIPTOR_L_) */
extern unsigned char _FD_ZW_NVM_DESCRIPTOR_L_;

#endif /* _NVM_DESCRIPTOR_H_ */
