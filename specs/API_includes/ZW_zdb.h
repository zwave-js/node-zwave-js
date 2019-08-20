/****************************  ZW_zdb.h  ****************************
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
 *              Copyright (c) 2011
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
 * Description: ...
 *
 * Author:   jbu
 *
 * Last Changed By:  $Author: $
 * Revision:         $Revision: $
 * Last Changed:     $Date: $
 *
 ****************************************************************************/
#ifndef _ZW_ZDB_H_
#define _ZW_ZDB_H_


/****************************************************************************/
/*                              INCLUDE FILES                               */
/****************************************************************************/
#include <ZW_typedefs.h>

/****************************************************************************/
/*                     EXPORTED TYPES and DEFINITIONS                       */
/****************************************************************************/
/* Break to debugger if assert fails */
#ifdef ZW_ZDB
#define ZDB_ASSERT(x, sigval) if(!(x)) zdb_handle_exception(sigval);
#else
#define ZDB_ASSERT(x, sigval)
#define ZW_zdb_init(x)
#define zdb_handle_exception(x)
#endif

/****************************************************************************/
/*                              EXPORTED DATA                               */
/****************************************************************************/

/****************************************************************************/
/*                           EXPORTED FUNCTIONS                             */
/****************************************************************************/
#ifdef ZW_ZDB
void ZW_zdb_init();
void zdb_handle_exception(int sigval);
#endif
#endif /* _ZW_ZDB_H_ */
