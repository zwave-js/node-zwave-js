/****************************************************************************
 *
 * Copyright (c) 2001-2013
 * Sigma Designs, Inc.
 * All Rights Reserved
 *
 *---------------------------------------------------------------------------
 *
 * Description: Z-Wave common controller/slave application interface
 *
 * Author:   Ivar Jeppesen
 *
 * Last Changed By:  $Author: jsi $
 * Revision:         $Revision: 31343 $
 * Last Changed:     $Date: 2015-04-17 10:57:14 +0200 (fr, 17 apr 2015) $
 *
 ****************************************************************************/
/**
 * @file ZW_basis_api.h
 * @brief Z-Wave common controller/slave application interface.
 *
 * Z Wave <=> Application general software interface.
 */
#ifndef _ZW_BASIS_API_H_
#define _ZW_BASIS_API_H_

/****************************************************************************/
/*                              INCLUDE FILES                               */
/****************************************************************************/
#include <ZW_typedefs.h>
#include <ZW_sysdefs.h>
#include <ZW_stdint.h>

#include <ZW_transport_api.h>

#include <ZW_timer_api.h>
#include <ZW_mem_api.h>

#include <ZW_classcmd.h>

/**
 * \defgroup COMMON Z-Wave Common API
 * This section describes interface functions that are implemented within all Z Wave nodes.
 * The first subsection defines functions that must be implemented within the application
 * modules, while the second subsection defines the functions that are implemented within
 * the Z Wave basis library.
 * Functions that do not complete the requested action before returning to the application
 *  (e.g. ZW_SEND_DATA) have a callback function pointer as one of the entry parameters.
 *  Unless explicitly specified this function pointer can be set to NULL (no action to take on completion).
 *
 *
 * \defgroup BASIS Z-Wave Basis API
 * This section defines functions that are implemented in all Z Wave nodes.
 */

/* ZW_GetProtocolStatus retrun value masks*/
#define ZW_PROTOCOL_STATUS_ROUTING  0x01
#define ZW_PROTOCOL_STATUS_SUC      0x02

/* ZW_LIBRARY_TYPEs one of these defines are returned when requesting */
/* Library type */
#define ZW_LIB_CONTROLLER_STATIC  0x01
#define ZW_LIB_CONTROLLER         0x02
#define ZW_LIB_SLAVE_ENHANCED     0x03
#define ZW_LIB_SLAVE              0x04
#define ZW_LIB_INSTALLER          0x05
#define ZW_LIB_SLAVE_ROUTING      0x06
#define ZW_LIB_CONTROLLER_BRIDGE  0x07
#define ZW_LIB_DUT                0x08
#define ZW_LIB_AVREMOTE           0x0A
#define ZW_LIB_AVDEVICE           0x0B

/* ZW_PROTOCOL_TYPE one of these are returned when requesting */
/* Protocol type */
typedef enum _PROTOCOL_TYPE_
{
  Z_WAVE,
  Z_WAVE_AV,
  Z_WAVE_FOR_IP
} PROTOCOL_TYPE;

/*This bit mask used as paramters for the API ZW_SetSleepMode to indicate which interrupt to mask out*/
#define ZW_INT_MASK_EXT1       0x02

#define ZW_AV_VERSION_MAJOR       1
#define ZW_AV_VERSION_MINOR       0

#ifdef ZW_BETA_RELEASE
#define ZW_VERSION_BETA           'c'
#endif

/* Z-Wave Library Chip type */
#define ZW_CHIP_TYPE              5
#define ZW_CHIP_REVISION          0


#ifdef APP_RF_NOTIFY
#define LIB_RF_NOTIFY
#endif

#if defined(LIB_RF_NOTIFY)
/*The valid vlaues of teh ApplicationRfNotify API*/
#define ZW_RF_TX_MODE       1   /*RF switch from Rx to Tx mode, the modualtor is satrted and the PA is on*/
#define ZW_RF_RX_MODE       2   /*RF switch from Tx to Rx mode, the demodulator is started*/
#define ZW_RF_PA_ON         4   /*RF is in Tx mode, the PA is turned on*/
#define ZW_RF_PA_OFF        8   /*RF is in Tx mode, the PA is turned off   */
#endif

/* Interrupt defines for ZW_SetExtIntLevel() */
#define ZW_INT0     0x00
#define ZW_INT1     0x01

/****************************************************************************/
/*                     EXPORTED TYPES and DEFINITIONS                       */
/****************************************************************************/
#ifdef ZW_3CH_SYSTEM
#define NUM_CHANNELS 3
#else
#define NUM_CHANNELS 2
#endif
#define NUM_CHANNELS_2CH 2
#define NUM_CHANNELS_3CH 3
#define NUM_CHANNELS_MAX 3

/* Node type structure used in ApplicationNodeInformation */
typedef struct _APPL_NODE_TYPE_
{
  BYTE generic;
  BYTE specific;
} APPL_NODE_TYPE;

typedef struct _NODE_TYPE_
{
  BYTE basic;                 /* Basic Device Type, is it a Controller, Controller_Static, */
                              /* Slave or a Slave_Routing Device Type */
  BYTE generic;               /* Generic Device Type */
  BYTE specific;              /* Specific Device Type */
} NODE_TYPE;


/* Node info stored within the non-volatile memory */
/* This are the first (protocol part) payload bytes from the Node Infomation frame */
typedef struct _NODEINFO_
{
  BYTE        capability;     /* Network capabilities */
  BYTE        security;       /* Network security */
  BYTE        reserved;
  NODE_TYPE   nodeType;       /* Basic, Generic and Specific Device types - Basic is generated... */
} NODEINFO;


/* valid powerlevel values used in ZW_RF_POWERLEVEL_SET and ZW_RF_POWERLEVEL_GET */
enum
{
  normalPower = 0,
  minus1dBm,
  minus2dBm,
  minus3dBm,
  minus4dBm,
  minus5dBm,
  minus6dBm,
  minus7dBm,
  minus8dBm,
  minus9dBm,
  miniumPower = minus9dBm
};


/* Protocol version structure used in ZW_GetProtocolVersion() */
typedef struct _PROTOCOL_VERSION_
{
  BYTE protocolType; /* PROTOCOL_TYPE protocolType; */
  BYTE protocolVersionMajor;
  BYTE protocolVersionMinor;
  BYTE protocolVersionRevision;
  uint16_t build_number;
} PROTOCOL_VERSION;


typedef struct
{
  signed char rssi_dBm[NUM_CHANNELS];
} RSSI_LEVELS;

typedef struct
{
  signed char rssi_dBm[NUM_CHANNELS_2CH];
} RSSI_LEVELS_2CH;

typedef struct
{
  signed char rssi_dBm[NUM_CHANNELS_3CH];
} RSSI_LEVELS_3CH;


/* Protocol Network statistics structure returned when calling ZW_GetNetworkStats */
typedef struct _S_NETWORK_STATISTICS_
{
  WORD wRFTxFrames;         /* Transmitted Frames */
  WORD wRFTxLBTBackOffs;    /* LBT backoffs */
  WORD wRFRxFrames;         /* Received Frames (No errors) */
  WORD wRFRxLRCErrors;      /* Checksum Errors */
  WORD wRFRxCRC16Errors;    /* CRC16 Errors */
  WORD wRFRxForeignHomeID;  /* Foreign Home ID */
} S_NETWORK_STATISTICS;


/* ZW_NetworkLearnModeStart mode parameter definitions */
typedef enum _E_NETWORK_LEARN_MODE_ACTION_
{
  E_NETWORK_LEARN_MODE_DISABLE =  0,      /* Disable learn process */
  E_NETWORK_LEARN_MODE_INCLUSION  = 1,    /* Enable the learn process to do an inclusion */
  E_NETWORK_LEARN_MODE_EXCLUSION  = 2,    /* Enable the learn process to do an exclusion */
  E_NETWORK_LEARN_MODE_EXCLUSION_NWE = 3, /* Enable the learn process to do an network wide exclusion */
  E_NETWORK_LEARN_MODE_INCLUSION_SMARTSTART = 4,/* Enable the learn process to do an SMARTSTART inclusion */
  E_NETWORK_LEARN_MODE_COUNT
} E_NETWORK_LEARN_MODE_ACTION;


/*===============================   ZW_Poll   ================================
**    Z-Wave low level poll function.
**    This function must be called while waiting on HW ready states and
**    when executing time consuming functions.
**
**    Not to lose RF receive data the time limit is 3/4 bit time, which is
**    around 70 usec at 9600 bps (500 clockcycles). Interrupt must not be
**    disabled more than 1/12 bit time which is around 8 usec (40 clock cycles).
**
**
** void       RET Nothing
** ZW_Poll( void );  IN  Nothing
**--------------------------------------------------------------------------*/
#define ZW_POLL() ZW_Poll()


/*===============================   ZW_Version   ============================
**    Copy Z-Wave basis version from code memory (Flash) to data memory (SRAM)
**    destintaion should be in XDATA
** extern void         RET  Nothing
** ZW_Version(
** XBYTE *buffer);      IN Destination pointer in RAM
**--------------------------------------------------------------------------*/
#define ZW_VERSION(buf) ZW_Version(buf)

/*=========================   ZW_GetProtocolVersion   =======================
**    Get different protocol version info
**
**    Fill in the data structure PROTOCOL_TYPE
**    destintaion should be in XDATA
** extern void
** ZW_GetProtocolVersion(
**   PROTOCOL_VERSION *dst)     IN Destination pointer in RAM
** ;
**--------------------------------------------------------------------------*/
#define ZW_GET_PROTOCOL_VERSION(buf) ZW_GetProtocolVersion(buf)

/*============================   ZW_Type_Library   ===========================
** Get Z-Wave library type
**
** extern BYTE            RET  Z-Wave library type (ZW_LIB_xxxx)
** ZW_Type_Library(void);
**--------------------------------------------------------------------------*/
#define ZW_TYPE_LIBRARY() ZW_Type_Library()


/*===========================   SendNodeInformation   =======================
**    Create and transmit a node informations frame
**
** void                           RET  FALSE if transmitter queue overflow
** SendNodeInformation(
** BYTE node                      IN  Destination Node ID (0xff = broadcast)
** BYTE txOptions,                IN  Transmit option flags
** VOID_CALLBACKFUNC(completedFunc)(BYTE));  IN  Transmit completed call back function
**--------------------------------------------------------------------------*/
#define ZW_SEND_NODE_INFO(node,option,func) ZW_SendNodeInformation(node,option,func)


/*===============================   ZW_SetRFReceiveMode   ===================
**    Initialize the Z-Wave RF chip.
**    Mode on:  Set the RF chip in receive mode and starts the data sampling.
**    Mode off: Set the RF chip in power down mode.
**
** BYTE           RET TRUE if operation was executed successfully, FALSE if not
** ZW_SetRFReceiveMode(
** BYTE mode );   IN  TRUE: On; FALSE: Off mode
**--------------------------------------------------------------------------*/
#define ZW_SET_RX_MODE(mode) ZW_SetRFReceiveMode(mode)


/*===============================   ZW_Random   =============================
**  Pseudo-random number function
**
**--------------------------------------------------------------------------*/
#define ZW_RANDOM() ZW_Random()

#ifdef DYNAMICAL_POWERLEVEL
/*======================   ZW_RFPowerlevelRediscoverySet  ======================
**    Set the powerlevel used when doing neighbour discovery
**
**          normalPower : Max power possible
**          minus1dB   : normalPower - 1dB
**          minus2dB   : normalPower - 2dB
**          minus3dB   : normalPower - 3dB
**          minus4dB   : normalPower - 4dB
**          minus5dB   : normalPower - 5dB
**          minus6dB   : normalPower - 6dB
**          minus7dB   : normalPower - 7dB
**          minus8dB   : normalPower - 8dB
**          minus9dB   : normalPower - 9dB
**
**--------------------------------------------------------------------------*/
void ZW_RFPowerlevelRediscoverySet(BYTE bNewPower);
#endif

/*==========================   ZW_RFPowerLevelSet  ==========================
**    Set the powerlevel used in RF transmitting.
**    Valid powerlevel values are :
**
**          normalPower : Max power possible
**          minus1dBm   - normalPower - 1dB
**          minus2dBm   - normalPower - 2dB
**          minus3dBm   - normalPower - 3dB
**          minus4dBm   - normalPower - 4dB
**          minus5dBm   - normalPower - 5dB
**          minus6dBm   - normalPower - 6dB
**          minus7dBm   - normalPower - 7dB
**          minus8dBm   - normalPower - 8dB
**          minus9dBm   - normalPower - 9dB
**
**--------------------------------------------------------------------------*/
#define ZW_RF_POWERLEVEL_SET(POWERLEVEL) ZW_RFPowerLevelSet(POWERLEVEL)


/*==========================   ZW_RFPowerLevelGet  ==========================
**    Get the current powerlevel used in RF transmitting.
**    Possible powerlevel return values are :
**
**          normalPower : Max power possible
**          minus1dBm   - normalPower - 1dB
**          minus2dBm   - normalPower - 2dB
**          minus3dBm   - normalPower - 3dB
**          minus4dBm   - normalPower - 4dB
**          minus5dBm   - normalPower - 5dB
**          minus6dBm   - normalPower - 6dB
**          minus7dBm   - normalPower - 7dB
**          minus8dBm   - normalPower - 8dB
**          minus9dBm   - normalPower - 9dB
**
**--------------------------------------------------------------------------*/

#define ZW_RF_POWERLEVEL_GET() ZW_RFPowerLevelGet()


/*==========================   ZW_SEND_TEST_FRAME  ==========================
**    Send a test frame to specified nodeID, power is previously
**    set by calling ZW_RF_POWERLEVEL_SET.
**    Valid power index values are :
**
**          normalPower - Max power possible
**          minus1dBm   - normalPower - 1dB
**          minus2dBm   - normalPower - 2dB
**          minus3dBm   - normalPower - 3dB
**          minus4dBm   - normalPower - 4dB
**          minus5dBm   - normalPower - 5dB
**          minus6dBm   - normalPower - 6dB
**          minus7dBm   - normalPower - 7dB
**          minus8dBm   - normalPower - 8dB
**          minus9dBm   - normalPower - 9dB
**
**--------------------------------------------------------------------------*/

#define ZW_SEND_TEST_FRAME(nodeID, power, func) ZW_SendTestFrame(nodeID, power, func)


/*===========================   ZW_GetProtocolStatus   ==========================
**    Reprort the status of the protocol
**   The function return a mask telling which protocol function is currently running
**   possible MASK values:
**   ZW_PROTOCOL_STATUS_ROUTING:    protocol is analysing the routing table.
**   ZW_PROTOCOL_STATUS_SUC:        SUC is sending pending updates.
**
**   return value of ZERO means protocol is idle.
**--------------------------------------------------------------------------*/
#define ZW_GET_PROTOCOL_STATUS()   ZW_GetProtocolStatus()

/*===============================   ZW_SET_EXT_INT_LEVEL   =========================================
**    Set the trigger level for external interrupt 0 or 1
**---------------------------------------------------------------------------------------------*/
#define ZW_SET_EXT_INT_LEVEL(SRC, TRIGGER_LEVEL)  ZW_SetExtIntLevel(SRC, TRIGGER_LEVEL)

/*============================= ZW_WATCHDOG_ENABLE =========================================
**  Enable the watch dog.
**  parameters:
**----------------------------------------------------------------------------*/
#define ZW_WATCHDOG_ENABLE  ZW_WatchDogEnable()
/*============================= ZW_WATCHDOG_DISABLE =========================================
**  Disable the watch dog.
**  parameters:
**----------------------------------------------------------------------------*/
#define ZW_WATCHDOG_DISABLE ZW_WatchDogDisable()

/*============================= ZW_WATCHDOG_KICK =========================================
**  Kick the watch dog to restarted.
**  parameters:
**----------------------------------------------------------------------------*/
#define ZW_WATCHDOG_KICK  ZW_WatchDogKick()

/*============================   ZW_SET_PROMISCUOUS_MODE   ======================
**
**  Function description.
**   Enable / disable the installer library promiscuous mode.
**   When promiscuous mode is enabled, all application layer frames will be passed
**   to the application layer regardless if the frames are addressed to another node.
**   When promiscuous mode is disabled, only application frames addressed to the node will be passed
**   to the application layer.
**
**  Side effects:
**
**--------------------------------------------------------------------------*/
#define ZW_SET_PROMISCUOUS_MODE(state)   ZW_SetPromiscuousMode(state)


/*============================== ZW_GetRandomWord ===========================
**    Get a true random word
**
**  Side effects:
**
**--------------------------------------------------------------------------*/
#define ZW_GET_RANDOM_WORD(randomWord)   ZW_GetRandomWord(randomWord)


/* TO#02781  fix - ZW_ExploreRequestInclusion not implemented in SerialAPI */
/*===========================   ZW_ExploreRequestInclusion   =================
**    Transmit a request for inclusion via a explore frame.
**
**    Side effects:
**
**--------------------------------------------------------------------------*/
#define ZW_EXPLORE_REQUEST_INCLUSION() ZW_ExploreRequestInclusion()

/*===========================   ZW_ExploreRequestInclusion   =================
**    Transmit a request for inclusion via a explore frame.
**
**    Side effects:
**
**--------------------------------------------------------------------------*/
#define ZW_EXPLORE_REQUEST_EXCLUSION() ZW_ExploreRequestExclusion()

/****************************************************************************/
/*                              EXPORTED DATA                               */
/****************************************************************************/

/* bWakeupReason can have the following values */
#define ZW_WAKEUP_RESET   0       /* Wake up after HW Reset (RESET_N pin activation) */
#define ZW_WAKEUP_WUT     1       /* Wake up by WUT timer */
#define ZW_WAKEUP_SENSOR  2       /* Wake up by a Wakeup Beam */
#define ZW_WAKEUP_WATCHDOG 3      /* Wake up after Watchdog Reset */
#define ZW_WAKEUP_EXT_INT  4      /* Wake up by External INT */
#define ZW_WAKEUP_POR      5      /* Wake up after Power On Reset */
#define ZW_WAKEUP_USB_SUSPEND 6   /* Wake up by USB suspend */
#define ZW_WAKEUP_SMARTSTART  7   /* Wake up in SMARTSTART */


typedef enum _SW_WAKEUP
{
  /**
   * Wake up after Hardware Reset (RESET_N pin activation)
   */
  SW_WAKEUP_RESET = ZW_WAKEUP_RESET,
  /**
   * Wake up by the WUT timer
   */
  SW_WAKEUP_WUT = ZW_WAKEUP_WUT,
  /**
   * Wake up by a Wakeup Beam
   */
  SW_WAKEUP_SENSOR = ZW_WAKEUP_SENSOR,
  /**
   * Reset because of a watchdog timeout
   */
  SW_WAKEUP_WATCHDOG = ZW_WAKEUP_WATCHDOG,
  /**
   * Wake up by External Interrupt
   */
  SW_WAKEUP_EXT_INT = ZW_WAKEUP_EXT_INT,
  /**
   * Reset by Power On Reset circuit
   */
  SW_WAKEUP_POR = ZW_WAKEUP_POR,
  /**
   * Wake up by USB suspend
   */
  SW_WAKEUP_USB_SUSPEND = ZW_WAKEUP_USB_SUSPEND,
  /**
   * Wake up in SMARTSTART
   */
  SW_WAKEUP_SMARTSTART = ZW_WAKEUP_SMARTSTART,
  /**
   * Unknown Wakeup reason
   */
  SW_WAKEUP_UNKNOWN = 0xFF
}
wakeup_reason_t;

/**
 * For backwards compatibility.
 */
typedef wakeup_reason_t SW_WAKEUP;

typedef enum _ZW_NVM_STATUS_
{
  /**
   * Nvm was empty or corrupt during startup and has been initialized to default state. This may indicate a first time startup of the system.
   */
  ZW_NVM_INITIALIZED = 0,
  /**
   * Nvm was valid during startup and layout is matching current application. This will be the normal startup scenario.
   */
  ZW_NVM_VALID = 1,
  /**
   * Nvm was upgraded during startup. This indicate a firmware update has completed and the nvm layout has been updated to match the definition of the new firmware.
   */
  ZW_NVM_UPGRADED,
} ZW_NVM_STATUS;


typedef enum _E_APPLICATION_STATE_
{
  /**
   * Application active - not ready for sleep/powerdown
   */
  E_APPLICATION_STATE_ACTIVE = 0,
  /**
   * Application want powerdown - ready for system powerdown - if applicable
   */
  E_APPLICATION_STATE_READY_FOR_POWERDOWN = 1,
  /**
   * Number of known Application states
   */
  E_APPLICATION_STATE_COUNT
} E_APPLICATION_STATE;


typedef enum _E_PROTOCOL_STATE_
{
  /**
   * Protocol active - not ready for sytem shutdown
   */
  E_PROTOCOL_STATE_ACTIVE = 0,
  /**
   * Protocol power down pending - protocol making ready for system shutdown
   */
  E_PROTOCOL_STATE_SHUTDOWN_PENDING = 1,
  /**
   * Protocol going in powerdown - now ready for system shutdown
   */
  E_PROTOCOL_STATE_READY_FOR_SHUTDOWN = 2,
  /**
   * Number of known Protocol states
   */
  E_PROTOCOL_STATE_COUNT
} E_PROTOCOL_STATE;


/*============================================================================
**    Defines for ApplicationNodeInformation field deviceOptionMask
**--------------------------------------------------------------------------*/
#define APPLICATION_NODEINFO_NOT_LISTENING            0x00
#define APPLICATION_NODEINFO_LISTENING                0x01
#define APPLICATION_NODEINFO_OPTIONAL_FUNCTIONALITY   0x02
#define APPLICATION_FREQ_LISTENING_MODE_1000ms        0x10
#define APPLICATION_FREQ_LISTENING_MODE_250ms         0x20

/**
 *
 */
typedef enum _E_SYSTEM_TYPE_
{
  /**
   *
   */
  E_SYSTEM_TYPE_NON_LISTENING = APPLICATION_NODEINFO_NOT_LISTENING,     /* 0x00 */
  /**
   *
   */
  E_SYSTEM_TYPE_LISTENING = APPLICATION_NODEINFO_LISTENING,     /* 0x01 */
  /**
   *
   */
  E_SYSTEM_TYPE_FLIRS = 0x02,                                       /* 0x02 */
} E_SYSTEM_TYPE;

#define SYSTEM_TYPE_LISTENING_MASK          E_SYSTEM_TYPE_LISTENING
#define SYSTEM_TYPE_FLIRS_MASK              E_SYSTEM_TYPE_FLIRS

extern code const BYTE ZW_3CH_Build;

/*==============================   ApplicationInitHW   ======================*/
/**
 * \ingroup COMMON
 * \ref ApplicationInitHW is used to initialize hardware used by the application.
 * The Z Wave hardware initialization function set all application IO pins to input mode.
 * The \ref ApplicationInitHW function MUST be called by the Z Wave main function during system startup.
 * At this point of time the Z Wave timer system is not started so waiting on hardware to get ready SHOULD be done by MCU busy loops.
 *
 * Declared in: ZW_basis_api.h
 *
 * \return TRUE  Application hardware initialized
 * \return FALSE Application hardware initialization failed. Protocol enters test mode and Calls ApplicationTestPoll
 * \param[in] bWakeupReason
      - \ref ZW_WAKEUP_RESET       Wake up after Hardware Reset (RESET_N pin activation)
      - \ref ZW_WAKEUP_WUT         Wake up by the WUT timer
      - \ref ZW_WAKEUP_SENSOR      Wake up by a Wakeup Beam
      - \ref ZW_WAKEUP_WATCHDOG	   Reset because of a Watchdog Timeout
      - \ref ZW_WAKEUP_EXT_INT     Wake up by External Interrupt
      - \ref ZW_WAKEUP_POR         Reset by Power On Reset circuit
      - \ref ZW_WAKEUP_USB_SUSPEND Wake up by USB suspend
 *
 * Serial API (Not supported)
 *
 */
extern  BYTE        /*RET TRUE if HW initialized */
ApplicationInitHW(
  SW_WAKEUP bWakeupReason  /* Reason for the powerup of the chip */
);


/*==========================   ApplicationInitSW   ==========================*/
/**
 * \ingroup COMMON
 *
 * \ref ApplicationInitSW is used to initialize memory used by the application and driver software.
 *      ApplicationInitSW return code is used to make the protocol determine if node should go
 *      into Power Down mode and if so; when and which Power Down mode should be used.
 *
 * \ref ApplicationInitSW MUST be called from the Z Wave main function during system startup.
 * Notice that watchdog is enabled by default and MUST be kicked by the application
 * to avoid resetting the system (See \ref ZW_WatchDogKick).
 *
 * Declared in: ZW_basis_api.h
 *
 * \return Application type - Listening/None-Listening or FREQ_LISTENING_250ms/FREQ_LISTENING_1000ms
 *    - \ref APPLICATION_NODEINFO_NOT_LISTENING
 *    - \ref APPLICATION_NODEINFO_LISTENING
 *    - \ref APPLICATION_FREQ_LISTENING_MODE_250ms
 *    - \ref APPLICATION_FREQ_LISTENING_MODE_1000ms
 * \param[in] bNvmStatus
 *    - \ref ZW_NVM_INITIALIZED     Nvm was empty or invalid during startup and has now been initialized as first time startup.
 *    - \ref ZW_NVM_VALID           Nvm is valid, that is in normal running condition.
 *    - \ref ZW_NVM_UPDATED         Nvm has been updated to match the layout of a newly installed firmware. Nvm is thus ready for normal operation.
 * Serial API (Not supported)
 *
 */
extern  BYTE        /*RET Application type - Listening/NotListening or FREQ_LISTENING_250ms/FREQ_LISTENING_1000ms */
ApplicationInitSW(
  ZW_NVM_STATUS bNvmStatus  /* Status of the nvm at startup. */
);


/*===========================   ApplicationPoll   ===========================*/
/**
 * \ingroup COMMON
 * The \ref ApplicationPoll function is the entry point from the Z Wave basis
 * software to the application software modules. The \ref ApplicationPoll function
 * is called from the Z Wave main loop when no low-level time critical actions are active.
 * In order not to disrupt the radio communication and the protocol,
 * the application code MUST return within 2ms measured from the call of \ref ApplicationPoll.
 *
 * To determine the \ref ApplicationPoll frequency (see table below) a LED Dimmer
 * application is modified to be able to measure how often \ref ApplicationPoll
 * is called via an output pin. The minimum value is measured when the module is idle,
 * i.e. no RF communication, no push button activation etc. The maximum value
 * is measured when the ERTT application at the same time sends Basic Set Commands
 * (value equal 0) as fast as possible to the LED Dimmer (DUT).
 *
 * ApplicationPoll frequency:
 * |       |ZW0201 LED Dimmer|ZW0301 LED Dimmer|400 Series LED Dimmer|500 Series LED Dimmer|
 * |-------|-----------------|-----------------|---------------------|---------------------|
 * |Minimum|           7.2 us|           7.2 us|                80 us|                  TBD|
 * |Maximum|           2.4 ms|           2.4 ms|               180 us|                  TBD|
 *
 * The abovementioned output pin mapped to the ApplicationPoll SHOULD also be used during
 * application testing to ensure that the application code never runs for more than 2msec
 * even in worst-case scenarios; setting the pin high when entering and low when leaving
 * the ApplicationPoll function.
 *
 * Declared in: ZW_basis_api.h
 *
 * Serial API (Not supported)
 */


#ifdef ZW_SMARTSTART_ENABLED
extern E_APPLICATION_STATE          /*RET Application active state - if TRUE, ready to powerdown */
ApplicationPoll(
  E_PROTOCOL_STATE bProtocolState); /* IN Protocol current state - If FALSE, ready to shutdown */
#else
extern void       /*RET Nothing */
ApplicationPoll(
  void);          /* IN Nothing */
#endif


/*===========================   ApplicationTestPoll   ===========================*/
/**
 * \ingroup COMMON
 * The \ref ApplicationTestPoll function is the entry point from the Z Wave basis
 * software to the application software when the production test mode is enabled
 * in the protocol. This will happen when \ref ApplicationInitHW returns FALSE.
 * The \ref ApplicationTestPoll function will be called indefinitely until the device is reset.
 * The device must be reset and \ref ApplicationInitHW must return TRUE in order to exit this mode.
 * When \ref ApplicationTestPoll is called the protocol will acknowledge frames
 * sent to home ID equal to 0x00000000 and node ID as follows:
 *
 * |Device                                  | Node ID|
 * |----------------------------------------|--------|
 * |Slave                                   |    0x00|
 * |Controllers before Dev. Kit v3.40       |    0xEF|
 * |Controllers from Dev. Kit v3.40 or later|    0x01|
 *
 * The following API calls are only available in production test mode:
 *   - \ref ZW_EepromInit is used to initialize the external NVM.
 *   Remember to initialize controllers with a unique home ID that
 *   typically can be transferred via the UART on the production line.
 *   - \ref ZW_SendConst is used to validate RF communication.
 *   Remember to enable RF communication when testing products
 *   based on a portable controller, routing slave or enhanced 232 slave.
 *
 * Declared in: ZW_basis_api.h
 *
 * Serial API (Not supported)
 */
extern  void          /*RET Nothing */
ApplicationTestPoll(
  void);              /* IN Nothing */

#ifndef ZW_CONTROLLER_BRIDGE

/*===========================   ApplicationCommandHandler   =================*/
/**
 * \ingroup COMMON
 * \warning doc bridge
 *
 * The Z Wave protocol will call the \ref ApplicationCommandHandler function
 * when an application command or request has been received from another
 * node. The receive buffer is released when returning from this
 * function. The type of frame used by the request can be determined
 * (single cast, mulitcast or broadcast frame). This is used to avoid
 * flooding the network by responding on a multicast or broadcast. In
 * order not to disrupt the radio communication and the protocol, no
 * application function must execute code for more than 5ms without returning.
 *
 * Except for the Bridge Controller library, this function MUST be implemented
 * by the Application layer.
 *
 * Declared in: ZW_basis_api.h
 *
 * \param[in] pCmd IN Payload from the received frame.  The command class is the very first byte.
 * \param[in] cmdLength IN  Number of Command class bytes.
 * \param[in] rxopt IN RECEIVE_OPTIONS_TYPE struct.
 * |RECEIVE_OPTIONS_TYPE struct member|Flag description see \ref RECEIVE_OPTIONS_TYPE                                   |
 * |----------------------------------|---------------------------------------------------------------------------------|
 * |\ref destNode                     |Command destination Node ID Only valid in promiscuous mode and singlecast frames.|
 * |\ref sourceNode                   |Command sender Node ID.                                                          |
 * |\ref rxRSSIVal                    |RSSI val in dBm with which frame was received with.                              |
 * |\ref rxStatus                     |Received frame status flags, see \ref RECEIVE_STATUS                             |
 *  |Flag Name                         |Flag Mask|Flag description                                                                 |
 *  |----------------------------------|---------|---------------------------------------------------------------------------------|
 *  |\ref RECEIVE_STATUS_ROUTED_BUSY   |xxxxxxx1 |A response route is locked by the application                                    |
 *  |\ref RECEIVE_STATUS_LOW_POWER     |xxxxxx1x |Received at low output power level                                               |
 *  |\ref RECEIVE_STATUS_TYPE_SINGLE   |xxxx00xx |Received a single cast frame                                                     |
 *  |\ref RECEIVE_STATUS_TYPE_BROAD    |xxxx01xx |Received a broadcast frame                                                       |
 *  |\ref RECEIVE_STATUS_TYPE_MULTI    |xxxx10xx |Received a multicast frame                                                       |
 *  |\ref RECEIVE_STATUS_TYPE_EXPLORE  |xxx10xxx |Received an explore frame                                                        |
 *  |\ref RECEIVE_STATUS_FOREIGN_FRAME |x1xxxxxx |The received frame is not addressed to this node (Only valid in promiscuous mode)|
 *
 * \serialapi{ZW->HOST: REQ | 0x04 | rxopt->rxStatus | rxopt->sourceNode | cmdLength | pCmd[ ] | rxopt->rxRSSIVal }
 *
 * When a foreign frame is received in promiscuous mode (only valid for controller portable) :
 * \serialapi{ZW->HOST: REQ | 0xD1 | rxopt->rxStatus | rxopt->sourceNode | cmdLength | pCmd[ ] | rxopt->destNode | rxopt->rxRSSIVal }
 *
 * The destNode parameter is only valid for singlecast frames.
 * @todo doxygen #if defined(ZW_CONTROLLER) && !defined(ZW_CONTROLLER_STATIC) &&
 * !defined(ZW_CONTROLLER_BRIDGE) around param destNode.
 *
 */
extern  void    /*RET Nothing  */
ApplicationCommandHandler(
  ZW_APPLICATION_TX_BUFFER *pCmd,  /* IN  Payload from the received frame, the union
                                          should be used to access the fields*/
  BYTE   cmdLength,                /* IN  Number of command bytes including the command */
  RECEIVE_OPTIONS_TYPE *rxopt);    /* IN  rxopt struct contains rxStatus, sourceNodeID, destNodeID and rssiVal */

#endif  /* ZW_CONTROLLER_BRIDGE */

/*===========================   ApplicationRfNotify   ===========================*/
/**
 * \ingroup COMMON
 * This function is used to inform the application about the current state of the radio
 * enabling control of an external power amplifier (PA). The Z Wave protocol will call
 * the \ref ApplicationRfNotify function when the radio changes state as follows:
 * - From Tx to Rx
 * - From Rx to Tx
 * - From powered down to Rx
 * - From powered down to Tx
 * - When PA is powered up
 * - When PA is powered down
 *
 * This enables the application to control an external PA using the appropriate number
 * of I/O pins. For details, refer to [35].
 *
 * A device incorporating an external PA, MUST set the parameter FLASH_APPL_PLL_STEPUP_OFFS
 * in App_RFSetup.a51 to 0 (zero) for adjustment of the signal quality.
 * This is necessary to be able to pass a FCC compliance test.
 *
 * The \ref ApplicationRfNotify function MUST be defined in the application regardless
 * not used for controlling an external PA.
 *
 * Declared in: ZW_basis_api.h
 *
 * \param[in] rfState   The current state of the radio.
 *                      Refer to ZW_transport_API.h header file
 * - \ref ZW_RF_TX_MODE The radio is in Tx state.
 *                      Previous state is either Rx or power down
 * - \ref ZW_RF_RX_MODE The radio in Rx or power down state.
 *                      Previous state is ether Tx or power down
 * - \ref ZW_RF_PA_ON   The radio in Tx moode and the PA is powered on
 * - \ref ZW_RF_PA_OFF  The radio in Tx mode and the PA is powered off
 *
 * \b Serial API:
 *
 * Not implemented.
 *
 */
extern  void          /*RET Nothing */
ApplicationRfNotify(
  BYTE rfState);


#if 0
/*=================   ApplicationNodeInformationEx   ===============
**
**
**    Side effects:
**
**--------------------------------------------------------------------------*/
BYTE                          /* RET TRUE if endpoint is valid, FALSE otherwise */
ApplicationNodeInformationEx(
    BYTE endpoint,                 /* IN endpoint to report on. Range: 1..N */
                                   /*    Endpoint 1 is the root nif.        */
    BYTE *deviceOptionsMask,       /*OUT Bitmask with application options   */
    APPL_NODE_TYPE *nodeType,      /* OUT Generic and Specific Device Type  */
    BYTE **pCmdClasses,            /* OUT Cmd classes supported by endpoint */
    BYTE *pLength);                /* OUT Length of pCmdClasses, 0 if endpoint does not exist */
#else
/*==========================   ApplicationNodeInformation   =================*/
/**
 * \ingroup COMMON

 * The Z-Wave Application Layer MUST use the \ref ApplicationNodeInformation
 * function to generate the Node Information frame and to save information about
 * node capabilities. All Z Wave application related fields of the Node Information
 * structure MUST be initialized by this function. For a description of the Generic
 * Device Classes, Specific Device Classes, and Command Classes refer to
 * [4], [5] and [9]. The deviceOptionsMask is a Bit mask where Listening and
 * Optional functionality flags MUST be set or cleared accordingly to the nodes
 * capabilities.
 *
 * The listening option in the deviceOptionsMask (APPLICATION_NODEINFO_LISTENING)
 * indicates a continuously powered node ready to receive frames.
 * A listening node assists as repeater in the network.
 *
 * The non-listening option in the deviceOptionsMask (APPLICATION_NODEINFO_NOT_LISTENING)
 * indicates a battery-operated node that power off RF reception when idle
 * (prolongs battery lifetime)..
 *
 * The optional functionality option in the deviceOptionsMask
 * (APPLICATION_NODEINFO_OPTIONAL_FUNCTIONALITY) indicates that this node supports
 * other command classes than the mandatory classes for the selected generic and
 * specific device class.
 *
 * To set a device as Listening with Optional Functionality:
 * \code
*deviceOptionsMask = APPLICATION_NODEINFO_LISTENING |
                     APPLICATION_NODEINFO_OPTIONAL_FUNCTIONALITY;
\endcode
 *
 * To set a device as not listening and with no Optional functionality support:
 * \code
*deviceOptionsMask =  APPLICATION_NODEINFO_NOT_LISTENING;
\endcode
 *
 * \note for Controllers:
 * Because controller libraries store some basic information about themselves
 * from ApplicationNodeInformation in nonvolatile memory.
 * ApplicationNodeInformation should be set to the correct values before Application
 * return from \ref ApplicationInitHW(), for applications where this cannot be done.
 * The Application must call \ref ZW_SET_DEFAULT() after updating
 * ApplicationNodeInformation in order to force the Z Wave library to store
 * the correct values.
 *
 * A way to verify if ApplicationNodeInformation is stored by the protocol
 * is to call \ref ZW_GetNodeProtocolInfo to verify that Generic and specific nodetype
 * are correct. If they differ from what is expected, the Application should Set the
 * ApplicationNodeInformation to the correct values and call \ref ZW_SET_DEFAULT()
 * to force the protocol to update its information.
 *
 * Declared in: ZW_basis_api.h
 *
 * \param[out] deviceOptionsMask Bitmask with options
 * - \ref APPLICATION_NODEINFO_LISTENING  In case this node is always listening
 *                                        (typically AC powered nodes) and stationary.
 * - \ref APPLICATION_NODEINFO_NOT_LISTENING  In case this node is non-listening
 *                                        (typically battery powered nodes).
 * - \ref APPLICATION_NODEINFO_OPTIONAL_FUNCTIONALITY  If the node supports other command
 *                                                     classes than the ones mandatory for
 *                                                     this nodes Generic and Specific
 *                                                     Device Class
 * - \ref APPLICATION_FREQ_LISTENING_MODE_250ms This option bit should be set if the node
 *                                              should act as a Frequently Listening
 *                                              Routing Slave with a wakeup interval of 250ms.
 *                                              This option is only avalaibe on Routing Slaves.
 *                                              This option is not available on 3-channel
 *                                              systems (the JP frequency).
 * - \ref APPLICATION_FREQ_LISTENING_MODE_1000ms This option bit should be set if the node
 *                                               should act as a Frequently Listening
 *                                               Routing Slave with a wakeup interval of 1000ms.
 *                                               This option is only avalaibe on
 *                                               Routing Slaves.
 * \param[out] nodeType Pointer to structure with the Device Class:
 * - (*nodeType).generic   The Generic Device Class [5]. Do not enter zero in this field.
 * - (*nodeType).specific  The Specific Device Class [5].
 * \param[out] nodeParm Command Class buffer pointer.
 *                      Command Classes [9] supported by the device itself and optional
 *                      Command Classes the device can control in other devices.
 * \param[out] parmLength Number of Command Class bytes.
 *
 * \serialapi{HOST->ZW: REQ | 0x03 | deviceOptionsMask | generic | specific | parmLength | nodeParm[ ]}
 *
 * The \ref ApplicationNodeInformation is replaced by \ref SerialAPI_ApplicationNodeInformation.
 * Used to set information that will be used in subsequent calls to \ref ZW_SendNodeInformation.
 * Replaces the functionality provided by the \ref ApplicationNodeInformation() callback function.
 * \code
void SerialAPI_ApplicationNodeInformation(BYTE  deviceOptionsMask,
  APPL_NODE_TYPE *nodeType,
  BYTE  *nodeParm,
  BYTE  parmLength)
\endcode
 *
 * Information is stored in NVM application area. The define APPL_NODEPARM_MAX in
 * serialappl.h must be modified accordingly to the number of command classes to be notified.
 *
 * The figure below lists the Node Information Frame structure on application level.
 * The Z Wave Protocol creates this frame via ApplicationNodeInformation.
 * The Node Information Frame structure when transmitted by RF does not include
 * the Basic byte descriptor field. The Basic byte descriptor field on application
 * level is deducted from the Capability and Security byte descriptor fields.
 *
 * | Byte descriptor \ bit number   | 7          | 6  | 5  | 4  | 3  | 2  | 1  | 0            |
 * |--------------------------------|------------|----|----|----|----|----|----|--------------|
 * | Capability                     | Liste-ning ||||||| Z Wave Protocol Specific Part        |
 * | Security                       | Opt. Func. ||||||| Z Wave Protocol Specific Part        |
 * | Reserved                       ||||||||          Z Wave Protocol Specific Part           |
 * | Basic                          ||||||||Basic Device Class (Z Wave Protocol Specific Part)|
 * | Generic                        ||||||||                 Generic Device Class             |
 * | Specific                       ||||||||                 Specific Device Class            |
 * | NodeInfo[0]                    ||||||||                  Command Class 1                 |
 * | NodeInfo[n-1]                  ||||||||                  Command Class n                 |
 *
 * Figure 8. Node Information frame structure on application level
 * @todo doxygen colspan in table rows below header.
 *
 * \warning Must use deviceOptionsMask parameter and associated defines to initialize
 * Node Information Frame with respect to listening, non-listening and optional
 * functionality options.
 */
extern  void                /*RET Nothing */
ApplicationNodeInformation(
  BYTE      *deviceOptionsMask,  /*OUT Bitmask with application options     */
  APPL_NODE_TYPE *nodeType, /*OUT Generic and Specific Device Type          */
  BYTE      **nodeParm,     /*OUT Device parameter buffer pointer           */
  BYTE      *parmLength );  /*OUT Number of Device parameter bytes          */
#endif


/****************************************************************************/
/*                           EXPORTED FUNCTIONS                             */
/*                 Implemented within the Z-Wave modules                    */
/****************************************************************************/


/*========================= ZW_NetworkLearnModeStart =========================
 *
 * \ingroup BASIS
 * \ref ZW_NetworkLearnModeStart is used to enable/disable the Z-Wave Network
 * Node inclusion/exclusion functionality.
 *
 * Declared in: ZW_basis_api.h
 *
 * \return TRUE  Requested Network Learn process initiated
 * \return FALSE
 * \param[in] bMode
      - \ref E_NETWORK_LEARN_MODE_DISABLE       Disable learn process
      - \ref E_NETWORK_LEARN_MODE_INCLUSION     Enable the learn process to do an inclusion
      - \ref E_NETWORK_LEARN_MODE_EXCLUSION     Enable the learn process to do an exclusion
      - \ref E_NETWORK_LEARN_MODE_EXCLUSION_NWE Enable the learn process to do an network wide exclusion
      - \ref E_NETWORK_LEARN_MODE_INCLUSION_SMARTSTART Enable the learn process to do an SMARTSTART inclusion based on local DSK
 *
 * \b Serial API:
 *
 * Uses ZW_SetLearnMode functionality.
 *
 */
BYTE
ZW_NetworkLearnModeStart(
  E_NETWORK_LEARN_MODE_ACTION bMode);


/**
 *
 * \ingroup BASIS
 * \ref ZW_NetworkManagementSetMaxInclusionRequestIntervals can be used to set the maximum interval inbetween SmartStart Inclusion requests
 *
 * Declared in: ZW_basis_api.h
 *
 * \return 0    Requested maximum intervals either 0(default) or not valid
 * \return 5-99 The requested number of intervals set
 * \param[in] bInclRequestIntervals The maximum number of 128sec ticks inbetween SmartStart inclusion requests.
              Valid range 5-99, which corresponds to 640-12672sec.
 *
  \serialapi{
  HOST->ZW: REQ | 0xD6 | bInclRequestIntervals
  ZW->HOST: RES | 0xD6 | retVal
  }
 *
 * FUNC_ID_ZW_NETWORK_MANAGEMENT_SET_MAX_INCLUSION_REQUEST_INTERVALS = 0xD6
 *
 */
BYTE
ZW_NetworkManagementSetMaxInclusionRequestIntervals(
  BYTE bInclRequestIntervals);


/*========================= ZW_Power_Management_Init =========================
 *
 * \ingroup BASIS
 * \ref ZW_Power_Management_Init is used to setup number of seconds a
 * non listening node sleeps inbetween wakeups (use WUTtimer)
 *
 * Declared in: ZW_basis_api.h
 *
 * \return Nothing
 *
 * \b Serial API:
 *
 * Not implemented.
 */
void
ZW_Power_Management_Init(
  DWORD sleep,        /* IN number of seconds to sleep until next wakeup */
  BYTE IntEnable);    /* IN interrupts Enable bitmask, If a bit is 1, */


/*============================== ZW_ClearTxTimers ===========================
**    Clear the Tx timers for the 3 channels
**
**--------------------------------------------------------------------------*/
void
ZW_ClearTxTimers();


/*============================== ZW_GetTxTimer =============================
**    Get the Tx timer in ms for 1 channel
**
**--------------------------------------------------------------------------*/
void
ZW_GetTxTimer(
  BYTE bChannel,
  DWORD *dwValue);


/*============================= ZW_ClearNetworkStats =========================
**    Clear the Network statistics
**
**--------------------------------------------------------------------------*/
void
ZW_ClearNetworkStats();


/*============================= ZW_GetNetworkStats ===========================
**    Get current Network statistics
**
**--------------------------------------------------------------------------*/
void
ZW_GetNetworkStats(
  S_NETWORK_STATISTICS *sNetworkStats);


/*===============================   ZW_SetRFReceiveMode   ===================
**    Initialize the Z-Wave RF chip.
**    Mode on:  Set the RF chip in receive mode and starts the data sampling.
**    Mode off: Set the RF chip in power down mode.
**
**--------------------------------------------------------------------------*/
extern BYTE         /*RET TRUE if operation was executed successfully, FALSE if not */
ZW_SetRFReceiveMode(
  BYTE mode);       /* IN TRUE: On; FALSE: Off mode */


/*===========================   ZW_SendNodeInformation   ====================*/
/**
 * \ingroup BASIS
 *
 * \macro{ ZW_SEND_NODE_INFO(node,option,func) }
 * Create and transmit a "Node Information" frame. The Z Wave transport layer builds a frame,
 * request application node information (see ApplicationNodeInformation) and queue the
 * "Node Information" frame for transmission. The completed call back function (completedFunc)
 * is called when the transmission is complete.
 *
 * The Node Information Frame is a protocol frame and will therefore not be directly
 * available to the application on the receiver. The API call ZW_SetLearnMode() can be used
 * to instruct the protocol to pass the Node Information Frame to the application.
 *
 * When ZW_SendNodeInformation() is used in learn mode for adding or removing the node
 * from the network the transmit option TRANSMIT_OPTION_LOW_POWER should NOT be used.
 * \note ZW_SendNodeInformation uses the transmit queue in the API, so using other transmit functions before the complete callback has been called by the API is not recommended.
 *
 * \return TRUE  If frame was put in the transmit queue
 * \return FALSE If it was not (callback will not be called)
 *
 * \param[in] destNode Destination Node ID (NODE_BROADCAST == all nodes)
 * \param[in] txOptions  Transmit option flags. (see ZW_SendData)
 * \param[in] completedFunc  Transmit completed call back function
 *
 * Callback function Parameters:
 * \param[in] txStatus (see \ref ZW_SendData)
 *
 * Timeout: 65s
 * Exception recovery: Resume normal operation, no recovery needed
 * \serialapi{
 * HOST->ZW: REQ | 0x12 | destNode | txOptions | funcID
 * ZW->HOST: RES | 0x12 | retVal
 * ZW->HOST: REQ | 0x12 | funcID | txStatus
 * }
 *
 */
extern BYTE                    /*RET  FALSE if transmitter queue overflow   */
ZW_SendNodeInformation(
  BYTE destNode,                 /*IN  Destination Node ID  */
  BYTE txOptions,                /*IN  Transmit option flags         */
  VOID_CALLBACKFUNC(completedFunc)(
      BYTE, TX_STATUS_TYPE *));  /*IN  Transmit completed call back function  */


/*===============================   ZW_Poll   ================================
**    Z-Wave low level poll function.
**    This function must be called while waiting on HW ready states and
**    when executing time consuming functions.
**
**    Not to lose RF receive data the time limit is 3/4 bit time, which is
**    around 70 usec at 9600 bps (500 clockcycles). Interrupt must not be
**    disabled more than 1/12 bit time which is around 8 usec (40 clock cycles).
**
**
**--------------------------------------------------------------------------*/
extern void  /*RET Nothing  */
ZW_Poll(
  void );    /* IN Nothing */


/*===============================   ZW_Random   =============================*/
/**
 * \ingroup BASIS
 * \macro{ZW_RANDOM()}
 *
 * A pseudo-random number generator that generates a sequence of numbers,
 * the elements of which are approximately independent of each other.
 * The same sequence of pseudo-random numbers will be repeated in
 * case the module is power cycled. The Z-Wave protocol uses also this
 * function in the random backoff algorithm etc.
 *
 * \return
 * Random number (0 – 0xFF)
 *
 *
 * \serialapi{
 * HOST->ZW: REQ | 0x1D
 * ZW->HOST: RES | 0x1D | rndNo
 * }
 */
extern BYTE /*RET Random number */
ZW_Random(
  void);    /*IN Nothing */


/*===============================   ZW_Version   ============================
**    Copy Z-Wave basis version from code memory (Flash) to data memory (SRAM)
**    destintaion should be in XDATA
**    Returns the
**--------------------------------------------------------------------------*/
extern BYTE      /*RET Library type ZW_LIB_xxx  */
ZW_Version(
  XBYTE *dst);   /* IN Destination pointer in RAM */


/**
 * Copies protocol version information to a variable given by a pointer.
 *
 * Destination should be in XDATA.
 * @param dst Given pointer.
 */
extern void
ZW_GetProtocolVersion(
  PROTOCOL_VERSION xdata *dst);


/*============================   ZW_Type_Library   ===========================
** Get Z-Wave library type
**
**    Side effects:
**
**--------------------------------------------------------------------------*/
extern BYTE      /*RET  Z-Wave library type (ZW_LIB_xxxx) */
ZW_Type_Library(void);


/*=========================  ZW_RFAbove3vSupplyGuaranteed  ======================
**    this function to disable\enable the OTP charge pump in RX mode.
**    Switching the charge pump off in RX lowers the sensitivity variation.
**     However the charge pump can only be switched off if the supply is guaranteed
**     to be above 3V
**
**    Side effects:
**-------------------------------------------------------------------------------------*/
void
ZW_RFAbove3vSupplyGuaranteed(
  BOOL above_3v_supply);


/*==========================   ZW_RFPowerLevelSet  ==========================*/
/*
**       normalPower : Max power possible
**       minus2dBm    - normalPower - 2dBm
**       minus4dBm    - normalPower - 4dBm
**       minus6dBm    - normalPower - 6dBm
**       minus8dBm    - normalPower - 8dBm
**       minus10dBm   - normalPower - 10dBm
**       minus12dBm   - normalPower - 12dBm
**       minus14dBm   - normalPower - 14dBm
**       minus16dBm   - normalPower - 16dBm
**       minus18dBm   - normalPower - 18dBm
*/
/**
 * \ingroup BASIS
 * Set the power level used in RF transmitting. The actual RF power is dependent
 * on the settings for transmit power level in App_RFSetup.a51. If this value is
 *  changed from using the default library value the resulting power levels might differ
 *  from the intended values. The returned value is however always the actual one used.
 *
 *  \note
 *  This function should only be used in an install/test link situation and the power level
 *  should always be set back to normalPower when the testing is done.
 *
 *  \param[in] powerLevel powerlevel to use in RF transmission, valid values:
  - \ref normalPower Max power possible
  - \ref minus1dBm  Normal power - 1dB (mapped to minus2dB )
  - \ref minus2dBm  Normal power - 2dB
  - \ref minus3dBm  Normal power - 3dB (mapped to minus4dB)
  - \ref minus4dBm  Normal power - 4dB
  - \ref minus5dBm  Normal power - 5dB (mapped to minus6dB)
  - \ref minus6dBm  Normal power - 6dB
  - \ref minus7dBm  Normal power - 7dB (mapped to minus8dB)
  - \ref minus8dBm  Normal power - 8dB
  - \ref minus9dBm  Normal power - 9dB (mapped to minus10dB)
  \return The powerlevel set.

  \macro{ZW_RF_POWERLEVEL_SET(POWERLEVEL)}

  \serialapi{
  HOST->ZW: REQ | 0x17 | powerLevel
  ZW->HOST: RES | 0x17 | retVal
  }
 *
 */
BYTE                /*RET The powerlevel set */
ZW_RFPowerLevelSet(
  BYTE powerLevel); /* IN Powerlevel to set */


/*==========================   ZW_RFPowerLevelGet  ==========================*/
/*
**       normalPower : Max power possible
**       minus2dBm    - normalPower - 2dBm
**       minus4dBm    - normalPower - 4dBm
**       minus6dBm    - normalPower - 6dBm
**       minus8dBm    - normalPower - 8dBm
**       minus10dBm   - normalPower - 10dBm
**       minus12dBm   - normalPower - 12dBm
**       minus14dBm   - normalPower - 14dBm
**       minus16dBm   - normalPower - 16dBm
**       minus18dBm   - normalPower - 18dBm
*/
/**
 * \ingroup BASIS
 * \macro{ZW_RF_POWERLEVEL_GET()}
 *
 * Get the current power level used in RF transmitting.
 *
 * \note This function should only be used in an install/test link situation.
 *
 * \return The power level currently in effect during RF transmissions.
 *
 * \serialapi{
 * HOST->ZW: REQ | 0xBA
 * ZW->HOST: RES | 0xBA | powerlevel
 * }
 */
BYTE                /*RET The current powerlevel */
ZW_RFPowerLevelGet(
  void);            /* IN Nothing */


/*===========================   ZW_SendTestFrame   ==========================*/
/*
**       normalPower : Max power possible
**       minus2dBm    - normalPower - 2dBm
**       minus4dBm    - normalPower - 4dBm
**       minus6dBm    - normalPower - 6dBm
**       minus8dBm    - normalPower - 8dBm
**       minus10dBm   - normalPower - 10dBm
**       minus12dBm   - normalPower - 12dBm
**       minus14dBm   - normalPower - 14dBm
**       minus16dBm   - normalPower - 16dBm
**       minus18dBm   - normalPower - 18dBm
*/
/**
 * \ingroup BASIS
 *
 * \macro {ZW_SEND_TEST_FRAME(nodeID, power, func)}
 *
 * Send a test frame directly to nodeID without any routing, RF transmission
 * power is previously set to powerlevel by calling ZW_RF_POWERLEVEL_SET. The
 * test frame is acknowledged at the RF transmission powerlevel indicated by the
 * parameter powerlevel by nodeID (if the test frame got through).  This test will
 * be done using 9600 kbit/s transmission rate.
 *
 * \note This function should only be used in an install/test link situation.
 *
 * \param[IN] nodeID Node ID on the node ID (1..232) the test frame should be transmitted to.
 * \param[IN] powerLevel Powerlevel to use in RF transmission, valid values:
 *  - normalPower Max power possible
 *  -  minus1dB  Normal power - 1dB (mapped to minus2dB )
 *  -  minus2dB  Normal power - 2dB
 *  -  minus3dB  Normal power - 3dB (mapped to minus4dB)
 *  -  minus4dB  Normal power - 4dB
 *  -  minus5dB  Normal power - 5dB (mapped to minus6dB)
 *  -  minus6dB  Normal power - 6dB
 *  -  minus7dB  Normal power - 7dB (mapped to minus8dB)
 *  -  minus8dB  Normal power - 8dB
 *  -  minus9dB  Normal power - 9dB (mapped to minus10dB)
 * \param[in] func Callback function called when done.
 * Callback function Parameters:
 * \param[in] txStatus (see \ref ZW_SendData)
 *
 * \return FALSE If transmit queue overflow.
 *
 * Timeout: 200ms
 * Exception recovery: Resume normal operation, no recovery needed
 *
 */
BYTE               /*RET FALSE if transmitter busy else TRUE */
ZW_SendTestFrame(
  BYTE nodeID,     /* IN nodeID to transmit to */
  BYTE powerLevel, /* IN powerlevel index */
  VOID_CALLBACKFUNC(func)(BYTE txStatus, TX_STATUS_TYPE *txStatusReport)); /* Call back function called when done */


/*===========================   ZW_GetProtocolStatus   ==========================*/
/**
 * \ingroup BASIS
 * \macro{ZW_GET_PROTOCOL_STATUS()}
 *
 * Report the status of the protocol.
 *
 * The function return a mask telling which protocol function is currently running
 *
 * \return Returns the protocol status as one of the following:
 * - Zero  Protocol is idle.
 * - \ref ZW_PROTOCOL_STATUS_ROUTING  Protocol is analyzing the routing table.
 * - \ref ZW_PROTOCOL_STATUS_SUC  SUC sends pending updates.
 *
 * \serialapi{
 * HOST->ZW: REQ | 0xBF
 * ZW->HOST: RES | 0xBF | retVal
 * }
 */
BYTE
ZW_GetProtocolStatus(void);


/*===============================   ZW_SetExtIntLevel   =========================================
**    Set the trigger level for external interrupt 0 or 1
**---------------------------------------------------------------------------------------------*/
void
ZW_SetExtIntLevel(
  BYTE intSrc,        /*IN: The interrupt src to set its level ZW_INT0 or ZW_INT1*/
  BYTE triggerLevel); /*IN: The trigger level of the interrupt source, TRUE active high/rising edge,*/
                      /*     FALSE active low faling edge*/


//#endif
/*============================= ZW_WatchDogEnable() =========================================
**  Enable the watch dog.
**  parameters:
**----------------------------------------------------------------------------*/
void
ZW_WatchDogEnable();


/*============================= ZW_WatchDogDisable() =========================================
**  Disable the watch dog.
**  parameters:
**----------------------------------------------------------------------------*/
void
ZW_WatchDogDisable();


/*============================= ZW_WatchDogKick() =========================================
**  Kick the watchdog to restarted.
**  parameters:
**----------------------------------------------------------------------------*/
void
ZW_WatchDogKick();


#ifdef ZW_PROMISCUOUS_MODE
/*============================   ZW_SetPromiscuousMode   ======================
**
**  Function description.
**   Enable / disable the installer library promiscuous mode.
**   When promiscuous mode is enabled, all application layer frames will be passed
**   to the application layer regardless if the frames are addressed to another node.
**   When promiscuous mode is disabled, only application frames addressed to the node will be passed
**   to the application layer.
**
**  Side effects:
**
**--------------------------------------------------------------------------*/
void                /*Nothing */
ZW_SetPromiscuousMode(
  BOOL state);     /* IN TRUE to enable the promiscuous mode, FALSE to disable it.*/
#endif /* ZW_PROMISCUOUS_MODE */


/*============================== ZW_GetRandomWord ===========================*/
/**
 *
 * \ingroup BASIS
 *
 * The API call generates a random word using the ZW0201/ZW0301 builtin random number
 * generator (RNG). If RF needs to be in Receive then ZW_SetRFReceiveMode should be called afterwards.
 * \return
 * TRUE If possible to generate random number.
 * \return
 * FALSE  If not possible e.g. RF not powered down.
 * \param[in,out] randomWord Pointer to word variable, which should receive the random word.
 * \param[in] bResetRadio  If TRUE the RF radio is reinitialized after generating the random word.
 *
 * \note
 * The ZW0201/ZW0301 RNG is based on the RF transceiver, which must be in powerdown
 * state (see ZW_SetRFReceiveMode) to assure proper operation of the RNG. Remember
 * to call ZW_GetRandomWord with bResetRadio = TRUE when the last random word is to
 * be generated. This is needed for the RF to be reinitialized, so that it can be
 * used to transmit and receive again.
 * *
 * \macro{ZW_GET_RANDOM_WORD(randomWord\,bResetRadio)}
 * \serialapi{
 * HOST -> ZW: REQ | 0x1C | noRandomBytes
 * ZW -> HOST: RES | 0x1C | randomGenerationSuccess | noRandomBytesGenerated | randombytes[]
 * }
 * \note
 * The Serial API function 0x1C makes use of the ZW_GetRandomWord to generate a specified number of random bytes and takes care of the handling of the RF:
 * - Set the RF in powerdown prior to calling the ZW_GetRandomWord the first time, if not possible then return result to HOST.
 * - Call ZW_GetRandomWord until enough random bytes generated or ZW_GetRandomWord returns FALSE.
 * - Call ZW_GetRandomWord with bResetRadio = TRUE to reinitialize the radio.
 * - Call ZW_SetRFReceiveMode with TRUE if the serialAPI hardware is a listening device or with FALSE if it is a non-listening device.
 * - Return result to HOST.
 *
 * @param[in]  noRandomBytes to generate
 * @param[out] randomGenerationSuccess  TRUE if random bytes could be generated
 * @param[out] noRandomBytesGenerated   Number of random numbers generated
 * @param[out] randombytes[] Array of generated random bytes
 *
 */
BOOL
ZW_GetRandomWord(
  BYTE *randomWord);


/*============================== ZW_GetRandomArray ===========================
**    Fill Array with random bytes in a multiple number of 2
**
**    returns:   Number of random bytes generated and filled into Array
**
**  Side effects:
**
**--------------------------------------------------------------------------*/
BYTE
ZW_GetRandomArray(
  BYTE *pRandomArray,
  BYTE bArrayByteCount);


/*===========================   ZW_ExploreRequestInclusion   =================*/
/**
 * \ingroup BASIS
 *
 * This function sends out an explorer frame requesting inclusion into a network.
 * If the inclusion request is accepted by a controller in network wide inclusion
 * mode then the application on this node will get notified through the callback
 * from the ZW_SetLearnMode() function. Once a callback is received from ZW_SetLearnMode()
 * saying that the inclusion process has started the application should not make further
 * calls to this function.
 *
 * \note Recommend not to call this function more than once every 4 seconds.
 *
 * \return TRUE  Inclusion request queued for transmission
 * \return FALSE Node is not in learn mode
 * \serialapi{
 * HOST->ZW: REQ | 0x5E
 * ZW->HOST: RES | 0x5E | retVal
 * }
 *
 */
BYTE
ZW_ExploreRequestInclusion();


/*===========================   ZW_ExploreRequestExclusion   =================*/
/**
 * \ingroup BASIS
 *
 * This function sends out an explorer frame requesting exclusion from the network.
 * If the exclusion request is accepted by a controller in network wide exclusion
 * mode then the application on this node will get notified through the callback
 * from the ZW_SetLearnMode() function. Once a callback is received from ZW_SetLearnMode()
 * saying that the exclusion process has started the application should not make further
 * calls to this function.
 *
 * \note Recommend not to call this function more than once every 4 seconds.
 *
 * \return TRUE  Exclusion request queued for transmission
 * \return FALSE Node is not in learn mode
 * \serialapi{
 * HOST->ZW: REQ | 0x5F
 * ZW->HOST: RES | 0x5F | retVal
 * }
 *
 */
BYTE
ZW_ExploreRequestExclusion();


/*============================== ZW_IOS_enable ===========================
**  Enables/disables IO ports.
**
**  Side effects:
**
**--------------------------------------------------------------------------*/
void
ZW_IOS_enable(
  BYTE bState);  /* IN  byte containing IO state. TRUE: IO port states are controllable
                 *                               FALSE: IO port states are frozen */

/*============================== ZW_IOS_set ===========================
**  Setup IO ports.
**
**  Side effects:
**
**--------------------------------------------------------------------------*/
void  /* RET Nothing */
ZW_IOS_set(BYTE bPort,         /* IN  port#,  0 => P0, 1 => P1, 2 => P2, 3 => P3 */
           BYTE bDirection,    /* IN  Direction bit pattern. 0b=output, 1b=input.
                                * E.g. 0xF0=> upper 4 IO's are inputs and the
                                * lower 4 IO's are outputs                       */
           BYTE bValue);       /* IN  Output setting / Pull-up state
                                *
                                * When an IO is set as output the corresponding
                                * bit in bValue will determine the output setting
                                * 1b=high
                                * 0b=low
                                *
                                * When an IO is set as input the
                                * corresponding bit in bValue will determine the
                                * state of the pull-up resistor in the IO cell.
                                * 1b=pull-up disabled
                                * 0b=pull-up enabled                             */


/*============================== ZW_IOS_get ===========================
**  Returns the IO port state.
**
**  Side effects:
**
**--------------------------------------------------------------------------*/
void  /* RET Nothing */
ZW_IOS_get(BYTE bPort,         /* IN  port#,  0 => P0, 1 => P1, 2 => P2, 3 => P3 */
           BYTE *bDirection,   /* OUT Direction bit pattern. 0b=output, 1b=input.
                                * E.g. 0xF0=> upper 4 IO's are inputs and the
                                * lower 4 IO's are outputs.                      */
           BYTE *bValue);      /* OUT State of the IO pad                        */


/*============================== ZW_CHIP_type_get ===========================
**  Returns the Z-Wave Single Chip type number
**
**  Side effects:
**
**--------------------------------------------------------------------------*/
BYTE  /* RET type number */
ZW_CHIP_type_get(void);


/*============================== ZW_CHIP_revision_get ===========================
**  Returns the Z-Wave Single Chip revision number
**
**  Side effects:
**
**--------------------------------------------------------------------------*/
BYTE  /* RET revision number */
ZW_CHIP_revision_get(void);


/*============================ ZW_AddPollTask ===============================
** Function description
** Add a PollTask to main poll queue.
**
** Side effects: queue has size 1.
**
**-------------------------------------------------------------------------*/
BOOL ZW_AddPollTask( VOID_CALLBACKFUNC (CBPolltask)(void));


/*===================   ZW_GetBackgroundRSSI   ===========================
**
**  Returns an estimate of the current background RSSI level.
**
**  A separate measurement is returned for each channel.
**
**-------------------------------------------------------------------------*/
void
ZW_GetBackgroundRSSI(
    RSSI_LEVELS *noise_levels);    /*OUT Structure to be filled with noise levels */


/*==================   ZW_RegisterBackgroundRSSICallback   =====================
**
**  Register a callback function to be called whenever new background
**  RSSI samples are available.
**
**  Side effects: None
**
**-------------------------------------------------------------------------*/
void ZW_RegisterBackgroundRSSICallback(
    VOID_CALLBACKFUNC(cbFun)(RSSI_LEVELS *)); /* IN Callback function to register*/


/*===========================   ZW_SetDefaultPowerLevel   ==================*/
/**
 * \ingroup BASIS
 *
 * Set the default power levels used for transmitting Z-Wave frames
 *
 * This function should only be called in ApplicationInitSW() and it should
 * only be used when it isn't possible to modify the Tx power througt
 * the App_RFSetup.c file
 *
 * \return TRUE  Power level is set
 * \return FALSE Power level is not set, function called outside scope
 * \serialapi{
 *    Not supported (See serialAPI documentation of FUNC_ID_SERIAL_API_SETUP)
 * }
 *
**/
BOOL ZW_SetDefaultPowerLevels(BYTE bNormalPower0, BYTE bNormalPower1, BYTE bNormalPower2,
                             BYTE bLowPower0, BYTE bLowPower1, BYTE bLowPower2);


/*===========================   ZW_GetDefaultPowerLevel   ==================*/
/**
 * \ingroup BASIS
 *
 * Get the default power levels used for transmitting Z-Wave frames
 *
 * \serialapi{
 *    Not supported (See serialAPI documentation of FUNC_ID_SERIAL_API_SETUP)
 * }
 *
**/
void ZW_GetDefaultPowerLevels(BYTE *pPowerlevels);


/*========================   ZW_GetMaxPayloadSize   =========================*/
/**
 * \ingroup BASIS
 *
 *  Get the max payload size the protocol can handle
 *
 * \return Maximum payload size supported by protocol.
 * \serialapi{
 *    Supported through the FUNC_ID_SERIAL_API_SETUP functionality
 * HOST->ZW: REQ | 0x0B | 0x10
 * ZW->HOST: RES | 0x0B | 0x10 | maxPayloadSize
 * }
**/
BYTE
ZW_GetMaxPayloadSize();


#endif /* _ZW_BASIS_API_H_ */

