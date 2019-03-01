/*
 * ZW_stdint.h
 *
 * Define integer types by their conventional POSIX names [1].
 * Note: This is a small subset of the spec, NOT a complete definition.
 *
 *  [1] http://pubs.opengroup.org/onlinepubs/9699919799/basedefs/stdint.h.html
 *
 *  Created on: 18/01/2013
 *      Author: jbu
 */
#ifndef ZW_STDINT_H_
#define ZW_STDINT_H_

#ifdef __GNUC__
#include <stdint.h>
#endif

#ifndef _STDINT_H // yield to "proper" stdint
#define _STDINT_H

typedef unsigned char uint8_t;
typedef unsigned short uint16_t;

/* These are needed to satisfy Yakindu*/
#ifndef __GNUC__
typedef signed short int_fast16_t;
typedef unsigned short uint_fast16_t;
#endif
#ifdef __C51__
typedef signed long int32_t;
typedef unsigned long uint32_t;
typedef int32_t  *intptr_t;
#endif
typedef unsigned char bool;
//   typedef unsigned __int64  uintptr_t;
//#else // _WIN64 ][
//   typedef _W64 signed int   intptr_t;
//   typedef _W64 unsigned int uintptr_t;
#define true (1)
#define false (0)

#endif /*#ifndef _STDINT_H*/

/* These are actually not POSIX, but from contiki */
typedef uint8_t u8_t;
typedef uint16_t u16_t;

#endif /* ZW_STDINT_H_ */
