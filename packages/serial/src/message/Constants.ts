import { ZnifferMessageHeaders } from "../MessageHeaders";

/** Indicates the type of a data message */
export enum MessageType {
	Request = 0x0,
	Response = 0x1,
}

/**
 * Complete list of function IDs for data messages.
 * IDs starting with FUNC_ID are straight from OZW and not implemented here yet.
 * IDs starting with UNKNOWN_FUNC are taken from openhab-zwave and not implemented here yet.
 * IDs starting with UNKNOWN_FUNC are also taken from https://github.com/yepher/RaZBerry/blob/master/README.md and not implemented yet
 * IDs ending with UNKNOWN_<hex-code> are reported by the stick but we don't know what they mean.
 */
export enum FunctionType {
	GetSerialApiInitData = 0x02,
	SetApplicationNodeInformation = 0x03, // Set up the controller NIF prior to starting or joining a Z-Wave network

	ApplicationCommand = 0x04, // A message from another node

	GetControllerCapabilities = 0x05,
	SetSerialApiTimeouts = 0x06,
	GetSerialApiCapabilities = 0x07,

	SoftReset = 0x08,

	GetProtocolVersion = 0x09, // Used to request the Z-Wave Protocol version data (700 series)
	SerialAPIStarted = 0x0a, // Sent by the controller after the serial API has been started (again)

	SerialAPISetup = 0x0b, // Configure the Serial API

	SetRFReceiveMode = 0x10, // Power the RF section of the stick down/up
	UNKNOWN_FUNC_SET_SLEEP_MODE = 0x11, // Set the CPU into sleep mode

	SendNodeInformation = 0x12, // Send Node Information Frame of the stick to a node

	SendData = 0x13, // Send data
	SendDataMulticast = 0x14, // Send data using multicast

	GetControllerVersion = 0x15,

	SendDataAbort = 0x16, // Abort sending data

	FUNC_ID_ZW_R_F_POWER_LEVEL_SET = 0x17, // Set RF Power level
	UNKNOWN_FUNC_SEND_DATA_META = 0x18, // ??
	FUNC_ID_ZW_GET_RANDOM = 0x1c, // Returns random data of variable length

	GetControllerId = 0x20, // Get Home ID and Controller Node ID

	UNKNOWN_FUNC_MEMORY_GET_BYTE = 0x21, // get a byte of memory
	UNKNOWN_FUNC_MEMORY_PUT_BYTE = 0x22, // write a byte of memory
	UNKNOWN_FUNC_MEMORY_GET_BUFFER = 0x23,
	UNKNOWN_FUNC_MEMORY_PUT_BUFFER = 0x24,

	EnterBootloader = 0x27, // Leave Serial API and enter bootloader (700+ series only). Enter Auto-Programming mode (500 series only).
	UNKNOWN_FUNC_UNKNOWN_0x28 = 0x28, // ZW_NVRGetValue(offset, length) => NVRdata[], see INS13954-13

	GetNVMId = 0x29, // Returns information about the external NVM
	ExtNVMReadLongBuffer = 0x2a, // Reads a buffer from the external NVM
	ExtNVMWriteLongBuffer = 0x2b, // Writes a buffer to the external NVM
	ExtNVMReadLongByte = 0x2c, // Reads a byte from the external NVM
	ExtExtWriteLongByte = 0x2d, // Writes a byte to the external NVM

	NVMOperations = 0x2e, // Read and write from/to the external NVM (700+ series)

	UNKNOWN_FUNC_CLOCK_SET = 0x30, // ??
	UNKNOWN_FUNC_CLOCK_GET = 0x31, // ??
	UNKNOWN_FUNC_CLOCK_COMPARE = 0x32, // ??
	UNKNOWN_FUNC_RTC_TIMER_CREATE = 0x33, // ??
	UNKNOWN_FUNC_RTC_TIMER_READ = 0x34, // ??
	UNKNOWN_FUNC_RTC_TIMER_DELETE = 0x35, // ??
	UNKNOWN_FUNC_RTC_TIMER_CALL = 0x36, // ??

	ClearTxTimers = 0x37, // Reset the Z-Wave module's internal TX timers
	GetTxTimers = 0x38, // Request the Z-Wave module's internal TX timers

	ClearNetworkStats = 0x39, // Clear the current Network Statistics collected by the Z-Wave API Module
	GetNetworkStats = 0x3a, // Request the current Network Statistics from the Z-Wave API Module

	GetBackgroundRSSI = 0x3b, // request the most recent background RSSI levels detected
	SetListenBeforeTalkThreshold = 0x3c, // Set the RSSI threshold above which the stick will not transmit

	ExtendedNVMOperations = 0x3d, // Read and write from/to the external NVM with 32-bit addresses (700+ series)

	RemoveSpecificNodeIdFromNetwork = 0x3f, // Trigger removal of a specific node that desires exclusion from the network

	FUNC_ID_ZW_SET_LEARN_NODE_STATE = 0x40, // Not implemented

	GetNodeProtocolInfo = 0x41, // Get protocol info (baud rate, listening, etc.) for a given node
	HardReset = 0x42, // Reset controller and node info to default (original) values

	FUNC_ID_ZW_NEW_CONTROLLER = 0x43, // Not implemented
	FUNC_ID_ZW_REPLICATION_COMMAND_COMPLETE = 0x44, // Replication send data complete
	FUNC_ID_ZW_REPLICATION_SEND_DATA = 0x45, // Replication send data
	AssignReturnRoute = 0x46, // Assign a return route from the source node to the destination node
	DeleteReturnRoute = 0x47, // Delete all return routes from the specified node
	RequestNodeNeighborUpdate = 0x48, // Ask the specified node to update its neighbors (then read them from the controller)
	ApplicationUpdateRequest = 0x49, // Get a list of supported (and controller) command classes

	AddNodeToNetwork = 0x4a, // Control the addnode (or addcontroller) process...start, stop, etc.
	RemoveNodeFromNetwork = 0x4b, // Control the removenode (or removecontroller) process...start, stop, etc.

	AddControllerAndAssignPrimary = 0x4c, // Include a controller node and assign it the primary controller role. ONLY use from a secondary controller that is SUC.
	AddPrimaryController = 0x4d, // Include a controller node and assign it the primary controller role.

	AssignPriorityReturnRoute = 0x4f, // Assign a priority route between two nodes

	SetLearnMode = 0x50, // Put a controller into learn mode for replication/ receipt of configuration info
	AssignSUCReturnRoute = 0x51, // Assign a return route to the SUC
	FUNC_ID_ZW_ENABLE_SUC = 0x52, // Make a controller a Static Update Controller
	RequestNetworkUpdate = 0x53, // Request an Automatic Controller Update from the SUC
	SetSUCNodeId = 0x54, // Configure a static/bridge controller to be a SUC/SIS node (or not)
	DeleteSUCReturnRoute = 0x55, // Remove return routes to the SUC
	GetSUCNodeId = 0x56, // Try to retrieve a Static Update Controller node id (zero if no SUC present)

	SendSUCNodeId = 0x57, // Send the SUC/SIS Node ID from the primary controller to another controller
	AssignPrioritySUCReturnRoute = 0x58, // Assign a priority route from a node to the SUC
	UNKNOWN_FUNC_REDISCOVERY_NEEDED = 0x59,

	FUNC_ID_ZW_REQUEST_NODE_NEIGHBOR_UPDATE_OPTIONS = 0x5a, // Allow options for request node neighbor update
	ExploreRequestInclusion = 0x5e, // Initiate network wide inclusion while in learn mode
	ExploreRequestExclusion = 0x5f, // Initiate network wide exclusion while in learn mode

	RequestNodeInfo = 0x60, // Get info (supported command classes) for the specified node

	RemoveFailedNode = 0x61, // Mark a specified node id as failed
	IsFailedNode = 0x62, // Check to see if a specified node has failed
	ReplaceFailedNode = 0x63, // Replace a failed node with a new one that takes the same node ID

	UNKNOWN_FUNC_UNKNOWN_0x66 = 0x66, // ??
	UNKNOWN_FUNC_UNKNOWN_0x67 = 0x67, // ??

	RequestProtocolCCEncryption = 0x68, // Used by the Z-Wave API module to request encryption of a Z-Wave protocol frame

	UNKNOWN_FUNC_TIMER_START = 0x70, // ??
	UNKNOWN_FUNC_TIMER_RESTART = 0x71, // ??
	UNKNOWN_FUNC_TIMER_CANCEL = 0x72, // ??
	UNKNOWN_FUNC_TIMER_CALL = 0x73, // ??

	FirmwareUpdateNVM = 0x78, // Access the NVM section for 500 series OTW firmware updates

	GetRoutingInfo = 0x80, // Get a specified node's neighbor information from the controller

	UNKNOWN_FUNC_GetTXCounter = 0x81, // ??
	UNKNOWN_FUNC_ResetTXCounter = 0x82, // ??
	UNKNOWN_FUNC_StoreNodeInfo = 0x83, // ??
	UNKNOWN_FUNC_StoreHomeId = 0x84, // ??

	LockUnlockLastRoute = 0x90, // Lock or unlock all last working routes
	UNKNOWN_FUNC_SEND_DATA_ROUTE_DEMO = 0x91, // ??
	GetPriorityRoute = 0x92, // Get the route that is used as the first routing attempty when transmitting to a node
	SetPriorityRoute = 0x93, // Set the route that shall be used as the first routing attempty when transmitting to a node
	UNKNOWN_FUNC_SERIAL_API_TEST = 0x95, // ??
	UNKNOWN_FUNC_UNKNOWN_0x98 = 0x98, // ??

	VirtualNodeSetNodeInfo = 0xa0, // Set node info of virtual nodes owned by the Z-Wave API module
	FUNC_ID_APPLICATION_SLAVE_COMMAND_HANDLER = 0xa1, // Slave command handler
	VirtualNodeSendNodeInfo = 0xa2, // Send the NIF of a virtual node owned by the Z-Wave API module
	FUNC_ID_ZW_SEND_SLAVE_DATA = 0xa3, // Send data from slave
	VirtualNodeSetLearnMode = 0xa4, // Put a virtual node into learn mode
	GetVirtualNodes = 0xa5, // Return all virtual nodes
	IsVirtualNode = 0xa6, // Test if a given node ID is a virtual node

	BridgeApplicationCommand = 0xa8, // A message from another node using the Bridge API
	SendDataBridge = 0xa9, // Send data (Bridge API)
	SendDataMulticastBridge = 0xab, // Send data using multicast (Bridge API)

	EnableWatchdog500 = 0xb6, // Enable Watchdog (500 series and older)
	DisableWatchdog500 = 0xb7, // Disable Watchdog (500 series and older)
	KickWatchdog500 = 0xb8, // Kick Watchdog (500 series and older)
	UNKNOWN_FUNC_UNKNOWN_0xB9 = 0xb9, // ??
	UNKNOWN_FUNC_RF_POWERLEVEL_GET = 0xba, // Get RF Power level

	GetLibrary = 0xbd, // Request the Z-Wave library type running on the Z-Wave module
	SendTestFrame = 0xbe, // Sends a NOP Power frame to the given node
	GetProtocolStatus = 0xbf, // Request the current status of the protocol running on the Z-Wave module

	FUNC_ID_ZW_SET_PROMISCUOUS_MODE = 0xd0, // Set controller into promiscuous mode to listen to all messages
	FUNC_ID_PROMISCUOUS_APPLICATION_COMMAND_HANDLER = 0xd1, // deprecated, replaced with a flag for the ApplicationCommandHandler

	StartWatchdog = 0xd2, // Start Hardware Watchdog (700 series and newer)
	StopWatchdog = 0xd3, // Stop Hardware Watchdog (700 series and newer)

	SetMaximumRoutingAttempts = 0xd4, // Set the maximum number of source routing attempts
	SetMaxSmartStartInclusionRequestInterval = 0xd6, // Set the maximum interval between SmartStart inclusion requests

	Shutdown = 0xd9, // Instruct the Z-Wave API to shut down in order to safely remove the power

	// Long range controller support
	GetLongRangeNodes = 0xda, // Used after GetSerialApiInitData to get the nodes with IDs > 0xFF
	GetLongRangeChannel = 0xdb,
	SetLongRangeChannel = 0xdc,
	SetLongRangeShadowNodeIDs = 0xdd,

	// Proprietary commands:
	Proprietary_DE = 0xDE,
	Proprietary_DF = 0xDF,
	Proprietary_E7 = 0xE7,
	Proprietary_E8 = 0xE8,
	Proprietary_F0 = 0xF0,
	Proprietary_F1 = 0xF1,
	Proprietary_F2 = 0xF2,
	Proprietary_F3 = 0xF3,
	Proprietary_F4 = 0xF4,
	Proprietary_F5 = 0xF5,
	Proprietary_F6 = 0xF6,
	Proprietary_F7 = 0xF7,
	Proprietary_F8 = 0xF8,
	Proprietary_F9 = 0xF9,
	Proprietary_FA = 0xFA,
	Proprietary_FB = 0xFB,
	Proprietary_FC = 0xFC,
	Proprietary_FD = 0xFD,
	Proprietary_FE = 0xFE,
}

export enum ZnifferFunctionType {
	GetVersion = 0x01,
	SetFrequency = 0x02,
	GetFrequencies = 0x03,
	Start = 0x04,
	Stop = 0x05,
	SetBaudRate = 0x0e,
	GetFrequencyInfo = 0x13,
}

export enum ZnifferMessageType {
	Command = ZnifferMessageHeaders.SOCF,
	Data = ZnifferMessageHeaders.SODF,
}

export enum ZnifferFrameType {
	Command = 0x00,
	Data = 0x01,
	BeamFrame = 0x02,
	BeamStart = 0x04,
	BeamStop = 0x05,
}
