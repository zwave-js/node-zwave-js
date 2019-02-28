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

	Controller_MessageDropped,
	Controller_InclusionFailed,

	CC_Invalid,
	ArithmeticException,
}

export class ZWaveError extends Error {
	constructor(
		public readonly message: string,
		public readonly code: ZWaveErrorCodes,
	) {
		super(message);

		// We need to set the prototype explicitly
		Object.setPrototypeOf(this, ZWaveError.prototype);
	}
}
