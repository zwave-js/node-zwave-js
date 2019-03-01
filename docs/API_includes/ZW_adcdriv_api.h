/******************************  ZW_adcdriv_api.h  *******************************
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
 *-----------------------------------------------------------------------------
 *
 * Description: Headerfile for interfacing to the Analog to digital converter.
 *
 * Author:Samer Seoud
 *
 * Last Changed By:  $Author: jsi $
 * Revision:         $Revision: 33893 $
 * Last Changed:     $Date: 2016-06-24 15:13:48 +0200 (fr, 24 jun 2016) $
 *
 *****************************************************************************/
#ifndef _ZW_ADCDRIV_API_H_
#define _ZW_ADCDRIV_API_H_

/***************************************************************/
/* DEFINES                                                     */
/***************************************************************/
#define ADC_IO_SINGLE_MODE       0x01
#define ADC_IO_MULTI_MODE        0x02
#define ADC_BATT_MULTI_MODE      0x03
#define ADC_BATT_SINGLE_MODE     0x04

/***************************************************************/
/* ZW050x: P3.4                                                */
/***************************************************************/
#define ADC_PIN0             0x01

/***************************************************************/
/* ZW050x: P3.5                                                */
/***************************************************************/
#define ADC_PIN1             0x02

/***************************************************************/
/* ZW050x: P3.6                                                */
/***************************************************************/
#define ADC_PIN2             0x04

/***************************************************************/
/* ZW050x: P3.7                                                */
/***************************************************************/
#define ADC_PIN3             0x08

#define ADC_PIN_BATT           0x00

#define ADC_REF_U_EXT          0x01
#define ADC_REF_U_BGAB         0x02
#define ADC_REF_U_VDD          0x04

#define ADC_REF_L_EXT          0x10
#define ADC_REF_L_VSS          0x20

#define ADC_8_BIT             0x01
#define ADC_12_BIT            0x02

#define ADC_AZPL_128          0x00
#define ADC_AZPL_256          0x40
#define ADC_AZPL_512          0x80
#define ADC_AZPL_1024         0xC0

#define ADC_THRES_LOWER       0x01
#define ADC_THRES_UPPER       0x02



#define ADC_NOT_FINISHED  0xFFFF

/**************************************************************************************************************************/
/*                                     ZW050x series                                                                      */
/**************************************************************************************************************************/

/*===============================   ZW_ADC_enable   =============================
**  start/stop the ADC unit in the ZW050x ASIC.
**  When adc is disabled while running in multiconversion mode the adc will
**  continue until the current conversion is done.
**-----------------------------------------------------------------------------*/
void ZW_ADC_enable(BYTE boStart);


/*===============================   ZW_ADC_power_enable   =============================
**  Power on/off the ADC unit.
**--------------------------------------------------------------------------*/
void ZW_ADC_power_enable(BYTE boEnable); /*IN TRUE to power on the ADC, FALSE to power it off*/

/*===============================   ZW_ADC_pin_select   ======================
**  Select the input pin for the ADC.
**--------------------------------------------------------------------------*/
void ZW_ADC_pin_select(BYTE bAdcPin); /*IN the adc to select as an input for the current conversion*/

/*===========================   ZW_ADC_threshold_set  ===========================
**  Set the comparsion threshold value of the ADC.
**  depending on the threshold mode the adc interrupt will fire when the convertion
**  is above or equal / below or equal the threshold value
** Note: ADC_SetResolution() must be called in advance to set resolution.
**--------------------------------------------------------------------------*/
void ZW_ADC_threshold_set(WORD wThreshold); /*IN the value used as threshold  */

/*=============================   ZW_ADC_int_enable  ========================
** enable or disable the ADC interrupt
**--------------------------------------------------------------------------*/
void ZW_ADC_int_enable(BYTE boEnable);  /** IN: TRUE to enable the adc interrupt, FALSE to disable it*/

/*=============================   ZW_ADC_int_clear  ========================
** clear the adc interrupt flag
**--------------------------------------------------------------------------*/
void ZW_ADC_int_clear();

/*===============================   ZW_ADC_is_fired   ===========================
**  Check if the ADC conversion crossed over the threshold value.
**--------------------------------------------------------------------------*/
BOOL ZW_ADC_is_fired();

/*===============================   ZSW_ADC_get_result   ===========================
**  get the value of an ADC conversion.
**--------------------------------------------------------------------------*/

WORD           /* RET: return the conversion result */
ZW_ADC_result_get();

/*============================  ZW_ADC_buffer_enable =============================================
**      Switches a buffer in between the analog input and the AD converter
------------------------------------------------------------------------------*/
void
ZW_ADC_buffer_enable(
        BYTE boEnable); /* IN TRUE: Switcht the buffer on, FALSE: switch the buffer off*/

/*=============================== ZW_ADC_auto_zero_set ===========================
** The the auto zero period length
-------------------------------------------------------------------------*/
void
ZW_ADC_auto_zero_set(
            BYTE bAzpl);  /* IN the ADC auto zero period length
                             Valid values: ADC_AZPL_128
                                            ADC_AZPL_256
                                            ADC_AZPL_512
                                            ADC_AZPL_1024*/

/*============================ ZW_ADC_resolution_set  ===========================
** Set the resolution of the ADC
** Parameters valid values:
**                           ADC_8_BIT for 8 bit ADC resolution
**                           ADC_12_BIT for 12 bit ADC resoltuion
** when resolution is ADC_8_BIT the sampling rate is 21k sample/s
** When resolution is ADC_16_BIT the sampling rate is 9k samples/s
---------------------------------------------------------------------------------*/

void
ZW_ADC_resolution_set(
                  BYTE bReso ); /*IN Valid values :ADC_8_BIT or ADC_12_BIT*/

/*======================================= ZW_ADC_threshold_mode_set  ==============================================
** Set the threshold trigger type.
** Parameter valid values:
**   ADC_THRES_UPPER if the interrupt is released when converted value is above/equal to the threshold
**   ADC_THRES_LOWER if the interrupt is released when converted value is below/equal to the threshold
-------------------------------------------------------------------------------------------------------*/

void
ZW_ADC_threshold_mode_set(
                 BYTE bThresMode); /*IN valid values: ADC_THRES_UPPER or ADC_THRES_LOWER*/

/*================================ ZW_ADC_batt_monitor_enable  ==============================================
** Enable The battery monitor mode
**
-------------------------------------------------------------------------------------------------------*/
void
ZW_ADC_batt_monitor_enable(BYTE boEnable); /*IN: TRUE to enable the battary monitor, FALSE to disable it*/

/*=============================   ZW_ADC_init  ========================
** Initialize the ADC unit and turn it on.
**--------------------------------------------------------------------------*/
void                       /*RET  Nothing       */
ZW_ADC_init(
         BYTE bMode,                 /*IN  Mode of the ADC, single, continious ect. */
         BYTE bUpper_ref,            /*IN  Which type of upper voltage reference to use*/
         BYTE bLower_ref,            /*IN  Which type of lower voltage reference to use*/
         BYTE bPin_en);               /*IN  Which pin(s) to enable */

#endif /* _ZW_ADCDRIV_API__H_ */
