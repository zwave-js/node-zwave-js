/***************************************************************************
*
* Copyright (c) 2001-2012
* Sigma Designs, Inc.
* All Rights Reserved
*
*---------------------------------------------------------------------------
*
* Description: Interface driver for the 500 Series Z-Wave Single Chip
*              built-in
*
* Author:      Morten Vested Olesen
*
* Last Changed By:  $Author: jdo $
* Revision:         $Revision: 1.38 $
* Last Changed:     $Date: 2005/07/27 15:12:54 $
*
****************************************************************************/
#ifndef _ZW_APPLTIMER_API_H_
#define _ZW_APPLTIMER_API_H_

/***************************************************************************/
/*                              INCLUDE FILES                              */
/****************************************************************************/
#include <ZW0x0x.h>
#include <ZW_typedefs.h>

/***************************************************************************/
/*                      PRIVATE TYPES and DEFINITIONS                      */
/***************************************************************************/

/***************************************************************************/
/*                              EXPORTED DATA                              */
/***************************************************************************/


/*******************************************************************************/
/*                                    Timer0                                   */
/*******************************************************************************/

#define TIMER_MODE_0 0x00
#define TIMER_MODE_1 0x01
#define TIMER_MODE_2 0x02
#define TIMER_MODE_3 0x03

#define TIMER_13BIT_MODE 0x00
#define TIMER_16BIT_MODE 0x01
#define TIMER_8BIT_RELOAD_MODE 0x02

/*============================   ZW_TIMER0_INT_GET   ====================
**    Function description
**      Get the status of timer0 interrupt flag
**    Side effects:
**--------------------------------------------------------------------------*/

#define ZW_TIMER0_INT_GET TF0

/*============================   ZW_TIMER0_init ===============================
**    Function description
**      Sets the Application register to the value specified:
**        TIMER_MODE_0: 13 bit mode. The 5 lower bits of the low register acts
**                      as a 5 bit prescaler for the high byte
**        TIMER_MODE_1: 16 bit mode.
**        TIMER_MODE_2: Auto reload mode. After an overflow the low byte is loaded
**                      into the high byte
**        TIMER_MODE_3: Timer 0 division mode. Timer 0 is divided into two 8 bit timers,
**                      one controlled by the Timer 0 cobntrol bits and the other controlled
**                      by the Timer 1 control bits. Enabling this will stop Timer 1
**--------------------------------------------------------------------------*/
void ZW_TIMER0_init(BYTE bValue);

/*============================   ZW_TIMER0_INT_CLEAR   ====================
**    Function description
**      Clears the Timer0 interrupt. Must be done on interrupt.
**    Side effects:
**--------------------------------------------------------------------------*/

#define ZW_TIMER0_INT_CLEAR  TF0=0

/*============================   ZW_TIMER0_INT_ENABLE   ======================
**    Function description
**      Enables or disables the Timer0 interrupt:
**        TRUE = Interrupt enabled
**        FALSE = Interrupt disabled
**    Side effects:
**
**--------------------------------------------------------------------------*/
#define ZW_TIMER0_INT_ENABLE(bState)  (ET0 = bState)

/*============================   ZW_TIMER0_ENABLE   ======================
**    Function description
**      Enables or disables the Timer0:
**        TRUE = Timer0 runs
**        FALSE = Timer0 halts
**    Side effects:
**
**--------------------------------------------------------------------------*/
#define ZW_TIMER0_ENABLE(bState)  (TR0 = bState)

/*============================   ZW_TIMER0_ext_clk   ======================
**    Function description
**      Select clock source for Timer0
**        TRUE = Timer0 runs on external clock (falling edge) of P3.4
**        FALSE = Timer0 runs on system clock (divided by 2) - default value after reset
**    Side effects:
**
**--------------------------------------------------------------------------*/
void   /* RET Nothing */
ZW_TIMER0_ext_clk(BYTE bState); /*IN TRUE or FALSE*/


/*============================   ZW_TIMER0_LOWBYTE_SET   ============================
**    Function description
**       Sets the low 8 bit Timer 0 register
**
**    Side effects:
**
**--------------------------------------------------------------------------*/
#define ZW_TIMER0_LOWBYTE_SET(bValue)   (TL0=bValue)

/*============================   ZW_TIMER0_HIGHBYTE_SET   ============================
**    Function description
**       Sets the high 8 bit Timer 0 register
**
**    Side effects:
**
**--------------------------------------------------------------------------*/
#define ZW_TIMER0_HIGHBYTE_SET(bValue)   (TH0=bValue)
/*============================   ZW_TIMER0_word_get   ========================
**    Function description
**       Gets the two 8 bit Timer 0 register values as one 16 bit value in a
**       safe way
**
**    Side effects:
**
**--------------------------------------------------------------------------*/
WORD ZW_TIMER0_word_get(void);

/*============================   ZW_TIMER0_HIGHBYTE_GET   ========================
**    Function description
**       Gets the high 8 bit Timer 0 register value
**
**    Side effects:
**
**--------------------------------------------------------------------------*/
#define ZW_TIMER0_HIGHBYTE_GET()  (TH0)

/*============================   ZW_TIMER0_LOWBYTE_GET   ========================
**    Function description
**       Gets the low 8 bit Timer 0 register value
**
**    Side effects:
**
**--------------------------------------------------------------------------*/
#define ZW_TIMER0_LOWBYTE_GET()  (TL0)

/*******************************************************************************/
/*                                    Timer1                                   */
/*******************************************************************************/

/*============================   ZW_TIMER0_INT_GET   ====================
**    Function description
**      Get the status of timer0 interrupt flag
**    Side effects:
**--------------------------------------------------------------------------*/

#define ZW_TIMER1_INT_GET TF1

/*============================   ZW_TIMER1_init ===============================
**    Function description
**      Sets the Application register to the value specified:
**        TIMER_MODE_0: 13 bit mode. The 5 lower bits of the low register acts as a 5 bit
**                      prescaler for the high byte
**        TIMER_MODE_1: 16 bit mode. (no reload)
**        TIMER_MODE_2: Auto reload mode. After an overflow the low byte is loaded into the
**                      high byte
**        TIMER_MODE_3: Timer 0 division mode. Timer 0 is divided into two 8 bit timers,
**                      one controlled by the Timer 0 cobntrol bits and the other controlled
**                      by the Timer 1 control bits. Enabling this will stop Timer 1
**      Timer1 counter counts up
**    Side effects:
**        If Timer0 uses mode 3 this will stop Timer1
**--------------------------------------------------------------------------*/
void ZW_TIMER1_init(BYTE bValue);

/*============================   ZW_TIMER1_INT_CLEAR   ====================
**    Function description
**      Clears the Timer1 interrupt. Must be done on interrupt.
**    Side effects:
**--------------------------------------------------------------------------*/

#define ZW_TIMER1_INT_CLEAR  TF1=0

/*============================   ZW_TIMER1_INT_ENABLE   ======================
**    Function description
**      Enables or disables the Timer1 interrupt:
**        TRUE = Interrupt enabled
**        FALSE = Interrupt disabled
**    Side effects:
**
**--------------------------------------------------------------------------*/
#define ZW_TIMER1_INT_ENABLE(bState)  (ET1 = bState)

/*============================   ZW_TIMER1_ENABLE   ======================
**    Function description
**      Enables or disables the Timer1:
**        TRUE = Timer0 runs
**        FALSE = Timer0 halted
**    Side effects:
**
**--------------------------------------------------------------------------*/
#define ZW_TIMER1_ENABLE(bState)  (TR1 = bState)

/*============================   ZW_TIMER1_ext_clk   ======================
**    Function description
**      Select clock source for Timer1
**        TRUE = Timer1 runs on external clock (falling edge) of P3.5
**        FALSE = Timer1 runs on system clock (divided by 2) - default value after reset
**    Side effects:
**
**--------------------------------------------------------------------------*/
void   /* RET Nothing */
ZW_TIMER1_ext_clk(BYTE bState); /*IN TRUE or FALSE*/

/*============================   ZW_TIMER1_LOWBYTE_SET   ============================
**    Function description
**       Sets the low 8 bit Timer 1 register
**
**    Side effects:
**
**--------------------------------------------------------------------------*/
#define ZW_TIMER1_LOWBYTE_SET(bValue)   (TL1=bValue)

/*============================   ZW_TIMER1_HIGHBYTE_SET   ============================
**    Function description
**       Sets the high 8 bit Timer 1 register
**
**    Side effects:
**
**--------------------------------------------------------------------------*/
#define ZW_TIMER1_HIGHBYTE_SET(bValue)   (TH1=bValue)

/*============================   ZW_TIMER1_word_get   ========================
**    Function description
**       Gets the two 8 bit Timer 1 register values as one 16 bit value in a
**       safe way
**
**    Side effects:
**
**--------------------------------------------------------------------------*/
WORD ZW_TIMER1_word_get(void);

/*============================   ZW_TIMER1_HIGHBYTE_GET   ========================
**    Function description
**       Gets the high 8 bit Timer 1 register value
**
**    Side effects:
**
**--------------------------------------------------------------------------*/
#define ZW_TIMER1_HIGHBYTE_GET()  (TH1)

/*============================   ZW_TIMER1_LOWBYTE_GET   ========================
**    Function description
**       Gets the low 8 bit Timer 1 register value
**
**    Side effects:
**
**--------------------------------------------------------------------------*/
#define ZW_TIMER1_LOWBYTE_GET()  (TL1)

/*******************************************************************************/
/*                                    GPTimer                                  */
/*******************************************************************************/

#define IMWR_BIT         0x40
#define RELOAD_BIT       0x08
#define PRESCALER_BIT    0x04
#define PWMINV_BIT       0x80
/*============================   ZW_GPTIMER_init ===============================
**    Function description
**      Sets the Application register to the bValue specified:
**        PRESCALER_BIT false = PWM counters run on fsystem/8.
**        PRESCALER_BIT true  = PWM counters run on fsystem/1024.
**        RELOAD_BIT false    = The timer stops upon overflow.
**        RELOAD_BIT true     = The timer reloads its counter registers upon overflow.
**        IMWR_BIT false      = The GP Timer counters will be loaded with the value of
**                              the reload register when it is disabled or when it
**                              times out (underrun).
**        IMWR_BIT true       = The GP Timer counters will be loaded with the value of
**                              the reload register when it is disabled or immediately
**                              when the reload value is set.
**        GPTimer counter counts down
**    Side effects:
**        - The PWM generator and the PWM output on P3.7 are disabled
**--------------------------------------------------------------------------*/
void   /* RET Nothing */
ZW_GPTIMER_init(BYTE bValue);


/*============================   ZW_GPTIMER_int_clear   ====================
**    Function description
**      Clears the GP timer interrupt flag.
**    Side effects:
**
**--------------------------------------------------------------------------*/
void   /* RET Nothing */
ZW_GPTIMER_int_clear(void);  /* IN   Nothing */


/*============================   ZW_GPTIMER_int_get   ====================
**    Function description
**      Read the GP timer interrupt flag.
**    Side effects:
**
**--------------------------------------------------------------------------*/
BYTE   /* RET 0x00:      Flag not set
        *     non-0x00 : Flag set       */
ZW_GPTIMER_int_get(void);  /* IN   Nothing */


/*============================   ZW_GPTIMER_int_enable   ======================
**    Function description
**      Enables or disables the GPTimer interrupt:
**        TRUE = Interrupt enabled
**        FALSE = Interupt disabled
**    Side effects:
**
**--------------------------------------------------------------------------*/
void   /* RET Nothing */
ZW_GPTIMER_int_enable(BYTE bState); /*IN TRUE or FALSE*/


/*============================   ZW_GPTIMER_enable   ======================
**    Function description
**      Enables or disables the GPTimer depending on the state of bState:
**        TRUE = GPTimer enabled
**        FALSE = GPTimer disabled
**      Timer counter is reloaded with the reload value when the GPTimer is
**      enabled.
**      When the GPTimer is disabled, the GPTimer circuit will be idle, hence
**      it will not issue interrupts nor set the interrupt flag.
**    Side effects:
**        - Clears interrupt flag.
**
**--------------------------------------------------------------------------*/
void   /* RET Nothing */
ZW_GPTIMER_enable(BYTE bState); /*IN TRUE or FALSE*/

/*============================   ZW_GPTIMER_pause   ======================
**    Function description
**      Enters or leaves pause state of the GPTimer:
**        TRUE = GPTimer pause state active
**        FALSE = GPTimer pause state inactive
**
**--------------------------------------------------------------------------*/
void   /* RET Nothing */
ZW_GPTIMER_pause(BYTE bState); /*IN TRUE or FALSE*/

/*============================   ZW_GPTIMER_reload_set   ======================
**    Function description
**       Sets the 16 bit GP Timer reload register. The value 0000h will give the
**       timeout value 10000h * prescaled_clock_periods.
**
**--------------------------------------------------------------------------*/
void   /* RET Nothing */
ZW_GPTIMER_reload_set(WORD wReloadValue);

/*============================   ZW_GPTIMER_reload_get   ======================
**    Function description
**       Returns the 16 bit GP Timer reload register value
**
**    Side effects:
**
**--------------------------------------------------------------------------*/
WORD   /* RET 16 bit reload value */
ZW_GPTIMER_reload_get(void); /* IN  Nothing */


/*============================   ZW_GPTIMER_get   ======================
**    Function description
**       Returns the 16 bit GP Timer register value
**
**    Side effects:
**
**--------------------------------------------------------------------------*/
WORD /* RET  GP Timer register */
ZW_GPTIMER_get(void); /* IN  Nothing */


/*******************************************************************************/
/*                                    PWM                                      */
/*******************************************************************************/


/*============================   ZW_PWM_init ===============================
**    Function description
**      Sets the Application register to the bValue specified:
**      PRESCALER_BIT false = PWM counters run on fsystem/8.
**      PRESCALER_BIT true  = PWM counters run on fsystem/1024.
**      IMWR_BIT false      = The PWM generator will use new values at the end
**                            of the a PWM period
**      IMWR_BIT true       = The PWM generator will use new values of GPTTH or GPTTL
**                            when it is disabled or immediately.
**      PWMINV_BIT false    = The PWM output is not inverted
**      PWMINV_BIT true     = The PWM output is inverted
**    Side effects:
        The GP Timer will be disabled
**--------------------------------------------------------------------------*/
void   /* RET Nothing */
ZW_PWM_init(BYTE bValue);

/*============================   ZW_PWM_enable   ======================
**    Function description
**      Enables or disables the PWM depending on the state of the :
**        TRUE = PWM enabled
**        FALSE = PWM disabled
**      PWM output is set high when the PWM is disabled and the PWMINV_BIT isn't set
**      PWM output is set low when the PWM is disabled and the PWMINV_BIT is set
**    Side effects:
**
**--------------------------------------------------------------------------*/
//void ZW_PWM_enable(BOOL bState)
#define ZW_PWM_enable ZW_GPTIMER_enable

/*============================   ZW_PWM_int_enable   ======================
**    Function description
**      Enables or disables the PWM interrupt:
**        TRUE = Interrupt enabled
**        FALSE = Interupt disabled
**    Side effects:
**
**--------------------------------------------------------------------------*/
#define ZW_PWM_int_enable   ZW_GPTIMER_int_enable

/*============================   ZW_PWM_int_clear   ====================
**    Function description
**      Clears the GP timer interrupt flag.
**    Side effects:
**
**--------------------------------------------------------------------------*/
#define ZW_PWM_int_clear   ZW_GPTIMER_int_clear


/*============================   ZW_GPTIMER_int_get   ====================
**    Function description
**      Read the GP timer interrupt flag.
**    Side effects:
**
**--------------------------------------------------------------------------*/
  /* RET 0x00:      Flag not set
   *     non-0x00 : Flag set       */
#define ZW_PWM_int_get   ZW_GPTIMER_int_get

/*============================   ZW_PWM_waveform_set   ======================
**    Function description
**      Sets the low and high periods of the PWM signal
**
**    Side effects:
**
**--------------------------------------------------------------------------*/
void ZW_PWM_waveform_set(BYTE bHigh,BYTE bLow);


/*============================   ZW_PWM_waveform_get   ======================
**    Function description
**      Returns the low and high periods of the PWM signal
**
**    Side effects:
**
**--------------------------------------------------------------------------*/
void /* RET Nothing */
ZW_PWM_waveform_get(BYTE *bHigh,  /* OUT high period */
                    BYTE *bLow);  /* OUT low period  */

#endif /*_ZW_APPLTIMER_API_H_*/
