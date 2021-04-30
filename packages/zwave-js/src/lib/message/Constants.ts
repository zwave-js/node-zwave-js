/** The priority of messages, sorted from high (0) to low (>0) */
export enum MessagePriority {
	// Handshake messages have the highest priority because they are part of other transactions
	// which have already started when the handshakes are needed (e.g. Security Nonce exchange)
	//
	// We distinguish between responses to handshake requests from nodes that must be handled first.
	// Some nodes don't respond to our requests if they are waiting for a nonce.
	Handshake = 0,
	// Our handshake requests must be prioritized over all other messages
	PreTransmitHandshake = 1,
	// Controller commands usually finish quickly and should be preferred over node queries
	Controller,
	// Pings (NoOP) are used for device probing at startup and for network diagnostics
	Ping,
	// Multistep controller commands typically require user interaction but still
	// should happen at a higher priority than any node data exchange
	MultistepController,
	// Whenever sleeping devices wake up, their queued messages must be handled quickly
	// because they want to go to sleep soon. So prioritize them over non-sleeping devices
	WakeUp,
	// Normal operation and node data exchange
	Normal,
	// Node querying is expensive and happens whenever a new node is discovered.
	// In order to keep the system responsive, give them a lower priority
	NodeQuery,
	// Some devices need their state to be polled at regular intervals. Only do that when
	// nothing else needs to be done
	Poll,
}
export function isMessagePriority(val: unknown): val is MessagePriority {
	return typeof val === "number" && val in MessagePriority;
}

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

	FUNC_ID_SERIAL_API_APPL_NODE_INFORMATION = 0x03,

	ApplicationCommand = 0x04, // A message from another node

	GetControllerCapabilities = 0x05,
	SetSerialApiTimeouts = 0x06,
	GetSerialApiCapabilities = 0x07,

	FUNC_ID_SERIAL_API_SOFT_RESET = 0x08,

	UNKNOWN_FUNC_UNKNOWN_0x09 = 0x09, // ??
	UNKNOWN_FUNC_UNKNOWN_0x0a = 0x0a, // ??

	SerialAPISetup = 0x0b, // Configure the Serial API

	UNKNOWN_FUNC_RF_RECEIVE_MODE = 0x10, // Power down the RF section of the stick
	UNKNOWN_FUNC_SET_SLEEP_MODE = 0x11, // Set the CPU into sleep mode

	FUNC_ID_ZW_SEND_NODE_INFORMATION = 0x12, // Send Node Information Frame of the stick

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

	UNKNOWN_FUNC_FlashAutoProgSet = 0x27, // ??
	UNKNOWN_FUNC_UNKNOWN_0x28 = 0x28, // ??

	UNKNOWN_FUNC_NVMGetId = 0x29,
	UNKNOWN_FUNC_NVMExtReadLongBuffer = 0x2a,
	UNKNOWN_FUNC_NVMExtWriteLongBuffer = 0x2b,
	UNKNOWN_FUNC_NVMExtReadLongByte = 0x2c,
	UNKNOWN_FUNC_NVMExtWriteLongByte = 0x2d,

	UNKNOWN_FUNC_CLOCK_SET = 0x30, // ??
	UNKNOWN_FUNC_CLOCK_GET = 0x31, // ??
	UNKNOWN_FUNC_CLOCK_COMPARE = 0x32, // ??
	UNKNOWN_FUNC_RTC_TIMER_CREATE = 0x33, // ??
	UNKNOWN_FUNC_RTC_TIMER_READ = 0x34, // ??
	UNKNOWN_FUNC_RTC_TIMER_DELETE = 0x35, // ??
	UNKNOWN_FUNC_RTC_TIMER_CALL = 0x36, // ??

	UNKNOWN_FUNC_ClearNetworkStats = 0x39,
	UNKNOWN_FUNC_GetNetworkStats = 0x3a,
	UNKNOWN_FUNC_GetBackgroundRSSI = 0x3b,
	UNKNOWN_FUNC_RemoveNodeIdFromNetwork = 0x3f,

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

	FUNC_ID_ZW_CREATE_NEW_PRIMARY = 0x4c, // Control the createnewprimary process...start, stop, etc.
	FUNC_ID_ZW_CONTROLLER_CHANGE = 0x4d, // Control the transferprimary process...start, stop, etc.
	FUNC_ID_ZW_SET_LEARN_MODE = 0x50, // Put a controller into learn mode for replication/ receipt of configuration info
	AssignSUCReturnRoute = 0x51, // Assign a return route to the SUC
	FUNC_ID_ZW_ENABLE_SUC = 0x52, // Make a controller a Static Update Controller
	FUNC_ID_ZW_REQUEST_NETWORK_UPDATE = 0x53, // Network update for a SUC(?)
	SetSUCNodeId = 0x54, // Configure a static/bridge controller to be a SUC/SIS node (or not)
	DeleteSUCReturnRoute = 0x55, // Remove return routes to the SUC
	GetSUCNodeId = 0x56, // Try to retrieve a Static Update Controller node id (zero if no SUC present)

	UNKNOWN_FUNC_SEND_SUC_ID = 0x57,
	UNKNOWN_FUNC_AssignPrioritySUCReturnRoute = 0x58,
	UNKNOWN_FUNC_REDISCOVERY_NEEDED = 0x59,

	FUNC_ID_ZW_REQUEST_NODE_NEIGHBOR_UPDATE_OPTIONS = 0x5a, // Allow options for request node neighbor update
	FUNC_ID_ZW_EXPLORE_REQUEST_INCLUSION = 0x5e, // supports NWI

	RequestNodeInfo = 0x60, // Get info (supported command classes) for the specified node

	RemoveFailedNode = 0x61, // Mark a specified node id as failed
	IsFailedNode = 0x62, // Check to see if a specified node has failed
	ReplaceFailedNode = 0x63, // Replace a failed node with a new one that takes the same node ID

	UNKNOWN_FUNC_UNKNOWN_0x66 = 0x66, // ??
	UNKNOWN_FUNC_UNKNOWN_0x67 = 0x67, // ??

	UNKNOWN_FUNC_TIMER_START = 0x70, // ??
	UNKNOWN_FUNC_TIMER_RESTART = 0x71, // ??
	UNKNOWN_FUNC_TIMER_CANCEL = 0x72, // ??
	UNKNOWN_FUNC_TIMER_CALL = 0x73, // ??

	UNKNOWN_FUNC_UNKNOWN_0x78 = 0x78, // ??

	GetRoutingInfo = 0x80, // Get a specified node's neighbor information from the controller

	UNKNOWN_FUNC_GetTXCounter = 0x81, // ??
	UNKNOWN_FUNC_ResetTXCounter = 0x82, // ??
	UNKNOWN_FUNC_StoreNodeInfo = 0x83, // ??
	UNKNOWN_FUNC_StoreHomeId = 0x84, // ??

	UNKNOWN_FUNC_LOCK_ROUTE_RESPONSE = 0x90, // ??
	UNKNOWN_FUNC_SEND_DATA_ROUTE_DEMO = 0x91, // ??
	UNKNOWN_FUNC_GET_PRIORITY_ROUTE = 0x92, // ??
	UNKNOWN_FUNC_SET_PRIORITY_ROUTE = 0x93, // ??
	UNKNOWN_FUNC_SERIAL_API_TEST = 0x95, // ??
	UNKNOWN_FUNC_UNKNOWN_0x98 = 0x98, // ??

	FUNC_ID_SERIAL_API_SLAVE_NODE_INFO = 0xa0, // Set application virtual slave node information
	FUNC_ID_APPLICATION_SLAVE_COMMAND_HANDLER = 0xa1, // Slave command handler
	FUNC_ID_ZW_SEND_SLAVE_NODE_INFO = 0xa2, // Send a slave node information message
	FUNC_ID_ZW_SEND_SLAVE_DATA = 0xa3, // Send data from slave
	FUNC_ID_ZW_SET_SLAVE_LEARN_MODE = 0xa4, // Enter slave learn mode
	FUNC_ID_ZW_GET_VIRTUAL_NODES = 0xa5, // Return all virtual nodes
	FUNC_ID_ZW_IS_VIRTUAL_NODE = 0xa6, // Virtual node test

	BridgeApplicationCommand = 0xa8, // A message from another node using the Bridge API
	SendDataBridge = 0xa9, // Send data (Bridge API)
	SendDataMulticastBridge = 0xab, // Send data using multicast (Bridge API)

	UNKNOWN_FUNC_UNKNOWN_0xB4 = 0xb4, // ??

	UNKNOWN_FUNC_WATCH_DOG_ENABLE = 0xb6,
	UNKNOWN_FUNC_WATCH_DOG_DISABLE = 0xb7,
	UNKNOWN_FUNC_WATCH_DOG_KICK = 0xb8,
	UNKNOWN_FUNC_UNKNOWN_0xB9 = 0xb9, // ??
	UNKNOWN_FUNC_RF_POWERLEVEL_GET = 0xba, // Get RF Power level

	UNKNOWN_FUNC_GET_LIBRARY_TYPE = 0xbd,
	UNKNOWN_FUNC_SEND_TEST_FRAME = 0xbe,
	UNKNOWN_FUNC_GET_PROTOCOL_STATUS = 0xbf,

	FUNC_ID_ZW_SET_PROMISCUOUS_MODE = 0xd0, // Set controller into promiscuous mode to listen to all messages
	FUNC_ID_PROMISCUOUS_APPLICATION_COMMAND_HANDLER = 0xd1,

	UNKNOWN_FUNC_UNKNOWN_0xD2 = 0xd2, // ??
	UNKNOWN_FUNC_UNKNOWN_0xD3 = 0xd3, // ??
	UNKNOWN_FUNC_UNKNOWN_0xD4 = 0xd4, // ??
	UNKNOWN_FUNC_UNKNOWN_0xEF = 0xef, // ??

	// Special commands for Z-Wave.me sticks
	UNKNOWN_FUNC_ZMEFreqChange = 0xf2,
	UNKNOWN_FUNC_ZMERestore = 0xf3,
	UNKNOWN_FUNC_ZMEBootloaderFlash = 0xf4,
	UNKNOWN_FUNC_ZMECapabilities = 0xf5,
	UNKNOWN_FUNC_ZMESerialAPIOptions = 0xf8,
}
