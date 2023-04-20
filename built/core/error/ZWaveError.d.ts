/**
 * Used to identify errors from this library without relying on the specific wording of the error message
 */
export declare enum ZWaveErrorCodes {
    PacketFormat_Truncated = 0,
    PacketFormat_Invalid = 1,
    PacketFormat_Checksum = 2,
    PacketFormat_InvalidPayload = 3,
    PacketFormat_DecryptionFailed = 4,
    /** The driver failed to start */
    Driver_Failed = 100,
    Driver_Reset = 101,
    Driver_Destroyed = 102,
    Driver_NotReady = 103,
    Driver_InvalidDataReceived = 104,
    Driver_NotSupported = 105,
    Driver_NoPriority = 106,
    Driver_InvalidCache = 107,
    Driver_InvalidOptions = 108,
    /** The driver tried to do something that requires security */
    Driver_NoSecurity = 109,
    Driver_NoErrorHandler = 110,
    Driver_FeatureDisabled = 111,
    /** There was a timeout while waiting for a message from the controller */
    Controller_Timeout = 200,
    /** There was a timeout while waiting for a response from a node */
    Controller_NodeTimeout = 201,
    Controller_MessageDropped = 202,
    Controller_ResponseNOK = 203,
    Controller_CallbackNOK = 204,
    Controller_InclusionFailed = 205,
    Controller_ExclusionFailed = 206,
    /** Tried to do something the controller does not support */
    Controller_NotSupported = 207,
    /** The interview for this node was restarted by the user */
    Controller_InterviewRestarted = 208,
    /** The node with the given node ID was not found */
    Controller_NodeNotFound = 209,
    /** The endpoint with the given index was not found on the node */
    Controller_EndpointNotFound = 210,
    /** The node was removed from the network */
    Controller_NodeRemoved = 211,
    /** Communication with the node will be insecure (no security configured) */
    Controller_NodeInsecureCommunication = 212,
    /** The message has expired (the given timeout has elapsed) */
    Controller_MessageExpired = 213,
    /** A Serial API command resulted in an error response */
    Controller_CommandError = 214,
    /** Tried to send a message that is too large */
    Controller_MessageTooLarge = 215,
    /** Could not fetch some information to determine firmware upgrades from a node */
    FWUpdateService_MissingInformation = 260,
    /** Any error related to HTTP requests during firmware update communication */
    FWUpdateService_RequestError = 261,
    /** The integrity check of the downloaded firmware update failed */
    FWUpdateService_IntegrityCheckFailed = 262,
    /** The given NVM version/format is unsupported */
    NVM_NotSupported = 280,
    /** Could not parse the JSON representation of an NVM due to invalid data */
    NVM_InvalidJSON = 281,
    /** A required NVM3 object was not found while deserializing the NVM */
    NVM_ObjectNotFound = 282,
    /** The parsed NVM or NVM content has an invalid format */
    NVM_InvalidFormat = 283,
    /** Not enough space in the NVM */
    NVM_NoSpace = 284,
    CC_Invalid = 300,
    CC_NoNodeID = 301,
    CC_NotSupported = 302,
    CC_NotImplemented = 303,
    CC_NoAPI = 304,
    Deserialization_NotImplemented = 320,
    Arithmetic = 321,
    Argument_Invalid = 322,
    Config_Invalid = 340,
    Config_NotFound = 341,
    /** A compound config file has circular imports */
    Config_CircularImport = 342,
    /** Failed to download the npm registry info for config updates */
    Config_Update_RegistryError = 343,
    /** Could not detect which package manager to use for updates */
    Config_Update_PackageManagerNotFound = 344,
    /** Installing the configuration update failed */
    Config_Update_InstallFailed = 345,
    /** The removal process could not be started or completed due to one or several reasons */
    RemoveFailedNode_Failed = 360,
    /** The removal process was aborted because the node has responded */
    RemoveFailedNode_NodeOK = 361,
    /** The replace process could not be started or completed due to one or several reasons */
    ReplaceFailedNode_Failed = 362,
    /** The replace process was aborted because the node has responded */
    ReplaceFailedNode_NodeOK = 363,
    /** The controller is currently busy with something that prevents an OTW update */
    OTW_Update_Busy = 380,
    /**
     * Used to report the first existing parameter number
     * available in a node's configuration
     */
    ConfigurationCC_FirstParameterNumber = 1000,
    /**
     * Used to report that a V3+ node should not have its parameters scanned with get/set commands
     */
    ConfigurationCC_NoLegacyScanOnNewDevices = 1001,
    /**
     * Used to report that a node using V3 or less MUST not use the resetToDefault flag
     */
    ConfigurationCC_NoResetToDefaultOnLegacyDevices = 1002,
    /**
     * Used to report that the command was not executed by the target node
     */
    SupervisionCC_CommandFailed = 1100,
    /**
     * Used to report that a ManufacturerProprietaryCC could not be instantiated
     * because of a missing manufacturer ID.
     */
    ManufacturerProprietaryCC_NoManufacturerId = 1200,
    /**
     * Used to report that an invalid group ID was used to address a (Multi Channel) Association
     */
    AssociationCC_InvalidGroup = 1300,
    /** Cannot add an association because it is not allowed */
    AssociationCC_NotAllowed = 1301,
    /** Used to report that no nonce exists */
    SecurityCC_NoNonce = 1400,
    /** Used to report that no SPAN is established between the nodes yet. */
    Security2CC_NoSPAN = 1401,
    /** Used to report that the inner state required for this action was not initialized */
    Security2CC_NotInitialized = 1402,
    /** Used to report that secure communication with a node is not possible because the node is not secure */
    Security2CC_NotSecure = 1403,
    /** Gets thrown when a Security S2 command is missing a required extension */
    Security2CC_MissingExtension = 1404,
    /** Gets thrown when a Security S2 encapsulated command cannot be decoded by the target node */
    Security2CC_CannotDecode = 1405,
    /** Gets thrown when parsing an invalid QR code */
    Security2CC_InvalidQRCode = 1406,
    /** Used to report that no MPAN has been received from the peer yet, or it is out of sync. */
    Security2CC_NoMPAN = 1407,
    /** Gets thrown when a Security S2 Multicast encapsulated command cannot be decoded by the target node */
    Security2CC_CannotDecodeMulticast = 1408,
    /** The firmware update process is already active on this node */
    FirmwareUpdateCC_Busy = 1500,
    /** The selected firmware target is not upgradable */
    FirmwareUpdateCC_NotUpgradable = 1501,
    /** The selected firmware target does not exist */
    FirmwareUpdateCC_TargetNotFound = 1502,
    /** The node reported that it could not start the update */
    FirmwareUpdateCC_FailedToStart = 1503,
    /** The node did not confirm the aborted update */
    FirmwareUpdateCC_FailedToAbort = 1504,
    /** The node did not confirm the completed update or the process stalled for too long */
    FirmwareUpdateCC_Timeout = 1505,
    /** An invalid firmware file was provided that cannot be handled by this library */
    Invalid_Firmware_File = 1506,
    /** An firmware file with an unsupported format was provided */
    Unsupported_Firmware_Format = 1507,
    /** A firmware update is already in progress on the network preventing this action from proceeding */
    FirmwareUpdateCC_NetworkBusy = 1508,
    /** Unsupported target node for a powerlevel test */
    PowerlevelCC_UnsupportedTestNode = 1600
}
export declare function getErrorSuffix(code: ZWaveErrorCodes): string;
/**
 * Errors thrown in this library are of this type. The `code` property identifies what went wrong.
 */
export declare class ZWaveError extends Error {
    readonly message: string;
    readonly code: ZWaveErrorCodes;
    /** Additional info required to handle this error (e.g. the Z-Wave message indicating the failure) */
    readonly context?: unknown;
    /** If this error corresponds to a failed transaction, this contains the stack where it was created */
    readonly transactionSource?: string | undefined;
    constructor(message: string, code: ZWaveErrorCodes, 
    /** Additional info required to handle this error (e.g. the Z-Wave message indicating the failure) */
    context?: unknown, 
    /** If this error corresponds to a failed transaction, this contains the stack where it was created */
    transactionSource?: string | undefined);
}
export declare function isZWaveError(e: unknown): e is ZWaveError;
export declare function isTransmissionError(e: unknown): e is ZWaveError & {
    code: ZWaveErrorCodes.Controller_Timeout | ZWaveErrorCodes.Controller_MessageDropped | ZWaveErrorCodes.Controller_CallbackNOK | ZWaveErrorCodes.Controller_ResponseNOK | ZWaveErrorCodes.Controller_NodeTimeout | ZWaveErrorCodes.Security2CC_CannotDecode;
};
/**
 * Tests is the given error is a "recoverable" error - i.e. something that shouldn't happen unless
 * someone interacted with zwave-js in a weird way, but something we can deal with.
 *
 * This explicitly does not include transmission errors.
 */
export declare function isRecoverableZWaveError(e: unknown): e is ZWaveError;
//# sourceMappingURL=ZWaveError.d.ts.map