/******************************* ZW_routing_cache.c **************************
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
 * Description:   Embedded NUnit test. This module use Serial API to expose
 *                                     Test-API to PC.
 * Author:   Thomas Roll
 *
 * Last Changed By:  $Author: jsi $
 * Revision:         $Revision: 8774 $
 * Last Changed:     $Date: 2007-03-07 13:29:05 +0100 (Wed, 07 Mar 2007) $
 *
 ****************************************************************************/

#ifndef _ZW_NUNIT_API_H_
#define _ZW_NUNIT_API_H_

/****************************************************************************/
/*                              INCLUDE FILES                               */
/****************************************************************************/
//#include <utest_suite.h>
#include <ZW_typedefs.h>

/****************************************************************************/
/*                     EXPORTED TYPES and DEFINITIONS                       */
/****************************************************************************/

#define FUNC_ID_NUNIT_ASSERT_EQUAL 1
#define FUNC_ID_NUNIT_ASSERT_W_EQUAL 2
#define FUNC_ID_NUNIT_ASSERT_NOT_EQUAL 3
#define FUNC_ID_NUNIT_ASSERT_W_NOT_EQUAL 4
#define FUNC_ID_NUNIT_ASSERT_GREATER 5
#define FUNC_ID_NUNIT_ASSERT_LESS 6
#define FUNC_ID_NUNIT_ASSERT_IS_TRUE 7
#define FUNC_ID_NUNIT_ASSERT_IS_FALSE 8
#define FUNC_ID_NUNIT_ASSERT_IS_NULL 9
#define FUNC_ID_NUNIT_ASSERT_IS_NOT_NULL 0xa
#define FUNC_ID_NUNIT_ASSERT_FAIL 0xb
#define FUNC_ID_NUNIT_SCENARIO_LIST 0xFE
#define FUNC_ID_NUNIT_SCENARIO_END 0xFF
/****************************************************************************/
/*                              EXPORTED DATA                               */
/****************************************************************************/



/****************************************************************************/
/*                           EXPORTED FUNCTIONS                             */
/****************************************************************************/

/*===============================   ZW_UnitTestInit   ====================
**    Init Unit test.
**
**
**--------------------------------------------------------------------------*/
void ZW_UnitTestInit(VOID_CALLBACKFUNC(pCb)( BYTE cmd, XBYTE* pMessage, BYTE len ), BYTE (*pGetCallbackCnt));

/*===============================   ZW_UnitTestInit   ====================
**    Send a list of test suites and numbering to PC (using Serial API).
**
**
**--------------------------------------------------------------------------*/
void ZW_UnitTestList(void);


/*===============================   ZW_UnitTestEnd   ====================
**    End Unit test.
**
**
**--------------------------------------------------------------------------*/
void ZW_UnitTestEnd(void);



/*===============================   ZW_UnitTestTcRun   ====================
**    Run a test suite
**
**
**--------------------------------------------------------------------------*/
void ZW_UnitTestTcRun(BYTE suite);


/*===============================   ZW_UnitTestTcRun   ====================
**    Run a test suite function
**
**
**--------------------------------------------------------------------------*/
void ZW_UnitTestRunTcFunc(void);


void ZW_AssertEqual( BYTE expected, BYTE actual, BYTE_P pMessage );
void ZW_AssertWordEqual( WORD expected, WORD actual, BYTE_P pMessage );
void ZW_AssertNotEqual( BYTE expected, BYTE actual, BYTE_P pMessage );
void ZW_AssertWordNotEqual( WORD expected, WORD actual, BYTE_P pMessage );

/* asserts that x is greater than y ( x > y ). */
void ZW_AssertGreater( BYTE expected, BYTE actual, BYTE_P pMessage );
/* asserts that x is less than y ( x < y ). */
void ZW_AssertLess( BYTE expected, BYTE actual, BYTE_P pMessage );

void ZW_AssertIsTrue( BOOL cond, BYTE_P pMessage );
void ZW_AssertIsFalse( BOOL cond, BYTE_P pMessage );
void ZW_AssertIsNull( BYTE* anObject, BYTE_P pMessage );
void ZW_AssertIsNotNull( BYTE* anObject, BYTE_P pMessage );
/*The Assert.Fail method provides you with the ability to generate
a failure based on tests that are not encapsulated by the other methods*/
void ZW_AssertFail( BYTE_P pMessage );

#endif /* _ZW_NUNIT_API_H_ */
