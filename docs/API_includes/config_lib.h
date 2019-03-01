/****************************  config_lib.h  *******************************
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
 * Description: This header file contains defines for library version
 *  in a generalized way.
 *
 *  Don't change the name of the file, and don't change the names of
 *  APP_VERSION and APP_REVISION, as they are handled automatically by
 *  the release procedure.
 *
 * Author:   Erik Friis Harck
 *
 * Last Changed By:  $Author: efh $
 * Revision:         $Revision: 11456 $
 * Last Changed:     $Date: 2008-09-25 16:29:18 +0200 (Thu, 25 Sep 2008) $
 *
 ****************************************************************************/
#ifndef _CONFIG_LIB_H_
#define _CONFIG_LIB_H_

#ifdef LIBFILE
#include "ZW_lib_defines.h"
#endif

/*
 * The following two definitions (ZW_VERSION_MAJOR, ZW_VERSION_MINOR & ZW_VERSION_PATCH) specifies
 * the Z-Wave Library version. It is manually changed to match the version specified in the following PSP.
 * PSP14406-1C Product Specification for Z-Wave 500 Series Developer's Kit v6.81.03
 */
#define ZW_VERSION_MAJOR 6
#define ZW_VERSION_MINOR 4
#define ZW_VERSION_PATCH 0

/* Configuration defines for all Z-Wave libraries */

/* Include support for ApplicationRfNotify API */
#define APP_RF_NOTIFY

#endif /* _CONFIG_LIB_H_ */

