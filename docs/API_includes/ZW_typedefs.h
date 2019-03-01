/*******************************  ZW_typedefs.h  *******************************
 *           #######
 *           ##  ##
 *           #  ##    ####   #####    #####  ##  ##   #####
 *             ##    ##  ##  ##  ##  ##      ##  ##  ##
 *            ##  #  ######  ##  ##   ####   ##  ##   ####
 *           ##  ##  ##      ##  ##      ##   #####      ##
 *          #######   ####   ##  ##  #####       ##  #####
 *                                           #####
 *          Products that speak Z-Wave work together better
 *
 *              Copyright (c) 2008
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
 * Description: Module description
 *
 * Author:   Ivar Jeppesen
 *
 * Last Changed By:  $Author: efh $
 * Revision:         $Revision: 29359 $
 * Last Changed:     $Date: 2014-07-11 11:13:33 +0200 (fr, 11 jul 2014) $
 *
 ****************************************************************************/
#ifndef _ZW_TYPEDEFS_H_
#define _ZW_TYPEDEFS_H_

#ifndef __C51__
#define data
#define code
#define idata
#define xdata
#define far
typedef unsigned char bit;
#endif

/****************************************************************************/
/*                              INCLUDE FILES                               */
/****************************************************************************/

/****************************************************************************/
/*                     EXPORTED TYPES and DEFINITIONS                       */
/****************************************************************************/
#ifndef BYTE
typedef unsigned char   BYTE;
typedef unsigned short  WORD;
typedef unsigned long   DWORD;

#define IIBYTE BYTE idata  /* Internal indexed data byte */
#define IBYTE  BYTE data   /* Internal data byte */
#define IWORD  WORD data   /* Internal data word */
#define IDWORD DWORD data  /* Internal data double word*/

#define XBYTE  BYTE xdata  /* External data byte */
#define XWORD  WORD xdata  /* External data word */
#define XDWORD DWORD xdata /* External data double word */
#define BBYTE  BYTE bdata  /* Internal bit adressable byte */

#define PBYTE  XBYTE
#define PWORD  XWORD
#define PDWORD XDWORD

#define BOOL   bit         /* Internal bit */

#define CODE   code        /* Used for defining callback function which allways */
                           /* resides in code space. */

typedef BYTE * BYTE_P;
typedef WORD * WORD_P;
typedef DWORD * DWORD_P;

typedef struct
{
  BYTE anything;
} sSomeXDATA4K;
typedef sSomeXDATA4K * XDATA4K_P;
#endif

#ifndef EOF
#define EOF (-1)
#endif

#ifndef NULL
#define NULL  (0)
#endif

#ifndef TRUE
#define TRUE  (1)
#define FALSE (0)
#endif

/* Define for making easy and consistent callback definitions */
#define VOID_CALLBACKFUNC(completedFunc)  void (CODE *completedFunc)

/* Remove memory specifier byte from generic pointer
   See also: http://www.keil.com/forum/3443/ */
#ifdef __C51__
#define STRIP_GENERIC_PTR(p) ((unsigned) (void *) (p))
/* Macros to test generic pointers for NULL-ness, even if they
have been promoted from memory specific pointers */
#define IS_NULL(x)  (STRIP_GENERIC_PTR(x) == 0)
#define NON_NULL(x) (STRIP_GENERIC_PTR(x) != 0)
#else
#define IS_NULL(x) (NULL == x)
#define NON_NULL(x) (NULL != x)
#endif

#define UNUSED(x) x = x; /* Hack to silence warning C280 Unreferenced local variable */
#define UNUSED_CONST(x) if(x) ; /* Hack to silence warning C280 Unreferenced const variable */

#define UIP_HTONL(x) x // C51 is big endian by default

/****************************************************************************/
/*                                 MACROS                                   */
/****************************************************************************/

/* offset of field m in a struct s */
#ifndef offsetof
#define offsetof(s,m)   (WORD)( (BYTE_P)&(((s *)0)->m) - (BYTE_P)0 )
#endif


#endif /* _ZW_TYPEDEFS_H_ */
