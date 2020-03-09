/* eslint-disable @typescript-eslint/camelcase */

/**
 * Used to identify errors from this library without relying on the error message
 */
export enum ZWaveErrorCodes {
	PacketFormat_Truncated,
	PacketFormat_Invalid,
	PacketFormat_Checksum,
	// This differs from the above three. It means that the packet has a valid format and checksum,
	// but the data does not match the expectations. This error does not reset the Z-Wave stack
	PacketFormat_InvalidPayload,

	Driver_Reset,
	Driver_Destroyed,
	Driver_NotReady,
	Driver_InvalidDataReceived,
	Driver_NotSupported,
	Driver_NoPriority,
	Driver_InvalidCache,
	Driver_InvalidOptions,

	/** The controller has timed out while waiting for a report from the node */
	Controller_NodeTimeout,
	Controller_MessageDropped,
	Controller_InclusionFailed,
	Controller_ExclusionFailed,

	/** The node with the given node ID was not found */
	Controller_NodeNotFound,

	CC_Invalid,
	CC_NoNodeID,
	CC_NotSupported,
	CC_NotImplemented,
	CC_NoAPI,

	Deserialization_NotImplemented,
	Arithmetic,
	Argument_Invalid,

	Config_Invalid,

	// Here follow message specific errors
	/** The removal process could not be started or completed due to one or several reasons */
	RemoveFailedNode_Failed,
	/** The removal process was aborted because the node has responded */
	RemoveFailedNode_NodeOK,

	// Here follow CC specific errors

	/**
	 * Used to report the first existing parameter number
	 * available in a node's configuration
	 */
	ConfigurationCC_FirstParameterNumber = 1000,
	/**
	 * Used to report that a V3+ node should not have its parameters scanned with get/set commands
	 */
	ConfigurationCC_NoLegacyScanOnNewDevices,
	/**
	 * Used to report that a node using V3 or less MUST not use the resetToDefault flag
	 */
	ConfigurationCC_NoResetToDefaultOnLegacyDevices,

	/**
	 * Used to report that the command was not executed by the target node
	 */
	SupervisionCC_CommandFailed = 1100,

	/**
	 * Used to report that a ManufacturerProprietaryCC could not be instanciated
	 * because of a missing manufacturer ID.
	 */
	ManufacturerProprietaryCC_NoManufacturerId = 1200,
}

/**
 * Errors thrown in this libary are of this type. The `code` property identifies what went wrong.
 */
export class ZWaveError extends Error {
	public constructor(
		public readonly message: string,
		public readonly code: ZWaveErrorCodes,
	) {
		super(message);

		// We need to set the prototype explicitly
		Object.setPrototypeOf(this, ZWaveError.prototype);
	}
}
