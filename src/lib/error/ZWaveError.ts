/* eslint-disable @typescript-eslint/camelcase */

export enum ZWaveErrorCodes {
	PacketFormat_Truncated,
	PacketFormat_Invalid,
	PacketFormat_Checksum,

	Driver_Reset,
	Driver_Destroyed,
	Driver_NotReady,
	Driver_InvalidDataReceived,
	Driver_NotSupported,
	Driver_NoPriority,
	Driver_InvalidCache,

	Controller_MessageDropped,
	Controller_InclusionFailed,
	Node_NotResponding,

	CC_Invalid,
	CC_NotSupported,
	CC_NoNodeID,

	Arithmetic,
}

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
