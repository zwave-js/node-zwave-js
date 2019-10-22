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

	Controller_MessageTimeout,
	Controller_MessageDropped,
	Controller_InclusionFailed,
	Controller_ExclusionFailed,

	Node_NotResponding,

	CC_Invalid,
	CC_NoNodeID,
	CC_NotSupported,
	CC_NotImplemented,
	CC_NoAPI,

	Deserialization_NotImplemented,
	Arithmetic,
	Argument_Invalid,

	Config_Invalid,

	// Here follow CC specific errors

	/**
	 * Used to report the first existing parameter number
	 * available in a node's configuration
	 */
	ConfigurationCC_FirstParameterNumber = 100,
	/**
	 * Used to report that a V3+ node should not have its parameters scanned with get/set commands
	 */
	ConfigurationCC_NoLegacyScanOnNewDevices,
	/**
	 * Used to report that a node using V3 or less MUST not use the resetToDefault flag
	 */
	ConfigurationCC_NoResetToDefaultOnLegacyDevices,
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
