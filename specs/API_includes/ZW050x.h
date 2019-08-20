/*******************************  ZW050x.h  *****************************
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
 * Description: Inventra 8051 SFR defines for the Z-Wave ZW050x RF transceiver.
 *
 * Author:   Samer Seoud
 *
 * Last Changed By:  $Author: sse $
 * Revision:         $Revision: 9285 $
 * Last Changed:     $Date: 2007-09-11 16:07:39 +0200 (Tue, 11 Sep 2007) $
 *
 ****************************************************************************/
#ifndef _ZW050X_H_
#define _ZW050X_H_

sfr SFRPAGE   = 0xFF;
sfr ACC       = 0xE0;
sfr SP        = 0x81;
sfr PCON      = 0x87;
sfr TCON      = 0x88;
sfr TMOD      = 0x89;
sfr TL0       = 0x8A;
sfr TL1       = 0x8B;
sfr TH0       = 0x8C;
sfr TH1       = 0x8D;
sfr IE        = 0xA8;
sfr IP        = 0xB8;
sfr PSW       = 0xD0;
sfr IE_1      = 0xE8;
sfr B         = 0xF0;
sfr IP1       = 0xF8;
sfr DPL       = 0x82;
sfr DPH       = 0x83;
sfr P0        = 0x80;
sfr P1        = 0x90;
sfr P2        = 0xA0;
sfr P3        = 0xB0;
sfr P0DIR     = 0xFD;
sfr P1DIR     = 0xC9;
sfr P2DIR     = 0xCA;
sfr P3DIR     = 0xCB;

/******  BIT accessible Registers ******/
/*P0*/
sbit P0b0  = P0^0;
sbit P0b1  = P0^1;
sbit P0b2  = P0^2;
sbit P0b3  = P0^3;
sbit P0b4  = P0^4;
sbit P0b5  = P0^5;
sbit P0b6  = P0^6;
sbit P0b7  = P0^7;


/*P1*/
sbit P1b0  = P1^0;
sbit P1b1  = P1^1;
sbit P1b2  = P1^2;
sbit P1b3  = P1^3;
sbit P1b4  = P1^4;
sbit P1b5  = P1^5;
sbit P1b6  = P1^6;
sbit P1b7  = P1^7;

/*P2*/
sbit P2b0  = P2^0;
sbit P2b1  = P2^1;
sbit P2b2  = P2^2;
sbit P2b3  = P2^3;
sbit P2b4  = P2^4;
sbit P2b5  = P2^5;
sbit P2b6  = P2^6;
sbit P2b7  = P2^7;

/*P3*/
sbit P3b0  = P3^0;
sbit P3b1  = P3^1;
sbit P3b4  = P3^4;
sbit P3b5  = P3^5;
sbit P3b6  = P3^6;
sbit P3b7  = P3^7;

/*  TCON  */
sbit TF1   = TCON^7;
sbit TR1   = TCON^6;
sbit TF0   = TCON^5;
sbit TR0   = TCON^4;
sbit IE1   = TCON^3;
sbit IT1   = TCON^2;
sbit IE0   = TCON^1;
sbit IT0   = TCON^0;

/*IE*/
sbit EA     = IE^7;
sbit ES0    = IE^4;
sbit ET1    = IE^3;
sbit EX1    = IE^2;
sbit ET0    = IE^1;
sbit EX0    = IE^0;

/*IP*/
sbit PS0    = IP^4;
sbit PT1    = IP^3;
sbit PX1    = IP^2;
sbit PT0    = IP^1;
sbit PX0    = IP^0;

/*PSW*/
sbit CY    = PSW^7;
sbit AC    = PSW^6;
sbit F0    = PSW^5;
sbit RS1   = PSW^4;
sbit RS0   = PSW^3;
sbit OV    = PSW^2;
sbit FL    = PSW^1;
sbit P     = PSW^0;

/*IE_1*/
sbit ESPI0   = IE_1^7;
sbit EIR     = IE_1^6;
sbit EUSB    = IE_1^5;
sbit ES1     = IE_1^4;
sbit EADC    = IE_1^2;
sbit EGPT    = IE_1^1;
sbit ETRI    = IE_1^0;

/*IP1*/
sbit PSPI0    = IP1^7;
sbit PIR      = IP1^6;
sbit PUSB     = IP1^5;
sbit PS1      = IP1^4;
sbit PADC     = IP1^2;
sbit PGPT     = IP1^1;
sbit PTRI     = IP1^0;

/*SFR registers page select defines*/
#define P0_PAGE    /* ANY */
#define P1_PAGE    /* ANY */
#define P2_PAGE    /* ANY */
#define P3_PAGE    /* ANY */
// Auto-generated vvvvvvvvvvv
#define P0DIR_PAGE SFRPAGE=0x01
#define P1DIR_PAGE SFRPAGE=0x01
#define P2DIR_PAGE SFRPAGE=0x01
#define P3DIR_PAGE SFRPAGE=0x01
  // Auto-generated ^^^^^^^^^^^^^^^^^^
#define IP1_PAGE   /* ANY */
#define B_PAGE     /* ANY */
#define IE1_PAGE   /* ANY */
#define A_PAGE     /* ANY */
#define PSW_PAGE   /* ANY */
#define IP_PAGE    /* ANY */
#define IE_PAGE    /* ANY */
#define P1_PAGE    /* ANY */
#define TH1_PAGE   /* ANY */
#define TH0_PAGE   /* ANY */
#define TL1_PAGE   /* ANY */
#define TL0_PAGE   /* ANY */
#define TMOD_PAGE  /* ANY */
#define TCON_PAGE  /* ANY */
#define PCON_PAGE  /* ANY */
#define DPH_PAGE   /* ANY */
#define DPL_PAGE   /* ANY */
#define SP_PAGE    /* ANY */
#define P0_PAGE    /* ANY */

/*SFR registers bit defines*/
#define P0_BITS                        0xFF
#define P1_BITS                        0xFF
#define P2_BITS                        0xFF
#define P3_H_BITS                      0xF0
#define P3_RESERVED_BITS               0x0C
#define P3_L_BITS                      0x03
#define SFRPAGE_RESERVED_BITS          0xFC
#define SFRPAGE_BITS                   0x03

/* SFR macros. Sets correct page */
#define SFR_SET(r,v) {r##_PAGE;r=v;}
#define SFR_SET_MASK(r,v,m) {r##_PAGE;r=((r##)&~(m##))|((v##)&(m##));}
#define SFR_GET(d,r) {r##_PAGE;d=r;}
#define SFR_GET_MASK(d,v,r) {r##_PAGE;d=((r)&(v));}
#define SFR_OR(r,v) {r##_PAGE;r=(r|v);}
#define SFR_AND(r,v) {r##_PAGE;r=(r&v);}



//ISR servicing external 0
#define INUM_INT0    0

//ISR servicing timer 0
#define INUM_TIMER0  1

//ISR servicing external 1
#define INUM_INT1    2

//ISR servicing timer 1
#define INUM_TIMER1  3

//ISR servicing serial port 0
#define INUM_SERIAL0 4

//INUM servicing TRIAC
#define INUM_TRIAC   6

//ISR servicing general purpose timer
#define INUM_GP_TIMER  7

//ISR servicing ADC
#define INUM_ADC 8


//ISR servicing serial port 1
#define INUM_SERIAL1 10

//ISR servicing USB
#define INUM_USB 11

//ISR servicing IR
#define INUM_IR 12

//ISR servicing SPI0
#define INUM_SPI0 13

//NMI servicing NMI
#define INUM_NMI 14

#endif /* _ZW050X_H_ */
